import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {loadStoredProject, PROJECT_STORAGE_KEY} from "../../src/app/storage";
import {projectReducer, useProjectState} from "../../src/app/useProjectState";

describe("project state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("updates typed project fields immutably", () => {
    const source = createDefaultProject();
    const next = projectReducer(source, {type: "root.update", patch: {text: "inter"}});

    expect(source.root.text).toBe("mate");
    expect(next.root.text).toBe("inter");
  });

  it("keeps an automatic project name in sync with the center content", () => {
    const source = createDefaultProject();

    expect(source.name).toBe("mate");
    const next = projectReducer(source, {type: "root.update", patch: {text: "man"}, syncName: true});

    expect(next.name).toBe("man");
  });

  it("does not overwrite a project name the user customized", () => {
    const source = {...createDefaultProject(), name: "我的单词视频"};

    const next = projectReducer(source, {type: "root.update", patch: {text: "man"}});

    expect(next.name).toBe("我的单词视频");
  });

  it("adds, updates, and removes words", () => {
    let project = createDefaultProject();
    project = projectReducer(project, {type: "word.add"});
    expect(project.words).toHaveLength(7);
    project = projectReducer(project, {type: "word.update", index: 6, patch: {text: "matey", meaningZh: "亲切的"}});
    expect(project.words[6].text).toBe("matey");
    project = projectReducer(project, {type: "word.remove", index: 6});
    expect(project.words).toHaveLength(6);
  });

  it("autosaves settings with reusable local asset references", () => {
    vi.useFakeTimers();
    const {result} = renderHook(() => useProjectState());
    const assetId = `asset_${"a".repeat(32)}`;

    act(() => {
      result.current.dispatch({type: "project.rename", name: "My project"});
      result.current.dispatch({
        type: "background.update",
        patch: {asset: {id: assetId, name: "background.mp4", kind: "video"}},
      });
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    expect(raw).toContain("My project");
    expect(raw).toContain(assetId);
    expect(loadStoredProject()?.background.asset?.id).toBe(assetId);
  });

  it("autosaves and restores an unfinished editable draft", () => {
    vi.useFakeTimers();
    const {result} = renderHook(() => useProjectState());

    act(() => {
      result.current.dispatch({type: "word.add"});
      result.current.dispatch({type: "root.update", patch: {text: ""}});
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const stored = loadStoredProject();
    expect(stored?.root.text).toBe("");
    expect(stored?.words.at(-1)).toMatchObject({text: "", meaningZh: ""});
  });

  it("normalizes the rest of an unfinished draft before restoring it", () => {
    const project = createDefaultProject();
    project.root.text = "";
    project.root.x = 5;
    project.background.audioVolume = -2;
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const stored = loadStoredProject();

    expect(stored?.root.text).toBe("");
    expect(stored?.root.x).toBe(1);
    expect(stored?.background.audioVolume).toBe(0);
  });

  it("updates the saved bundled mate example to the revised word positions", () => {
    const project = createDefaultProject();
    const classmate = project.words.find((word) => word.text === "classmate")!;
    const schoolmate = project.words.find((word) => word.text === "schoolmate")!;
    classmate.direction = "s";
    schoolmate.direction = "se";
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    const stored = loadStoredProject();

    expect(stored?.words.find((word) => word.text === "schoolmate")?.direction).toBe("s");
    expect(stored?.words.find((word) => word.text === "classmate")?.direction).toBe("se");
  });

  it("replaces a legacy automatic project name with the current center content", () => {
    const project = createDefaultProject();
    project.name = "词根 mate";
    project.root.text = "man";
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));

    expect(loadStoredProject()?.name).toBe("man");
  });

  it("replaces the project atomically only after successful parsing", () => {
    const source = createDefaultProject();
    const replacement = {...source, name: "Imported"};
    const next = projectReducer(source, {type: "project.replace", project: replacement});

    expect(next.name).toBe("Imported");
    expect(source.name).not.toBe("Imported");
  });
});
