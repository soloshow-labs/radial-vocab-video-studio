import {describe, expect, it} from "vitest";
import {
  CANVAS_PRESETS,
  DEFAULT_CHINESE_VOICE,
  MAX_PROJECT_NARRATION_CHARACTERS,
  MAX_PROJECT_WORDS,
  createDefaultProject,
  normalizeProject,
  validateProject,
} from "../../src/domain/project";

describe("project model", () => {
  it("creates a complete safe default project", () => {
    const project = createDefaultProject();

    expect(project.version).toBe(1);
    expect(project.canvas).toEqual({preset: "9:16", ...CANVAS_PRESETS["9:16"]});
    expect(project.root).toMatchObject({text: "mate", meaningZh: "伙伴"});
    expect(project.words).toHaveLength(6);
    expect(project.background.asset).toBeNull();
    expect(project.music.asset).toBeNull();
    expect(project.voice.provider).toBe("azure-speech");
    expect(JSON.stringify(project)).not.toMatch(/apiKey|secret|AZURE_SPEECH_KEY|\/Users\//i);
  });

  it("normalizes bounded values and canonical canvas dimensions", () => {
    const input = createDefaultProject();
    input.canvas = {preset: "16:9", width: 1, height: 1, fps: 1};
    input.root.x = 2;
    input.root.y = -1;
    input.background.audioVolume = 5;
    input.music.volume = -4;
    input.words[0] = {...input.words[0], x: 1.4, y: -0.2};

    const normalized = normalizeProject(input);

    expect(normalized.canvas).toEqual({preset: "16:9", ...CANVAS_PRESETS["16:9"]});
    expect(normalized.root).toMatchObject({x: 1, y: 0});
    expect(normalized.background.audioVolume).toBe(1);
    expect(normalized.music.volume).toBe(0);
    expect(normalized.words[0]).toMatchObject({x: 1, y: 0});
  });

  it("adds the default Chinese voice to projects saved before separate voices existed", () => {
    const input = createDefaultProject();
    delete input.voice.chineseVoice;

    expect(normalizeProject(input).voice.chineseVoice).toBe(DEFAULT_CHINESE_VOICE);
  });

  it("rejects machine paths and unsupported providers", () => {
    const input = createDefaultProject() as unknown as Record<string, unknown>;
    input.background = {
      ...(input.background as Record<string, unknown>),
      asset: {id: "/Users/example/video.mp4", name: "video.mp4", kind: "video"},
    };
    input.voice = {...(input.voice as Record<string, unknown>), provider: "elevenlabs"};

    const result = validateProject(input);

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["asset.invalid_id", "voice.unsupported_provider"]),
    );
  });

  it("warns when the word list exceeds the reliable layout range", () => {
    const input = createDefaultProject();
    input.words = Array.from({length: 9}, (_, index) => ({
      text: `word${index}`,
      meaningZh: `释义${index}`,
    }));

    const result = validateProject(input);

    expect(result.ok).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain("words.dense_layout");
  });

  it("rejects projects that exceed the render and narration work budget", () => {
    const tooManyWords = createDefaultProject();
    tooManyWords.words = Array.from({length: MAX_PROJECT_WORDS + 1}, (_, index) => ({
      text: `word${index}`,
      meaningZh: `释义${index}`,
    }));
    expect(validateProject(tooManyWords).errors.map((error) => error.code)).toContain("words.too_many");

    const oversizedNarration = createDefaultProject();
    oversizedNarration.voice.speakChinese = true;
    oversizedNarration.root = {text: "root", meaningZh: "词根", x: 0.5, y: 0.52};
    oversizedNarration.words = Array.from({length: MAX_PROJECT_WORDS}, (_, index) => ({
      text: `${index}${"a".repeat(600)}`,
      meaningZh: `${index}${"中".repeat(600)}`,
    }));
    expect(validateProject(oversizedNarration).errors.map((error) => error.code)).toContain(
      "project.narration_too_long",
    );

    oversizedNarration.voice.speakChinese = false;
    expect(validateProject(oversizedNarration).errors.map((error) => error.code)).not.toContain(
      "project.narration_too_long",
    );
  });

  it("accepts only inert six-digit hex colors from imported projects", () => {
    const unsafeGlobal = createDefaultProject();
    unsafeGlobal.style.arrow.color = "url(https://attacker.example/paint)";
    expect(validateProject(unsafeGlobal).errors).toContainEqual({
      code: "style.invalid_color",
      path: "style.arrow.color",
    });

    const unsafeWord = createDefaultProject();
    unsafeWord.words[0] = {...unsafeWord.words[0], highlightColor: "url(#paint)"};
    expect(validateProject(unsafeWord).errors).toContainEqual({
      code: "word.invalid_color",
      path: "words.0.highlightColor",
    });

    const valid = createDefaultProject();
    valid.title.fill = "#abcdef";
    valid.words[0] = {...valid.words[0], englishColor: "#ABCDEF"};
    expect(validateProject(valid).ok).toBe(true);
  });
});
