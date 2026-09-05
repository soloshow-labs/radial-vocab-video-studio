const AZURE_VOICE_NAME_PATTERN = /^[A-Za-z]{2,3}-[A-Za-z0-9:-]{3,120}(?:Neural|MAI-Voice-2(?:-Flash)?)$/;
export const MAX_TTS_TEXT_LENGTH = 1_000;

export function isSupportedAzureVoiceName(value: string): boolean {
  return AZURE_VOICE_NAME_PATTERN.test(value);
}
