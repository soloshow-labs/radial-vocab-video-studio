import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {buildServer} from "../../src/server/app";
import type {ServerConfig} from "../../src/server/config";

const servers: Array<ReturnType<typeof buildServer>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("asset uploads", () => {
  it("accepts one authenticated video and returns only safe metadata", async () => {
    const server = await createServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/assets/video",
      headers: {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token", "content-type": "multipart/form-data; boundary=radial"},
      payload: multipart("lesson.mp4", "video/mp4", "not-a-real-video"),
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({asset: {id: expect.stringMatching(/^asset_/), name: "lesson.mp4", kind: "video"}});
    expect(response.body).not.toMatch(/\/tmp\/|storage|source\.mp4/);
    const id = response.json().asset.id as string;
    const media = await server.inject({method: "GET", url: `/api/assets/${id}/content`, headers: {range: "bytes=0-2"}});
    expect(media.statusCode).toBe(206);
    expect(media.body).toBe("not");
  });

  it("uses the smaller audio limit", async () => {
    const server = await createServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/assets/audio",
      headers: {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token", "content-type": "multipart/form-data; boundary=radial"},
      payload: multipart("music.mp3", "audio/mpeg", "0123456789"),
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({error: {code: "upload_too_large"}});
  });
});

async function createServer() {
  const storageDir = await mkdtemp(join(tmpdir(), "radial-upload-test-"));
  const config: ServerConfig = {host: "127.0.0.1", port: 4317, uiOrigin: "http://127.0.0.1:5173", sessionToken: "test-session-token", storageDir, videoMaxBytes: 1000, audioMaxBytes: 5};
  const server = buildServer(config, {mediaInspector: async () => ({durationSec: 1, hasVideo: true, hasAudio: true})});
  servers.push(server);
  return server;
}

function multipart(filename: string, mime: string, content: string): string {
  return `--radial\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n${content}\r\n--radial--\r\n`;
}
