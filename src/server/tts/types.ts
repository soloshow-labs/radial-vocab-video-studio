import type {TtsVoice} from "../../shared/api";

export type TtsSynthesisRequest = {
  text: string;
  voice: string;
  secondaryText?: string;
  secondaryVoice?: string;
  rate: string;
  breakMs?: number;
};

export type TtsAudio = {audio: Buffer; mime: "audio/wav"; durationSec: number};

export interface TtsProvider {
  readonly configured: boolean;
  testConnection(): Promise<void>;
  listVoices(): Promise<TtsVoice[]>;
  synthesize(request: TtsSynthesisRequest): Promise<TtsAudio>;
}
