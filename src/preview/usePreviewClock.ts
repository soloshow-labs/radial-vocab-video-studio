import {useEffect, useRef} from "react";

export function usePreviewClock({playing, duration, currentTime, onTime}: {
  playing: boolean;
  duration: number;
  currentTime: number;
  onTime: (time: number) => void;
}) {
  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const next = timeRef.current + (now - previous) / 1000;
      previous = now;
      const wrapped = duration > 0 && next >= duration ? 0 : next;
      timeRef.current = wrapped;
      onTime(wrapped);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, onTime, playing]);
}
