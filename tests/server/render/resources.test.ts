import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import Fastify from "fastify";
import {describe, expect, it} from "vitest";
import {PublicError} from "../../../src/server/errors";
import {registerRenderResourceRoute, RenderResourceRegistry} from "../../../src/server/render/resources";

describe("RenderResourceRegistry", () => {
  it("uses unguessable opaque tokens and supports revocation", () => {
    const registry = new RenderResourceRegistry();
    const token = registry.register({path: "/private/local.wav", mime: "audio/wav"});
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(registry.get(token)).toEqual({path: "/private/local.wav", mime: "audio/wav"});
    registry.revoke(token);
    expect(() => registry.get(token)).toThrow(PublicError);
  });

  it("rejects malformed tokens without revealing resource state", () => {
    const registry = new RenderResourceRegistry();
    expect(() => registry.get("../../secret")).toThrowError(expect.objectContaining({code: "render_resource_not_found"}));
  });

  it("supports byte ranges required by Remotion media reads", async () => {
    const directory = await mkdtemp(join(tmpdir(), "radial-resource-test-"));
    const path = join(directory, "audio.wav");
    await writeFile(path, "0123456789");
    const registry = new RenderResourceRegistry();
    const token = registry.register({path, mime: "audio/wav"});
    const app = Fastify();
    registerRenderResourceRoute(app, registry);
    const response = await app.inject({
      method: "GET",
      url: `/internal/render-resources/${token}`,
      headers: {range: "bytes=2-5"},
    });
    await app.close();
    expect(response.statusCode).toBe(206);
    expect(response.headers["content-range"]).toBe("bytes 2-5/10");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.body).toBe("2345");
  });
});
