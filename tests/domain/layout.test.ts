import {describe, expect, it} from "vitest";
import {applyCanvasPreset, createDefaultProject, type CanvasPreset} from "../../src/domain/project";
import {
  arrowLengthGroupForDirection,
  computeLayout,
  slotOrderForCount,
  usedArrowLengthGroups,
} from "../../src/domain/layout";

describe("radial layout", () => {
  it("uses the expected six-word order and all four preset canvases", () => {
    expect(slotOrderForCount(6, "manual")).toEqual(["ne", "n", "nw", "sw", "s", "se"]);

    for (const preset of ["9:16", "16:9", "3:4", "4:3"] as CanvasPreset[]) {
      const project = applyCanvasPreset(createDefaultProject(), preset);
      const layout = computeLayout(project);
      expect(layout.words).toHaveLength(6);
      for (const word of layout.words) {
        expect(word.label.x).toBeGreaterThanOrEqual(0);
        expect(word.label.x).toBeLessThanOrEqual(1);
        expect(word.label.y).toBeGreaterThanOrEqual(0);
        expect(word.label.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it("places schoolmate below the center and classmate at the lower right", () => {
    const project = createDefaultProject();
    const layout = computeLayout(project);

    expect(layout.words.find((item) => item.word.text === "schoolmate")?.direction).toBe("s");
    expect(layout.words.find((item) => item.word.text === "classmate")?.direction).toBe("se");
  });

  it("preserves manual word and arrow positions", () => {
    const project = createDefaultProject();
    project.words[0] = {
      ...project.words[0],
      x: 0.7,
      y: 0.2,
      arrowStart: {x: 0.4, y: 0.5},
      arrowEnd: {x: 0.65, y: 0.24},
    };

    const word = computeLayout(project).words[0];

    expect(word.label).toEqual({x: 0.7, y: 0.2});
    expect(word.arrow).toEqual({start: {x: 0.4, y: 0.5}, end: {x: 0.65, y: 0.24}});
  });

  it("starts automatic arrows at the configured center circle edge", () => {
    const project = createDefaultProject();
    const initial = computeLayout(project);
    const initialDistance = pixelDistance(initial.center, initial.words[0].arrow.start, project.canvas);

    project.style.center.sizeRatio = 0.16;
    const smaller = computeLayout(project);
    const smallerDistance = pixelDistance(smaller.center, smaller.words[0].arrow.start, project.canvas);

    expect(smallerDistance).toBeLessThan(initialDistance);
    expect(smallerDistance).toBeCloseTo(Math.min(project.canvas.width, project.canvas.height) * 0.16 * 0.5, 0);
  });

  it("applies grouped arrow lengths to matching directions", () => {
    const project = createDefaultProject();
    project.layout.arrowLengths = {vertical: 0.5, nwSe: 0.5, neSw: 0.5};
    const short = computeLayout(project);
    project.layout.arrowLengths.vertical = 0.9;
    const long = computeLayout(project);

    expect(arrowPixels(long, "n", project)).toBeGreaterThan(arrowPixels(short, "n", project));
    expect(arrowPixels(long, "ne", project)).toBeCloseTo(arrowPixels(short, "ne", project), 5);
    expect(arrowLengthGroupForDirection("nw")).toBe("nwSe");
    expect(usedArrowLengthGroups(project)).toEqual(["vertical", "nwSe", "neSw"]);
  });

  it("scales all labels consistently for long words and warns for dense layouts", () => {
    const project = createDefaultProject();
    project.words[0].text = "intercontinentalism";
    project.words.push(
      {text: "roommate", meaningZh: "室友"},
      {text: "deskmate", meaningZh: "同桌"},
      {text: "shipmate", meaningZh: "船友"},
    );

    const layout = computeLayout(project);

    expect(layout.warnings).toEqual(expect.arrayContaining(["layout.long_words", "layout.reused_directions"]));
    expect(new Set(layout.words.map((word) => word.fontScale)).size).toBe(1);
  });

  it("assigns newly added words to unused directions before reusing occupied slots", () => {
    const project = createDefaultProject();
    project.words.push({text: "roommate", meaningZh: "室友"});

    const layout = computeLayout(project);

    expect(layout.words[6]?.direction).toBe("w");
    expect(layout.words[6]?.label).not.toEqual(layout.words[5]?.label);
  });

  it("warns when manually assigned word labels overlap", () => {
    const project = createDefaultProject();
    project.words[1] = {...project.words[1], direction: "ne"};

    const layout = computeLayout(project);

    expect(layout.warnings).toContain("layout.overlapping_labels");
  });
});

function pixelDistance(
  first: {x: number; y: number},
  second: {x: number; y: number},
  canvas: {width: number; height: number},
) {
  return Math.hypot((second.x - first.x) * canvas.width, (second.y - first.y) * canvas.height);
}

function arrowPixels(
  layout: ReturnType<typeof computeLayout>,
  direction: string,
  project: ReturnType<typeof createDefaultProject>,
) {
  const word = layout.words.find((item) => item.direction === direction);
  if (!word) throw new Error(`Missing direction ${direction}`);
  return pixelDistance(word.arrow.start, word.arrow.end, project.canvas);
}
