import type {FastifyInstance} from "fastify";
import {normalizeProject, ProjectValidationError, type ProjectConfig} from "../../domain/project";
import type {RenderJobResponse, RenderRequest} from "../../shared/api";
import {MAX_PROJECT_DOCUMENT_BYTES} from "../../domain/project-io";
import type {AssetStore} from "../assets";
import {PublicError} from "../errors";
import type {RenderQueue, RenderJobSnapshot} from "../render/queue";
import {sendFileWithRanges} from "../range-response";

export function registerRenderRoutes(
  app: FastifyInstance,
  queue: RenderQueue<{project: ProjectConfig}>,
  assets: AssetStore,
) {
  app.post<{Body: RenderRequest}>("/api/render", {bodyLimit: MAX_PROJECT_DOCUMENT_BYTES}, async (request, reply) => {
    const project = normalizeRequestProject(request.body?.project);
    if (project.background.asset) assets.resolvePath(project.background.asset.id, "video");
    if (project.music.asset) assets.resolvePath(project.music.asset.id, "audio");
    return reply.status(202).send(toResponse(queue.enqueue({project})));
  });

  app.get<{Params: {id: string}}>("/api/jobs/:id", async (request) => toResponse(queue.get(request.params.id)));
  app.get<{Params: {id: string}}>("/api/jobs/:id/video", async (request, reply) => {
    const artifacts = queue.getArtifacts(request.params.id);
    return sendFileWithRanges({reply, path: artifacts.videoFile, mime: "video/mp4", range: request.headers.range});
  });
  app.get<{Params: {id: string}}>("/api/jobs/:id/poster", async (request, reply) => {
    const artifacts = queue.getArtifacts(request.params.id);
    return sendFileWithRanges({reply, path: artifacts.posterFile, mime: "image/png", range: request.headers.range});
  });
}

function normalizeRequestProject(input: unknown): ProjectConfig {
  try {
    return normalizeProject(input);
  } catch (error) {
    if (error instanceof ProjectValidationError) throw new PublicError("project_invalid", 422);
    throw error;
  }
}

function toResponse(job: RenderJobSnapshot): RenderJobResponse {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    ...(job.errorCode ? {errorCode: job.errorCode} : {}),
    ...(job.result ? {result: {videoUrl: `/api/jobs/${job.id}/video`, posterUrl: `/api/jobs/${job.id}/poster`}} : {}),
  };
}
