import {normalizeProject, ProjectValidationError, type ProjectConfig} from "./project";

const FORBIDDEN_KEY = /^(?:apiKey|secret|token|path|absolutePath)$/i;
export const MAX_PROJECT_DOCUMENT_BYTES = 256 * 1024;

export function serializeProject(project: ProjectConfig): string {
  const normalized = normalizeProject(project);
  const portable: ProjectConfig = {
    ...normalized,
    background: {...normalized.background, asset: null},
    music: {...normalized.music, asset: null},
  };
  assertNoForbiddenKeys(portable);
  return `${JSON.stringify(portable, null, 2)}\n`;
}

export function parseProjectDocument(text: string): ProjectConfig {
  if (text.length > MAX_PROJECT_DOCUMENT_BYTES || new TextEncoder().encode(text).byteLength > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new ProjectValidationError([{code: "project.document_too_large"}]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProjectValidationError([{code: "project.invalid_json"}]);
  }
  return normalizeProject(parsed);
}

function assertNoForbiddenKeys(value: unknown, trail: string[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, [...trail, String(index)]));
    return;
  }
  if (typeof value !== "object" || value === null) return;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      throw new ProjectValidationError([{code: "project.forbidden_field", path: [...trail, key].join(".")}]);
    }
    assertNoForbiddenKeys(child, [...trail, key]);
  }
}
