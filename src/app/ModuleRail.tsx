import {useI18n} from "../i18n/I18nProvider";
import {AudioIcon, ContentIcon, LayoutIcon, OutputIcon, StyleIcon, VideoIcon} from "../ui/icons";
import type {ModuleId} from "./modules";

type ModuleRailProps = {
  active: ModuleId;
  onSelect: (module: ModuleId) => void;
};

const MODULES = [
  {id: "content", group: "content", label: "nav.content", Icon: ContentIcon},
  {id: "background", group: "content", label: "nav.background", Icon: VideoIcon},
  {id: "layout", group: "appearance", label: "nav.layout", Icon: LayoutIcon},
  {id: "style", group: "appearance", label: "nav.style", Icon: StyleIcon},
  {id: "audio", group: "output", label: "nav.audio", Icon: AudioIcon},
  {id: "output", group: "output", label: "nav.output", Icon: OutputIcon},
] as const;

export function ModuleRail({active, onSelect}: ModuleRailProps) {
  const {t} = useI18n();
  const groups = ["content", "appearance", "output"] as const;
  return (
    <nav className="module-rail" aria-label={t("nav.aria")}>
      <h2 className="module-rail__title">{t("nav.heading")}</h2>
      {groups.map((group) => (
        <div key={group}>
          <div className="module-rail__group">{t(`nav.group.${group}`)}</div>
          {MODULES.filter((module) => module.group === group).map(({id, label, Icon}) => (
            <button
              className="module-button"
              type="button"
              key={id}
              aria-current={active === id ? "page" : undefined}
              aria-label={t(label)}
              onClick={() => onSelect(id)}
            >
              <span className="module-button__icon"><Icon /></span>
              <span className="module-button__label">{t(label)}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
