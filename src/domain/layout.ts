import {
  ARROW_LENGTH_GROUPS,
  ARROW_LENGTH_LIMITS,
  type ArrowLengthGroup,
  type Direction,
  type Point,
  type ProjectConfig,
  type SlotOrderMode,
  type WordConfig,
} from "./project";

export type WordLayout = {
  index: number;
  word: WordConfig;
  direction: Direction;
  label: Point;
  arrow: {start: Point; end: Point};
  fontScale: number;
};

export type LayoutResult = {
  center: Point;
  words: WordLayout[];
  warnings: string[];
};

const SLOT_ORDERS: Record<SlotOrderMode, Direction[]> = {
  manual: ["ne", "n", "nw", "w", "sw", "s", "se", "e"],
  "ne-counterclockwise": ["ne", "n", "nw", "w", "sw", "s", "se", "e"],
  "ne-clockwise": ["ne", "e", "se", "s", "sw", "w", "nw", "n"],
  "nw-clockwise": ["nw", "n", "ne", "e", "se", "s", "sw", "w"],
  "nw-counterclockwise": ["nw", "w", "sw", "s", "se", "e", "ne", "n"],
};

const DIRECTION_VECTOR: Record<Direction, Point> = {
  n: {x: 0, y: -1},
  ne: {x: 0.72, y: -0.72},
  e: {x: 1, y: 0},
  se: {x: 0.72, y: 0.72},
  s: {x: 0, y: 1},
  sw: {x: -0.72, y: 0.72},
  w: {x: -1, y: 0},
  nw: {x: -0.72, y: -0.72},
};

const PORTRAIT_OFFSETS: Record<Direction, Point> = {
  n: {x: 0, y: -0.25},
  ne: {x: 0.34, y: -0.18},
  e: {x: 0.36, y: 0},
  se: {x: 0.34, y: 0.27},
  s: {x: 0, y: 0.34},
  sw: {x: -0.34, y: 0.27},
  w: {x: -0.36, y: 0},
  nw: {x: -0.34, y: -0.18},
};

const ORIGINAL_ARROW_LENGTH = 0.78;
const LABEL_GAP_PX = 18;

export function slotOrderForCount(count: number, mode: SlotOrderMode = "manual"): Direction[] {
  const fullOrder = SLOT_ORDERS[mode] ?? SLOT_ORDERS.manual;
  const available = count <= 6 ? fullOrder.filter((direction) => direction !== "e" && direction !== "w") : fullOrder;
  return Array.from({length: Math.max(0, count)}, (_, index) => available[index % available.length]);
}

export function arrowLengthGroupForDirection(direction: Direction): ArrowLengthGroup {
  if (direction === "n" || direction === "s") return "vertical";
  if (direction === "e" || direction === "w") return "horizontal";
  if (direction === "nw" || direction === "se") return "nwSe";
  return "neSw";
}

export function usedArrowLengthGroups(project: ProjectConfig): ArrowLengthGroup[] {
  const directions = resolveWordDirections(project.words, project.layout.slotOrder);
  const used = new Set<ArrowLengthGroup>();
  project.words.forEach((word, index) => {
    const direction = directions[index];
    if (!direction) return;
    used.add(arrowLengthGroupForDirection(direction));
  });
  return ARROW_LENGTH_GROUPS.filter((group) => used.has(group));
}

