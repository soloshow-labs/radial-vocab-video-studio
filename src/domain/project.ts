import {MAX_TTS_TEXT_LENGTH, isSupportedAzureVoiceName} from "../shared/tts";

export type CanvasPreset = "9:16" | "16:9" | "3:4" | "4:3";
export type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type SlotOrderMode =
  | "manual"
  | "ne-counterclockwise"
  | "ne-clockwise"
  | "nw-clockwise"
  | "nw-counterclockwise";
export type ArrowLengthGroup = "vertical" | "horizontal" | "nwSe" | "neSw";
export type AssetKind = "video" | "audio";

export type AssetReference = {
  id: string;
  name: string;
  kind: AssetKind;
};

export type WordConfig = {
  text: string;
  meaningZh: string;
  direction?: Direction;
  x?: number;
  y?: number;
  arrowStart?: Point;
  arrowEnd?: Point;
  englishColor?: string;
  chineseColor?: string;
  highlightColor?: string;
};

export type Point = {x: number; y: number};

export type ProjectConfig = {
  version: 1;
  name: string;
  canvas: {
    preset: CanvasPreset;
    width: number;
    height: number;
    fps: number;
  };
  background: {
    asset: AssetReference | null;
    fit: "cover";
    loop: boolean;
    startSec: number;
    audioEnabled: boolean;
    audioVolume: number;
  };
  music: {
    asset: AssetReference | null;
    volume: number;
  };
  layout: {
    arrowLength: number;
    slotOrder: SlotOrderMode;
    arrowLengths: Partial<Record<ArrowLengthGroup, number>>;
  };
  title: {
    text: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
  };
  root: {
    text: string;
    meaningZh: string;
    x: number;
    y: number;
  };
  words: WordConfig[];
  style: {
    mask: {color: string; opacity: number};
    center: {
      sizeRatio: number;
      borderColor: string;
      borderWidth: number;
      fillColor: string;
      fillOpacity: number;
      englishColor: string;
      chineseColor: string;
    };
    arrow: {
      color: string;
      width: number;
      headSize: number;
    };
    word: {
      englishColor: string;
      chineseColor: string;
      highlightColor: string;
      englishFontSize: number;
      chineseFontSize: number;
      fontFamily: string;
    };
  };
  voice: {
    provider: "azure-speech";
    voice: string;
    chineseVoice?: string;
    rate: string;
    speakChinese: boolean;
    breakMs: number;
  };
};

export type ProjectIssue = {
  code: string;
  path?: string;
};

export type ProjectValidationResult = {
  ok: boolean;
  errors: ProjectIssue[];
  warnings: ProjectIssue[];
};

export const CANVAS_PRESETS: Record<CanvasPreset, {width: number; height: number; fps: number}> = {
  "9:16": {width: 1080, height: 1920, fps: 30},
  "16:9": {width: 1920, height: 1080, fps: 30},
  "3:4": {width: 1080, height: 1440, fps: 30},
  "4:3": {width: 1440, height: 1080, fps: 30},
};

