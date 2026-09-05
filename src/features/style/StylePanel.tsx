import type {Dispatch, ReactNode} from "react";
import type {ProjectConfig} from "../../domain/project";
import {useI18n} from "../../i18n/I18nProvider";
import {ColorField, Field, NumberField} from "../../ui/Field";
import type {ProjectAction} from "../../app/useProjectState";

type StylePanelProps = {project: ProjectConfig; dispatch: Dispatch<ProjectAction>};

export function StylePanel({project, dispatch}: StylePanelProps) {
  const {t} = useI18n();
  return (
    <>
      <StyleSection title={t("style.mask")}>
        <ColorControl id="mask-color" label={t("style.maskColor")} value={project.style.mask.color} onChange={(color) => dispatch({type: "style.mask", patch: {color}})} />
        <NumberControl id="mask-opacity" label={t("style.maskOpacity")} min={0} max={1} step={0.05} scale={100} unit="%" value={project.style.mask.opacity} onChange={(opacity) => dispatch({type: "style.mask", patch: {opacity}})} />
      </StyleSection>
      <StyleSection title={t("style.heading")}>
        <ColorControl id="title-fill" label={t("style.fill")} value={project.title.fill} onChange={(fill) => dispatch({type: "title.update", patch: {fill}})} />
        <ColorControl id="title-stroke" label={t("style.stroke")} value={project.title.stroke} onChange={(stroke) => dispatch({type: "title.update", patch: {stroke}})} />
        <NumberControl id="title-stroke-width" label={t("style.strokeWidth")} min={0} step={1} unit="px" value={project.title.strokeWidth} onChange={(strokeWidth) => dispatch({type: "title.update", patch: {strokeWidth}})} />
        <ColorControl id="title-shadow" label={t("style.shadow")} value={project.title.shadowColor} onChange={(shadowColor) => dispatch({type: "title.update", patch: {shadowColor}})} />
        <NumberControl id="title-shadow-x" label={t("style.shadowX")} step={1} unit="px" value={project.title.shadowOffsetX} onChange={(shadowOffsetX) => dispatch({type: "title.update", patch: {shadowOffsetX}})} />
        <NumberControl id="title-shadow-y" label={t("style.shadowY")} step={1} unit="px" value={project.title.shadowOffsetY} onChange={(shadowOffsetY) => dispatch({type: "title.update", patch: {shadowOffsetY}})} />
      </StyleSection>
      <StyleSection title={t("style.center")}>
        <NumberControl id="center-size" label={t("style.centerSize")} min={0.14} max={0.34} step={0.01} scale={100} unit="%" value={project.style.center.sizeRatio} onChange={(sizeRatio) => dispatch({type: "style.center", patch: {sizeRatio}})} />
        <ColorControl id="center-border" label={t("style.borderColor")} value={project.style.center.borderColor} onChange={(borderColor) => dispatch({type: "style.center", patch: {borderColor}})} />
        <NumberControl id="center-border-width" label={t("style.borderWidth")} min={0} step={1} unit="px" value={project.style.center.borderWidth} onChange={(borderWidth) => dispatch({type: "style.center", patch: {borderWidth}})} />
        <ColorControl id="center-fill" label={t("style.fill")} value={project.style.center.fillColor} onChange={(fillColor) => dispatch({type: "style.center", patch: {fillColor}})} />
        <NumberControl id="center-fill-opacity" label={t("style.fillOpacity")} min={0} max={1} step={0.05} scale={100} unit="%" value={project.style.center.fillOpacity} onChange={(fillOpacity) => dispatch({type: "style.center", patch: {fillOpacity}})} />
        <ColorControl id="center-english" label={t("style.englishColor")} value={project.style.center.englishColor} onChange={(englishColor) => dispatch({type: "style.center", patch: {englishColor}})} />
        <ColorControl id="center-chinese" label={t("style.chineseColor")} value={project.style.center.chineseColor} onChange={(chineseColor) => dispatch({type: "style.center", patch: {chineseColor}})} />
      </StyleSection>
      <StyleSection title={t("style.arrow")}>
        <ColorControl id="arrow-color" label={t("style.arrowColor")} value={project.style.arrow.color} onChange={(color) => dispatch({type: "style.arrow", patch: {color}})} />
        <NumberControl id="arrow-width" label={t("style.arrowWidth")} min={1} step={1} unit="px" value={project.style.arrow.width} onChange={(width) => dispatch({type: "style.arrow", patch: {width}})} />
        <NumberControl id="arrow-head" label={t("style.arrowHead")} min={1} step={1} unit="px" value={project.style.arrow.headSize} onChange={(headSize) => dispatch({type: "style.arrow", patch: {headSize}})} />
      </StyleSection>
      <StyleSection title={t("style.words")}>
        <ColorControl id="word-english" label={t("style.englishColor")} value={project.style.word.englishColor} onChange={(englishColor) => dispatch({type: "style.word", patch: {englishColor}})} />
        <ColorControl id="word-chinese" label={t("style.chineseColor")} value={project.style.word.chineseColor} onChange={(chineseColor) => dispatch({type: "style.word", patch: {chineseColor}})} />
        <ColorControl id="word-highlight" label={t("style.highlight")} value={project.style.word.highlightColor} onChange={(highlightColor) => dispatch({type: "style.word", patch: {highlightColor}})} />
        <NumberControl id="word-english-size" label={t("style.englishSize")} min={1} step={1} unit="px" value={project.style.word.englishFontSize} onChange={(englishFontSize) => dispatch({type: "style.word", patch: {englishFontSize}})} />
        <NumberControl id="word-chinese-size" label={t("style.chineseSize")} min={1} step={1} unit="px" value={project.style.word.chineseFontSize} onChange={(chineseFontSize) => dispatch({type: "style.word", patch: {chineseFontSize}})} />
        <Field className="field--wide" label={t("style.fontFamily")} help={t("help.fontFamily")} helpLabel={t("help.more")} htmlFor="word-font"><input id="word-font" value={project.style.word.fontFamily} onChange={(event) => dispatch({type: "style.word", patch: {fontFamily: event.currentTarget.value}})} /></Field>
      </StyleSection>
    </>
  );
}

function StyleSection({title, children}: {title: string; children: ReactNode}) {
  return <><div className="section-divider"><h3>{title}</h3></div><div className="inspector-grid">{children}</div></>;
}

function ColorControl({id, label, value, onChange}: {id: string; label: string; value: string; onChange: (value: string) => void}) {
  return <ColorField id={id} label={label} value={value} onChange={onChange} />;
}

function NumberControl({id, label, value, min, max, step, scale, unit, onChange}: {id: string; label: string; value: number; min?: number; max?: number; step?: number; scale?: number; unit?: string; onChange: (value: number) => void}) {
  return <NumberField id={id} label={label} value={value} min={min} max={max} step={step} scale={scale} unit={unit} onChange={onChange} />;
}
