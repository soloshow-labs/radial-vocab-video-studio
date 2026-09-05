import {useId, type ChangeEvent, type Dispatch} from "react";
import {CANVAS_PRESETS, type ProjectConfig} from "../../domain/project";
import {useI18n} from "../../i18n/I18nProvider";
import {Field, NumberField} from "../../ui/Field";
import type {ProjectAction} from "../../app/useProjectState";

type BackgroundPanelProps = {
  project: ProjectConfig;
  dispatch: Dispatch<ProjectAction>;
  onFile: (file: File | null) => void;
  uploading: boolean;
};

export function BackgroundPanel({project, dispatch, onFile, uploading}: BackgroundPanelProps) {
  const {t} = useI18n();
  const uploadId = useId();
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => onFile(event.currentTarget.files?.[0] ?? null);

  return (
    <>
      <div className="file-drop">
        <input id={uploadId} type="file" accept="video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={handleFile} />
        <label htmlFor={uploadId}>
          <span className={project.background.asset ? "file-name" : undefined}>
            {uploading ? t("common.uploading") : project.background.asset?.name ?? t("background.upload")}
          </span>
        </label>
      </div>
      <div className="inspector-grid">
        <Field label={t("background.ratio")} htmlFor="canvas-preset">
          <select id="canvas-preset" value={project.canvas.preset} onChange={(event) => dispatch({type: "canvas.preset", preset: event.currentTarget.value as keyof typeof CANVAS_PRESETS})}>
            {Object.keys(CANVAS_PRESETS).map((preset) => <option value={preset} key={preset}>{preset}</option>)}
          </select>
        </Field>
        <NumberField id="background-start" label={t("background.start")} help={t("help.backgroundStart")} helpLabel={t("help.more")} min={0} step={0.1} unit="s" value={project.background.startSec} onChange={(startSec) => dispatch({type: "background.update", patch: {startSec}})} />
      </div>
      <div className="option-stack">
        <label className="check-field"><input type="checkbox" checked={project.background.loop} onChange={(event) => dispatch({type: "background.update", patch: {loop: event.currentTarget.checked}})} /><span>{t("background.loop")}</span></label>
        <label className="check-field"><input type="checkbox" checked={project.background.audioEnabled} onChange={(event) => dispatch({type: "background.update", patch: {audioEnabled: event.currentTarget.checked}})} /><span>{t("background.originalAudio")}</span></label>
      </div>
      <Field label={t("background.originalVolume")} hint={`${Math.round(project.background.audioVolume * 100)}%`} htmlFor="background-volume">
        <input id="background-volume" type="range" min="0" max="1" step="0.01" disabled={!project.background.audioEnabled} value={project.background.audioVolume} onChange={(event) => dispatch({type: "background.update", patch: {audioVolume: numberOr(event.currentTarget.value, 0)}})} />
      </Field>
    </>
  );
}

function numberOr(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
