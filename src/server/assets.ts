import {randomUUID} from "node:crypto";
import {createReadStream, createWriteStream, existsSync, readdirSync, readFileSync, statSync} from "node:fs";
import {mkdir, rename, rmdir, unlink, writeFile} from "node:fs/promises";
import {basename, extname, join} from "node:path";
import {pipeline} from "node:stream/promises";
import {Transform, type Readable} from "node:stream";
import type {AssetKind, AssetReference} from "../domain/project";
import {PublicError} from "./errors";
import {inspectMedia, type MediaInspection, type MediaInspector} from "./media";

type StoredAsset = AssetReference & {path: string; mime: string; size: number; media: MediaInspection};

export type InternalAssetResource = {
  path: string;
  mime: string;
  durationSec: number;
};

const ALLOWED = {
  video: new Map([
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
    ["video/quicktime", ".mov"],
  ]),
  audio: new Map([
    ["audio/mpeg", ".mp3"],
    ["audio/wav", ".wav"],
    ["audio/x-wav", ".wav"],
    ["audio/mp4", ".m4a"],
    ["audio/aac", ".aac"],
    ["audio/ogg", ".ogg"],
  ]),
} satisfies Record<AssetKind, Map<string, string>>;

export class AssetStore {
  private readonly assets = new Map<string, StoredAsset>();

  constructor(
    private readonly root: string,
    private readonly inspector: MediaInspector = inspectMedia,
  ) {
    this.loadExistingAssets();
  }

  async put(options: {
    kind: AssetKind;
    displayName: string;
    mime: string;
    stream: Readable;
    maxBytes: number;
  }): Promise<AssetReference> {
    const extension = ALLOWED[options.kind].get(options.mime);
    if (!extension || !hasCompatibleExtension(options.displayName, extension)) {
      throw new PublicError("unsupported_media_type", 415);
    }

    const uuid = randomUUID();
    const id = `asset_${uuid.replaceAll("-", "")}`;
    const directory = join(this.root, "assets", uuid);
    const temporaryPath = join(directory, `upload${extension}.part`);
    const finalPath = join(directory, `source${extension}`);
    const displayName = sanitizeDisplayName(options.displayName);
    await mkdir(directory, {recursive: true, mode: 0o700});

    let size = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        size += chunk.length;
        callback(size > options.maxBytes ? new PublicError("upload_too_large", 413) : null, chunk);
      },
    });

    try {
      await pipeline(options.stream, limiter, createWriteStream(temporaryPath, {mode: 0o600}));
      if ((options.stream as Readable & {truncated?: boolean}).truncated) {
        throw new PublicError("upload_too_large", 413);
      }
      const media = await this.inspector(temporaryPath);
      if (options.kind === "video" && !media.hasVideo) throw new PublicError("invalid_video", 422);
      if (options.kind === "audio" && !media.hasAudio) throw new PublicError("invalid_audio", 422);
      await rename(temporaryPath, finalPath);
      const stored: StoredAsset = {id, name: displayName, kind: options.kind, path: finalPath, mime: options.mime, size, media};
      await writeFile(join(directory, "asset.json"), JSON.stringify(storedMetadata(stored)), {mode: 0o600});
      this.assets.set(id, stored);
      return publicMetadata(stored);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      await unlink(finalPath).catch(() => undefined);
      await rmdir(directory).catch(() => undefined);
      throw error;
    }
  }

  get(id: string): AssetReference {
    return publicMetadata(this.getStored(id));
  }

  resolvePath(id: string, expectedKind?: AssetKind): string {
    const stored = this.getStored(id);
    if (expectedKind && stored.kind !== expectedKind) throw new PublicError("asset_kind_mismatch", 422);
    return stored.path;
  }

  open(id: string, expectedKind?: AssetKind) {
    return createReadStream(this.resolvePath(id, expectedKind));
  }

  resolveResource(id: string, expectedKind?: AssetKind): InternalAssetResource {
    const stored = this.getStored(id);
    if (expectedKind && stored.kind !== expectedKind) throw new PublicError("asset_kind_mismatch", 422);
    return {path: stored.path, mime: stored.mime, durationSec: stored.media.durationSec};
  }

  private getStored(id: string): StoredAsset {
    if (!/^asset_[a-f0-9]{32}$/.test(id)) throw new PublicError("asset_not_found", 404);
    const stored = this.assets.get(id);
    if (!stored) throw new PublicError("asset_not_found", 404);
    return stored;
  }

  private loadExistingAssets(): void {
    const assetsRoot = join(this.root, "assets");
    if (!existsSync(assetsRoot)) return;
    for (const entry of readdirSync(assetsRoot, {withFileTypes: true})) {
      if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue;
      try {
        const directory = join(assetsRoot, entry.name);
        const parsed = JSON.parse(readFileSync(join(directory, "asset.json"), "utf8")) as Partial<StoredAsset>;
        if (parsed.id !== `asset_${entry.name.replaceAll("-", "")}` || !isStoredKind(parsed.kind) || typeof parsed.mime !== "string") continue;
        const extension = ALLOWED[parsed.kind].get(parsed.mime);
        if (!extension || typeof parsed.name !== "string" || sanitizeDisplayName(parsed.name) !== parsed.name || !isMediaInspection(parsed.media)) continue;
        const path = join(directory, `source${extension}`);
        if (!existsSync(path)) continue;
        this.assets.set(parsed.id, {
          id: parsed.id,
          name: parsed.name,
          kind: parsed.kind,
          path,
          mime: parsed.mime,
          size: statSync(path).size,
          media: parsed.media,
        });
      } catch {
        // Ignore incomplete or tampered local manifests; they are never exposed.
      }
    }
  }
}

function publicMetadata(asset: StoredAsset): AssetReference {
  return {id: asset.id, name: asset.name, kind: asset.kind};
}

function storedMetadata(asset: StoredAsset) {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    mime: asset.mime,
    size: asset.size,
    media: asset.media,
  };
}

function isStoredKind(value: unknown): value is AssetKind {
  return value === "video" || value === "audio";
}

function isMediaInspection(value: unknown): value is MediaInspection {
  if (!value || typeof value !== "object") return false;
  const media = value as Partial<MediaInspection>;
  return typeof media.durationSec === "number" && Number.isFinite(media.durationSec) && media.durationSec > 0
    && typeof media.hasVideo === "boolean" && typeof media.hasAudio === "boolean";
}

export function sanitizeDisplayName(input: string): string {
  return basename(input.replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "media";
}

function hasCompatibleExtension(name: string, expected: string): boolean {
  const actual = extname(name).toLowerCase();
  if (expected === ".m4a") return actual === ".m4a" || actual === ".mp4";
  if (expected === ".wav") return actual === ".wav";
  return actual === expected;
}
