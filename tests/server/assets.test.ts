import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Readable} from "node:stream";
import {describe, expect, it} from "vitest";
import {AssetStore, sanitizeDisplayName} from "../../src/server/assets";
import {PublicError} from "../../src/server/errors";

describe("AssetStore", () => {
  it("stores media behind opaque ids and never exposes paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-assets-"));
    const store = new AssetStore(root, async () => ({durationSec: 2, hasVideo: true, hasAudio: false}));
    const asset = await store.put({kind: "video", displayName: "../lesson.mp4", mime: "video/mp4", stream: Readable.from(Buffer.from("fixture")), maxBytes: 100});
    expect(asset).toEqual({id: expect.stringMatching(/^asset_[a-f0-9]{32}$/), name: "lesson.mp4", kind: "video"});
    expect(JSON.stringify(asset)).not.toContain(root);
    expect(store.resolvePath(asset.id, "video")).toContain("source.mp4");
    const reopened = new AssetStore(root);
    expect(reopened.get(asset.id)).toEqual(asset);
    expect(reopened.resolveResource(asset.id, "video")).toMatchObject({mime: "video/mp4", durationSec: 2});
  });

  it("rejects traversal ids, type mismatches, unsupported files, and oversized uploads", async () => {
    const root = await mkdtemp(join(tmpdir(), "radial-assets-"));
    const store = new AssetStore(root, async () => ({durationSec: 2, hasVideo: true, hasAudio: true}));
    expect(() => store.get("../../etc/passwd")).toThrow(PublicError);
    await expect(store.put({kind: "video", displayName: "clip.exe", mime: "video/mp4", stream: Readable.from("x"), maxBytes: 10})).rejects.toMatchObject({code: "unsupported_media_type"});
    await expect(store.put({kind: "audio", displayName: "music.mp3", mime: "audio/mpeg", stream: Readable.from("too large"), maxBytes: 3})).rejects.toMatchObject({code: "upload_too_large"});
  });

  it("sanitizes display names", () => {
    expect(sanitizeDisplayName("C:\\secret\\folder\\ voice\u0000.mp3")).toBe("voice.mp3");
  });
});
