import {Composition} from "remotion";
import {createDefaultProject} from "../domain/project";
import {createPreviewTimeline} from "../domain/timeline";
import {RadialVocabVideo} from "./RadialVocabVideo";
import type {RadialVideoProps} from "./types";

const project = createDefaultProject();
const timeline = createPreviewTimeline(project);
const defaultProps: RadialVideoProps = {project, timeline, narrations: []};

export function RemotionRoot() {
  return (
    <Composition
      id="RadialVocabVideo"
      component={RadialVocabVideo}
      width={project.canvas.width}
      height={project.canvas.height}
      fps={project.canvas.fps}
      durationInFrames={Math.ceil(timeline.totalSec * project.canvas.fps)}
      defaultProps={defaultProps}
      calculateMetadata={({props}) => ({
        width: props.project.canvas.width,
        height: props.project.canvas.height,
        fps: props.project.canvas.fps,
        durationInFrames: Math.ceil(props.timeline.totalSec * props.project.canvas.fps),
      })}
    />
  );
}
