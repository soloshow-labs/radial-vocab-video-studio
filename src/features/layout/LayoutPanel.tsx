import type {Dispatch} from "react";
import {resolveWordDirections} from "../../domain/layout";
import {DIRECTIONS, type Direction, type ProjectConfig, type SlotOrderMode} from "../../domain/project";
import {useI18n} from "../../i18n/I18nProvider";
import {Field, NumberField} from "../../ui/Field";
import type {ProjectAction} from "../../app/useProjectState";

type LayoutPanelProps = {
  project: ProjectConfig;
  dispatch: Dispatch<ProjectAction>;
};

const SLOT_OPTIONS: Array<{value: SlotOrderMode; zh: string; en: string}> = [
  {value: "manual", zh: "手动顺序", en: "Manual"},
  {value: "ne-counterclockwise", zh: "右上起逆时针", en: "NE, counter-clockwise"},
  {value: "ne-clockwise", zh: "右上起顺时针", en: "NE, clockwise"},
  {value: "nw-clockwise", zh: "左上起顺时针", en: "NW, clockwise"},
  {value: "nw-counterclockwise", zh: "左上起逆时针", en: "NW, counter-clockwise"},
];

const DIRECTION_LABELS: Record<Direction, {zh: string; en: string}> = {
  n: {zh: "上", en: "North"},
  ne: {zh: "右上", en: "North-east"},
  e: {zh: "右", en: "East"},
  se: {zh: "右下", en: "South-east"},
  s: {zh: "下", en: "South"},
  sw: {zh: "左下", en: "South-west"},
  w: {zh: "左", en: "West"},
  nw: {zh: "左上", en: "North-west"},
};

export function LayoutPanel({project, dispatch}: LayoutPanelProps) {
  const {locale, t} = useI18n();
  const language = locale === "zh-CN" ? "zh" : "en";
  const resolvedDirections = resolveWordDirections(project.words, project.layout.slotOrder);
  const updateArrowLength = (group: keyof ProjectConfig["layout"]["arrowLengths"], value: number) => {
    dispatch({type: "layout.update", patch: {arrowLengths: {...project.layout.arrowLengths, [group]: value}}});
  };

  return (
    <>
      <div className="inspector-grid">
        <NumberField id="center-x" label={t("layout.centerX")} help={t("help.layoutCenter")} helpLabel={t("help.more")} min={0} max={1} step={0.01} scale={100} unit="%" value={project.root.x} onChange={(x) => dispatch({type: "root.update", patch: {x}})} />
        <NumberField id="center-y" label={t("layout.centerY")} help={t("help.layoutCenter")} helpLabel={t("help.more")} min={0} max={1} step={0.01} scale={100} unit="%" value={project.root.y} onChange={(y) => dispatch({type: "root.update", patch: {y}})} />
        <Field className="field--wide" label={t("layout.slotOrder")} help={t("help.slotOrder")} helpLabel={t("help.more")} htmlFor="slot-order">
          <select id="slot-order" value={project.layout.slotOrder} onChange={(event) => dispatch({type: "layout.update", patch: {slotOrder: event.currentTarget.value as SlotOrderMode}})}>
            {SLOT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option[language]}</option>)}
          </select>
        </Field>
      </div>
      <div className="section-divider"><h3>{locale === "zh-CN" ? "箭头长度" : "Arrow lengths"}</h3></div>
      <div className="inspector-grid">
        <NumberField id="arrow-vertical" label={t("layout.vertical")} min={0.45} max={0.9} step={0.01} scale={100} unit="%" value={project.layout.arrowLengths.vertical ?? project.layout.arrowLength} onChange={(value) => updateArrowLength("vertical", value)} />
        <NumberField id="arrow-horizontal" label={t("layout.horizontal")} min={0.45} max={0.9} step={0.01} scale={100} unit="%" value={project.layout.arrowLengths.horizontal ?? project.layout.arrowLength} onChange={(value) => updateArrowLength("horizontal", value)} />
        <NumberField id="arrow-nwse" label={t("layout.nwSe")} min={0.45} max={0.9} step={0.01} scale={100} unit="%" value={project.layout.arrowLengths.nwSe ?? project.layout.arrowLength} onChange={(value) => updateArrowLength("nwSe", value)} />
        <NumberField id="arrow-nesw" label={t("layout.neSw")} min={0.45} max={0.9} step={0.01} scale={100} unit="%" value={project.layout.arrowLengths.neSw ?? project.layout.arrowLength} onChange={(value) => updateArrowLength("neSw", value)} />
      </div>
      <div className="section-divider"><h3>{t("words.direction")}</h3></div>
      <div className="word-layout-header" aria-hidden="true">
        <span>{t("words.english")}</span>
        <span>{t("words.direction")}</span>
        <span>X %</span>
        <span>Y %</span>
      </div>
      <div className="word-layout-list">
        {project.words.map((word, index) => (
          <div className="word-layout-item" key={index}>
            <span className="word-layout-item__name">{word.text || `${index + 1}`}</span>
            <select id={`word-${index}-direction`} aria-label={`${t("words.direction")} ${index + 1}`} value={resolvedDirections[index]} onChange={(event) => dispatch({type: "word.update", index, patch: {direction: event.currentTarget.value as Direction}})}>
              {DIRECTIONS.map((direction) => <option value={direction} key={direction}>{DIRECTION_LABELS[direction][language]}</option>)}
            </select>
            <input id={`word-${index}-x`} aria-label={`${t("words.positionX")} ${index + 1}`} type="number" min="0" max="100" step="1" placeholder={t("words.auto")} value={displayPercentage(word.x)} onChange={(event) => dispatch({type: "word.update", index, patch: {x: readOptionalPercentage(event.currentTarget.value)}})} />
            <input id={`word-${index}-y`} aria-label={`${t("words.positionY")} ${index + 1}`} type="number" min="0" max="100" step="1" placeholder={t("words.auto")} value={displayPercentage(word.y)} onChange={(event) => dispatch({type: "word.update", index, patch: {y: readOptionalPercentage(event.currentTarget.value)}})} />
          </div>
        ))}
      </div>
    </>
  );
}

function readOptionalPercentage(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed / 100 : undefined;
}

function displayPercentage(value: number | undefined): number | "" {
  return value === undefined ? "" : Number((value * 100).toFixed(2));
}
