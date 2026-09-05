import {describe, expect, it, vi} from "vitest";
import {PublicError} from "../../../src/server/errors";
import {RenderQueue} from "../../../src/server/render/queue";

describe("RenderQueue", () => {
  it("runs one job at a time in FIFO order and reports progress", async () => {
    const order: number[] = [];
    const queue = new RenderQueue<number>(async (value, report) => {
      order.push(value);
      report({progress: 0.6, stage: "rendering"});
      await Promise.resolve();
      return {videoFile: `/private/${value}.mp4`, posterFile: `/private/${value}.png`};
    });
    const first = queue.enqueue(1);
    const second = queue.enqueue(2);
    await queue.whenIdle();
    expect(order).toEqual([1, 2]);
    expect(queue.get(first.id)).toMatchObject({status: "succeeded", progress: 1, stage: "complete"});
    expect(queue.get(second.id).result).toEqual({videoReady: true, posterReady: true});
    expect(JSON.stringify(queue.get(first.id))).not.toContain("/private/");
  });

  it("rejects jobs beyond the pending limit", () => {
    const queue = new RenderQueue(async () => new Promise(() => undefined), 1);
    queue.enqueue(1);
    expect(() => queue.enqueue(2)).toThrow(PublicError);
  });

  it("records safe failure codes and rejects invalid ids", async () => {
    const queue = new RenderQueue(async () => { throw new Error("/Users/name/private"); });
    const job = queue.enqueue(1);
    await queue.whenIdle();
    expect(queue.get(job.id)).toMatchObject({status: "failed", errorCode: "render_failed"});
    expect(JSON.stringify(queue.get(job.id))).not.toContain("/Users/");
    expect(() => queue.get("../../bad")).toThrowError(expect.objectContaining({code: "render_job_not_found"}));
  });

  it("expires completed jobs and releases their artifacts", async () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const queue = new (RenderQueue as any)(
      async () => ({videoFile: "/private/video.mp4", posterFile: "/private/poster.png"}),
      3,
      {retentionMs: 1_000, onExpire},
    ) as RenderQueue<number>;
    const job = queue.enqueue(1);
    await queue.whenIdle();

    await vi.advanceTimersByTimeAsync(1_001);

    expect(() => queue.get(job.id)).toThrowError(expect.objectContaining({code: "render_job_not_found"}));
    expect(onExpire).toHaveBeenCalledWith({videoFile: "/private/video.mp4", posterFile: "/private/poster.png"});
    vi.useRealTimers();
  });

  it("keeps completed jobs by default instead of deleting local output unexpectedly", async () => {
    vi.useFakeTimers();
    const queue = new RenderQueue<number>(async () => ({videoFile: "/private/video.mp4", posterFile: "/private/poster.png"}));
    const job = queue.enqueue(1);
    await queue.whenIdle();

    await vi.advanceTimersByTimeAsync(25 * 60 * 60 * 1_000);

    expect(queue.get(job.id)).toMatchObject({status: "succeeded"});
    vi.useRealTimers();
  });
});
