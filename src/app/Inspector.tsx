import type {Dispatch} from "react";
import {validateProject, type ProjectConfig, type ProjectIssue} from "../domain/project";
import {useI18n} from "../i18n/I18nProvider";
import {AudioPanel} from "../features/audio/AudioPanel";
import {BackgroundPanel} from "../features/background/BackgroundPanel";
import {ContentPanel} from "../features/content/ContentPanel";
import {LayoutPanel} from "../features/layout/LayoutPanel";
import {OutputPanel} from "../features/output/OutputPanel";
import {StylePanel} from "../features/style/StylePanel";
import type {ModuleId} from "./modules";
import type {ProjectAction} from "./useProjectState";
import type {AssetKind} from "../domain/project";
import type {RenderJobResponse, TtsVoice} from "../shared/api";
import {Button} from "../ui/Button";

type InspectorProps = {
  active: ModuleId;
  project: ProjectConfig;
  dispatch: Dispatch<ProjectAction>;
  onBackgroundFile: (file: File | null) => void;
  onMusicFile: (file: File | null) => void;
  uploading: AssetKind | null;
  ttsState: "unknown" | "checking" | "configured" | "not-configured" | "error";
  ttsVoices: TtsVoice[];
  ttsVoicesLoading: boolean;
  ttsVoicesFailed: boolean;
  previewingSpeech: boolean;
  onTestSpeech: () => void;
  onPreviewSpeech: (text: string, meaningZh?: string) => void;
  renderJob: RenderJobResponse | null;
  onGenerate: () => void;
  generating: boolean;
  onIssueSelect: (issue: ProjectIssue) => void;
};

const HEADINGS = {
  content: ["content.title", "content.description"],
  background: ["background.title", "background.description"],
  layout: ["layout.title", "layout.description"],
  style: ["style.title", "style.description"],
  audio: ["audio.title", "audio.description"],
  output: ["output.title", "output.description"],
} as const;

export function Inspector({active, project, dispatch, onBackgroundFile, onMusicFile, uploading, ttsState, ttsVoices, ttsVoicesLoading, ttsVoicesFailed, previewingSpeech, onTestSpeech, onPreviewSpeech, renderJob, onGenerate, generating, onIssueSelect}: InspectorProps) {
  const {t} = useI18n();
  const [title, description] = HEADINGS[active];
  const validation = validateProject(project);
  const issueCount = validation.errors.length;
  const blockedText = issueCount === 1 ? t("app.generateBlockedOne") : t("app.generateBlockedMany", {count: issueCount});
  return (
    <section className="inspector" aria-labelledby={`inspector-${active}`}>
      <header className="inspector-header">
        <h2 id={`inspector-${active}`}>{t(title)}</h2>
        <p>{t(description)}</p>
      </header>
      <div className="inspector-body">
        {active === "content" ? <ContentPanel project={project} dispatch={dispatch} onPreviewSpeech={onPreviewSpeech} previewingSpeech={previewingSpeech} /> : null}
        {active === "background" ? <BackgroundPanel project={project} dispatch={dispatch} onFile={onBackgroundFile} uploading={uploading === "video"} /> : null}
        {active === "layout" ? <LayoutPanel project={project} dispatch={dispatch} /> : null}
        {active === "style" ? <StylePanel project={project} dispatch={dispatch} /> : null}
        {active === "audio" ? <AudioPanel project={project} dispatch={dispatch} onMusicFile={onMusicFile} uploading={uploading === "audio"} ttsState={ttsState} voices={ttsVoices} voicesLoading={ttsVoicesLoading} voicesFailed={ttsVoicesFailed} onTest={onTestSpeech} onPreview={() => onPreviewSpeech(project.root.text, project.root.meaningZh)} previewing={previewingSpeech} /> : null}
        {active === "output" ? <OutputPanel project={project} renderJob={renderJob} onIssueSelect={onIssueSelect} /> : null}
      </div>
      <footer className="inspector-footer">
        <span id="generate-readiness" className={`inspector-footer__summary ${issueCount ? "inspector-footer__summary--error" : ""}`}>
          {issueCount ? blockedText : `${project.canvas.preset} · ${project.canvas.width} × ${project.canvas.height} · ${project.canvas.fps} FPS`}
        </span>
        <Button variant="primary" disabled={generating || !validation.ok} aria-describedby="generate-readiness" title={issueCount ? blockedText : undefined} onClick={onGenerate}>
          {generating ? `${t("app.generating")} · ${Math.round((renderJob?.progress ?? 0) * 100)}%` : t("app.generate")}
        </Button>
      </footer>
    </section>
  );
}
