import {useCallback, useEffect, useMemo, useState} from "react";
import type {ProjectConfig} from "../domain/project";
import {createPreviewTimeline} from "../domain/timeline";
import {computeLayout} from "../domain/layout";
import {useI18n} from "../i18n/I18nProvider";
import {PauseIcon, PlayIcon} from "../ui/icons";
import {RadialComposition} from "./RadialComposition";
import {usePreviewClock} from "./usePreviewClock";
import type {RenderJobResponse} from "../shared/api";

export function PreviewPanel({project, backgroundUrl, musicUrl, renderJob = null, onOpenLayout}: {project: ProjectConfig; backgroundUrl?: string; musicUrl?: string; renderJob?: RenderJobResponse | null; onOpenLayout?: () => void}) {
  const {t} = useI18n();
  const timeline = useMemo(() => createPreviewTimeline(project), [project]);
  const layout = useMemo(() => computeLayout(project), [project]);
  const labelsOverlap = layout.warnings.includes("layout.overlapping_labels");
  const [currentTime, setCurrentTime] = useState(timeline.totalSec);
  const [playing, setPlaying] = useState(false);
  const [safeArea, setSafeArea] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [view, setView] = useState<"live" | "result">("live");
  const onTime = useCallback((time: number) => setCurrentTime(time), []);

  useEffect(() => {
    if (!playing) setCurrentTime(timeline.totalSec);
  }, [playing, timeline.totalSec]);

  useEffect(() => {
    if (renderJob?.status === "succeeded") setView("result");
  }, [renderJob?.status]);

  usePreviewClock({playing, duration: timeline.totalSec, currentTime, onTime});

  return (
    <section className="preview-panel" aria-label={t("preview.aria")}>
      <div className="preview-toolbar">
        <div className="preview-toolbar__tabs">
          <button className={`preview-tab ${view === "live" ? "preview-tab--active" : ""}`} type="button" onClick={() => setView("live")}>{t("preview.title")}</button>
          {renderJob?.result ? <button className={`preview-tab ${view === "result" ? "preview-tab--active" : ""}`} type="button" onClick={() => setView("result")}>{t("preview.result")}</button> : null}
          {view === "live" ? <button className="preview-tab" type="button" aria-pressed={showLayers} onClick={() => setShowLayers((value) => !value)}>{t("preview.layers")}</button> : null}
          {view === "live" ? <button className="preview-tab" type="button" aria-pressed={safeArea} onClick={() => setSafeArea((value) => !value)}>{t("preview.safeArea")}</button> : null}
        </div>
        <span>{project.canvas.preset} · {project.canvas.width} × {project.canvas.height} · {project.canvas.fps} FPS</span>
      </div>
      <div className="preview-stage">
        {view === "result" && renderJob?.result ? (
          <div className="generated-video-frame" data-preset={project.canvas.preset}>
            <video controls src={renderJob.result.videoUrl} poster={renderJob.result.posterUrl} />
          </div>
        ) : <RadialComposition project={project} timeline={timeline} currentTime={currentTime} backgroundUrl={backgroundUrl} musicUrl={musicUrl} playing={playing} showSafeArea={safeArea} />}
        {view === "live" && showLayers ? (
          <div className="layer-popover">
            <strong>{t("preview.layers")}</strong>
            <span>{t("content.videoTitle")}</span>
            <span>{t("content.root")}</span>
            <span>{t("words.count", {count: project.words.length})}</span>
          </div>
        ) : null}
        {renderJob && (renderJob.status === "queued" || renderJob.status === "running") ? (
          <div className="render-overlay" role="status">
            <strong>{t("preview.rendering")}</strong>
            <div className="render-progress"><span style={{width: `${Math.round(renderJob.progress * 100)}%`}} /></div>
            <span>{Math.round(renderJob.progress * 100)}%</span>
          </div>
        ) : null}
        {view === "live" && labelsOverlap ? (
          <div className="preview-warning" role="status">
            <span>{t("preview.layoutOverlap")}</span>
            {onOpenLayout ? <button type="button" onClick={onOpenLayout}>{t("preview.fixLayout")}</button> : null}
          </div>
        ) : null}
      </div>
      {view === "live" ? <div className="preview-footer">
        <button className="preview-play" type="button" aria-label={playing ? t("preview.pause") : t("preview.play")} onClick={() => { if (currentTime >= timeline.totalSec) setCurrentTime(0); setPlaying((value) => !value); }}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <input className="preview-seek" type="range" min="0" max={timeline.totalSec} step="0.01" value={Math.min(currentTime, timeline.totalSec)} aria-label={t("output.previewTime")} onChange={(event) => { setPlaying(false); setCurrentTime(Number(event.currentTarget.value)); }} />
        <span>{formatTime(currentTime)} / {formatTime(timeline.totalSec)}</span>
        <span className="preview-zoom">{t("preview.fit")}</span>
      </div> : (
        <div className="preview-footer preview-footer--result">
          <span>{t("preview.resultReady")}</span>
          <a className="button button--primary" href={renderJob?.result?.videoUrl} download>{t("output.download")}</a>
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
