import {describe, expect, it} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {buildSpeechSegments, buildTimeline} from "../../src/domain/timeline";

describe("narration timeline", () => {
  it("builds root-first English segments by default", () => {
    const segments = buildSpeechSegments(createDefaultProject());

    expect(segments.map((segment) => segment.text)).toEqual([
      "mate",
      "teammate",
      "workmate",
      "soulmate",
      "playmate",
      "classmate",
      "schoolmate",
    ]);
  });

  it("includes Chinese meanings only when enabled", () => {
    const project = createDefaultProject();
    project.voice.speakChinese = true;

    expect(buildSpeechSegments(project)[0]).toMatchObject({text: "mate", secondaryText: "伙伴"});
    expect(buildSpeechSegments(project)[1]).toMatchObject({text: "teammate", secondaryText: "队友"});
  });

  it("builds a monotonic timeline with reveal minimums", () => {
    const timeline = buildTimeline(createDefaultProject(), [0.5, 0.7, 0.8, 0.9, 0.6, 0.7, 0.8]);

    expect(timeline.introHoldSec).toBe(0.8);
    expect(timeline.finalHoldSec).toBe(1);
    expect(timeline.items).toHaveLength(7);
    expect(timeline.items[0].audioDurationSec).toBe(0.5);
    expect(timeline.items[0].durationSec).toBe(0.8);
    for (let index = 1; index < timeline.items.length; index += 1) {
      expect(timeline.items[index].startSec).toBeGreaterThan(timeline.items[index - 1].startSec);
    }
    expect(timeline.totalSec).toBeGreaterThan(7);
  });

  it("rejects missing and invalid audio durations", () => {
    const project = createDefaultProject();

    expect(() => buildTimeline(project, [0.5])).toThrowError("timeline.segment_count_mismatch");
    expect(() => buildTimeline(project, [0.5, 0.7, Number.NaN, 0.9, 0.6, 0.7, 0.8])).toThrowError(
      "timeline.invalid_duration.2",
    );
  });
});
