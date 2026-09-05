import type {ProjectIssue} from "../domain/project";
import type {ModuleId} from "./modules";

export type IssueDestination = {
  module: ModuleId;
  elementId?: string;
};

export function issueDestination(issue: ProjectIssue): IssueDestination {
  const path = issue.path ?? "";
  const word = path.match(/^words\.(\d+)\.(text|meaningZh|direction|x|y)/);
  if (word) {
    const [, index, field] = word;
    if (field === "text" || field === "meaningZh") {
      return {module: "content", elementId: `word-${index}-${field === "text" ? "text" : "meaning"}`};
    }
    return {module: "layout", elementId: `word-${index}-${field}`};
  }
  if (path === "words") return {module: "content"};
  if (path === "root.text") return {module: "content", elementId: "root-text"};
  if (path === "root.meaningZh") return {module: "content", elementId: "root-meaning"};
  if (path.startsWith("root.")) return {module: "layout", elementId: path.endsWith(".x") ? "center-x" : "center-y"};
  if (path.startsWith("canvas.")) return {module: "background", elementId: "canvas-preset"};
  if (path.startsWith("background.")) return {module: "background", elementId: path.endsWith("startSec") ? "background-start" : undefined};
  if (path.startsWith("music.")) return {module: "audio", elementId: path.endsWith("volume") ? "music-volume" : undefined};
  if (path.startsWith("voice.")) {
    if (path.endsWith("chineseVoice")) return {module: "audio", elementId: "chinese-voice"};
    if (path.endsWith("rate")) return {module: "audio", elementId: "voice-rate"};
    if (path.endsWith("breakMs")) return {module: "audio", elementId: "voice-break"};
    return {module: "audio", elementId: "voice-name"};
  }
  if (path.startsWith("layout.")) return {module: "layout"};
  if (path.startsWith("title.") || path.startsWith("style.")) return {module: "style"};
  if (path === "name") return {module: "content", elementId: "project-name"};
  return {module: "content"};
}
