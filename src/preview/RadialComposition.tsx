import {useEffect, useRef} from "react";
import {computeLayout} from "../domain/layout";
import type {ProjectConfig} from "../domain/project";
import type {Timeline} from "../domain/timeline";
import {arrowHead, easeOutBack, RADIAL_TYPOGRAPHY, revealProgress, rgbWithOpacity, splitByRoot, wordTransformOrigin, wordTranslate} from "../domain/visual";

type RadialCompositionProps = {
  project: ProjectConfig;
  timeline: Timeline;
  currentTime: number;
  backgroundUrl?: string;
  musicUrl?: string;
  playing?: boolean;
  showSafeArea?: boolean;
};

export function RadialComposition({project, timeline, currentTime, backgroundUrl, musicUrl, playing = false, showSafeArea = false}: RadialCompositionProps) {
  const layout = computeLayout(project);
  const backgroundRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const centerPx = Math.min(project.canvas.width, project.canvas.height) * project.style.center.sizeRatio;
  const centerWidth = `${roundPercent((centerPx / project.canvas.width) * 100)}%`;
  const centerHeight = `${roundPercent((centerPx / project.canvas.height) * 100)}%`;
  const centerProgress = clamp(currentTime / Math.max(0.001, timeline.introHoldSec));
  const centerScale = 0.72 + easeOutBack(centerProgress) * 0.28 + Math.sin(currentTime * 3.8) * 0.012 * centerProgress;

  useEffect(() => {
    const video = backgroundRef.current;
    if (video) {
      video.volume = project.background.audioEnabled ? clamp(project.background.audioVolume) : 0;
      seekBackground(video, project.background.startSec, currentTime, project.background.loop);
    }
    const music = musicRef.current;
    if (music) {
      music.volume = clamp(project.music.volume);
      seekMedia(music, currentTime);
    }
  }, [currentTime, project.background.audioEnabled, project.background.audioVolume, project.background.loop, project.background.startSec, project.music.volume]);

  useEffect(() => {
    for (const media of [backgroundRef.current, musicRef.current]) {
      if (!media) continue;
      if (playing) void media.play().catch(() => undefined);
      else if (!media.paused) media.pause();
    }
  }, [playing]);

  return (
    <div className="composition-frame" data-preset={project.canvas.preset} data-aspect={project.canvas.preset}>
      <div className="radial-composition" style={{fontFamily: project.style.word.fontFamily}}>
        {backgroundUrl ? <video ref={backgroundRef} src={backgroundUrl} muted={!project.background.audioEnabled} loop={project.background.loop} playsInline /> : null}
        {musicUrl ? <audio ref={musicRef} src={musicUrl} loop /> : null}
        <div
          className="composition-mask"
          data-testid="preview-mask"
          style={{backgroundColor: project.style.mask.color, opacity: project.style.mask.opacity}}
        />
        {project.title.text ? (
          <div
            className="composition-title"
            style={{
              color: project.title.fill,
              top: "12%",
              fontSize: "12cqw",
              ...RADIAL_TYPOGRAPHY.title,
              WebkitTextStroke: `${(project.title.strokeWidth / project.canvas.width) * 100}cqw ${project.title.stroke}`,
              textShadow: `${(project.title.shadowOffsetX / project.canvas.width) * 100}cqw ${(project.title.shadowOffsetY / project.canvas.width) * 100}cqw 0 ${project.title.shadowColor}`,
            }}
          >
            {project.title.text}
          </div>
        ) : null}
        <svg className="composition-arrows" viewBox={`0 0 ${project.canvas.width} ${project.canvas.height}`} preserveAspectRatio="none">
          {layout.words.map((item, index) => {
            const timelineItem = timeline.items[index + 1];
            if (!timelineItem) return null;
            const reveal = revealProgress(timeline, item.index, currentTime);
            if (reveal.arrow <= 0) return null;
            const x1 = item.arrow.start.x * project.canvas.width;
            const y1 = item.arrow.start.y * project.canvas.height;
            const x2 = x1 + (item.arrow.end.x * project.canvas.width - x1) * reveal.arrow;
            const y2 = y1 + (item.arrow.end.y * project.canvas.height - y1) * reveal.arrow;
            const head = arrowHead(x1, y1, x2, y2, project.style.arrow.headSize);
            if (!head) return null;
            return (
              <g key={`arrow-${index}`} opacity={Math.min(1, reveal.arrow * 1.2)}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={head.lineEnd.x}
                  y2={head.lineEnd.y}
                  stroke={project.style.arrow.color}
                  strokeWidth={project.style.arrow.width}
                  strokeLinecap="round"
                />
                <polygon points={head.points} fill={project.style.arrow.color} />
              </g>
            );
          })}
        </svg>
        <div
          className="composition-center"
          data-testid="preview-root"
          style={{
            left: `${layout.center.x * 100}%`,
            top: `${layout.center.y * 100}%`,
            width: centerWidth,
            height: centerHeight,
            borderColor: project.style.center.borderColor,
            borderWidth: `${(project.style.center.borderWidth / project.canvas.width) * 100}cqw`,
            backgroundColor: rgbWithOpacity(project.style.center.fillColor, project.style.center.fillOpacity),
            opacity: centerProgress,
            transform: `translate(-50%, -50%) scale(${centerScale})`,
            boxShadow: `0 0 ${(centerPx * 0.16 * centerProgress / project.canvas.width) * 100}cqw ${rgbWithOpacity(project.style.center.borderColor, 0.42)}`,
          }}
        >
          <div>
            <div className="composition-center__root" style={{color: project.style.center.englishColor, fontSize: `${(centerPx * 0.28 / project.canvas.width) * 100}cqw`, ...RADIAL_TYPOGRAPHY.centerEnglish}}>{project.root.text}</div>
            <div className="composition-center__meaning" style={{color: project.style.center.chineseColor, fontSize: `${(centerPx * 0.18 / project.canvas.width) * 100}cqw`, marginTop: `${(centerPx * 0.08 / project.canvas.width) * 100}cqw`, ...RADIAL_TYPOGRAPHY.centerChinese}}>{project.root.meaningZh}</div>
          </div>
        </div>
        {layout.words.map((item, index) => {
          const timelineItem = timeline.items[index + 1];
          if (!timelineItem) return null;
          const reveal = revealProgress(timeline, item.index, currentTime);
          if (reveal.word <= 0) return null;
          const englishColor = item.word.englishColor ?? project.style.word.englishColor;
          const chineseColor = item.word.chineseColor ?? project.style.word.chineseColor;
          const highlightColor = item.word.highlightColor ?? project.style.word.highlightColor;
          return (
            <div
              className="composition-word"
              key={`word-${index}`}
              style={{
                left: `${item.label.x * 100}%`,
                top: `${item.label.y * 100}%`,
                opacity: reveal.word,
                transform: `${wordTranslate(item)} translateY(${(1 - reveal.word) * 12}px) scale(${item.fontScale * (0.96 + reveal.word * 0.04)})`,
                transformOrigin: wordTransformOrigin(item),
                textShadow: RADIAL_TYPOGRAPHY.wordTextShadow,
              }}
            >
              <div className="composition-word__english" style={{color: englishColor, fontSize: `${(project.style.word.englishFontSize / project.canvas.width) * 100}cqw`, ...RADIAL_TYPOGRAPHY.wordEnglish}}>
                {splitByRoot(item.word.text, project.root.text).map((part, partIndex) => (
                  <span key={`${part.text}-${partIndex}`} style={part.highlight ? {color: highlightColor} : undefined}>{part.text}</span>
                ))}
              </div>
              <div className="composition-word__chinese" style={{color: chineseColor, fontSize: `${(project.style.word.chineseFontSize / project.canvas.width) * 100}cqw`, ...RADIAL_TYPOGRAPHY.wordChinese}}>{item.word.meaningZh}</div>
            </div>
          );
        })}
        {showSafeArea ? <div className="safe-area" data-testid="safe-area" /> : null}
      </div>
    </div>
  );
}

function seekMedia(media: HTMLMediaElement, target: number): void {
  const duration = media.duration;
  const safeTarget = Number.isFinite(duration) && duration > 0 ? target % duration : target;
  if (Math.abs(media.currentTime - safeTarget) > 0.05) media.currentTime = safeTarget;
}

function seekBackground(media: HTMLMediaElement, startSec: number, currentTime: number, loop: boolean): void {
  const duration = media.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    seekMedia(media, startSec + currentTime);
    return;
  }
  const usableDuration = Math.max(0, duration - startSec);
  const target = loop && usableDuration > 0
    ? startSec + (currentTime % usableDuration)
    : Math.min(startSec + currentTime, duration);
  if (Math.abs(media.currentTime - target) > 0.05) media.currentTime = target;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundPercent(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
