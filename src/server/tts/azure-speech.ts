import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";
import {PublicError} from "../errors";
import {mapSpeechError} from "./errors";
import {buildSsml} from "./ssml";
import type {TtsAudio, TtsProvider, TtsSynthesisRequest} from "./types";
import type {TtsVoice} from "../../shared/api";

type AzureCredentials = {key: string; region: string};
export type AzureSynthesizer = (credentials: AzureCredentials, ssml: string, timeoutMs: number) => Promise<TtsAudio>;
export type AzureVoiceLister = (credentials: AzureCredentials, timeoutMs: number) => Promise<TtsVoice[]>;

export function createAzureSpeechProvider(
  env: NodeJS.ProcessEnv = process.env,
  synthesizeSsml: AzureSynthesizer = synthesizeWithSdk,
  timeoutMs = 20_000,
  listAvailableVoices: AzureVoiceLister = listVoicesWithSdk,
): TtsProvider {
  const key = env.AZURE_SPEECH_KEY?.trim() ?? "";
  const region = env.AZURE_SPEECH_REGION?.trim() ?? "";
  const configured = Boolean(key && region);
  const credentials = {key, region};
  let voicesPromise: Promise<TtsVoice[]> | undefined;

  const synthesize = async (request: TtsSynthesisRequest) => {
    if (!configured) throw new PublicError("tts_not_configured", 503);
    const ssml = buildSsml(request);
    try {
      return await synthesizeSsml(credentials, ssml, timeoutMs);
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw mapSpeechError(error);
    }
  };

  return {
    configured,
    async listVoices() {
      if (!configured) throw new PublicError("tts_not_configured", 503);
      voicesPromise ??= listAvailableVoices(credentials, timeoutMs).catch((error) => {
        voicesPromise = undefined;
        if (error instanceof PublicError) throw error;
        throw mapSpeechError(error);
      });
      return voicesPromise;
    },
    synthesize,
    async testConnection() {
      await synthesize({text: "test", voice: "en-US-JennyNeural", rate: "+0%"});
    },
  };
}

async function listVoicesWithSdk(credentials: AzureCredentials, timeoutMs: number): Promise<TtsVoice[]> {
  const speechConfig = speechSdk.SpeechConfig.fromSubscription(credentials.key, credentials.region);
  const synthesizer = new speechSdk.SpeechSynthesizer(speechConfig);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      synthesizer.getVoicesAsync(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
    if (!result.voices.length) throw new Error(result.errorDetails || "empty voice list");
    return result.voices.map((voice) => ({
      shortName: voice.shortName,
      locale: voice.locale,
      localName: voice.localName || voice.displayName || voice.shortName,
      gender: voiceGender(voice.gender),
    }));
  } finally {
    if (timer) clearTimeout(timer);
    synthesizer.close();
  }
}

function voiceGender(gender: speechSdk.SynthesisVoiceGender): TtsVoice["gender"] {
  if (gender === speechSdk.SynthesisVoiceGender.Female) return "female";
  if (gender === speechSdk.SynthesisVoiceGender.Male) return "male";
  if (gender === speechSdk.SynthesisVoiceGender.Neutral) return "neutral";
  return "unknown";
}

async function synthesizeWithSdk(credentials: AzureCredentials, ssml: string, timeoutMs: number): Promise<TtsAudio> {
  const speechConfig = speechSdk.SpeechConfig.fromSubscription(credentials.key, credentials.region);
  speechConfig.speechSynthesisOutputFormat = speechSdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
  const synthesizer = new speechSdk.SpeechSynthesizer(speechConfig);

  return new Promise<TtsAudio>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      synthesizer.close();
      callback();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("timeout"))), timeoutMs);

    try {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => finish(() => {
          const audio = Buffer.from(result.audioData);
          const durationSec = result.audioDuration / 10_000_000;
          if (audio.length === 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
            reject(new Error("empty synthesis result"));
            return;
          }
          resolve({audio, mime: "audio/wav", durationSec});
        }),
        (error) => finish(() => reject(new Error(String(error)))),
      );
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
