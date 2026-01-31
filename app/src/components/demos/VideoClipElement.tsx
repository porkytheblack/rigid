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

  // Get playback speed (clamped to valid range)
  const playbackSpeed = Math.max(0.25, Math.min(4, clip.speed ?? 1));

  // Calculate video source time from timeline time
  // We use playbackRate for speed, so getVideoTime just maps timeline position to source position
  // The speed multiplication happens naturally via playbackRate during playback
  //
  // For scrubbing (paused), we need to multiply by speed to get correct frame
  // For playback start, we also multiply by speed since we're setting initial position
  const getVideoTime = useCallback((timelineTimeMs: number) => {
    const clipRelativeTime = timelineTimeMs - clip.start_time_ms;
    // Multiply by speed: at 2x, timeline position 2.5s = source position 5s
    return ((clip.in_point_ms || 0) + clipRelativeTime * playbackSpeed) / 1000;
  }, [clip.start_time_ms, clip.in_point_ms, playbackSpeed]);

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
      el.playbackRate = playbackSpeed;
    }
  }, [onRef, clip.muted, volume, isMuted, playbackSpeed]);

  // Track if we've synced position for current playback session
  const hasSyncedForPlayback = useRef(false);
  const lastIsPlaying = useRef(false);

  // Handle play/pause state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track.visible) return;

    const shouldBeActive = isClipActive(currentTimeMs) && isVisible;

    // Detect play state change
    if (isPlaying && !lastIsPlaying.current) {
      hasSyncedForPlayback.current = false;
    }
    lastIsPlaying.current = isPlaying;

    if (isPlaying) {
      if (shouldBeActive) {
        // Only sync position once at the start of playback
        if (!hasSyncedForPlayback.current) {
          const videoTime = getVideoTime(currentTimeMs);
          video.currentTime = Math.max(0, videoTime);
          hasSyncedForPlayback.current = true;
        }

        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
      hasSyncedForPlayback.current = false;
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

  // Handle playback speed changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track.visible) return;

    const shouldBeActive = isClipActive(currentTimeMs) && isVisible;

    if (shouldBeActive && isPlaying && !hasSyncedForPlayback.current) {
      const videoTime = getVideoTime(currentTimeMs);
      video.currentTime = Math.max(0, videoTime);
      hasSyncedForPlayback.current = true;
      video.play().catch(() => {});
    } else if (!shouldBeActive && !video.paused) {
      video.pause();
      hasSyncedForPlayback.current = false;
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
  // Only re-render if non-time props change, OR if time changes while paused (scrubbing)
  const isPlaying = useDemosStore.getState().playback.isPlaying;

  // Always compare non-time props
  if (
    prevProps.clip !== nextProps.clip ||
    prevProps.clip.speed !== nextProps.clip.speed || // Explicit speed check for playbackRate updates
    prevProps.track !== nextProps.track ||
    prevProps.src !== nextProps.src ||
    prevProps.isVisible !== nextProps.isVisible ||
    prevProps.hasZoomEffect !== nextProps.hasZoomEffect ||
    prevProps.currentZoom !== nextProps.currentZoom ||
    prevProps.zoomTransformOrigin !== nextProps.zoomTransformOrigin
  ) {
    return false; // Re-render
  }

  // Only compare currentTimeMs if paused (for scrubbing)
  if (!isPlaying && prevProps.currentTimeMs !== nextProps.currentTimeMs) {
    return false; // Re-render for scrubbing
  }

  return true; // Skip re-render
});
