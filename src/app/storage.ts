import {createDefaultProject, normalizeDraftProject, type ProjectConfig} from "../domain/project";
import {normalizeLegacyAutomaticProjectName} from "../domain/project-name";

export const PROJECT_STORAGE_KEY = "radial-vocab.project.v1";

export function saveStoredProject(project: ProjectConfig): void {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
}

export function loadStoredProject(): ProjectConfig | null {
  const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    const project = updateBundledMateLayout(normalizeDraftProject(parsed));
    return {...project, name: normalizeLegacyAutomaticProjectName(project.name, project.root.text)};
  } catch {
    return null;
  }
}

export function loadInitialProject(): ProjectConfig {
  return loadStoredProject() ?? createDefaultProject();
}

function updateBundledMateLayout(project: ProjectConfig): ProjectConfig {
  const bundledWords = ["teammate", "workmate", "soulmate", "playmate", "classmate", "schoolmate"];
  if (
    project.root.text !== "mate"
    || project.words.length !== bundledWords.length
    || !project.words.every((word, index) => word.text === bundledWords[index])
    || project.words[4]?.direction !== "s"
    || project.words[5]?.direction !== "se"
  ) return project;

  return {
    ...project,
    words: project.words.map((word, index) => (
      index === 4 ? {...word, direction: "se"}
        : index === 5 ? {...word, direction: "s"}
          : word
    )),
  };
}
