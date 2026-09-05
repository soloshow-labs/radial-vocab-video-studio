import type {CSSProperties} from "react";
import {Audio, Video} from "@remotion/media";
import {AbsoluteFill, Loop, Sequence, useCurrentFrame, useVideoConfig} from "remotion";
import {computeLayout} from "../domain/layout";
import {arrowHead, easeOutBack, RADIAL_TYPOGRAPHY, revealProgress, rgbWithOpacity, splitByRoot, wordTransformOrigin, wordTranslate} from "../domain/visual";
import type {RadialVideoProps} from "./types";

export function RadialVocabVideo({project, timeline, backgroundUrl, backgroundDurationSec = 0, narrations, musicUrl}: RadialVideoProps) {
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const frame = useCurrentFrame();
  const currentSec = frame / fps;
  const layout = computeLayout(project);
  const startFrom = Math.round(project.background.startSec * fps);
  const loopFrames = Math.max(1, Math.round(backgroundDurationSec * fps) - startFrom);
  const centerSize = Math.round(Math.min(width, height) * project.style.center.sizeRatio);
  const centerProgress = clamp(currentSec / Math.max(0.001, timeline.introHoldSec));
  const centerScale = 0.72 + easeOutBack(centerProgress) * 0.28 + Math.sin(currentSec * 3.8) * 0.012 * centerProgress;
  const titleStyle: CSSProperties = {
    position: "absolute",
    top: height * 0.12,
    right: 0,
    left: 0,
    color: project.title.fill,
    fontFamily: project.style.word.fontFamily,
    fontSize: Math.round(width * 0.12),
    ...RADIAL_TYPOGRAPHY.title,
    textAlign: "center",
    WebkitTextStroke: `${project.title.strokeWidth}px ${project.title.stroke}`,
    textShadow: `${project.title.shadowOffsetX}px ${project.title.shadowOffsetY}px 0 ${project.title.shadowColor}`,
  };

  const background = backgroundUrl ? (
    <Video
      src={backgroundUrl}
      trimBefore={startFrom}
      muted={!project.background.audioEnabled}
      volume={project.background.audioEnabled ? clamp(project.background.audioVolume) : 0}
      style={{width: "100%", height: "100%", objectFit: "cover"}}
    />
  ) : null;

  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: "#000", fontFamily: project.style.word.fontFamily}}>
      {project.background.loop && backgroundDurationSec > 0 && background ? <Loop durationInFrames={loopFrames}>{background}</Loop> : background}
      <AbsoluteFill style={{backgroundColor: project.style.mask.color, opacity: project.style.mask.opacity}} />
      {project.title.text.trim() ? <div style={titleStyle}>{project.title.text}</div> : null}

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: "absolute", inset: 0}}>
        {layout.words.map((item) => {
          const reveal = revealProgress(timeline, item.index, currentSec);
          if (reveal.arrow <= 0) return null;
          const x1 = item.arrow.start.x * width;
          const y1 = item.arrow.start.y * height;
          const x2 = x1 + (item.arrow.end.x * width - x1) * reveal.arrow;
          const y2 = y1 + (item.arrow.end.y * height - y1) * reveal.arrow;
          const head = arrowHead(x1, y1, x2, y2, project.style.arrow.headSize);
          return head ? (
            <g key={item.index} opacity={Math.min(1, reveal.arrow * 1.2)}>
              <line x1={x1} y1={y1} x2={head.lineEnd.x} y2={head.lineEnd.y} stroke={project.style.arrow.color} strokeWidth={project.style.arrow.width} strokeLinecap="round" />
              <polygon points={head.points} fill={project.style.arrow.color} />
            </g>
          ) : null;
        })}
      </svg>

      <div style={{position: "absolute", left: layout.center.x * width, top: layout.center.y * height, width: centerSize, height: centerSize, border: `${project.style.center.borderWidth}px solid ${project.style.center.borderColor}`, borderRadius: "50%", backgroundColor: rgbWithOpacity(project.style.center.fillColor, project.style.center.fillOpacity), opacity: centerProgress, transform: `translate(-50%, -50%) scale(${centerScale})`, boxShadow: `0 0 ${Math.round(centerSize * 0.16 * centerProgress)}px ${rgbWithOpacity(project.style.center.borderColor, 0.42)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}>
        <div style={{color: project.style.center.englishColor, fontSize: Math.round(centerSize * 0.28), ...RADIAL_TYPOGRAPHY.centerEnglish}}>{project.root.text}</div>
        <div style={{color: project.style.center.chineseColor, fontSize: Math.round(centerSize * 0.18), marginTop: centerSize * 0.08, ...RADIAL_TYPOGRAPHY.centerChinese}}>{project.root.meaningZh}</div>
      </div>

      {layout.words.map((item) => {
        const reveal = revealProgress(timeline, item.index, currentSec);
        if (reveal.word <= 0) return null;
        const englishColor = item.word.englishColor ?? project.style.word.englishColor;
        const chineseColor = item.word.chineseColor ?? project.style.word.chineseColor;
        const highlightColor = item.word.highlightColor ?? project.style.word.highlightColor;
        return (
          <div key={item.index} style={{position: "absolute", left: item.label.x * width, top: item.label.y * height, opacity: reveal.word, transform: `${wordTranslate(item)} translateY(${(1 - reveal.word) * 12}px) scale(${0.96 + reveal.word * 0.04})`, transformOrigin: wordTransformOrigin(item), textAlign: "center", whiteSpace: "nowrap", textShadow: RADIAL_TYPOGRAPHY.wordTextShadow}}>
            <div style={{color: englishColor, fontSize: Math.round(project.style.word.englishFontSize * item.fontScale), ...RADIAL_TYPOGRAPHY.wordEnglish}}>
              {splitByRoot(item.word.text, project.root.text).map((part, index) => <span key={`${part.text}-${index}`} style={{color: part.highlight ? highlightColor : englishColor}}>{part.text}</span>)}
            </div>
            <div style={{color: chineseColor, fontSize: Math.round(project.style.word.chineseFontSize * item.fontScale), marginTop: 10, ...RADIAL_TYPOGRAPHY.wordChinese}}>{item.word.meaningZh}</div>
          </div>
        );
      })}

      {narrations.map((track, index) => <Sequence key={index} from={Math.round(track.startSec * fps)}><Audio src={track.url} /></Sequence>)}
      {musicUrl && project.music.volume > 0 ? <Audio src={musicUrl} loop volume={(audioFrame) => project.music.volume * fadeOutVolume(audioFrame, durationInFrames, fps)} /> : null}
    </AbsoluteFill>
  );
}

function fadeOutVolume(frame: number, duration: number, fps: number) {
  const fadeFrames = Math.max(1, Math.round(fps * 0.8));
  const remaining = duration - frame;
  return remaining >= fadeFrames ? 1 : clamp(remaining / fadeFrames);
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
