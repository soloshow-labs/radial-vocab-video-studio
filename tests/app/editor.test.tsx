import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {App} from "../../src/app/App";
import {resetApiSession} from "../../src/app/api";
import {MAX_PROJECT_DOCUMENT_BYTES} from "../../src/domain/project-io";

describe("three-column editor", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetApiSession();
    vi.unstubAllGlobals();
  });

  it("renders Chinese navigation and every functional module", () => {
    render(<App />);

    expect(screen.getByRole("heading", {name: "Radial Vocab"})).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", {name: "视频设置"});
    expect(within(navigation).getByRole("heading", {name: "视频设置"})).toBeInTheDocument();
    for (const label of ["内容设置", "画面设置", "声音与输出"]) {
      expect(within(navigation).getByText(label)).toBeInTheDocument();
    }
    for (const label of ["单词内容", "背景视频", "放射布局", "画面样式", "语音与音乐", "视频输出"]) {
      expect(within(navigation).getByRole("button", {name: label})).toBeInTheDocument();
    }
    expect(within(navigation).queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByText("项目")).toBeInTheDocument();
    expect(screen.getAllByRole("button", {name: "查看说明"}).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", {name: "生成视频"}).closest(".inspector-footer")).not.toBeNull();
    expect(screen.getByRole("link", {name: "GitHub 项目"})).toHaveAttribute(
      "href",
      "https://github.com/soloshow-labs/radial-vocab-video-studio",
    );
    expect(screen.getByRole("region", {name: "视频预览"})).toBeInTheDocument();
  });

  it("switches to English", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", {name: "English"}));

    expect(screen.getByRole("button", {name: "Background video"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Generate video"})).toBeInTheDocument();
  });

  it("runs the public demo without contacting local APIs", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<App demoMode />);

    expect(screen.getByRole("note")).toHaveTextContent("在线体验版支持编辑、导入导出和实时预览");
    expect(screen.getByText("在线体验")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "本地版生成视频"})).toBeDisabled();

    await user.click(screen.getByRole("button", {name: "语音与音乐"}));

    expect(screen.getByText("在线体验版未连接语音服务")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "测试连接"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "试听词根"})).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("previews a background file locally in demo mode without uploading it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    const createObjectURL = vi.fn(() => "blob:demo-video");
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", class extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    const {container} = render(<App demoMode />);

    await user.click(screen.getByRole("button", {name: "背景视频"}));
    const input = container.querySelector<HTMLInputElement>('input[type="file"][accept*="video/mp4"]');
    expect(input).not.toBeNull();
    await user.upload(input!, new File(["video"], "demo.mp4", {type: "video/mp4"}));

    expect(screen.getByText("demo.mp4")).toBeInTheDocument();
    expect(screen.getByText("文件只在当前浏览器标签页中预览，不会上传到服务器。")).toBeInTheDocument();
    expect(container.querySelector("video")).toHaveAttribute("src", "blob:demo-video");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("changes modules without hiding the preview", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", {name: "背景视频"}));

    expect(screen.getByRole("heading", {name: "背景视频"})).toBeInTheDocument();
    expect(screen.getByRole("region", {name: "视频预览"})).toBeInTheDocument();
    expect(screen.getByLabelText("输出比例")).toHaveValue("9:16");
  });

  it("updates root content in the live preview", async () => {
    const user = userEvent.setup();
    render(<App />);

    const rootInput = screen.getByLabelText("词根 / 词缀");
    await user.clear(rootInput);
    await user.type(rootInput, "inter");

    expect(screen.getByTestId("preview-root")).toHaveTextContent("inter");
    expect(screen.getByLabelText("项目名称")).toHaveValue("inter");
  });

  it("preserves a project name the user edits manually", async () => {
    const user = userEvent.setup();
    render(<App />);

    const projectName = screen.getByLabelText("项目名称");
    await user.clear(projectName);
    await user.type(projectName, "消防员视频");
    const rootInput = screen.getByLabelText("词根 / 词缀");
    await user.clear(rootInput);
    await user.type(rootInput, "fireman");

    expect(projectName).toHaveValue("消防员视频");
  });

  it("keeps a word input focused while typing its complete value", async () => {
    const user = userEvent.setup();
    render(<App />);

    const wordInput = screen.getByLabelText("英文 1");
    await user.clear(wordInput);
    await user.type(wordInput, "intermate");

    expect(wordInput).toHaveValue("intermate");
    expect(wordInput).toHaveFocus();
  });

  it("shows an understandable error when an imported project is invalid", async () => {
    const user = userEvent.setup();
    const {container} = render(<App />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]');
    expect(input).not.toBeNull();

    const file = new File(["{broken"], "broken.json", {type: "application/json"});
    Object.defineProperty(file, "text", {value: async () => "{broken"});
    await user.upload(input!, file);

    expect(await screen.findByRole("status")).toHaveTextContent("无法导入项目文件，请检查文件内容。");
  });

  it("rejects an oversized project before reading it", async () => {
    const user = userEvent.setup();
    const {container} = render(<App />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]');
    const file = new File(["x".repeat(MAX_PROJECT_DOCUMENT_BYTES + 1)], "large.json", {
      type: "application/json",
    });
    const read = vi.fn(async () => "{}");
    Object.defineProperty(file, "text", {value: read});

    await user.upload(input!, file);

    expect(await screen.findByRole("status")).toHaveTextContent("项目文件过大，请选择不超过 256 KB 的文件。");
    expect(read).not.toHaveBeenCalled();
  });

  it("re-enables generation when render polling loses the server", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/session") return Response.json({sessionToken: "s".repeat(43)});
      if (url === "/api/render") {
        return Response.json({id: "d".repeat(32), status: "queued", progress: 0, stage: "queued"}, {status: 202});
      }
      throw new TypeError("offline");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    const generate = screen.getByRole("button", {name: "生成视频"});
    await user.click(generate);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("本地服务未启动"), {timeout: 2_000});
    expect(generate).toBeEnabled();
  });

  it("shows the current render percentage on the generate button", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/session") return Response.json({sessionToken: "s".repeat(43)});
      if (url === "/api/render") {
        return Response.json({id: "f".repeat(32), status: "queued", progress: 0, stage: "queued"}, {status: 202});
      }
      if (url === `/api/jobs/${"f".repeat(32)}`) {
        return Response.json({id: "f".repeat(32), status: "running", progress: 0.42, stage: "rendering"});
      }
      throw new TypeError("unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await user.click(screen.getByRole("button", {name: "生成视频"}));

    expect(await screen.findByRole("button", {name: "正在生成 · 42%"})).toBeDisabled();
  });

  it("keeps polling a valid render instead of declaring it failed after 30 minutes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/session") return Response.json({sessionToken: "s".repeat(43)});
      if (url === "/api/render") {
        return Response.json({id: "e".repeat(32), status: "queued", progress: 0, stage: "queued"}, {status: 202});
      }
      if (url === `/api/jobs/${"e".repeat(32)}`) {
        return Response.json({id: "e".repeat(32), status: "running", progress: 0.5, stage: "rendering"});
      }
      throw new TypeError("unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole("button", {name: "生成视频"}));
    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(30 * 60 * 1_000 + 1_000);
    });

    expect(screen.getByRole("button", {name: "正在生成 · 50%"})).toBeDisabled();
    expect(screen.queryByText("视频生成等待超时，请重新尝试。")).not.toBeInTheDocument();
    vi.useRealTimers();
  }, 15_000);

  it("reloads Azure voices after a failed lookup when connection testing succeeds", async () => {
    const user = userEvent.setup();
    let voiceRequests = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/tts/status") return Response.json({configured: true, provider: "azure-speech"});
      if (url === "/api/tts/voices") {
        voiceRequests += 1;
        if (voiceRequests === 1) return Response.json({error: {code: "tts_synthesis_failed"}}, {status: 502});
        return Response.json({voices: [{shortName: "en-US-JennyNeural", locale: "en-US", localName: "Jenny", gender: "female"}]});
      }
      if (url === "/api/session") return Response.json({sessionToken: "s".repeat(43)});
      if (url === "/api/tts/test") return Response.json({ok: true});
      throw new TypeError("unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await user.click(screen.getByRole("button", {name: "语音与音乐"}));
    expect(await screen.findAllByText("使用内置常用音色")).toHaveLength(2);
    await user.click(screen.getByRole("button", {name: "测试连接"}));

    expect(await screen.findAllByText("已加载 1 个音色")).toHaveLength(2);
  });

  it("recovers when browser audio playback never finishes", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:stalled-preview");
    const revokeObjectURL = vi.fn();
    const NativeURL = URL;
    vi.stubGlobal("URL", class extends NativeURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    vi.stubGlobal("Audio", class {
      addEventListener() {}
      play() { return Promise.resolve(); }
      pause() {}
    });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/tts/status") return Response.json({configured: true, provider: "azure-speech"});
      if (url === "/api/tts/voices") return Response.json({voices: []});
      if (url === "/api/session") return Response.json({sessionToken: "s".repeat(43)});
      if (url === "/api/tts/preview") return new Response(new Blob(["audio"]), {status: 200, headers: {"Content-Type": "audio/wav", "X-Audio-Duration-Ms": "1000"}});
      throw new TypeError("unexpected request");
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", {name: "语音与音乐"}));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", {name: "试听词根"}));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("button", {name: "正在试听"})).toBeDisabled();

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

    expect(screen.getByRole("button", {name: "试听词根"})).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("试听超时，请重试。");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:stalled-preview");
  });

  it("recovers when the speech preview request never returns", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/tts/status") return Promise.resolve(Response.json({configured: true, provider: "azure-speech"}));
      if (url === "/api/tts/voices") return Promise.resolve(Response.json({voices: []}));
      if (url === "/api/session") return Promise.resolve(Response.json({sessionToken: "s".repeat(43)}));
      if (url === "/api/tts/preview") {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {once: true});
        });
      }
      return Promise.reject(new TypeError("unexpected request"));
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", {name: "语音与音乐"}));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", {name: "试听词根"}));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole("button", {name: "正在试听"})).toBeDisabled();

    await act(async () => { await vi.advanceTimersByTimeAsync(25_000); });

    expect(screen.getByRole("button", {name: "试听词根"})).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("试听超时，请重试。");
  });

  it("disables generation and explains how many settings need attention", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("中文 1"));

    expect(screen.getByRole("button", {name: "生成视频"})).toBeDisabled();
    expect(screen.getByText("还有 1 项需要修正")).toBeInTheDocument();
  });

  it("opens and focuses the source field when a validation issue is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(screen.getByLabelText("中文 1"));
    await user.click(screen.getByRole("button", {name: "视频输出"}));

    await user.click(screen.getByRole("button", {name: "第 1 个单词的中文含义不能为空。"}));

    expect(screen.getByRole("heading", {name: "单词内容"})).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("中文 1")).toHaveFocus());
  });

  it("never renders local paths or credential field names", () => {
    const {container} = render(<App />);
    expect(container.textContent).not.toMatch(/\/Users\/|[A-Z]:\\|AZURE_SPEECH_KEY|AZURE_SPEECH_REGION/);
  });
});
