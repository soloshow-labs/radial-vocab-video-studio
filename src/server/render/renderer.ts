import {bundle} from "@remotion/bundler";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import {existsSync} from "node:fs";
import {mkdir, rmdir, unlink, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";
import type {ProjectConfig} from "../../domain/project";
import {buildSpeechSegments, buildTimeline} from "../../domain/timeline";
import type {RadialVideoProps} from "../../remotion/types";
import type {ServerConfig} from "../config";
import type {TtsProvider} from "../tts/types";
import type {AssetStore} from "../assets";
import type {RenderArtifacts, RenderProgress} from "./queue";
import {RenderResourceRegistry} from "./resources";

type RenderInput = {project: ProjectConfig};
type Report = (progress: RenderProgress) => void;

export type ProjectRenderer = (input: RenderInput, report: Report) => Promise<RenderArtifacts>;

export function createProjectRenderer(options: {
  config: ServerConfig;
  assets: AssetStore;
  tts: TtsProvider;
  resources: RenderResourceRegistry;
  entryPoint?: string;
}): ProjectRenderer {
  let bundlePromise: Promise<string> | undefined;
  const getBundle = () => {
    bundlePromise ??= bundle({
      entryPoint: options.entryPoint ?? resolve(process.cwd(), "src/remotion/index.ts"),
      onProgress: () => undefined,
    }).catch((error) => {
      bundlePromise = undefined;
      throw error;
    });
    return bundlePromise;
  };
  const browserExecutable = resolveBrowserExecutable(process.env);

  return async ({project}, report) => {
    const jobId = crypto.randomUUID().replaceAll("-", "");
    const jobDirectory = join(options.config.storageDir, "jobs", jobId);
    const writtenFiles: string[] = [];
    const registeredTokens: string[] = [];
    await mkdir(jobDirectory, {recursive: true, mode: 0o700});

    try {
      report({progress: 0.03, stage: "speech"});
      const segments = buildSpeechSegments(project);
      const synthesized = [];
      for (const [index, segment] of segments.entries()) {
        const result = await options.tts.synthesize({
          text: segment.text,
          voice: project.voice.voice,
          ...(segment.secondaryText ? {
            secondaryText: segment.secondaryText,
            secondaryVoice: project.voice.chineseVoice,
          } : {}),
          rate: project.voice.rate,
          breakMs: project.voice.breakMs,
        });
        const audioPath = join(jobDirectory, `speech-${index}.wav`);
        await writeFile(audioPath, result.audio, {mode: 0o600});
        writtenFiles.push(audioPath);
        synthesized.push({audioPath, durationSec: result.durationSec});
        report({progress: 0.03 + ((index + 1) / segments.length) * 0.22, stage: "speech"});
      }

      const timeline = buildTimeline(project, synthesized.map((item) => item.durationSec));
      const narrations = synthesized.map((item, index) => {
        const token = options.resources.register({path: item.audioPath, mime: "audio/wav"});
        registeredTokens.push(token);
        return {startSec: timeline.items[index].startSec, url: resourceUrl(options.config, token)};
      });

      let backgroundUrl: string | undefined;
      let backgroundDurationSec = 0;
      if (project.background.asset) {
        const resource = options.assets.resolveResource(project.background.asset.id, "video");
        const token = options.resources.register(resource);
        registeredTokens.push(token);
        backgroundUrl = resourceUrl(options.config, token);
        backgroundDurationSec = resource.durationSec;
      }

      let musicUrl: string | undefined;
      if (project.music.asset) {
        const resource = options.assets.resolveResource(project.music.asset.id, "audio");
        const token = options.resources.register(resource);
        registeredTokens.push(token);
        musicUrl = resourceUrl(options.config, token);
      }

      const inputProps: RadialVideoProps = {project, timeline, narrations, backgroundUrl, backgroundDurationSec, musicUrl};
      report({progress: 0.28, stage: "preparing"});
      const serveUrl = await getBundle();
      const composition = await selectComposition({
        serveUrl,
        id: "RadialVocabVideo",
        inputProps: inputProps as unknown as Record<string, unknown>,
        logLevel: "warn",
        ...(browserExecutable ? {browserExecutable} : {}),
      });

      const posterFile = join(jobDirectory, "poster.png");
      await renderStill({
        composition,
        serveUrl,
        inputProps: inputProps as unknown as Record<string, unknown>,
        output: posterFile,
        frame: Math.max(0, composition.durationInFrames - 1),
        imageFormat: "png",
        overwrite: true,
        logLevel: "warn",
        ...(browserExecutable ? {browserExecutable} : {}),
      });
      writtenFiles.push(posterFile);
      report({progress: 0.35, stage: "rendering"});

      const videoFile = join(jobDirectory, "video.mp4");
      await renderMedia({
        composition,
        serveUrl,
        inputProps: inputProps as unknown as Record<string, unknown>,
        codec: "h264",
        audioCodec: "aac",
        outputLocation: videoFile,
        overwrite: true,
        logLevel: "warn",
        ...(browserExecutable ? {browserExecutable} : {}),
        onProgress: ({progress}) => report({progress: 0.35 + progress * 0.64, stage: "rendering"}),
      });
      writtenFiles.push(videoFile);
      for (const file of synthesized.map((item) => item.audioPath)) {
        await unlink(file).catch(() => undefined);
        const writtenIndex = writtenFiles.indexOf(file);
        if (writtenIndex >= 0) writtenFiles.splice(writtenIndex, 1);
      }
      return {videoFile, posterFile};
    } catch (error) {
      for (const file of writtenFiles.reverse()) await unlink(file).catch(() => undefined);
      await rmdir(jobDirectory).catch(() => undefined);
      throw error;
    } finally {
      for (const token of registeredTokens) options.resources.revoke(token);
    }
  };
}

export function resolveBrowserExecutable(env: NodeJS.ProcessEnv): string | undefined {
  const configured = env.RADIAL_BROWSER_EXECUTABLE?.trim();
  if (configured && existsSync(configured)) return configured;
  const candidates = process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    : process.platform === "win32"
      ? [
          `${env.PROGRAMFILES ?? "C:\\Program Files"}\\Google\\Chrome\\Application\\chrome.exe`,
          `${env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)"}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((candidate) => existsSync(candidate));
}

function resourceUrl(config: ServerConfig, token: string): string {
  return `http://${config.host}:${config.port}/internal/render-resources/${token}`;
}
