import type {ProjectConfig} from "../domain/project";
import type {Timeline} from "../domain/timeline";

export type NarrationTrack = {url: string; startSec: number};

export type RadialVideoProps = {
  project: ProjectConfig;
  timeline: Timeline;
  backgroundUrl?: string;
  backgroundDurationSec?: number;
  narrations: NarrationTrack[];
  musicUrl?: string;
};
