import {useId, type ChangeEvent, type Dispatch} from "react";
import type {ProjectConfig} from "../../domain/project";
import {useI18n} from "../../i18n/I18nProvider";
import {Button} from "../../ui/Button";
import {Field} from "../../ui/Field";
import type {ProjectAction} from "../../app/useProjectState";
import {DEFAULT_CHINESE_VOICE, DEFAULT_ENGLISH_VOICE} from "../../domain/project";
import type {TtsVoice} from "../../shared/api";
import {isSupportedAzureVoiceName} from "../../shared/tts";

type AudioPanelProps = {
  project: ProjectConfig;
  dispatch: Dispatch<ProjectAction>;
  onMusicFile: (file: File | null) => void;
  uploading: boolean;
  ttsState: "unknown" | "checking" | "configured" | "not-configured" | "error";
  voices: TtsVoice[];
  voicesLoading: boolean;
  voicesFailed: boolean;
  onTest: () => void;
  onPreview: () => void;
  previewing: boolean;
};

const FALLBACK_VOICES: TtsVoice[] = [
  {shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female"},
  {shortName: "en-US-GuyNeural", locale: "en-US", localName: "Guy", gender: "male"},
  {shortName: "en-US-AriaNeural", locale: "en-US", localName: "Aria", gender: "female"},
  {shortName: "en-US-DavisNeural", locale: "en-US", localName: "Davis", gender: "male"},
  {shortName: "en-GB-SoniaNeural", locale: "en-GB", localName: "Sonia", gender: "female"},
  {shortName: "en-GB-RyanNeural", locale: "en-GB", localName: "Ryan", gender: "male"},
  {shortName: "zh-CN-XiaoxiaoNeural", locale: "zh-CN", localName: "晓晓", gender: "female"},
  {shortName: "zh-CN-YunxiNeural", locale: "zh-CN", localName: "云希", gender: "male"},
];

export function AudioPanel({project, dispatch, onMusicFile, uploading, ttsState, voices, voicesLoading, voicesFailed, onTest, onPreview, previewing}: AudioPanelProps) {
  const {t} = useI18n();
  const musicId = useId();
  const handleMusic = (event: ChangeEvent<HTMLInputElement>) => onMusicFile(event.currentTarget.files?.[0] ?? null);
  const availableVoices = voices.length > 0 ? voices : FALLBACK_VOICES;
  const englishVoices = voicesForLanguage(availableVoices, "en", project.voice.voice || DEFAULT_ENGLISH_VOICE);
  const chineseVoice = project.voice.chineseVoice || DEFAULT_CHINESE_VOICE;
  const chineseVoices = voicesForLanguage(availableVoices, "zh", chineseVoice);
  const englishVoiceHint = voicesLoading
    ? t("audio.voicesLoading")
    : voicesFailed
      ? t("audio.voicesFallback")
    : voices.length > 0
      ? t("audio.voiceCount", {count: englishVoices.length})
      : undefined;
  const chineseVoiceHint = voicesLoading
    ? t("audio.voicesLoading")
    : voicesFailed
      ? t("audio.voicesFallback")
    : voices.length > 0
      ? t("audio.voiceCount", {count: chineseVoices.length})
      : undefined;

  return (
    <>
      <div className="connection-card">
        <div className="connection-card__row">
          <div>
            <strong>{t("audio.azure")}</strong>
            <div className={`status status--${ttsState}`}>{statusText(ttsState, t)}</div>
            <div className="connection-card__meta">{t("audio.credentialsSource")}</div>
          </div>
          <Button disabled={ttsState === "checking"} onClick={onTest}>{ttsState === "checking" ? t("common.checking") : t("audio.test")}</Button>
        </div>
      </div>
      <div className="inspector-grid">
        <Field className="field--wide" label={t("audio.englishVoice")} hint={englishVoiceHint} htmlFor="voice-name">
          <select id="voice-name" value={project.voice.voice} onChange={(event) => dispatch({type: "voice.update", patch: {voice: event.currentTarget.value}})}>
            <VoiceOptions voices={englishVoices} />
          </select>
        </Field>
        <Field label={t("audio.rate")} htmlFor="voice-rate">
          <select id="voice-rate" value={project.voice.rate} onChange={(event) => dispatch({type: "voice.update", patch: {rate: event.currentTarget.value}})}>
            {["-25%", "-10%", "+0%", "+10%", "+25%", "+50%"].map((rate) => <option value={rate} key={rate}>{rate}</option>)}
          </select>
        </Field>
        <Field label={t("audio.break")} help={t("help.voiceBreak")} helpLabel={t("help.more")} htmlFor="voice-break"><input id="voice-break" type="number" min="0" max="5000" step="50" value={project.voice.breakMs} onChange={(event) => dispatch({type: "voice.update", patch: {breakMs: numberOr(event.currentTarget.value, 0)}})} /></Field>
      </div>
      <label className="check-field"><input type="checkbox" checked={project.voice.speakChinese} onChange={(event) => dispatch({type: "voice.update", patch: {speakChinese: event.currentTarget.checked}})} /><span>{t("audio.speakChinese")}</span></label>
      <Field className="field--wide chinese-voice-field" label={t("audio.chineseVoice")} hint={chineseVoiceHint} htmlFor="chinese-voice">
        <select id="chinese-voice" value={chineseVoice} disabled={!project.voice.speakChinese} onChange={(event) => dispatch({type: "voice.update", patch: {chineseVoice: event.currentTarget.value}})}>
          <VoiceOptions voices={chineseVoices} />
        </select>
      </Field>
      <div className="inline-action-row audio-preview-row">
        <span>{t("audio.previewHint")}</span>
        <Button disabled={previewing || !project.root.text.trim()} onClick={onPreview}>{previewing ? t("audio.previewing") : t("content.rootPreview")}</Button>
      </div>
      <div className="section-divider"><h3>{t("audio.music")}</h3></div>
      <div className="file-drop">
        <input id={musicId} type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg" disabled={uploading} onChange={handleMusic} />
        <label htmlFor={musicId}><span className={project.music.asset ? "file-name" : undefined}>{uploading ? t("common.uploading") : project.music.asset?.name ?? t("audio.uploadMusic")}</span></label>
      </div>
      <Field label={t("audio.musicVolume")} hint={`${Math.round(project.music.volume * 100)}%`} htmlFor="music-volume"><input id="music-volume" type="range" min="0" max="1" step="0.01" disabled={!project.music.asset} value={project.music.volume} onChange={(event) => dispatch({type: "music.update", patch: {volume: numberOr(event.currentTarget.value, 0)}})} /></Field>
    </>
  );
}

function VoiceOptions({voices}: {voices: TtsVoice[]}) {
  const groups = new Map<string, TtsVoice[]>();
  for (const voice of voices) groups.set(voice.locale, [...(groups.get(voice.locale) ?? []), voice]);
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([locale, localeVoices]) => (
      <optgroup label={locale} key={locale}>
        {[...localeVoices]
          .sort((left, right) => left.localName.localeCompare(right.localName))
          .map((voice) => <option value={voice.shortName} key={voice.shortName}>{voice.localName} · {voice.shortName}</option>)}
      </optgroup>
    ));
}

function voicesForLanguage(voices: TtsVoice[], language: string, selected: string): TtsVoice[] {
  const prefix = `${language.toLowerCase()}-`;
  const filtered = voices.filter((voice) => (
    voice.locale.toLowerCase().startsWith(prefix)
    && voice.shortName.toLowerCase().startsWith(prefix)
    && isSupportedAzureVoiceName(voice.shortName)
  ));
  if (filtered.some((voice) => voice.shortName === selected)) return filtered;
  return [{shortName: selected, locale: selected.split("-").slice(0, 2).join("-"), localName: selected, gender: "unknown"}, ...filtered];
}

function statusText(state: AudioPanelProps["ttsState"], t: ReturnType<typeof useI18n>["t"]): string {
  if (state === "checking") return t("common.checking");
  if (state === "configured") return t("audio.configured");
  if (state === "error") return t("audio.connectionError");
  return t("audio.notConfigured");
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
