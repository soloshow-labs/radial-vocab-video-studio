import {PublicError} from "../errors";

export function mapSpeechError(error: unknown): PublicError {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout|timed out/i.test(message)) return new PublicError("tts_timeout", 504);
  if (/401|403|authentication|unauthorized|subscription/i.test(message)) {
    return new PublicError("tts_authentication_failed", 401);
  }
  if (/429|quota|limit|too many/i.test(message)) return new PublicError("tts_quota_exceeded", 429);
  return new PublicError("tts_synthesis_failed", 502);
}
