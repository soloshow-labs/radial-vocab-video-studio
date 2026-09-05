import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";
import {buildServer} from "../../../src/server/app";
import type {ServerConfig} from "../../../src/server/config";
import type {TtsProvider} from "../../../src/server/tts/types";

const servers: Array<ReturnType<typeof buildServer>> = [];
afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("TTS routes", () => {
  it("reports configuration without credentials", async () => {
    const server = await createServer(fakeProvider(false));
    const response = await server.inject({method: "GET", url: "/api/tts/status", headers: {origin: "http://127.0.0.1:5173"}});
    expect(response.json()).toEqual({configured: false, provider: "azure-speech"});
  });

  it("tests the connection and previews wav audio", async () => {
    const provider = fakeProvider(true);
    const server = await createServer(provider);
    const headers = {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token"};
    const testResponse = await server.inject({method: "POST", url: "/api/tts/test", headers});
    expect(testResponse.json()).toEqual({ok: true});
    const preview = await server.inject({method: "POST", url: "/api/tts/preview", headers: {...headers, "content-type": "application/json"}, payload: {text: "mate", voice: "en-US-JennyNeural", rate: "+0%"}});
    expect(preview.statusCode).toBe(200);
    expect(preview.headers["content-type"]).toContain("audio/wav");
    expect(preview.headers["x-audio-duration-ms"]).toBe("500");
    expect(preview.rawPayload.toString()).toBe("wave");
  });

  it("returns only public voice metadata", async () => {
    const provider = fakeProvider(true);
    const response = await (await createServer(provider)).inject({
      method: "GET",
      url: "/api/tts/voices",
      headers: {origin: "http://127.0.0.1:5173"},
    });

    expect(response.json()).toEqual({voices: [{shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female"}]});
  });

  it("redacts provider errors", async () => {
    const provider = fakeProvider(true);
    provider.testConnection = vi.fn().mockRejectedValue(new Error("secret-key-value"));
    const server = await createServer(provider);
    const response = await server.inject({method: "POST", url: "/api/tts/test", headers: {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token"}});
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({error: {code: "internal_error"}});
    expect(response.body).not.toContain("secret-key-value");
  });

  it("rejects malformed preview bodies with a stable public error", async () => {
    const server = await createServer({
      configured: true,
      testConnection: vi.fn(),
      listVoices: vi.fn().mockResolvedValue([]),
      synthesize: async (request) => {
        const {buildSsml} = await import("../../../src/server/tts/ssml");
        buildSsml(request);
        return {audio: Buffer.from("wave"), mime: "audio/wav", durationSec: 0.5};
      },
    });
    const response = await server.inject({method: "POST", url: "/api/tts/preview", headers: {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token", "content-type": "application/json"}, payload: {}});
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({error: {code: "invalid_tts_request"}});
  });

  it("rejects oversized preview bodies before calling the provider", async () => {
    const provider = fakeProvider(true);
    const server = await createServer(provider);
    const response = await server.inject({
      method: "POST",
      url: "/api/tts/preview",
      headers: {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token", "content-type": "application/json"},
      payload: JSON.stringify({text: "x".repeat(20_000), voice: "en-US-JennyNeural", rate: "+0%"}),
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({error: {code: "request_too_large"}});
    expect(provider.synthesize).not.toHaveBeenCalled();
  });

  it("bounds concurrent and pending Azure Speech work", async () => {
    let active = 0;
    let peak = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = fakeProvider(true);
    provider.synthesize = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await gate;
      active -= 1;
      return {audio: Buffer.from("wave"), mime: "audio/wav" as const, durationSec: 0.5};
    });
    const server = await createServer(provider);
    const headers = {origin: "http://127.0.0.1:5173", "x-radial-session": "test-session-token", "content-type": "application/json"};
    const requests = Array.from({length: 8}, () => server.inject({
      method: "POST",
      url: "/api/tts/preview",
      headers,
      payload: {text: "mate", voice: "en-US-JennyNeural", rate: "+0%"},
    }));

    await vi.waitFor(() => expect(provider.synthesize).toHaveBeenCalledTimes(2));
    release();
    const responses = await Promise.all(requests);

    expect(peak).toBe(2);
    expect(responses.filter((response) => response.statusCode === 429)).toHaveLength(2);
    expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(6);
    expect(responses.find((response) => response.statusCode === 429)?.json()).toEqual({error: {code: "tts_busy"}});
  });
});

function fakeProvider(configured: boolean): TtsProvider {
  return {
    configured,
    testConnection: vi.fn().mockResolvedValue(undefined),
    listVoices: vi.fn().mockResolvedValue([{shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female"}]),
    synthesize: vi.fn().mockResolvedValue({audio: Buffer.from("wave"), mime: "audio/wav", durationSec: 0.5}),
  };
}

async function createServer(ttsProvider: TtsProvider) {
  const storageDir = await mkdtemp(join(tmpdir(), "radial-tts-test-"));
  const config: ServerConfig = {host: "127.0.0.1", port: 4317, uiOrigin: "http://127.0.0.1:5173", sessionToken: "test-session-token", storageDir, videoMaxBytes: 1000, audioMaxBytes: 1000};
  const server = buildServer(config, {ttsProvider, mediaInspector: async () => ({durationSec: 1, hasVideo: true, hasAudio: true})});
  servers.push(server);
  return server;
}
