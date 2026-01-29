"use client";

import { useEffect, useRef, memo, useCallback } from "react";
import type { DemoClip, DemoTrack } from "@/lib/tauri/types";
import { useDemosStore } from "@/lib/stores";

interface VideoClipElementProps {
  clip: DemoClip;
  track: DemoTrack;
  src: string;
  isVisible: boolean;
  currentTimeMs: number; // Only used when paused for scrubbing
  hasZoomEffect?: boolean;
  currentZoom?: number;
  zoomTransformOrigin?: string;
  style?: React.CSSProperties;
  onRef?: (el: HTMLVideoElement | null) => void;
}

/**
 * Self-contained video element for the demo editor canvas.
 * Uses targeted selectors to only re-render on meaningful state changes.
 * During playback, the video plays naturally using its own clock.
 */
export const VideoClipElement = memo(function VideoClipElement({
  clip,
  track,
  src,
  isVisible,
  currentTimeMs,
  hasZoomEffect,
  currentZoom,
  zoomTransformOrigin,
  style,
  onRef,
}: VideoClipElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subscribe only to specific playback properties (NOT currentTimeMs)
  const isPlaying = useDemosStore((state) => state.playback.isPlaying);
  const volume = useDemosStore((state) => state.playback.volume);
  const isMuted = useDemosStore((state) => state.playback.isMuted);

  // Calculate video time from timeline time
  const getVideoTime = useCallback((timelineTimeMs: number) => {
    const clipRelativeTime = timelineTimeMs - clip.start_time_ms;
    return ((clip.in_point_ms || 0) + clipRelativeTime) / 1000;
  }, [clip.start_time_ms, clip.in_point_ms]);

  // Check if clip is active at given time
  const isClipActive = useCallback((timelineTimeMs: number) => {
    return timelineTimeMs >= clip.start_time_ms &&
           timelineTimeMs < clip.start_time_ms + clip.duration_ms;
  }, [clip.start_time_ms, clip.duration_ms]);

  // Set up video element
  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    onRef?.(el);

    if (el) {
      el.volume = volume;
      el.muted = isMuted || (clip.muted ?? false);
    }
  }, [onRef, clip.muted, volume, isMuted]);

  // Handle play/pause state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track.visible) return;

    const shouldBeActive = isClipActive(currentTimeMs) && isVisible;

    if (isPlaying) {
      if (shouldBeActive) {
        const videoTime = getVideoTime(currentTimeMs);
        video.currentTime = Math.max(0, videoTime);
        video.play().catch(() => {});
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isPlaying, track.visible, isVisible, currentTimeMs, getVideoTime, isClipActive]);

  // Handle scrubbing when paused
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track.visible || isPlaying) return;

    const shouldBeActive = isClipActive(currentTimeMs) && isVisible;

    if (shouldBeActive) {
      const videoTime = getVideoTime(currentTimeMs);
      const drift = Math.abs(video.currentTime - videoTime);
      if (drift > 0.05) {
        video.currentTime = Math.max(0, videoTime);
      }
    }
  }, [currentTimeMs, isPlaying, track.visible, isVisible, getVideoTime, isClipActive]);

  // Handle volume changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
    }
  }, [volume]);

  // Handle mute changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted || (clip.muted ?? false);
    }
  }, [isMuted, clip.muted]);

  // Handle visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track.visible) return;

    const shouldBeActive = isClipActive(currentTimeMs) && isVisible;

    if (shouldBeActive && isPlaying) {
      const videoTime = getVideoTime(currentTimeMs);
      video.currentTime = Math.max(0, videoTime);
      video.play().catch(() => {});
    } else if (!shouldBeActive && !video.paused) {
      video.pause();
    }
  }, [isVisible, track.visible, currentTimeMs, isPlaying, getVideoTime, isClipActive]);

  return (
    <video
      ref={handleVideoRef}
      src={src}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        clipPath: `inset(${clip.crop_top ?? 0}% ${clip.crop_right ?? 0}% ${clip.crop_bottom ?? 0}% ${clip.crop_left ?? 0}%${clip.corner_radius ? ` round ${clip.corner_radius}px` : ""})`,
        transform: hasZoomEffect ? `scale(${currentZoom})` : undefined,
        transformOrigin: zoomTransformOrigin,
        pointerEvents: "none",
        ...style,
      }}
      playsInline
      preload="auto"
      onError={(e) => {
        console.error("Video load error:", clip.source_path, e);
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison to avoid re-renders during playback
  // Only re-render if non-time props change, OR if time changes while paused
  const isPlaying = useDemosStore.getState().playback.isPlaying;

  // Always compare non-time props
  if (
    prevProps.clip !== nextProps.clip ||
    prevProps.track !== nextProps.track ||
    prevProps.src !== nextProps.src ||
    prevProps.isVisible !== nextProps.isVisible ||
    prevProps.hasZoomEffect !== nextProps.hasZoomEffect ||
    prevProps.currentZoom !== nextProps.currentZoom ||
    prevProps.zoomTransformOrigin !== nextProps.zoomTransformOrigin
  ) {
    return false; // Re-render
  }

  // Only compare currentTimeMs if paused
  if (!isPlaying && prevProps.currentTimeMs !== nextProps.currentTimeMs) {
    return false; // Re-render for scrubbing
  }

  return true; // Skip re-render
});
