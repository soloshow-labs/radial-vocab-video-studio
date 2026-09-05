import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {createDefaultProject} from "../../src/domain/project";
import {AudioPanel} from "../../src/features/audio/AudioPanel";
import {I18nProvider} from "../../src/i18n/I18nProvider";
import type {TtsVoice} from "../../src/shared/api";

const voices: TtsVoice[] = [
  {shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female"},
  {shortName: "en-GB-SoniaNeural", locale: "en-GB", localName: "Sonia", gender: "female"},
  {shortName: "zh-CN-XiaoxiaoNeural", locale: "zh-CN", localName: "晓晓", gender: "female"},
  {shortName: "zh-CN-YunxiNeural", locale: "zh-CN", localName: "云希", gender: "male"},
];

describe("audio panel voices", () => {
  it("separates English and Chinese voices without exposing credentials", () => {
    const project = createDefaultProject();
    renderPanel(project);

    expect(screen.getByLabelText("英文声音")).toHaveValue("en-US-JennyNeural");
    expect(screen.getByLabelText("中文声音")).toBeDisabled();
    expect(screen.getByText("凭据仅从本地 .env 读取")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/AZURE_SPEECH_KEY|private-key/);
  });

  it("updates the Chinese voice independently", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const project = createDefaultProject();
    project.voice.speakChinese = true;
    renderPanel(project, dispatch);

    await user.selectOptions(screen.getByLabelText("中文声音"), "zh-CN-YunxiNeural");
    expect(dispatch).toHaveBeenCalledWith({type: "voice.update", patch: {chineseVoice: "zh-CN-YunxiNeural"}});
  });
});

function renderPanel(project = createDefaultProject(), dispatch = vi.fn()) {
  return render(
    <I18nProvider>
      <AudioPanel
        project={project}
        dispatch={dispatch}
        onMusicFile={vi.fn()}
        uploading={false}
        ttsState="configured"
        voices={voices}
        voicesLoading={false}
        voicesFailed={false}
        onTest={vi.fn()}
        onPreview={vi.fn()}
        previewing={false}
      />
    </I18nProvider>,
  );
}