export function computeLayout(project: ProjectConfig): LayoutResult {
  const warnings: string[] = [];
  const center = {x: project.root.x, y: project.root.y};
  const directions = resolveWordDirections(project.words, project.layout.slotOrder);
  const radius = radiusForPreset(project.canvas.preset);
  const widths = project.words.map((word) => estimateTextWidth(word.text, project.style.word.englishFontSize, project.canvas.width));
  const maxWidth = Math.max(0, ...widths);
  const fontScale = maxWidth > 0.28 ? Math.max(0.72, 0.28 / maxWidth) : 1;

  if (fontScale < 1) warnings.push("layout.long_words");
  if (project.words.length > 8) warnings.push("layout.reused_directions");
  if (project.words.length > 10) warnings.push("layout.too_many_words");

  const words = project.words.map((word, index): WordLayout => {
    const direction = directions[index] ?? "n";
    const autoLabel = automaticLabel(center, direction, project.canvas.preset, radius);
    const hasManualLabel = word.x !== undefined || word.y !== undefined;
    let label = clampPoint({x: word.x ?? autoLabel.x, y: word.y ?? autoLabel.y});
    let start = word.arrowStart ?? circleEdgePoint(center, label, project);
    let end = word.arrowEnd;

    if (!hasManualLabel && !word.arrowStart && !word.arrowEnd) {
      const unit = pixelUnit(start, label, project);
      start = circleEdgeFromUnit(center, unit, project);
      end = moveInPixels(start, unit, automaticArrowLengthPx(project, arrowLengthFor(project, direction)), project);
      label = clampPoint(labelAfterArrow(end, unit, direction, project, word, fontScale, widths[index] ?? 0));
    }

    return {
      index,
      word,
      direction,
      label,
      arrow: {
        start,
        end: end ?? shortenArrow(start, label, arrowLengthFor(project, direction)),
      },
      fontScale,
    };
  });

  if (hasOverlappingLabels(words, project)) warnings.push("layout.overlapping_labels");

  return {center, words, warnings};
}

export function resolveWordDirections(words: WordConfig[], mode: SlotOrderMode): Direction[] {
  const preferred = slotOrderForCount(words.length, mode);
  const fullOrder = SLOT_ORDERS[mode] ?? SLOT_ORDERS.manual;
  const candidates = [...new Set([...preferred, ...fullOrder])];
  const used = new Set(words.map((word) => word.direction).filter(isDirection));
  let reusedIndex = 0;
  return words.map((word) => {
    if (isDirection(word.direction)) return word.direction;
    const available = candidates.find((direction) => !used.has(direction));
    const direction = available ?? candidates[reusedIndex++ % candidates.length] ?? "n";
    used.add(direction);
    return direction;
  });
}

function hasOverlappingLabels(words: WordLayout[], project: ProjectConfig): boolean {
  const bounds = words.map((item) => labelBounds(item, project));
  return bounds.some((box, index) => bounds.slice(index + 1).some((other) => (
    box.left < other.right
    && box.right > other.left
    && box.top < other.bottom
    && box.bottom > other.top
  )));
}

function labelBounds(item: WordLayout, project: ProjectConfig) {
  const widthPx = Math.max(
    textWidthPx(item.word.text, project.style.word.englishFontSize, item.fontScale),
    textWidthPx(item.word.meaningZh, project.style.word.chineseFontSize, item.fontScale),
  ) + 12;
  const heightPx = (project.style.word.englishFontSize + project.style.word.chineseFontSize) * item.fontScale * 1.15 + 8;
  const width = widthPx / project.canvas.width;
  const height = heightPx / project.canvas.height;
  const manual = item.word.x !== undefined || item.word.y !== undefined || item.word.arrowStart !== undefined || item.word.arrowEnd !== undefined;
  const horizontal = manual || item.direction === "n" || item.direction === "s" ? "center" : item.direction.includes("e") ? "left" : "right";
  const vertical = manual || item.direction === "e" || item.direction === "w" ? "center" : item.direction.startsWith("n") ? "bottom" : "top";
  const left = horizontal === "left" ? item.label.x : horizontal === "right" ? item.label.x - width : item.label.x - width / 2;
  const top = vertical === "top" ? item.label.y : vertical === "bottom" ? item.label.y - height : item.label.y - height / 2;
  return {left, right: left + width, top, bottom: top + height};
}

function arrowLengthFor(project: ProjectConfig, direction: Direction): number {
  const groupValue = project.layout.arrowLengths[arrowLengthGroupForDirection(direction)];
  return clamp(groupValue ?? project.layout.arrowLength, ARROW_LENGTH_LIMITS.min, ARROW_LENGTH_LIMITS.max);
}

function radiusForPreset(preset: ProjectConfig["canvas"]["preset"]): Point {
  if (preset === "16:9") return {x: 0.34, y: 0.28};
  if (preset === "4:3") return {x: 0.31, y: 0.31};
  if (preset === "3:4") return {x: 0.29, y: 0.33};
  return {x: 0.32, y: 0.34};
}

