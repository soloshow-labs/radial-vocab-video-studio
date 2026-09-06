import {useEffect, useRef, useState} from "react";
import {MAX_PROJECT_DOCUMENT_BYTES, parseProjectDocument, serializeProject} from "../domain/project-io";
import {validateProject, type AssetKind, type ProjectConfig, type ProjectIssue} from "../domain/project";
import type {RenderJobResponse} from "../shared/api";
import {PreviewPanel} from "../preview/PreviewPanel";
import {ApiClientError, getRenderJob, getTtsStatus, getTtsVoices, previewSpeech, queueRender, testTtsConnection, uploadAsset} from "./api";
import {HeaderBar} from "./HeaderBar";
import {Inspector} from "./Inspector";
import {ModuleRail} from "./ModuleRail";
import type {ModuleId} from "./modules";
import {useProjectState} from "./useProjectState";
import {useI18n} from "../i18n/I18nProvider";
import {publicErrorText} from "./error-messages";
import type {TtsVoice} from "../shared/api";
import {issueDestination} from "./issue-navigation";
import {GITHUB_REPOSITORY_URL, PUBLIC_DEMO} from "./runtime";

const AUDIO_PLAYBACK_FALLBACK_TIMEOUT_MS = 30_000;

export function AppShell({demoMode = PUBLIC_DEMO}: {demoMode?: boolean}) {
  const {locale, t} = useI18n();
  const {project, dispatch, saveState} = useProjectState();
  const [active, setActive] = useState<ModuleId>("content");
  const [backgroundFile, setBackgroundFile] = useObjectUrl();
  const [musicFile, setMusicFile] = useObjectUrl();
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [notice, setNotice] = useState<{tone: "error" | "success"; code: string} | null>(null);
  const [ttsState, setTtsState] = useState<"unknown" | "checking" | "configured" | "not-configured" | "error">(demoMode ? "not-configured" : "unknown");
  const [ttsVoices, setTtsVoices] = useState<TtsVoice[]>([]);
  const [ttsVoicesLoading, setTtsVoicesLoading] = useState(false);
  const [ttsVoicesAttempted, setTtsVoicesAttempted] = useState(false);
  const [ttsVoicesFailed, setTtsVoicesFailed] = useState(false);
  const [previewingSpeech, setPreviewingSpeech] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJobResponse | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const pollGeneration = useRef(0);

  const attachFile = async (kind: AssetKind, file: File | null, setFile: (file: File | null) => void) => {
    setFile(file);
    if (!file) {
      dispatch(kind === "video" ? {type: "background.update", patch: {asset: null}} : {type: "music.update", patch: {asset: null}});
      return;
    }
    dispatch(kind === "video" ? {type: "background.update", patch: {asset: null}} : {type: "music.update", patch: {asset: null}});
    if (demoMode) return;
    setUploading(kind);
    setNotice(null);
    try {
      const {asset} = await uploadAsset(kind, file);
      dispatch(kind === "video" ? {type: "background.update", patch: {asset}} : {type: "music.update", patch: {asset}});
    } catch (error) {
      setFile(null);
      dispatch(kind === "video" ? {type: "background.update", patch: {asset: null}} : {type: "music.update", patch: {asset: null}});
      setNotice({tone: "error", code: errorCode(error)});
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    if (demoMode || active !== "audio" || ttsState !== "unknown") return;
    setTtsState("checking");
    void getTtsStatus()
      .then(({configured}) => setTtsState(configured ? "configured" : "not-configured"))
      .catch(() => setTtsState("error"));
  }, [active, demoMode, ttsState]);

  useEffect(() => {
    if (demoMode || active !== "audio" || ttsState !== "configured" || ttsVoicesAttempted) return;
    setTtsVoicesAttempted(true);
    setTtsVoicesLoading(true);
    setTtsVoicesFailed(false);
    void getTtsVoices()
      .then(({voices}) => setTtsVoices(voices))
      .catch(() => setTtsVoicesFailed(true))
      .finally(() => setTtsVoicesLoading(false));
  }, [active, demoMode, ttsState, ttsVoicesAttempted]);

  useEffect(() => () => {
    pollGeneration.current += 1;
  }, []);

  useEffect(() => {
    if (!pendingFocusId) return;
    const target = document.getElementById(pendingFocusId) ?? document.getElementById(`inspector-${active}`);
    if (!target) return;
    target.focus();
    target.scrollIntoView?.({block: "center", behavior: "smooth"});
    setPendingFocusId(null);
  }, [active, pendingFocusId]);

  const testSpeech = async () => {
    if (demoMode) return;
    setTtsState("checking");
    setNotice(null);
    try {
      await testTtsConnection();
      setTtsState("configured");
      if (ttsVoicesFailed) {
        setTtsVoicesFailed(false);
        setTtsVoicesAttempted(false);
      }
      setNotice({tone: "success", code: "tts_connected"});
    } catch (error) {
      setTtsState(errorCode(error) === "tts_not_configured" ? "not-configured" : "error");
      setNotice({tone: "error", code: errorCode(error)});
    }
  };

  const playSpeech = async (text: string, meaningZh = "") => {
    if (!text.trim()) return;
    if (demoMode) {
      setNotice({tone: "error", code: "demo_local_only"});
      return;
    }
    setPreviewingSpeech(true);
    setNotice(null);
    try {
      const {audio: blob, durationMs} = await previewSpeech(project, text, meaningZh);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      try {
        await playAudioWithTimeout(audio, durationMs);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setNotice({tone: "error", code: errorCode(error)});
    } finally {
      setPreviewingSpeech(false);
    }
  };

  const generateVideo = async () => {
    if (demoMode) {
      setNotice({tone: "error", code: "demo_local_only"});
      return;
    }
    if (!validateProject(project).ok) {
      setActive("output");
      return;
    }
    const generation = ++pollGeneration.current;
    setActive("output");
    setNotice(null);
    try {
      let job = await queueRender(project);
      setRenderJob(job);
      while (job.status === "queued" || job.status === "running") {
        await wait(500);
        if (pollGeneration.current !== generation) return;
        job = await getRenderJob(job.id);
        setRenderJob(job);
      }
      setNotice(job.status === "succeeded"
        ? {tone: "success", code: "render_complete"}
        : {tone: "error", code: job.errorCode ?? "render_failed"});
    } catch (error) {
      const code = errorCode(error);
      setRenderJob((current) => current && (current.status === "queued" || current.status === "running")
        ? {...current, status: "failed", stage: "failed", errorCode: code}
        : current);
      setNotice({tone: "error", code});
    }
  };

  const openIssue = (issue: ProjectIssue) => {
    const destination = issueDestination(issue);
    setActive(destination.module);
    setPendingFocusId(destination.elementId ?? `inspector-${destination.module}`);
  };

  const importProject = async (file: File) => {
    if (file.size > MAX_PROJECT_DOCUMENT_BYTES) {
      setNotice({tone: "error", code: "project_import_too_large"});
      return;
    }
    try {
      const imported = parseProjectDocument(await file.text());
      dispatch({type: "project.replace", project: imported});
      setBackgroundFile(null);
      setMusicFile(null);
      setNotice(null);
    } catch {
      setNotice({tone: "error", code: "project_import_invalid"});
    }
  };

  const exportProject = () => {
    try {
      const blob = new Blob([serializeProject(project)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileStem(project.name)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice({tone: "error", code: "project_invalid"});
    }
  };

  return (
    <main className="studio">
      <HeaderBar
        projectName={project.name}
        onRename={(name) => dispatch({type: "project.rename", name})}
        onImport={(file) => void importProject(file)}
        onExport={exportProject}
        saveState={saveState}
        demoMode={demoMode}
      />
      {notice ? <div className={`studio-notice studio-notice--${notice.tone}`} role="status">{publicErrorText(notice.code, locale)}</div> : null}
      {demoMode ? (
        <aside className="demo-bar" role="note">
          <span>{t("demo.banner")}</span>
          <a href={`${GITHUB_REPOSITORY_URL}#install-and-run`} target="_blank" rel="noreferrer">{t("demo.localGuide")}</a>
        </aside>
      ) : null}
      <div className="studio-workspace">
        <ModuleRail active={active} onSelect={setActive} />
        <Inspector
          active={active}
          project={project}
          dispatch={dispatch}
          onBackgroundFile={(file) => void attachFile("video", file, setBackgroundFile)}
          onMusicFile={(file) => void attachFile("audio", file, setMusicFile)}
          uploading={uploading}
          ttsState={ttsState}
          ttsVoices={ttsVoices}
          ttsVoicesLoading={ttsVoicesLoading}
          ttsVoicesFailed={ttsVoicesFailed}
          previewingSpeech={previewingSpeech}
          onTestSpeech={() => void testSpeech()}
          onPreviewSpeech={(text, meaningZh) => void playSpeech(text, meaningZh)}
          renderJob={renderJob}
          onGenerate={() => void generateVideo()}
          generating={renderJob?.status === "queued" || renderJob?.status === "running"}
          onIssueSelect={openIssue}
          demoMode={demoMode}
          backgroundFileName={backgroundFile?.name}
          musicFileName={musicFile?.name}
        />
        <PreviewPanel
          project={project}
          backgroundUrl={backgroundFile?.url ?? (project.background.asset ? `/api/assets/${project.background.asset.id}/content` : undefined)}
          musicUrl={musicFile?.url ?? (project.music.asset ? `/api/assets/${project.music.asset.id}/content` : undefined)}
          renderJob={renderJob}
          onOpenLayout={() => setActive("layout")}
        />
      </div>
    </main>
  );
}

type LocalObjectUrl = {url: string; name: string};

function useObjectUrl(): [LocalObjectUrl | null, (file: File | null) => void] {
  const [value, setValue] = useState<LocalObjectUrl | null>(null);
  const current = useRef<string | null>(null);
  const setFile = (file: File | null) => {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = file ? URL.createObjectURL(file) : null;
    setValue(current.current ? {url: current.current, name: file?.name ?? ""} : null);
  };
  useEffect(() => () => {
    if (current.current) URL.revokeObjectURL(current.current);
  }, []);
  return [value, setFile];
}

function safeFileStem(name: string): string {
  const stem = name.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
  return stem || "radial-vocab-project";
}

function errorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : "request_failed";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function playAudioWithTimeout(audio: HTMLAudioElement, durationMs?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      callback();
    };
    const timeoutMs = durationMs === undefined
      ? AUDIO_PLAYBACK_FALLBACK_TIMEOUT_MS
      : Math.min(Math.max(durationMs + 5_000, 10_000), 120_000);
    const timer = window.setTimeout(() => finish(() => {
      audio.pause();
      reject(new ApiClientError("tts_preview_timeout", 408));
    }), timeoutMs);
    audio.addEventListener("ended", () => finish(resolve), {once: true});
    audio.addEventListener("error", () => finish(() => reject(new ApiClientError("audio_playback_failed", 0))), {once: true});
    void audio.play().catch((error) => finish(() => reject(error)));
  });
}
