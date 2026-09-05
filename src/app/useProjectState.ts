import {useEffect, useReducer, useRef, useState, type Dispatch} from "react";
import {
  applyCanvasPreset,
  createDefaultProject,
  type CanvasPreset,
  type ProjectConfig,
  type WordConfig,
} from "../domain/project";
import {loadInitialProject, saveStoredProject} from "./storage";
import {isAutomaticProjectName} from "../domain/project-name";

export type ProjectAction =
  | {type: "project.replace"; project: ProjectConfig}
  | {type: "project.reset"}
  | {type: "project.rename"; name: string}
  | {type: "canvas.preset"; preset: CanvasPreset}
  | {type: "background.update"; patch: Partial<ProjectConfig["background"]>}
  | {type: "music.update"; patch: Partial<ProjectConfig["music"]>}
  | {type: "title.update"; patch: Partial<ProjectConfig["title"]>}
  | {type: "root.update"; patch: Partial<ProjectConfig["root"]>; syncName?: boolean}
  | {type: "layout.update"; patch: Partial<ProjectConfig["layout"]>}
  | {type: "style.mask"; patch: Partial<ProjectConfig["style"]["mask"]>}
  | {type: "style.center"; patch: Partial<ProjectConfig["style"]["center"]>}
  | {type: "style.arrow"; patch: Partial<ProjectConfig["style"]["arrow"]>}
  | {type: "style.word"; patch: Partial<ProjectConfig["style"]["word"]>}
  | {type: "voice.update"; patch: Partial<ProjectConfig["voice"]>}
  | {type: "word.add"}
  | {type: "word.update"; index: number; patch: Partial<WordConfig>}
  | {type: "word.remove"; index: number};

export function projectReducer(project: ProjectConfig, action: ProjectAction): ProjectConfig {
  switch (action.type) {
    case "project.replace":
      return action.project;
    case "project.reset":
      return createDefaultProject();
    case "project.rename":
      return {...project, name: action.name};
    case "canvas.preset":
      return applyCanvasPreset(project, action.preset);
    case "background.update":
      return {...project, background: {...project.background, ...action.patch}};
    case "music.update":
      return {...project, music: {...project.music, ...action.patch}};
    case "title.update":
      return {...project, title: {...project.title, ...action.patch}};
    case "root.update":
      return {
        ...project,
        name: action.syncName && action.patch.text?.trim() ? action.patch.text.trim() : project.name,
        root: {...project.root, ...action.patch},
      };
    case "layout.update":
      return {...project, layout: {...project.layout, ...action.patch}};
    case "style.mask":
      return {...project, style: {...project.style, mask: {...project.style.mask, ...action.patch}}};
    case "style.center":
      return {...project, style: {...project.style, center: {...project.style.center, ...action.patch}}};
    case "style.arrow":
      return {...project, style: {...project.style, arrow: {...project.style.arrow, ...action.patch}}};
    case "style.word":
      return {...project, style: {...project.style, word: {...project.style.word, ...action.patch}}};
    case "voice.update":
      return {...project, voice: {...project.voice, ...action.patch}};
    case "word.add":
      return {...project, words: [...project.words, {text: "", meaningZh: ""}]};
    case "word.update":
      return {
        ...project,
        words: project.words.map((word, index) => (index === action.index ? {...word, ...action.patch} : word)),
      };
    case "word.remove":
      return {...project, words: project.words.filter((_, index) => index !== action.index)};
  }
}

export function useProjectState() {
  const [project, baseDispatch] = useReducer(projectReducer, undefined, loadInitialProject);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const firstRender = useRef(true);
  const automaticName = useRef<boolean | null>(null);
  automaticName.current ??= isAutomaticProjectName(project.name, project.root.text);
  const dispatch: Dispatch<ProjectAction> = (action) => {
    if (action.type === "project.rename") automaticName.current = false;
    if (action.type === "project.reset") automaticName.current = true;
    if (action.type === "project.replace") {
      automaticName.current = isAutomaticProjectName(action.project.name, action.project.root.text);
    }
    baseDispatch(action.type === "root.update"
      ? {...action, syncName: automaticName.current === true}
      : action);
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        saveStoredProject(project);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [project]);

  return {project, dispatch, saveState};
}