function automaticLabel(center: Point, direction: Direction, preset: ProjectConfig["canvas"]["preset"], radius: Point): Point {
  if (preset === "9:16") {
    const offset = PORTRAIT_OFFSETS[direction];
    return {x: center.x + offset.x, y: center.y + offset.y};
  }
  const vector = DIRECTION_VECTOR[direction];
  return {x: center.x + vector.x * radius.x, y: center.y + vector.y * radius.y};
}

function circleEdgePoint(center: Point, label: Point, project: ProjectConfig): Point {
  const radiusPx = Math.min(project.canvas.width, project.canvas.height) * project.style.center.sizeRatio * 0.5;
  const radius = {x: radiusPx / project.canvas.width, y: radiusPx / project.canvas.height};
  const dx = label.x - center.x;
  const dy = label.y - center.y;
  const scale = 1 / Math.sqrt((dx / radius.x) ** 2 + (dy / radius.y) ** 2);
  if (!Number.isFinite(scale)) return center;
  return {x: center.x + dx * scale, y: center.y + dy * scale};
}

function circleEdgeFromUnit(center: Point, unit: Point, project: ProjectConfig): Point {
  const radiusPx = Math.min(project.canvas.width, project.canvas.height) * project.style.center.sizeRatio * 0.5;
  return {
    x: center.x + (unit.x * radiusPx) / project.canvas.width,
    y: center.y + (unit.y * radiusPx) / project.canvas.height,
  };
}

function pixelUnit(start: Point, end: Point, project: ProjectConfig): Point {
  const dx = (end.x - start.x) * project.canvas.width;
  const dy = (end.y - start.y) * project.canvas.height;
  const length = Math.hypot(dx, dy);
  return length <= 1 ? {x: 0, y: -1} : {x: dx / length, y: dy / length};
}

function automaticArrowLengthPx(project: ProjectConfig, arrowLength: number): number {
  return Math.min(project.canvas.width, project.canvas.height) * 0.26 * (arrowLength / ORIGINAL_ARROW_LENGTH);
}

function moveInPixels(start: Point, unit: Point, distance: number, project: ProjectConfig): Point {
  return {
    x: start.x + (unit.x * distance) / project.canvas.width,
    y: start.y + (unit.y * distance) / project.canvas.height,
  };
}

function labelAfterArrow(
  end: Point,
  unit: Point,
  direction: Direction,
  project: ProjectConfig,
  word: WordConfig,
  fontScale: number,
  englishWidthNormalized: number,
): Point {
  const englishWidth = englishWidthNormalized * project.canvas.width * fontScale;
  const chineseWidth = textWidthPx(word.meaningZh, project.style.word.chineseFontSize, fontScale);
  const blockWidth = Math.max(englishWidth, chineseWidth);
  const topInset = (blockWidth - chineseWidth) / 2;
  const bottomInset = (blockWidth - englishWidth) / 2;
  const offsetX = direction === "ne" ? topInset : direction === "nw" ? -topInset : direction === "se" ? bottomInset : direction === "sw" ? -bottomInset : 0;
  return {
    x: end.x + (unit.x * LABEL_GAP_PX - offsetX) / project.canvas.width,
    y: end.y + (unit.y * LABEL_GAP_PX) / project.canvas.height,
  };
}

function shortenArrow(start: Point, label: Point, length: number): Point {
  return {x: start.x + (label.x - start.x) * length, y: start.y + (label.y - start.y) * length};
}

function estimateTextWidth(text: string, fontSize: number, canvasWidth: number): number {
  return textWidthPx(text, fontSize, 1) / canvasWidth;
}

function textWidthPx(text: string, fontSize: number, scale: number): number {
  return Array.from(text).reduce((sum, character) => sum + (/[㐀-鿿]/.test(character) ? 1 : 0.58), 0) * fontSize * scale;
}

function clampPoint(point: Point): Point {
  return {x: clamp(point.x, 0.07, 0.93), y: clamp(point.y, 0.08, 0.92)};
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && Object.hasOwn(DIRECTION_VECTOR, value);
}