export const DIRECTIONS: Direction[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
export const DEFAULT_ENGLISH_VOICE = "en-US-JennyNeural";
export const DEFAULT_CHINESE_VOICE = "zh-CN-XiaoxiaoNeural";
export const SLOT_ORDER_MODES: SlotOrderMode[] = [
  "manual",
  "ne-counterclockwise",
  "ne-clockwise",
  "nw-clockwise",
  "nw-counterclockwise",
];
export const ARROW_LENGTH_GROUPS: ArrowLengthGroup[] = ["vertical", "horizontal", "nwSe", "neSw"];
export const ARROW_LENGTH_LIMITS = {min: 0.45, max: 0.9} as const;
export const CENTER_SIZE_RATIO_LIMITS = {min: 0.14, max: 0.34} as const;
export const MAX_PROJECT_WORDS = 10;
export const MAX_PROJECT_TEXT_LENGTH = MAX_TTS_TEXT_LENGTH;
export const MAX_PROJECT_NARRATION_CHARACTERS = 12_000;
const MAX_PROJECT_NAME_LENGTH = 200;
const MAX_TITLE_LENGTH = 200;
const MAX_ASSET_NAME_LENGTH = 255;
const MAX_FONT_FAMILY_LENGTH = 256;
const DRAFT_PLACEHOLDER = "__radial_vocab_draft__";

export class ProjectValidationError extends Error {
  readonly issues: ProjectIssue[];

  constructor(issues: ProjectIssue[]) {
    super(issues[0]?.code ?? "project.invalid");
    this.name = "ProjectValidationError";
    this.issues = issues;
  }
}

export function createDefaultProject(): ProjectConfig {
  return {
    version: 1,
    name: "mate",
    canvas: {preset: "9:16", ...CANVAS_PRESETS["9:16"]},
    background: {
      asset: null,
      fit: "cover",
      loop: true,
      startSec: 0,
      audioEnabled: false,
      audioVolume: 0.12,
    },
    music: {asset: null, volume: 0.1},
    layout: {
      arrowLength: 0.68,
      slotOrder: "manual",
      arrowLengths: {vertical: 0.78},
    },
    title: {
      text: "秒记单词",
      fill: "#FFD21A",
      stroke: "#111111",
      strokeWidth: 8,
      shadowColor: "#C81E1E",
      shadowOffsetX: 5,
      shadowOffsetY: 7,
    },
    root: {text: "mate", meaningZh: "伙伴", x: 0.5, y: 0.52},
    words: [
      {text: "teammate", meaningZh: "队友", direction: "ne"},
      {text: "workmate", meaningZh: "同事", direction: "n"},
      {text: "soulmate", meaningZh: "知己", direction: "nw"},
      {text: "playmate", meaningZh: "玩伴", direction: "sw"},
      {text: "classmate", meaningZh: "同学", direction: "se"},
      {text: "schoolmate", meaningZh: "校友", direction: "s"},
    ],
    style: {
      mask: {color: "#000000", opacity: 0.5},
      center: {
        sizeRatio: 0.24,
        borderColor: "#E4DA20",
        borderWidth: 4,
        fillColor: "#000000",
        fillOpacity: 0.1,
        englishColor: "#F6A800",
        chineseColor: "#FFFFFF",
      },
      arrow: {color: "#FFFFFF", width: 8, headSize: 42},
      word: {
        englishColor: "#FFFFFF",
        chineseColor: "#FFFFFF",
        highlightColor: "#F6A800",
        englishFontSize: 58,
        chineseFontSize: 42,
        fontFamily: 'Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
      },
    },
    voice: {
      provider: "azure-speech",
      voice: DEFAULT_ENGLISH_VOICE,
      chineseVoice: DEFAULT_CHINESE_VOICE,
      rate: "+0%",
      speakChinese: false,
      breakMs: 0,
    },
  };
}

export function validateProject(input: unknown): ProjectValidationResult {
  const errors: ProjectIssue[] = [];
  const warnings: ProjectIssue[] = [];

  if (!isRecord(input)) {
    return {ok: false, errors: [{code: "project.invalid"}], warnings};
  }

  if (input.version !== 1) errors.push({code: "project.unsupported_version", path: "version"});
  if (!isNonEmptyString(input.name)) errors.push({code: "project.name_required", path: "name"});
  else if (input.name.length > MAX_PROJECT_NAME_LENGTH) errors.push({code: "project.name_too_long", path: "name"});

  const canvas = input.canvas;
  if (!isRecord(canvas) || !isCanvasPreset(canvas.preset)) {
    errors.push({code: "canvas.invalid_preset", path: "canvas.preset"});
  }

  const background = input.background;
  if (!isRecord(background)) {
    errors.push({code: "background.invalid", path: "background"});
  } else {
    validateAsset(background.asset, "video", "background.asset", errors);
    if (background.fit !== "cover") errors.push({code: "background.invalid_fit", path: "background.fit"});
    if (typeof background.loop !== "boolean") errors.push({code: "background.invalid_loop", path: "background.loop"});
    if (!isFiniteNumber(background.startSec) || background.startSec < 0) {
      errors.push({code: "background.invalid_start", path: "background.startSec"});
    }
    if (typeof background.audioEnabled !== "boolean") {
      errors.push({code: "background.invalid_audio", path: "background.audioEnabled"});
    }
    if (!isFiniteNumber(background.audioVolume)) {
      errors.push({code: "background.invalid_volume", path: "background.audioVolume"});
    }
  }

  const music = input.music;
  if (!isRecord(music)) {
    errors.push({code: "music.invalid", path: "music"});
  } else {
    validateAsset(music.asset, "audio", "music.asset", errors);
    if (!isFiniteNumber(music.volume)) errors.push({code: "music.invalid_volume", path: "music.volume"});
  }

  const root = input.root;
  if (!isRecord(root)) {
    errors.push({code: "root.invalid", path: "root"});
  } else {
    if (!isNonEmptyString(root.text)) errors.push({code: "root.text_required", path: "root.text"});
    else if (root.text.length > MAX_PROJECT_TEXT_LENGTH) errors.push({code: "root.text_too_long", path: "root.text"});
    if (!isNonEmptyString(root.meaningZh)) errors.push({code: "root.meaning_required", path: "root.meaningZh"});
    else if (root.meaningZh.length > MAX_PROJECT_TEXT_LENGTH) {
      errors.push({code: "root.meaning_too_long", path: "root.meaningZh"});
    }
    if (!isFiniteNumber(root.x) || !isFiniteNumber(root.y)) errors.push({code: "root.invalid_position", path: "root"});
  }

  if (!Array.isArray(input.words) || input.words.length === 0) {
    errors.push({code: "words.required", path: "words"});
  } else if (input.words.length > MAX_PROJECT_WORDS) {
    errors.push({code: "words.too_many", path: "words"});
  } else {
    input.words.forEach((word, index) => validateWord(word, index, errors));
    if (input.words.length > 8) warnings.push({code: "words.dense_layout", path: "words"});
    const includesChineseNarration = isRecord(input.voice) && input.voice.speakChinese === true;
    if (projectNarrationCharacters(root, input.words, includesChineseNarration) > MAX_PROJECT_NARRATION_CHARACTERS) {
      errors.push({code: "project.narration_too_long", path: "words"});
    }
  }

  validateLayout(input.layout, errors);
  validateTitle(input.title, errors);
  validateStyle(input.style, errors);

  const voice = input.voice;
  if (!isRecord(voice)) {
    errors.push({code: "voice.invalid", path: "voice"});
  } else {
    if (voice.provider !== "azure-speech") {
      errors.push({code: "voice.unsupported_provider", path: "voice.provider"});
    }
    if (!isNonEmptyString(voice.voice)) errors.push({code: "voice.voice_required", path: "voice.voice"});
    else if (!isSupportedAzureVoiceName(voice.voice)) errors.push({code: "voice.invalid_voice", path: "voice.voice"});
    if (voice.chineseVoice !== undefined && !isNonEmptyString(voice.chineseVoice)) {
      errors.push({code: "voice.chinese_voice_required", path: "voice.chineseVoice"});
    } else if (typeof voice.chineseVoice === "string" && !isSupportedAzureVoiceName(voice.chineseVoice)) {
      errors.push({code: "voice.invalid_chinese_voice", path: "voice.chineseVoice"});
    }
    if (!isNonEmptyString(voice.rate)) errors.push({code: "voice.rate_required", path: "voice.rate"});
    if (typeof voice.speakChinese !== "boolean") {
      errors.push({code: "voice.invalid_chinese_toggle", path: "voice.speakChinese"});
    }
    if (!isFiniteNumber(voice.breakMs) || voice.breakMs < 0) {
      errors.push({code: "voice.invalid_break", path: "voice.breakMs"});
    }
  }

  return {ok: errors.length === 0, errors, warnings};
}

export function normalizeProject(input: unknown): ProjectConfig {
  const result = validateProject(input);
  if (!result.ok) throw new ProjectValidationError(result.errors);

  const source = input as ProjectConfig;
  const preset = source.canvas.preset;
  return {
    version: 1,
    name: source.name.trim(),
    canvas: {preset, ...CANVAS_PRESETS[preset]},
    background: {
      asset: normalizeAsset(source.background.asset),
      fit: "cover",
      loop: source.background.loop,
      startSec: Math.max(0, source.background.startSec),
      audioEnabled: source.background.audioEnabled,
      audioVolume: clamp(source.background.audioVolume, 0, 1),
    },
    music: {
      asset: normalizeAsset(source.music.asset),
      volume: clamp(source.music.volume, 0, 1),
    },
    layout: {
      arrowLength: clamp(source.layout.arrowLength, ARROW_LENGTH_LIMITS.min, ARROW_LENGTH_LIMITS.max),
      slotOrder: source.layout.slotOrder,
      arrowLengths: Object.fromEntries(
        ARROW_LENGTH_GROUPS.flatMap((group) => {
          const value = source.layout.arrowLengths[group];
          return value === undefined
            ? []
            : [[group, clamp(value, ARROW_LENGTH_LIMITS.min, ARROW_LENGTH_LIMITS.max)]];
        }),
      ),
    },
    title: {
      text: source.title.text,
      fill: source.title.fill,
      stroke: source.title.stroke,
      strokeWidth: Math.max(0, source.title.strokeWidth),
      shadowColor: source.title.shadowColor,
      shadowOffsetX: source.title.shadowOffsetX,
      shadowOffsetY: source.title.shadowOffsetY,
    },
    root: {
      text: source.root.text.trim(),
      meaningZh: source.root.meaningZh.trim(),
      x: clamp(source.root.x, 0, 1),
      y: clamp(source.root.y, 0, 1),
    },
    words: source.words.map((word) => normalizeWord(word)),
    style: {
      mask: {color: source.style.mask.color, opacity: clamp(source.style.mask.opacity, 0, 1)},
      center: {
        sizeRatio: clamp(source.style.center.sizeRatio, CENTER_SIZE_RATIO_LIMITS.min, CENTER_SIZE_RATIO_LIMITS.max),
        borderColor: source.style.center.borderColor,
        borderWidth: Math.max(0, source.style.center.borderWidth),
        fillColor: source.style.center.fillColor,
        fillOpacity: clamp(source.style.center.fillOpacity, 0, 1),
        englishColor: source.style.center.englishColor,
        chineseColor: source.style.center.chineseColor,
      },
      arrow: {
        color: source.style.arrow.color,
        width: Math.max(1, source.style.arrow.width),
        headSize: Math.max(1, source.style.arrow.headSize),
      },
      word: {
        englishColor: source.style.word.englishColor,
        chineseColor: source.style.word.chineseColor,
        highlightColor: source.style.word.highlightColor,
        englishFontSize: Math.max(1, source.style.word.englishFontSize),
        chineseFontSize: Math.max(1, source.style.word.chineseFontSize),
        fontFamily: source.style.word.fontFamily.trim(),
      },
    },
    voice: {
      provider: "azure-speech",
      voice: source.voice.voice.trim(),
      chineseVoice: source.voice.chineseVoice?.trim() || DEFAULT_CHINESE_VOICE,
      rate: source.voice.rate.trim(),
      speakChinese: source.voice.speakChinese,
      breakMs: clamp(source.voice.breakMs, 0, 5000),
    },
  };
}

export function normalizeDraftProject(input: unknown): ProjectConfig {
  if (!isRecord(input)) throw new ProjectValidationError([{code: "project.invalid"}]);
  const sourceRoot = input.root;
  const sourceWords = input.words;
  const preparedWords = Array.isArray(sourceWords)
    ? sourceWords.length === 0
      ? [{text: DRAFT_PLACEHOLDER, meaningZh: DRAFT_PLACEHOLDER}]
      : sourceWords.map((word) => isRecord(word)
        ? {...word, text: prepareDraftText(word.text), meaningZh: prepareDraftText(word.meaningZh)}
        : word)
    : sourceWords;
  const prepared = {
    ...input,
    name: prepareDraftText(input.name),
    root: isRecord(sourceRoot)
      ? {...sourceRoot, text: prepareDraftText(sourceRoot.text), meaningZh: prepareDraftText(sourceRoot.meaningZh)}
      : sourceRoot,
    words: preparedWords,
  };
  const normalized = normalizeProject(prepared);
  const originalWords = Array.isArray(sourceWords) ? sourceWords : [];

  return {
    ...normalized,
    name: restoreDraftText(input.name, normalized.name),
    root: isRecord(sourceRoot)
      ? {
          ...normalized.root,
          text: restoreDraftText(sourceRoot.text, normalized.root.text),
          meaningZh: restoreDraftText(sourceRoot.meaningZh, normalized.root.meaningZh),
        }
      : normalized.root,
    words: originalWords.length === 0
      ? []
      : normalized.words.map((word, index) => {
          const sourceWord = originalWords[index];
          return isRecord(sourceWord)
            ? {
                ...word,
                text: restoreDraftText(sourceWord.text, word.text),
                meaningZh: restoreDraftText(sourceWord.meaningZh, word.meaningZh),
              }
            : word;
        }),
  };
}

function prepareDraftText(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? DRAFT_PLACEHOLDER : value;
}

function restoreDraftText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function applyCanvasPreset(project: ProjectConfig, preset: CanvasPreset): ProjectConfig {
  return {...project, canvas: {preset, ...CANVAS_PRESETS[preset]}};
}

function validateAsset(value: unknown, kind: AssetKind, path: string, errors: ProjectIssue[]): void {
  if (value === null) return;
  if (!isRecord(value)) {
    errors.push({code: "asset.invalid", path});
    return;
  }
  if (!isOpaqueAssetId(value.id)) errors.push({code: "asset.invalid_id", path: `${path}.id`});
  if (!isNonEmptyString(value.name) || value.name.length > MAX_ASSET_NAME_LENGTH || containsPath(value.name)) {
    errors.push({code: "asset.invalid_name", path: `${path}.name`});
  }
  if (value.kind !== kind) errors.push({code: "asset.invalid_kind", path: `${path}.kind`});
}

function validateWord(value: unknown, index: number, errors: ProjectIssue[]): void {
  if (!isRecord(value)) {
    errors.push({code: "word.invalid", path: `words.${index}`});
    return;
  }
  if (!isNonEmptyString(value.text)) errors.push({code: "word.text_required", path: `words.${index}.text`});
  else if (value.text.length > MAX_PROJECT_TEXT_LENGTH) {
    errors.push({code: "word.text_too_long", path: `words.${index}.text`});
  }
  if (!isNonEmptyString(value.meaningZh)) {
    errors.push({code: "word.meaning_required", path: `words.${index}.meaningZh`});
  } else if (value.meaningZh.length > MAX_PROJECT_TEXT_LENGTH) {
    errors.push({code: "word.meaning_too_long", path: `words.${index}.meaningZh`});
  }
  if (value.direction !== undefined && !isDirection(value.direction)) {
    errors.push({code: "word.invalid_direction", path: `words.${index}.direction`});
  }
  for (const coordinate of ["x", "y"] as const) {
    if (value[coordinate] !== undefined && !isFiniteNumber(value[coordinate])) {
      errors.push({code: "word.invalid_position", path: `words.${index}.${coordinate}`});
    }
  }
  for (const point of ["arrowStart", "arrowEnd"] as const) {
    if (value[point] !== undefined && !isPoint(value[point])) {
      errors.push({code: "word.invalid_arrow_point", path: `words.${index}.${point}`});
    }
  }
  for (const color of ["englishColor", "chineseColor", "highlightColor"] as const) {
    if (value[color] !== undefined && !isHexColor(value[color])) {
      errors.push({code: "word.invalid_color", path: `words.${index}.${color}`});
    }
  }
}

function validateLayout(value: unknown, errors: ProjectIssue[]): void {
  if (!isRecord(value)) {
    errors.push({code: "layout.invalid", path: "layout"});
    return;
  }
  if (!isFiniteNumber(value.arrowLength)) errors.push({code: "layout.invalid_arrow_length", path: "layout.arrowLength"});
  if (!SLOT_ORDER_MODES.includes(value.slotOrder as SlotOrderMode)) {
    errors.push({code: "layout.invalid_slot_order", path: "layout.slotOrder"});
  }
  if (!isRecord(value.arrowLengths)) {
    errors.push({code: "layout.invalid_arrow_lengths", path: "layout.arrowLengths"});
    return;
  }
  for (const group of ARROW_LENGTH_GROUPS) {
    const length = value.arrowLengths[group];
    if (length !== undefined && !isFiniteNumber(length)) {
      errors.push({code: "layout.invalid_arrow_length", path: `layout.arrowLengths.${group}`});
    }
  }
}

function validateTitle(value: unknown, errors: ProjectIssue[]): void {
  if (!isRecord(value)) {
    errors.push({code: "title.invalid", path: "title"});
    return;
  }
  if (typeof value.text !== "string" || value.text.length > MAX_TITLE_LENGTH) {
    errors.push({code: "title.invalid", path: "title.text"});
  }
  for (const key of ["fill", "stroke", "shadowColor"] as const) {
    if (!isHexColor(value[key])) errors.push({code: "title.invalid_color", path: `title.${key}`});
  }
  for (const key of ["strokeWidth", "shadowOffsetX", "shadowOffsetY"] as const) {
    if (!isFiniteNumber(value[key])) errors.push({code: "title.invalid", path: `title.${key}`});
  }
}

function validateStyle(value: unknown, errors: ProjectIssue[]): void {
  if (!isRecord(value) || !isRecord(value.mask) || !isRecord(value.center) || !isRecord(value.arrow) || !isRecord(value.word)) {
    errors.push({code: "style.invalid", path: "style"});
    return;
  }
  const numbers: Array<[unknown, string]> = [
    [value.mask.opacity, "style.mask.opacity"],
    [value.center.sizeRatio, "style.center.sizeRatio"],
    [value.center.borderWidth, "style.center.borderWidth"],
    [value.center.fillOpacity, "style.center.fillOpacity"],
    [value.arrow.width, "style.arrow.width"],
    [value.arrow.headSize, "style.arrow.headSize"],
    [value.word.englishFontSize, "style.word.englishFontSize"],
    [value.word.chineseFontSize, "style.word.chineseFontSize"],
  ];
  if (numbers.some(([number]) => !isFiniteNumber(number))) errors.push({code: "style.invalid_number", path: "style"});

  const colors: Array<[unknown, string]> = [
    [value.mask.color, "style.mask.color"],
    [value.center.borderColor, "style.center.borderColor"],
    [value.center.fillColor, "style.center.fillColor"],
    [value.center.englishColor, "style.center.englishColor"],
    [value.center.chineseColor, "style.center.chineseColor"],
    [value.arrow.color, "style.arrow.color"],
    [value.word.englishColor, "style.word.englishColor"],
    [value.word.chineseColor, "style.word.chineseColor"],
    [value.word.highlightColor, "style.word.highlightColor"],
  ];
  for (const [color, path] of colors) {
    if (!isHexColor(color)) errors.push({code: "style.invalid_color", path});
  }
  if (!isNonEmptyString(value.word.fontFamily) || value.word.fontFamily.length > MAX_FONT_FAMILY_LENGTH) {
    errors.push({code: "style.invalid_string", path: "style.word.fontFamily"});
  }
}

function normalizeAsset(asset: AssetReference | null): AssetReference | null {
  return asset ? {id: asset.id, name: asset.name.trim(), kind: asset.kind} : null;
}

function normalizeWord(word: WordConfig): WordConfig {
  return {
    text: word.text.trim(),
    meaningZh: word.meaningZh.trim(),
    ...(word.direction ? {direction: word.direction} : {}),
    ...(word.x === undefined ? {} : {x: clamp(word.x, 0, 1)}),
    ...(word.y === undefined ? {} : {y: clamp(word.y, 0, 1)}),
    ...(word.arrowStart ? {arrowStart: normalizePoint(word.arrowStart)} : {}),
    ...(word.arrowEnd ? {arrowEnd: normalizePoint(word.arrowEnd)} : {}),
    ...(word.englishColor ? {englishColor: word.englishColor} : {}),
    ...(word.chineseColor ? {chineseColor: word.chineseColor} : {}),
    ...(word.highlightColor ? {highlightColor: word.highlightColor} : {}),
  };
}

function normalizePoint(point: Point): Point {
  return {x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1)};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function projectNarrationCharacters(root: unknown, words: unknown[], includeMeanings: boolean): number {
  if (!isRecord(root)) return 0;
  let total = stringLength(root.text) + (includeMeanings ? stringLength(root.meaningZh) : 0);
  for (const word of words) {
    if (!isRecord(word)) continue;
    total += stringLength(word.text) + (includeMeanings ? stringLength(word.meaningZh) : 0);
  }
  return total;
}

function stringLength(value: unknown): number {
  return typeof value === "string" ? value.length : 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCanvasPreset(value: unknown): value is CanvasPreset {
  return typeof value === "string" && Object.hasOwn(CANVAS_PRESETS, value);
}

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && DIRECTIONS.includes(value as Direction);
}

function isPoint(value: unknown): value is Point {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isOpaqueAssetId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(?:asset_[a-z0-9_-]{12,80}|[0-9a-f]{8}-[0-9a-f-]{27,45})$/i.test(value);
}

function containsPath(value: string): boolean {
  return value.includes("/") || value.includes("\\") || /^[A-Za-z]:/.test(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
