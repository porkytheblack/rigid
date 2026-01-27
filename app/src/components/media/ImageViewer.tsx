"use client";

import { useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailSize?: "sm" | "md" | "lg";
}

const thumbnailSizes = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

export function ImageViewer({ src, alt = "", className = "", thumbnailSize = "md" }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const open = useCallback(() => {
    setIsOpen(true);
    setScale(1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setScale(1);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  }, [close]);

  return (
    <>
      {/* Thumbnail */}
      <button
        onClick={open}
        className={`relative group overflow-hidden bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors ${thumbnailSizes[thumbnailSize]} ${className}`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {/* Fullscreen Modal */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={zoomOut}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm px-2 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={close}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors ml-2"
              title="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh] overflow-auto"
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-none"
              style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Inline version for use in nodes (smaller, no expand button visible by default)
export function InlineImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const close = useCallback(() => {
    setIsOpen(false);
    setScale(1);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  }, [close]);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setIsOpen(true)}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      />

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm px-2 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={close}
              className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors ml-2"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
