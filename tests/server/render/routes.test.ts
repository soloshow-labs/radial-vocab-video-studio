import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";
import {MAX_PROJECT_WORDS, createDefaultProject} from "../../../src/domain/project";
import {MAX_PROJECT_DOCUMENT_BYTES} from "../../../src/domain/project-io";
import {buildServer} from "../../../src/server/app";
import type {ServerConfig} from "../../../src/server/config";
import {RenderQueue} from "../../../src/server/render/queue";

const servers: Array<ReturnType<typeof buildServer>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("render routes", () => {
  it("queues a normalized project and exposes only opaque result URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-render-route-"));
    const videoFile = join(root, "private-video.mp4");
    const posterFile = join(root, "private-poster.png");
    await writeFile(videoFile, "video");
    await writeFile(posterFile, "poster");
    const queue = new RenderQueue<{project: ReturnType<typeof createDefaultProject>}>(async ({project}) => {
      expect(project.canvas.width).toBe(1080);
      return {videoFile, posterFile};
    });
    const server = createServer(root, queue);

    const queued = await server.inject({
      method: "POST",
      url: "/api/render",
      headers: authenticatedHeaders(),
      payload: {project: createDefaultProject()},
    });
    expect(queued.statusCode).toBe(202);
    expect(queued.json()).toMatchObject({id: expect.stringMatching(/^[a-f0-9]{32}$/), status: "queued"});
    expect(queued.body).not.toContain(root);

    const id = queued.json().id as string;
    await queue.whenIdle();
    const status = await server.inject({method: "GET", url: `/api/jobs/${id}`});
    expect(status.json()).toEqual({
      id,
      status: "succeeded",
      progress: 1,
      stage: "complete",
      result: {videoUrl: `/api/jobs/${id}/video`, posterUrl: `/api/jobs/${id}/poster`},
    });
    expect(status.body).not.toContain(root);
    const video = await server.inject({method: "GET", url: `/api/jobs/${id}/video`, headers: {range: "bytes=0-2"}});
    expect(video.statusCode).toBe(206);
    expect(video.headers["accept-ranges"]).toBe("bytes");
    expect(video.body).toBe("vid");
    expect((await server.inject({method: "GET", url: `/api/jobs/${id}/poster`})).body).toBe("poster");
  });

  it("rejects invalid projects before queueing", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-render-route-"));
    const queue = new RenderQueue<{project: ReturnType<typeof createDefaultProject>}>(async () => ({videoFile: "unused", posterFile: "unused"}));
    const server = createServer(root, queue);
    const response = await server.inject({
      method: "POST",
      url: "/api/render",
      headers: authenticatedHeaders(),
      payload: {project: {version: 1}},
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({error: {code: "project_invalid"}});
  });

  it("rejects over-budget projects without queueing work", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-render-route-"));
    const worker = vi.fn(async () => ({videoFile: "unused", posterFile: "unused"}));
    const queue = new RenderQueue<{project: ReturnType<typeof createDefaultProject>}>(worker);
    const server = createServer(root, queue);
    const project = createDefaultProject();
    project.words = Array.from({length: MAX_PROJECT_WORDS + 1}, (_, index) => ({
      text: `word${index}`,
      meaningZh: `释义${index}`,
    }));

    const response = await server.inject({
      method: "POST",
      url: "/api/render",
      headers: authenticatedHeaders(),
      payload: {project},
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({error: {code: "project_invalid"}});
    expect(worker).not.toHaveBeenCalled();
  });

  it("applies a small JSON body limit to render requests", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-render-route-"));
    const queue = new RenderQueue<{project: ReturnType<typeof createDefaultProject>}>(async () => ({videoFile: "unused", posterFile: "unused"}));
    const server = createServer(root, queue);
    const response = await server.inject({
      method: "POST",
      url: "/api/render",
      headers: {...authenticatedHeaders(), "content-type": "application/json"},
      payload: JSON.stringify({ignored: "x".repeat(MAX_PROJECT_DOCUMENT_BYTES)}),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({error: {code: "request_too_large"}});
  });
});

function createServer(root: string, queue: RenderQueue<{project: ReturnType<typeof createDefaultProject>}>) {
  const config: ServerConfig = {
    host: "127.0.0.1",
    port: 4317,
    uiOrigin: "http://127.0.0.1:5173",
    sessionToken: "test-session-token",
    storageDir: root,
    videoMaxBytes: 1000,
    audioMaxBytes: 1000,
  };
  const server = buildServer(config, {renderQueue: queue});
  servers.push(server);
  return server;
}

function authenticatedHeaders() {
  return {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token"};
}
