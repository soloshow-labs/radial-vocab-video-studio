import {describe, expect, it, vi} from "vitest";
import {createAzureSpeechProvider} from "../../../src/server/tts/azure-speech";

describe("Azure Speech provider", () => {
  it("stays unconfigured without both server-side values", async () => {
    const provider = createAzureSpeechProvider({AZURE_SPEECH_KEY: "key"}, vi.fn());
    expect(provider.configured).toBe(false);
    await expect(provider.testConnection()).rejects.toMatchObject({code: "tts_not_configured"});
  });

  it("keeps credentials in provider scope and returns synthesized audio", async () => {
    const synthesize = vi.fn().mockResolvedValue({audio: Buffer.from("wave"), mime: "audio/wav", durationSec: 0.5});
    const provider = createAzureSpeechProvider({AZURE_SPEECH_KEY: "private-key", AZURE_SPEECH_REGION: "eastus"}, synthesize);
    const result = await provider.synthesize({text: "mate", voice: "en-US-JennyNeural", rate: "+0%"});
    expect(result.audio.toString()).toBe("wave");
    expect(synthesize).toHaveBeenCalledWith({key: "private-key", region: "eastus"}, expect.stringContaining("mate"), 20_000);
    expect(JSON.stringify(provider)).not.toContain("private-key");
  });

  it("caches the public voice list without exposing credentials", async () => {
    const voices = [{shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female" as const}];
    const listVoices = vi.fn().mockResolvedValue(voices);
    const provider = createAzureSpeechProvider(
      {AZURE_SPEECH_KEY: "private-key", AZURE_SPEECH_REGION: "eastus"},
      vi.fn(),
      20_000,
      listVoices,
    );

    await expect(provider.listVoices()).resolves.toEqual(voices);
    await expect(provider.listVoices()).resolves.toEqual(voices);
    expect(listVoices).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await provider.listVoices())).not.toContain("private-key");
  });

  it.each([
    [new Error("401 AuthenticationFailure"), "tts_authentication_failed"],
    [new Error("429 quota exceeded"), "tts_quota_exceeded"],
    [new Error("request timeout"), "tts_timeout"],
    [new Error("socket closed"), "tts_synthesis_failed"],
  ])("maps provider failures to safe code", async (error, code) => {
    const provider = createAzureSpeechProvider({AZURE_SPEECH_KEY: "key", AZURE_SPEECH_REGION: "region"}, vi.fn().mockRejectedValue(error));
    await expect(provider.testConnection()).rejects.toMatchObject({code});
  });
});
