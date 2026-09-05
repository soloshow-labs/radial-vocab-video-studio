import type {
  ApiErrorBody,
  RenderJobResponse,
  RenderRequest,
  SessionResponse,
  TtsVoicesResponse,
  UploadAssetResponse,
} from "../shared/api";
import type {AssetKind, ProjectConfig} from "../domain/project";

const TTS_PREVIEW_REQUEST_TIMEOUT_MS = 25_000;

export class ApiClientError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = "ApiClientError";
  }
}

let sessionPromise: Promise<string> | undefined;

export function resetApiSession(): void {
  sessionPromise = undefined;
}

export async function uploadAsset(kind: AssetKind, file: File): Promise<UploadAssetResponse> {
  const form = new FormData();
  form.append("file", file);
  return requestJson(`/api/assets/${kind}`, {method: "POST", body: form}, true);
}

export async function getTtsStatus(): Promise<{configured: boolean; provider: "azure-speech"}> {
  return requestJson("/api/tts/status");
}

export async function getTtsVoices(): Promise<TtsVoicesResponse> {
  return requestJson("/api/tts/voices");
}

export async function testTtsConnection(): Promise<void> {
  await requestJson("/api/tts/test", {method: "POST"}, true);
}

export async function previewSpeech(project: ProjectConfig, text: string, meaningZh = ""): Promise<{audio: Blob; durationMs?: number}> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), TTS_PREVIEW_REQUEST_TIMEOUT_MS);
  try {
    const response = await request("/api/tts/preview", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      signal: controller.signal,
      body: JSON.stringify({
        text,
        voice: project.voice.voice,
        ...(project.voice.speakChinese && meaningZh.trim() ? {
          secondaryText: meaningZh,
          secondaryVoice: project.voice.chineseVoice,
        } : {}),
        rate: project.voice.rate,
        breakMs: project.voice.breakMs,
      }),
    }, true);
    const duration = Number(response.headers.get("X-Audio-Duration-Ms"));
    return {
      audio: await response.blob(),
      ...(Number.isFinite(duration) && duration > 0 ? {durationMs: duration} : {}),
    };
  } catch (error) {
    if (controller.signal.aborted) throw new ApiClientError("tts_preview_timeout", 408);
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function queueRender(project: ProjectConfig): Promise<RenderJobResponse> {
  const body: RenderRequest = {project};
  return requestJson("/api/render", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  }, true);
}

export async function getRenderJob(id: string): Promise<RenderJobResponse> {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new ApiClientError("render_job_not_found", 404);
  return requestJson(`/api/jobs/${id}`);
}

async function requestJson<T>(url: string, init: RequestInit = {}, mutation = false): Promise<T> {
  const response = await request(url, init, mutation);
  return response.json() as Promise<T>;
}

async function request(url: string, init: RequestInit, mutation: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (mutation) headers.set("X-Radial-Session", await getSessionToken());
  let response: Response;
  try {
    response = await fetch(url, {...init, headers});
  } catch {
    throw new ApiClientError("server_unavailable", 0);
  }
  if (response.ok) return response;
  let code = "request_failed";
  try {
    code = ((await response.json()) as ApiErrorBody).error.code || code;
  } catch {
    // The server intentionally exposes only stable error codes when available.
  }
  throw new ApiClientError(code, response.status);
}

async function getSessionToken(): Promise<string> {
  sessionPromise ??= fetch("/api/session")
    .then(async (response) => {
      if (!response.ok) throw new ApiClientError("session_unavailable", response.status);
      const payload = await response.json() as SessionResponse;
      if (!/^[A-Za-z0-9_-]{40,128}$/.test(payload.sessionToken)) {
        throw new ApiClientError("session_unavailable", 500);
      }
      return payload.sessionToken;
    })
    .catch((error) => {
      sessionPromise = undefined;
      throw error instanceof ApiClientError ? error : new ApiClientError("server_unavailable", 0);
    });
  return sessionPromise;
}
