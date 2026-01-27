"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, X, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { createPortal } from "react-dom";

interface MiniPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  thumbnailSize?: "sm" | "md" | "lg";
}

const thumbnailSizes = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

export function MiniPlayer({ src, poster, className = "", thumbnailSize = "md" }: MiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const expandedVideoRef = useRef<HTMLVideoElement>(null);

  // Sync play state between mini and expanded video
  useEffect(() => {
    const video = isExpanded ? expandedVideoRef.current : videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, isExpanded]);

  // Update progress
  useEffect(() => {
    const video = isExpanded ? expandedVideoRef.current : videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isExpanded]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
    const video = isExpanded ? expandedVideoRef.current : videoRef.current;
    if (video) {
      video.muted = !isMuted;
    }
  }, [isMuted, isExpanded]);

  const expand = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setProgress(video.currentTime);
    }
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    const video = expandedVideoRef.current;
    if (video) {
      setProgress(video.currentTime);
    }
    setIsExpanded(false);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    const video = isExpanded ? expandedVideoRef.current : videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, [isExpanded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      collapse();
    }
  }, [collapse]);

  return (
    <>
      {/* Mini Player Thumbnail */}
      <div
        className={`relative group overflow-hidden bg-black border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors ${thumbnailSizes[thumbnailSize]} ${className}`}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted={isMuted}
          className="w-full h-full object-cover"
          onClick={togglePlay}
        />

        {/* Play/Pause overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={expand}
          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <Maximize2 className="w-3 h-3 text-white" />
        </button>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-white/80"
              style={{ width: `${(progress / duration) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {isExpanded && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col">
            {/* Video */}
            <video
              ref={expandedVideoRef}
              src={src}
              poster={poster}
              muted={isMuted}
              className="max-w-full max-h-[80vh] object-contain"
              onClick={togglePlay}
              autoPlay={isPlaying}
            />

            {/* Controls */}
            <div className="flex items-center gap-3 mt-4 px-2">
              <button
                onClick={togglePlay}
                className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <span className="text-white text-sm min-w-[80px]">
                {formatTime(progress)} / {formatTime(duration)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />

              <button
                onClick={toggleMute}
                className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={collapse}
                className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
              >
                <Minimize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={collapse}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

// Inline version for use in nodes
export function InlineVideo({ src, poster, className = "" }: { src: string; poster?: string; className?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  }, []);

  return (
    <>
      <div className={`relative cursor-pointer ${className}`} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-cover"
          onEnded={() => setIsPlaying(false)}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white drop-shadow" />
          ) : (
            <Play className="w-8 h-8 text-white drop-shadow" />
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded transition-colors"
        >
          <Maximize2 className="w-3 h-3 text-white" />
        </button>
      </div>

      {isExpanded && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <video
            src={src}
            poster={poster}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
