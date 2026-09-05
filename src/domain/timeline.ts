import type {ProjectConfig} from "./project";

export type SpeechSegment = {
  id: string;
  kind: "root" | "word";
  text: string;
  secondaryText?: string;
  wordIndex?: number;
};

export type TimelineItem = SpeechSegment & {
  startSec: number;
  durationSec: number;
  audioDurationSec: number;
  revealSec: number;
};

export type Timeline = {
  introHoldSec: number;
  finalHoldSec: number;
  items: TimelineItem[];
  totalSec: number;
};

export const INTRO_HOLD_SEC = 0.8;
export const FINAL_HOLD_SEC = 1;
export const ARROW_REVEAL_SEC = 0.35;
export const WORD_REVEAL_SEC = 0.25;
const MIN_WORD_HOLD_SEC = 0.35;
const MIN_ROOT_HOLD_SEC = 0.8;

export function buildSpeechSegments(project: ProjectConfig): SpeechSegment[] {
  const withChinese = project.voice.speakChinese;
  return [
    {
      id: "root",
      kind: "root" as const,
      text: project.root.text,
      ...(withChinese ? {secondaryText: project.root.meaningZh} : {}),
    },
    ...project.words.map((word, wordIndex) => ({
      id: `word-${wordIndex}`,
      kind: "word" as const,
      wordIndex,
      text: word.text,
      ...(withChinese ? {secondaryText: word.meaningZh} : {}),
    })),
  ];
}

export function buildTimeline(project: ProjectConfig, durationsSec: number[]): Timeline {
  const segments = buildSpeechSegments(project);
  if (durationsSec.length !== segments.length) {
    throw new Error("timeline.segment_count_mismatch");
  }

  let cursor = INTRO_HOLD_SEC;
  const items = segments.map((segment, index): TimelineItem => {
    const rawDuration = durationsSec[index];
    if (!Number.isFinite(rawDuration)) throw new Error(`timeline.invalid_duration.${index}`);

    const audioDurationSec = Math.max(0.2, rawDuration);
    const minimum = segment.kind === "root" ? MIN_ROOT_HOLD_SEC : ARROW_REVEAL_SEC + WORD_REVEAL_SEC + MIN_WORD_HOLD_SEC;
    const durationSec = Math.max(audioDurationSec, minimum);
    const startSec = cursor;
    cursor += durationSec;
    return {...segment, startSec, durationSec, audioDurationSec, revealSec: startSec};
  });

  return {
    introHoldSec: INTRO_HOLD_SEC,
    finalHoldSec: FINAL_HOLD_SEC,
    items,
    totalSec: cursor + FINAL_HOLD_SEC,
  };
}

export function createPreviewTimeline(project: ProjectConfig): Timeline {
  const durations = buildSpeechSegments(project).map((segment) => {
    const characterCount = segment.text.length + (segment.secondaryText?.length ?? 0);
    return Math.max(0.55, characterCount * 0.075);
  });
  return buildTimeline(project, durations);
}
