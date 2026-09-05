import {useRef, type ChangeEvent} from "react";
import {useI18n} from "../i18n/I18nProvider";
import {Button} from "../ui/Button";
import {BrandMark, GitHubIcon} from "../ui/icons";

const GITHUB_REPOSITORY_URL = "https://github.com/soloshow-labs/radial-vocab-video-studio";

type HeaderBarProps = {
  projectName: string;
  onRename: (name: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  saveState: "saved" | "saving" | "error";
};

export function HeaderBar({projectName, onRename, onImport, onExport, saveState}: HeaderBarProps) {
  const {locale, setLocale, t} = useI18n();
  const importInput = useRef<HTMLInputElement>(null);
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onImport(file);
    event.currentTarget.value = "";
  };

  return (
    <header className="studio-header">
      <div className="studio-brand">
        <span className="studio-brand__mark"><BrandMark /></span>
        <h1>{t("app.name")}</h1>
      </div>
      <div className="studio-project">
        <label className="studio-project__field">
          <span className="studio-project__label">{t("app.project")}</span>
          <input
            id="project-name"
            className="studio-project__name"
            aria-label={t("app.projectName")}
            title={t("app.projectHint")}
            value={projectName}
            onChange={(event) => onRename(event.currentTarget.value)}
          />
        </label>
        <span className={`save-indicator save-indicator--${saveState}`} title={t("app.saveStatus")}>{t(`app.${saveState}`)}</span>
      </div>
      <div className="studio-actions">
        <a
          className="button button--ghost github-link"
          href={GITHUB_REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          title={t("app.githubHint")}
          aria-label={t("app.github")}
        >
          <span className="button__icon"><GitHubIcon /></span>
          <span>GitHub</span>
        </a>
        <div className="locale-switch" aria-label={t("app.language")}>
          <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>简体中文</button>
          <button type="button" aria-pressed={locale === "en-US"} onClick={() => setLocale("en-US")}>English</button>
        </div>
        <Button onClick={() => importInput.current?.click()}>{t("app.import")}</Button>
        <Button onClick={onExport}>{t("app.export")}</Button>
        <input ref={importInput} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
      </div>
    </header>
  );
}
