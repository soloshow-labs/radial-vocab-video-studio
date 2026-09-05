import {describe, expect, it} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {MAX_PROJECT_DOCUMENT_BYTES, parseProjectDocument, serializeProject} from "../../src/domain/project-io";

describe("project import and export", () => {
  it("round trips the normalized project", () => {
    const source = createDefaultProject();
    const parsed = parseProjectDocument(serializeProject(source));

    expect(parsed).toEqual(source);
  });

  it("does not serialize credentials, tokens, or absolute paths", () => {
    const serialized = serializeProject(createDefaultProject());

    expect(serialized).not.toMatch(/AZURE_SPEECH_KEY|apiKey|secret|token|\/Users\/|[A-Z]:\\/i);
  });

  it("exports portable settings without machine-local media references", () => {
    const source = createDefaultProject();
    source.background.asset = {id: `asset_${"a".repeat(32)}`, name: "private.mp4", kind: "video"};
    source.music.asset = {id: `asset_${"b".repeat(32)}`, name: "private.mp3", kind: "audio"};
    const serialized = serializeProject(source);
    expect(serialized).not.toContain("private.mp4");
    expect(serialized).not.toContain(`asset_${"a".repeat(32)}`);
    expect(parseProjectDocument(serialized).background.asset).toBeNull();
    expect(parseProjectDocument(serialized).music.asset).toBeNull();
  });

  it("rejects invalid JSON and unsupported versions", () => {
    expect(() => parseProjectDocument("{broken")).toThrowError("project.invalid_json");
    expect(() => parseProjectDocument(JSON.stringify({...createDefaultProject(), version: 99}))).toThrowError(
      "project.unsupported_version",
    );
  });

  it("cannot replace an existing project after a failed import", () => {
    const current = createDefaultProject();
    const before = structuredClone(current);

    expect(() => parseProjectDocument("null")).toThrowError();
    expect(current).toEqual(before);
  });

  it("rejects project documents before parsing when they exceed the byte limit", () => {
    expect(() => parseProjectDocument(" ".repeat(MAX_PROJECT_DOCUMENT_BYTES + 1))).toThrowError(
      "project.document_too_large",
    );
  });
});
