import {useState, type Dispatch} from "react";
import type {ProjectConfig} from "../../domain/project";
import {parseWordPairs} from "../../domain/import-words";
import {useI18n} from "../../i18n/I18nProvider";
import {Field} from "../../ui/Field";
import {AudioIcon, PlusIcon, TrashIcon} from "../../ui/icons";
import {HelpTip} from "../../ui/HelpTip";
import type {ProjectAction} from "../../app/useProjectState";
import {syncAutomaticProjectName} from "../../domain/project-name";

type ContentPanelProps = {
  project: ProjectConfig;
  dispatch: Dispatch<ProjectAction>;
  onPreviewSpeech: (text: string, meaningZh?: string) => void;
  previewingSpeech: boolean;
  speechDisabled?: boolean;
};

export function ContentPanel({project, dispatch, onPreviewSpeech, previewingSpeech, speechDisabled = false}: ContentPanelProps) {
  const {t} = useI18n();
  const [bulkText, setBulkText] = useState("");
  const [firstAsRoot, setFirstAsRoot] = useState(false);
  const parsedPairs = parseWordPairs(bulkText);

  const fillFromBulk = () => {
    const pairs = parseWordPairs(bulkText);
    if (pairs.length === 0) return;
    const [first, ...rest] = pairs;
    dispatch({
      type: "project.replace",
      project: {
        ...project,
        name: firstAsRoot ? syncAutomaticProjectName(project.name, project.root.text, first.text) : project.name,
        root: firstAsRoot ? {...project.root, text: first.text, meaningZh: first.meaningZh} : project.root,
        words: firstAsRoot ? rest : pairs,
      },
    });
  };

  return (
    <>
      <div className="inspector-grid">
        <Field label={t("content.root")} htmlFor="root-text">
          <input id="root-text" value={project.root.text} onChange={(event) => dispatch({type: "root.update", patch: {text: event.currentTarget.value}})} />
        </Field>
        <Field label={t("content.rootMeaning")} htmlFor="root-meaning">
          <input id="root-meaning" value={project.root.meaningZh} onChange={(event) => dispatch({type: "root.update", patch: {meaningZh: event.currentTarget.value}})} />
        </Field>
        <Field className="field--wide" label={t("content.videoTitle")} hint={t("field.optional")} htmlFor="video-title">
          <input id="video-title" value={project.title.text} onChange={(event) => dispatch({type: "title.update", patch: {text: event.currentTarget.value}})} />
        </Field>
        <Field className="field--wide" label={t("content.bulk")} hint={t("content.bulkHint")} htmlFor="bulk-words">
          <textarea
            id="bulk-words"
            value={bulkText}
            placeholder={"teammate    队友\nworkmate    同事"}
            onChange={(event) => setBulkText(event.currentTarget.value)}
          />
        </Field>
      </div>
      <div className="inline-action-row">
        <span className="check-with-help">
          <label className="check-field">
            <input type="checkbox" checked={firstAsRoot} onChange={(event) => setFirstAsRoot(event.currentTarget.checked)} />
            <span>{t("content.firstAsRoot")}</span>
          </label>
          <HelpTip text={t("help.firstAsRoot")} label={t("help.more")} />
        </span>
        <button className="text-action text-action--outlined" type="button" disabled={parsedPairs.length === 0} title={parsedPairs.length === 0 ? t("content.recognizeEmpty") : undefined} onClick={fillFromBulk}>
          {t("content.recognize")}
        </button>
      </div>
      {parsedPairs.length === 0 ? <p className="control-note">{t("content.recognizeEmpty")}</p> : null}
      <div className="inline-action-row content-preview-row">
        <span>{t("content.rootPreviewHint")}</span>
        <button className="text-action" type="button" disabled={speechDisabled || previewingSpeech || !project.root.text.trim()} title={speechDisabled ? t("demo.previewDisabled") : undefined} onClick={() => onPreviewSpeech(project.root.text, project.root.meaningZh)}>
          <AudioIcon /> {t("content.rootPreview")}
        </button>
      </div>
      <div className="section-divider">
        <h3>{t("words.count", {count: project.words.length})}</h3>
        <button className="text-action text-action--outlined" type="button" onClick={() => dispatch({type: "word.add"})}>
          <PlusIcon aria-hidden="true" /> {t("words.add")}
        </button>
      </div>
      <div className="word-list">
        {project.words.map((word, index) => (
          <div className="word-item" key={index}>
            <span className="word-item__index">{String(index + 1).padStart(2, "0")}</span>
            <input
              id={`word-${index}-text`}
              aria-label={`${t("words.english")} ${index + 1}`}
              value={word.text}
              onChange={(event) => dispatch({type: "word.update", index, patch: {text: event.currentTarget.value}})}
            />
            <input
              id={`word-${index}-meaning`}
              aria-label={`${t("words.chinese")} ${index + 1}`}
              value={word.meaningZh}
              onChange={(event) => dispatch({type: "word.update", index, patch: {meaningZh: event.currentTarget.value}})}
            />
            <button className="icon-button" type="button" disabled={speechDisabled || previewingSpeech || !word.text.trim()} title={speechDisabled ? t("demo.previewDisabled") : undefined} aria-label={`${t("words.preview")} ${index + 1}`} onClick={() => onPreviewSpeech(word.text, word.meaningZh)}>
              <AudioIcon />
            </button>
            <button className="icon-button icon-button--danger" type="button" aria-label={`${t("words.remove")} ${index + 1}`} onClick={() => dispatch({type: "word.remove", index})}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
