import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ContentPanel} from "../../src/features/content/ContentPanel";
import {createDefaultProject} from "../../src/domain/project";
import {I18nProvider} from "../../src/i18n/I18nProvider";

describe("content panel speech preview", () => {
  it("explains why bulk parsing is unavailable", () => {
    render(
      <I18nProvider>
        <ContentPanel
          project={createDefaultProject()}
          dispatch={vi.fn()}
          onPreviewSpeech={vi.fn()}
          previewingSpeech={false}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", {name: "识别并填充"})).toBeDisabled();
    expect(screen.getByText("请先粘贴至少一行“英文 + 中文”内容。")).toBeInTheDocument();
  });

  it("passes both English and Chinese content to word previews", async () => {
    const user = userEvent.setup();
    const onPreviewSpeech = vi.fn();
    render(
      <I18nProvider>
        <ContentPanel
          project={createDefaultProject()}
          dispatch={vi.fn()}
          onPreviewSpeech={onPreviewSpeech}
          previewingSpeech={false}
        />
      </I18nProvider>,
    );

    await user.click(screen.getByRole("button", {name: "试听 1"}));

    expect(onPreviewSpeech).toHaveBeenCalledWith("teammate", "队友");
  });

  it("recognizes one-space English and Chinese rows and uses the first row as root", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <I18nProvider>
        <ContentPanel
          project={createDefaultProject()}
          dispatch={dispatch}
          onPreviewSpeech={vi.fn()}
          previewingSpeech={false}
        />
      </I18nProvider>,
    );

    await user.type(screen.getByLabelText("批量粘贴"), "postman 邮递员\nfisherman 渔夫\nsportsman 运动员\ngentleman 绅士");
    await user.click(screen.getByRole("checkbox", {name: "首组作为词根 / 词缀"}));
    await user.click(screen.getByRole("button", {name: "识别并填充"}));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "project.replace",
      project: expect.objectContaining({
        name: "postman",
        root: expect.objectContaining({text: "postman", meaningZh: "邮递员"}),
        words: [
          {text: "fisherman", meaningZh: "渔夫"},
          {text: "sportsman", meaningZh: "运动员"},
          {text: "gentleman", meaningZh: "绅士"},
        ],
      }),
    }));
  });

  it("renders recognize as the same outlined action style as add word", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <ContentPanel
          project={createDefaultProject()}
          dispatch={vi.fn()}
          onPreviewSpeech={vi.fn()}
          previewingSpeech={false}
        />
      </I18nProvider>,
    );

    await user.type(screen.getByLabelText("批量粘贴"), "postman 邮递员");

    expect(screen.getByRole("button", {name: "识别并填充"})).toHaveClass("text-action--outlined");
    expect(screen.getByRole("button", {name: "添加单词"})).toHaveClass("text-action--outlined");
  });
});
