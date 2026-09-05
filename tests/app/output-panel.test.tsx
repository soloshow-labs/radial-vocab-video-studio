import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {OutputPanel} from "../../src/features/output/OutputPanel";
import {I18nProvider} from "../../src/i18n/I18nProvider";

describe("output panel", () => {
  beforeEach(() => localStorage.removeItem("radial-vocab.locale"));

  it("shows a prominent localized Chinese validation summary instead of internal codes", () => {
    const project = createDefaultProject();
    project.words[0].meaningZh = "";

    render(
      <I18nProvider>
        <OutputPanel project={project} renderJob={null} />
      </I18nProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("生成前请先修正以下内容");
    expect(screen.getByRole("alert")).toHaveTextContent("第 1 个单词的中文含义不能为空。");
    expect(screen.getByText("发现 1 项需要修正")).toBeInTheDocument();
    expect(screen.queryByText("word.meaning_required")).not.toBeInTheDocument();
    expect(screen.queryByText("尚未选择背景视频")).not.toBeInTheDocument();
  });

  it("uses natural English validation copy in the English interface", () => {
    localStorage.setItem("radial-vocab.locale", "en-US");
    const project = createDefaultProject();
    project.root.text = "";

    render(
      <I18nProvider>
        <OutputPanel project={project} renderJob={null} />
      </I18nProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Fix the following before generating");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a root or affix.");
    expect(screen.getByText("1 item needs attention")).toBeInTheDocument();
    expect(screen.queryByText("root.text_required")).not.toBeInTheDocument();
  });

  it("localizes a failed render instead of exposing a raw error code", () => {
    render(
      <I18nProvider>
        <OutputPanel
          project={createDefaultProject()}
          renderJob={{id: "a".repeat(32), status: "failed", progress: 0, stage: "failed", errorCode: "tts_authentication_failed"}}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(screen.getByText("Azure Speech 凭据无效，请检查环境变量。")).toBeInTheDocument();
    expect(screen.queryByText("tts_authentication_failed")).not.toBeInTheDocument();
  });
});
