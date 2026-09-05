import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {createPreviewTimeline} from "../../src/domain/timeline";
import {RadialComposition} from "../../src/preview/RadialComposition";
import {PreviewPanel} from "../../src/preview/PreviewPanel";
import {I18nProvider} from "../../src/i18n/I18nProvider";

describe("radial composition", () => {
  it("renders title, root, meaning, words, and highlighted root", () => {
    const project = createDefaultProject();
    const timeline = createPreviewTimeline(project);
    render(<RadialComposition project={project} timeline={timeline} currentTime={timeline.totalSec} />);

    expect(screen.getByText("秒记单词")).toBeInTheDocument();
    expect(screen.getByTestId("preview-root")).toHaveTextContent("mate伙伴");
    expect(screen.getByText("team", {exact: true})).toBeInTheDocument();
    expect(screen.getAllByText("mate", {exact: true}).length).toBeGreaterThan(1);
    expect(screen.getByText("队友")).toBeInTheDocument();
    expect(document.querySelectorAll(".composition-arrows polygon")).toHaveLength(project.words.length);
  });

  it("applies project colors and hides unrevealed words", () => {
    const project = createDefaultProject();
    project.style.mask.opacity = 0.3;
    project.style.word.highlightColor = "#ff0080";
    const timeline = createPreviewTimeline(project);
    render(<RadialComposition project={project} timeline={timeline} currentTime={0} />);

    expect(screen.getByTestId("preview-mask")).toHaveStyle({opacity: "0.3"});
    expect(screen.queryByText("teammate")).not.toBeInTheDocument();
  });

  it("matches final-render geometry on landscape canvases", () => {
    const project = createDefaultProject();
    project.canvas = {preset: "16:9", width: 1920, height: 1080, fps: 30};
    const timeline = createPreviewTimeline(project);
    render(<RadialComposition project={project} timeline={timeline} currentTime={timeline.totalSec} />);

    expect(screen.getByTestId("preview-root")).toHaveStyle({width: "13.5%", height: "24%"});
    expect(screen.getByText("秒记单词")).toHaveStyle({top: "12%"});
  });

  it("uses the final-render typography in the live preview", () => {
    const project = createDefaultProject();
    const timeline = createPreviewTimeline(project);
    render(<RadialComposition project={project} timeline={timeline} currentTime={timeline.totalSec} />);

    expect(screen.getByText("mate", {selector: ".composition-center__root"})).toHaveStyle({fontWeight: "900", lineHeight: "1"});
    expect(screen.getByText("伙伴")).toHaveStyle({fontWeight: "800", lineHeight: "1.25"});
    const englishWord = screen.getByText("team", {exact: true}).parentElement;
    expect(englishWord).toHaveStyle({fontWeight: "900", lineHeight: "1"});
    expect(englishWord?.closest(".composition-word")).toHaveStyle({textShadow: "none"});
    expect(screen.getByText("队友")).toHaveStyle({fontWeight: "800", lineHeight: "1.2"});
  });

  it("previews background timing, source volume, and background music", () => {
    const project = createDefaultProject();
    project.background.startSec = 2.5;
    project.background.audioEnabled = true;
    project.background.audioVolume = 0.23;
    project.music.volume = 0.17;
    const timeline = createPreviewTimeline(project);
    const props = {
      project,
      timeline,
      currentTime: 1,
      backgroundUrl: "/background.mp4",
      musicUrl: "/music.mp3",
      playing: false,
    } as Parameters<typeof RadialComposition>[0] & {musicUrl: string; playing: boolean};
    const {container} = render(<RadialComposition {...props} />);

    const video = container.querySelector("video");
    const audio = container.querySelector("audio");
    expect(video?.currentTime).toBe(3.5);
    expect(video?.volume).toBe(0.23);
    expect(audio).toHaveAttribute("src", "/music.mp3");
    expect(audio?.volume).toBe(0.17);
  });

  it("shows a clear warning when manually positioned labels overlap", () => {
    const project = createDefaultProject();
    project.words[1] = {...project.words[1], direction: "ne"};

    render(
      <I18nProvider>
        <PreviewPanel project={project} />
      </I18nProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("部分文字发生重叠，请在“放射布局”中调整方向或位置。");
  });
});
