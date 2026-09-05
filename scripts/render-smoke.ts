import {mkdtemp, rmdir, unlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {createDefaultProject} from "../src/domain/project";
import {buildServer} from "../src/server/app";
import type {ServerConfig} from "../src/server/config";
import type {TtsProvider} from "../src/server/tts/types";

const port = 4327;
const storageDir = await mkdtemp(join(tmpdir(), "radial-render-smoke-"));
const config: ServerConfig = {
  host: "127.0.0.1",
  port,
  uiOrigin: "http://127.0.0.1:5173",
  sessionToken: "render-smoke-session",
  storageDir,
  videoMaxBytes: 1024,
  audioMaxBytes: 1024,
};
const tts: TtsProvider = {
  configured: true,
  listVoices: async () => [],
  async testConnection() {},
  async synthesize() {
    return {audio: silentWave(0.32), mime: "audio/wav", durationSec: 0.32};
  },
};
const server = buildServer(config, {ttsProvider: tts});
const execFileAsync = promisify(execFile);
let artifacts: {videoFile: string; posterFile: string} | undefined;

try {
  await server.listen({host: config.host, port});
  const project = createDefaultProject();
  project.canvas = {preset: "16:9", width: 640, height: 360, fps: 12};
  project.words = project.words.slice(0, 2);
  const queued = await fetch(`http://${config.host}:${port}/api/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: config.uiOrigin,
      "X-Radial-Session": config.sessionToken,
    },
    body: JSON.stringify({project}),
  });
  if (!queued.ok) throw new Error(`queue failed: ${queued.status} ${await queued.text()}`);
  const job = await queued.json() as {id: string};

  for (;;) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    const status = await fetch(`http://${config.host}:${port}/api/jobs/${job.id}`).then((response) => response.json()) as {
      status: string;
      errorCode?: string;
      result?: {videoUrl: string; posterUrl: string};
    };
    if (status.status === "failed") throw new Error(status.errorCode ?? "render failed");
    if (status.status !== "succeeded" || !status.result) continue;
    artifacts = server.renderQueue.getArtifacts(job.id);
    const video = await fetch(`http://${config.host}:${port}${status.result.videoUrl}`);
    const poster = await fetch(`http://${config.host}:${port}${status.result.posterUrl}`);
    if (!video.ok || !poster.ok) throw new Error("render artifacts are unavailable");
    const streams = await probeStreams(`http://${config.host}:${port}${status.result.videoUrl}`);
    if (streams && (!streams.includes("video") || !streams.includes("audio"))) {
      throw new Error("rendered MP4 must contain video and audio streams");
    }
    console.log(JSON.stringify({
      ok: true,
      videoBytes: (await video.arrayBuffer()).byteLength,
      posterBytes: (await poster.arrayBuffer()).byteLength,
      streams: streams ?? "ffprobe-unavailable",
    }));
    break;
  }
} finally {
  await server.close();
  if (artifacts) {
    await unlink(artifacts.videoFile).catch(() => undefined);
    await unlink(artifacts.posterFile).catch(() => undefined);
    await rmdir(dirname(artifacts.videoFile)).catch(() => undefined);
  }
  await rmdir(join(storageDir, "jobs")).catch(() => undefined);
  await rmdir(storageDir).catch(() => undefined);
}

async function probeStreams(url: string): Promise<string[] | undefined> {
  try {
    const {stdout} = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", url,
    ]);
    return ((JSON.parse(stdout) as {streams?: Array<{codec_type?: string}>}).streams ?? [])
      .map((stream) => stream.codec_type)
      .filter((stream): stream is string => Boolean(stream));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function silentWave(durationSec: number): Buffer {
  const sampleRate = 24_000;
  const samples = Math.round(sampleRate * durationSec);
  const dataLength = samples * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}
