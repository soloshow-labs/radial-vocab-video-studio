import {PublicError} from "../errors";
import type {TtsSynthesisRequest} from "./types";
import {MAX_TTS_TEXT_LENGTH, isSupportedAzureVoiceName} from "../../shared/tts";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function buildSsml(request: TtsSynthesisRequest): string {
  if (!request || typeof request.text !== "string" || typeof request.voice !== "string" || typeof request.rate !== "string") {
    throw new PublicError("invalid_tts_request", 400);
  }
  const text = request.text.trim();
  if (!text || text.length > MAX_TTS_TEXT_LENGTH || CONTROL_CHARACTERS.test(text)) {
    throw new PublicError("invalid_tts_text", 400);
  }
  if (!isSupportedAzureVoiceName(request.voice)) throw new PublicError("invalid_tts_voice", 400);
  const secondaryText = request.secondaryText?.trim() ?? "";
  const secondaryVoice = request.secondaryVoice?.trim() ?? "";
  if (secondaryText && (!secondaryVoice || secondaryText.length > MAX_TTS_TEXT_LENGTH || CONTROL_CHARACTERS.test(secondaryText))) {
    throw new PublicError("invalid_tts_request", 400);
  }
  if (secondaryVoice && (!secondaryText || !isSupportedAzureVoiceName(secondaryVoice))) {
    throw new PublicError("invalid_tts_voice", 400);
  }
  const rate = parseRate(request.rate);
  const breakMs = request.breakMs ?? 0;
  if (!Number.isInteger(breakMs) || breakMs < 0 || breakMs > 5000) {
    throw new PublicError("invalid_tts_break", 400);
  }
  const language = request.voice.split("-").slice(0, 2).join("-");
  const pause = breakMs > 0 ? `<break time="${breakMs}ms"/>` : "";
  const primary = `<voice name="${request.voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice>`;
  const secondary = secondaryText
    ? `<break time="160ms"/><voice name="${secondaryVoice}"><prosody rate="${rate}">${escapeXml(secondaryText)}</prosody></voice>`
    : "";
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">${primary}${secondary}${pause}</speak>`;
}

export function parseRate(value: string): string {
  if (!/^[+-]?\d+%$/.test(value)) throw new PublicError("invalid_tts_rate", 400);
  const rate = Number.parseInt(value, 10);
  if (rate < -50 || rate > 100) throw new PublicError("invalid_tts_rate", 400);
  return `${rate >= 0 ? "+" : ""}${rate}%`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
