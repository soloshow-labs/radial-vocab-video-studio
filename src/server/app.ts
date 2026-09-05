import multipart from "@fastify/multipart";
import Fastify, {type FastifyRequest} from "fastify";
import type {AssetKind} from "../domain/project";
import type {HealthResponse, SessionResponse, UploadAssetResponse} from "../shared/api";
import {AssetStore} from "./assets";
import type {ServerConfig} from "./config";
import {PublicError, publicErrorBody} from "./errors";
import type {MediaInspector} from "./media";
import {registerTtsRoutes} from "./routes/tts";
import {registerRenderRoutes} from "./routes/render";
import {createSecurityHook} from "./security";
import {createAzureSpeechProvider} from "./tts/azure-speech";
import type {TtsProvider} from "./tts/types";
import {limitTtsConcurrency} from "./tts/limit";
import {RenderQueue} from "./render/queue";
import {RenderResourceRegistry, registerRenderResourceRoute} from "./render/resources";
import type {ProjectConfig} from "../domain/project";
import {sendFileWithRanges} from "./range-response";

export type ServerDependencies = {
  mediaInspector?: MediaInspector;
  assetStore?: AssetStore;
  ttsProvider?: TtsProvider;
  renderQueue?: RenderQueue<{project: ProjectConfig}>;
};

export function buildServer(config: ServerConfig, dependencies: ServerDependencies = {}) {
  const app = Fastify({logger: false, bodyLimit: config.videoMaxBytes + 1024 * 1024});
  const assets = dependencies.assetStore ?? new AssetStore(config.storageDir, dependencies.mediaInspector);
  const tts = limitTtsConcurrency(dependencies.ttsProvider ?? createAzureSpeechProvider());
  const resources = new RenderResourceRegistry();
  let projectRenderer: Awaited<ReturnType<typeof loadProjectRenderer>> | undefined;
  const renderQueue = dependencies.renderQueue ?? new RenderQueue<{project: ProjectConfig}>(
    async (input, report) => {
      projectRenderer ??= await loadProjectRenderer(config, assets, tts, resources);
      return projectRenderer(input, report);
    },
    3,
  );

  app.register(multipart, {
    limits: {files: 1, fields: 0, parts: 1, fileSize: config.videoMaxBytes},
  });
  app.addHook("onRequest", createSecurityHook(config));
  app.setErrorHandler((error, _request, reply) => {
    if (isBodyTooLargeError(error)) {
      return reply.status(413).send({error: {code: "request_too_large"}});
    }
    const status = error instanceof PublicError ? error.statusCode : 500;
    return reply.status(status).send(publicErrorBody(error));
  });

  app.get<{Reply: HealthResponse}>("/api/health", async () => ({ok: true, version: 1, mode: "local"}));
  app.get<{Reply: SessionResponse}>("/api/session", async () => ({sessionToken: config.sessionToken}));
  registerRenderResourceRoute(app, resources);

  app.post<{Reply: UploadAssetResponse}>("/api/assets/video", async (request, reply) => {
    const asset = await saveUpload(request, assets, "video", config.videoMaxBytes);
    return reply.status(201).send({asset});
  });
  app.post<{Reply: UploadAssetResponse}>("/api/assets/audio", async (request, reply) => {
    const asset = await saveUpload(request, assets, "audio", config.audioMaxBytes);
    return reply.status(201).send({asset});
  });
  app.get<{Params: {id: string}}>("/api/assets/:id/content", async (request, reply) => {
    const resource = assets.resolveResource(request.params.id);
    return sendFileWithRanges({reply, path: resource.path, mime: resource.mime, range: request.headers.range});
  });
  registerTtsRoutes(app, tts);
  registerRenderRoutes(app, renderQueue, assets);

  return Object.assign(app, {assetStore: assets, renderQueue});
}

function isBodyTooLargeError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && error.code === "FST_ERR_CTP_BODY_TOO_LARGE";
}

async function loadProjectRenderer(config: ServerConfig, assets: AssetStore, tts: TtsProvider, resources: RenderResourceRegistry) {
  const {createProjectRenderer} = await import("./render/renderer");
  return createProjectRenderer({config, assets, tts, resources});
}


async function saveUpload(
  request: FastifyRequest,
  assets: AssetStore,
  kind: AssetKind,
  maxBytes: number,
) {
  const file = await request.file({limits: {fileSize: maxBytes}});
  if (!file) throw new PublicError("upload_required", 400);
  return assets.put({kind, displayName: file.filename, mime: file.mimetype, stream: file.file, maxBytes});
}
