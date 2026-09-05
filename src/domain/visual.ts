import type {WordLayout} from "./layout";
import {ARROW_REVEAL_SEC, WORD_REVEAL_SEC, type Timeline} from "./timeline";

export const RADIAL_TYPOGRAPHY = {
  title: {fontWeight: 900, lineHeight: 1},
  centerEnglish: {fontWeight: 900, lineHeight: 1},
  centerChinese: {fontWeight: 800, lineHeight: 1.25},
  wordEnglish: {fontWeight: 900, lineHeight: 1},
  wordChinese: {fontWeight: 800, lineHeight: 1.2},
  wordTextShadow: "none",
} as const;

export function revealProgress(timeline: Timeline, wordIndex: number, currentSec: number) {
  const item = timeline.items.find((candidate) => candidate.kind === "word" && candidate.wordIndex === wordIndex);
  if (!item) return {arrow: 1, word: 1};
  const elapsed = currentSec - item.revealSec;
  return {
    arrow: clamp(elapsed / ARROW_REVEAL_SEC),
    word: clamp((elapsed - ARROW_REVEAL_SEC) / WORD_REVEAL_SEC),
  };
}

export function arrowHead(x1: number, y1: number, x2: number, y2: number, size: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return undefined;
  const ux = dx / length;
  const uy = dy / length;
  const headLength = Math.min(size, length * 0.7);
  const halfWidth = headLength * 0.46;
  const baseX = x2 - ux * headLength;
  const baseY = y2 - uy * headLength;
  const px = -uy;
  const py = ux;
  return {
    lineEnd: {x: baseX, y: baseY},
    points: `${x2},${y2} ${baseX + px * halfWidth},${baseY + py * halfWidth} ${baseX - px * halfWidth},${baseY - py * halfWidth}`,
  };
}

export function wordTranslate(item: Pick<WordLayout, "direction" | "word">): string {
  if (hasManualPosition(item.word)) return "translate(-50%, -50%)";
  return ({
    n: "translate(-50%, -100%)",
    ne: "translate(0, -100%)",
    e: "translate(0, -50%)",
    se: "translate(0, 0)",
    s: "translate(-50%, 0)",
    sw: "translate(-100%, 0)",
    w: "translate(-100%, -50%)",
    nw: "translate(-100%, -100%)",
  } as Record<string, string>)[item.direction] ?? "translate(-50%, -50%)";
}

export function wordTransformOrigin(item: Pick<WordLayout, "direction" | "word">): string {
  if (hasManualPosition(item.word)) return "center";
  return ({
    n: "bottom center",
    ne: "bottom left",
    e: "center left",
    se: "top left",
    s: "top center",
    sw: "top right",
    w: "center right",
    nw: "bottom right",
  } as Record<string, string>)[item.direction] ?? "center";
}

export function splitByRoot(word: string, root: string): Array<{text: string; highlight: boolean}> {
  if (!root) return [{text: word, highlight: false}];
  const index = word.toLocaleLowerCase().indexOf(root.toLocaleLowerCase());
  if (index < 0) return [{text: word, highlight: false}];
  return [
    {text: word.slice(0, index), highlight: false},
    {text: word.slice(index, index + root.length), highlight: true},
    {text: word.slice(index + root.length), highlight: false},
  ].filter((part) => part.text.length > 0);
}

export function rgbWithOpacity(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const value = Number.parseInt(color.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

export function easeOutBack(value: number): number {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (value - 1) ** 3 + c1 * (value - 1) ** 2;
}

function hasManualPosition(word: {x?: number; y?: number; arrowStart?: unknown; arrowEnd?: unknown}): boolean {
  return word.x !== undefined || word.y !== undefined || word.arrowStart !== undefined || word.arrowEnd !== undefined;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
