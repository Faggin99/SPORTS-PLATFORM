import { useState, useCallback, useRef, useEffect } from 'react';
import { interpolateElements } from '../utils/interpolation';

const FRAME_DURATION_MS = 1500; // Time per frame transition at 1x speed

export function usePlayback(frames, currentFrameIndex, goToFrame) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [interpolatedElements, setInterpolatedElements] = useState(null);

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const playFrameRef = useRef(currentFrameIndex);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setInterpolatedElements(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const animate = useCallback((timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const elapsed = timestamp - startTimeRef.current;
    const frameDuration = FRAME_DURATION_MS / speed;
    const t = Math.min(elapsed / frameDuration, 1);

    const frameIdx = playFrameRef.current;
    const frameA = frames[frameIdx];
    const frameB = frames[frameIdx + 1];

    if (!frameA || !frameB) {
      // End of animation
      stopPlayback();
      return;
    }

    const interpolated = interpolateElements(frameA, frameB, t);
    setInterpolatedElements(interpolated);

    if (t >= 1) {
      // Move to next frame transition
      playFrameRef.current = frameIdx + 1;
      goToFrame(frameIdx + 1);
      startTimeRef.current = null;

      if (frameIdx + 1 >= frames.length - 1) {
        // Reached last frame
        stopPlayback();
        return;
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [frames, speed, goToFrame, stopPlayback]);

  const play = useCallback(() => {
    if (frames.length <= 1) return;

    // If at last frame, restart from beginning
    if (currentFrameIndex >= frames.length - 1) {
      goToFrame(0);
      playFrameRef.current = 0;
    } else {
      playFrameRef.current = currentFrameIndex;
    }

    setIsPlaying(true);
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);
  }, [frames, currentFrameIndex, goToFrame, animate]);

  const pause = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const rewind = useCallback(() => {
    stopPlayback();
    goToFrame(0);
  }, [stopPlayback, goToFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    speed,
    interpolatedElements,
    play,
    pause,
    rewind,
    setSpeed,
  };
}
