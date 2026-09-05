import {parseMedia} from "@remotion/media-parser";
import {nodeReader} from "@remotion/media-parser/node";
import {PublicError} from "./errors";

export type MediaInspection = {durationSec: number; hasVideo: boolean; hasAudio: boolean};
export type MediaInspector = (path: string) => Promise<MediaInspection>;

export const inspectMedia: MediaInspector = async (path) => {
  try {
    const parsed = await parseMedia({
      src: path,
      reader: nodeReader,
      fields: {durationInSeconds: true, tracks: true},
      acknowledgeRemotionLicense: true,
    });
    const durationSec = parsed.durationInSeconds;
    if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error("invalid duration");
    }
    return {
      durationSec,
      hasVideo: parsed.tracks.some((track) => track.type === "video"),
      hasAudio: parsed.tracks.some((track) => track.type === "audio"),
    };
  } catch {
    throw new PublicError("invalid_media", 422);
  }
};
