import {randomUUID} from "node:crypto";
import {PublicError} from "../errors";

export type RenderJobStatus = "queued" | "running" | "succeeded" | "failed";
export type RenderProgress = {progress: number; stage: string};
export type RenderArtifacts = {videoFile: string; posterFile: string};
export type RenderJobSnapshot = {
  id: string;
  status: RenderJobStatus;
  progress: number;
  stage: string;
  errorCode?: string;
  result?: {videoReady: true; posterReady: true};
};

type Worker<T> = (payload: T, report: (progress: RenderProgress) => void) => Promise<RenderArtifacts>;
type InternalJob<T> = RenderJobSnapshot & {payload: T; artifacts?: RenderArtifacts};
type RenderQueueOptions = {
  retentionMs?: number;
  onExpire?: (artifacts: RenderArtifacts | undefined) => void | Promise<void>;
};

export class RenderQueue<T> {
  private readonly jobs = new Map<string, InternalJob<T>>();
  private readonly pending: Array<InternalJob<T>> = [];
  private active = false;
  private idleWaiters: Array<() => void> = [];

  constructor(
    private readonly worker: Worker<T>,
    private readonly maxPending = 3,
    private readonly options: RenderQueueOptions = {},
  ) {}

  enqueue(payload: T): RenderJobSnapshot {
    if (this.pending.length >= this.maxPending) throw new PublicError("render_queue_full", 429);
    const job: InternalJob<T> = {
      id: randomUUID().replaceAll("-", ""),
      status: "queued",
      progress: 0,
      stage: "queued",
      payload,
    };
    this.jobs.set(job.id, job);
    this.pending.push(job);
    queueMicrotask(() => void this.runNext());
    return toPublic(job);
  }

  get(id: string): RenderJobSnapshot {
    return toPublic(this.getInternal(id));
  }

  getArtifacts(id: string): RenderArtifacts {
    const job = this.getInternal(id);
    if (job.status !== "succeeded" || !job.artifacts) throw new PublicError("render_not_ready", 409);
    return job.artifacts;
  }

  whenIdle(): Promise<void> {
    if (!this.active && this.pending.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private getInternal(id: string): InternalJob<T> {
    if (!/^[a-f0-9]{32}$/.test(id)) throw new PublicError("render_job_not_found", 404);
    const job = this.jobs.get(id);
    if (!job) throw new PublicError("render_job_not_found", 404);
    return job;
  }

  private async runNext(): Promise<void> {
    if (this.active) return;
    const job = this.pending.shift();
    if (!job) {
      this.resolveIdle();
      return;
    }
    this.active = true;
    job.status = "running";
    job.stage = "preparing";
    try {
      job.artifacts = await this.worker(job.payload, ({progress, stage}) => {
        job.progress = clamp(progress);
        job.stage = stage;
      });
      job.status = "succeeded";
      job.progress = 1;
      job.stage = "complete";
      job.result = {videoReady: true, posterReady: true};
    } catch (error) {
      job.status = "failed";
      job.progress = 0;
      job.stage = "failed";
      job.errorCode = error instanceof PublicError ? error.code : "render_failed";
    } finally {
      this.active = false;
      this.scheduleExpiry(job);
      queueMicrotask(() => void this.runNext());
    }
  }

  private scheduleExpiry(job: InternalJob<T>): void {
    const retentionMs = this.options.retentionMs;
    if (retentionMs === undefined) return;
    const timer = setTimeout(() => {
      if (!this.jobs.delete(job.id)) return;
      void Promise.resolve(this.options.onExpire?.(job.artifacts)).catch(() => undefined);
    }, Math.max(0, retentionMs));
    timer.unref?.();
  }

  private resolveIdle() {
    for (const resolve of this.idleWaiters.splice(0)) resolve();
  }
}

function toPublic<T>(job: InternalJob<T>): RenderJobSnapshot {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    ...(job.errorCode ? {errorCode: job.errorCode} : {}),
    ...(job.result ? {result: job.result} : {}),
  };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
