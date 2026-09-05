import type {AssetReference, ProjectConfig} from "../domain/project";

export type ApiErrorBody = {error: {code: string}};
export type HealthResponse = {ok: true; version: 1; mode: "local"};
export type SessionResponse = {sessionToken: string};
export type UploadAssetResponse = {asset: AssetReference};
export type TtsVoice = {
  shortName: string;
  locale: string;
  localName: string;
  gender: "female" | "male" | "neutral" | "unknown";
};
export type TtsVoicesResponse = {voices: TtsVoice[]};
export type RenderRequest = {project: ProjectConfig};
export type RenderJobState = "queued" | "running" | "succeeded" | "failed";
export type RenderJobResponse = {
  id: string;
  status: RenderJobState;
  progress: number;
  stage: string;
  errorCode?: string;
  result?: {videoUrl: string; posterUrl: string};
};
