import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {buildServer} from "../../src/server/app";
import type {ServerConfig} from "../../src/server/config";

const servers: Array<ReturnType<typeof buildServer>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("server security", () => {
  it("keeps health public and safe", async () => {
    const server = await createServer();
    const response = await server.inject({method: "GET", url: "/api/health"});
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ok: true, version: 1, mode: "local"});
    expect(response.body).not.toContain("token");
    expect(response.headers["content-security-policy"]).toBe("frame-ancestors 'none'");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("sets anti-framing headers on error and non-API responses", async () => {
    const server = await createServer();
    for (const url of ["/missing", "/internal/render-resources/invalid-token"]) {
      const response = await server.inject({method: "GET", url});
      expect(response.headers["content-security-policy"]).toBe("frame-ancestors 'none'");
      expect(response.headers["x-frame-options"]).toBe("DENY");
    }
  });

  it("returns the ephemeral session only to the configured UI origin", async () => {
    const server = await createServer();
    const allowed = await server.inject({method: "GET", url: "/api/session", headers: {origin: "http://127.0.0.1:5173"}});
    const blocked = await server.inject({method: "GET", url: "/api/session", headers: {origin: "https://attacker.example"}});
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toEqual({sessionToken: "test-session-token"});
    expect(blocked.statusCode).toBe(403);
  });

  it("rejects foreign and missing origins on mutations", async () => {
    const server = await createServer();
    const foreign = await server.inject({method: "POST", url: "/api/assets/video", headers: {origin: "https://attacker.example", "x-radial-session": "test-session-token"}});
    const missing = await server.inject({method: "POST", url: "/api/assets/video", headers: {"x-radial-session": "test-session-token"}});
    expect(foreign.statusCode).toBe(403);
    expect(foreign.json()).toEqual({error: {code: "origin_not_allowed"}});
    expect(missing.statusCode).toBe(403);
  });

  it("rejects missing or wrong session tokens without echoing values", async () => {
    const server = await createServer();
    for (const token of [undefined, "wrong-secret-value"]) {
      const response = await server.inject({method: "POST", url: "/api/assets/video", headers: {origin: "http://127.0.0.1:5173", ...(token ? {"x-radial-session": token} : {})}});
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({error: {code: "session_required"}});
      expect(response.body).not.toContain("wrong-secret-value");
    }
  });

  it("defaults to loopback-only configuration", async () => {
    const {loadServerConfig} = await import("../../src/server/config");
    const config = loadServerConfig({}, "/tmp/radial-test");
    expect(config.host).toBe("127.0.0.1");
    expect(config.uiOrigin).toBe("http://127.0.0.1:5173");
    expect(config.sessionToken.length).toBeGreaterThanOrEqual(40);
  });
});

async function createServer() {
  const storageDir = await mkdtemp(join(tmpdir(), "radial-server-test-"));
  const config: ServerConfig = {host: "127.0.0.1", port: 4317, uiOrigin: "http://127.0.0.1:5173", sessionToken: "test-session-token", storageDir, videoMaxBytes: 1000, audioMaxBytes: 1000};
  const server = buildServer(config, {mediaInspector: async () => ({durationSec: 1, hasVideo: true, hasAudio: true})});
  servers.push(server);
  return server;
}
