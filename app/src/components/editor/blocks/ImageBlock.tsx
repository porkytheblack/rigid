"use client";

import { useRef, useState, useCallback } from "react";
import { Block, BlockType, EditorScreenshot } from "../types";
import { Image as ImageIcon, Upload, Link, Trash2, Camera } from "lucide-react";

interface ImageBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
  screenshots?: EditorScreenshot[];
}

export function ImageBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
  screenshots = [],
}: ImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showScreenshotPicker, setShowScreenshotPicker] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const hasImage = !!block.meta?.src;
  const width = block.meta?.width || 'full';

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for preview
    const src = URL.createObjectURL(file);
    onUpdate({
      ...block,
      meta: {
        ...block.meta,
        src,
        alt: file.name,
      },
    });
  }, [block, onUpdate]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlValue.trim()) return;

    onUpdate({
      ...block,
      meta: {
        ...block.meta,
        src: urlValue.trim(),
      },
    });
    setShowUrlInput(false);
    setUrlValue('');
  }, [block, urlValue, onUpdate]);

  const handleScreenshotSelect = useCallback((screenshot: EditorScreenshot) => {
    onUpdate({
      ...block,
      meta: {
        ...block.meta,
        src: screenshot.imagePath,
        alt: screenshot.title,
      },
    });
    setShowScreenshotPicker(false);
  }, [block, onUpdate]);

  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...block,
      meta: {
        ...block.meta,
        caption: e.target.value,
      },
    });
  }, [block, onUpdate]);

  const handleWidthChange = (newWidth: 'small' | 'medium' | 'full') => {
    onUpdate({
      ...block,
      meta: {
        ...block.meta,
        width: newWidth,
      },
    });
  };

  const getWidthClass = () => {
    switch (width) {
      case 'small':
        return 'max-w-[50%]';
      case 'medium':
        return 'max-w-[75%]';
      default:
        return 'max-w-full';
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Arrow up - focus previous block
    if (e.key === 'ArrowUp' && onFocusPrevious) {
      e.preventDefault();
      onFocusPrevious();
      return;
    }

    // Arrow down - focus next block
    if (e.key === 'ArrowDown' && onFocusNext) {
      e.preventDefault();
      onFocusNext();
      return;
    }

    // Enter - insert block after
    if (e.key === 'Enter') {
      e.preventDefault();
      onInsertAfter();
      return;
    }

    // Delete/Backspace - delete block
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onDelete();
      return;
    }
  }, [onFocusPrevious, onFocusNext, onInsertAfter, onDelete]);

  if (!hasImage) {
    return (
      <div className="w-full">
        <div
          className="border border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)] p-8 flex flex-col items-center justify-center gap-4 hover:border-[var(--text-tertiary)] transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <ImageIcon className="w-12 h-12 text-[var(--text-tertiary)]" />
          <div className="text-center">
            <p className="text-[var(--text-body-sm)] text-[var(--text-primary)] mb-1">
              Click to upload an image
            </p>
            <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              or drag and drop
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap justify-center">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-medium hover:bg-[var(--surface-hover)]"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(true);
              }}
            >
              <Link className="w-4 h-4" />
              Embed link
            </button>
            {screenshots.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-medium hover:bg-[var(--surface-hover)]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowScreenshotPicker(true);
                }}
              >
                <Camera className="w-4 h-4" />
                Screenshots
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* URL input modal */}
        {showUrlInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUrlInput(false)}>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-4">
                Embed image from URL
              </h3>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-md)] placeholder:text-[var(--text-tertiary)] mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUrlSubmit();
                  if (e.key === 'Escape') setShowUrlInput(false);
                }}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  onClick={() => setShowUrlInput(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90"
                  onClick={handleUrlSubmit}
                >
                  Embed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screenshot picker modal */}
        {showScreenshotPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScreenshotPicker(false)}>
            <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                  Select from Screenshots
                </h3>
                <button
                  type="button"
                  className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                  onClick={() => setShowScreenshotPicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {screenshots.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-tertiary)]">
                    No screenshots available
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {screenshots.map((screenshot) => (
                      <button
                        key={screenshot.id}
                        type="button"
                        className="relative aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden hover:border-[var(--text-primary)] transition-colors group"
                        onClick={() => handleScreenshotSelect(screenshot)}
                      >
                        <img
                          src={screenshot.imagePath}
                          alt={screenshot.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-white text-[var(--text-caption)] truncate">{screenshot.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative mx-auto ${getWidthClass()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Image */}
      <div className={`relative border border-[var(--border-default)] ${isFocused ? 'border-[var(--text-primary)]' : ''}`}>
        <img
          src={block.meta?.src}
          alt={block.meta?.alt || ''}
          className="w-full h-auto block"
        />

        {/* Hover controls */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg">
            <button
              type="button"
              className={`px-2 py-1 text-[var(--text-caption)] ${width === 'small' ? 'bg-[var(--surface-hover)]' : ''} hover:bg-[var(--surface-hover)]`}
              onClick={() => handleWidthChange('small')}
            >
              50%
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-[var(--text-caption)] ${width === 'medium' ? 'bg-[var(--surface-hover)]' : ''} hover:bg-[var(--surface-hover)]`}
              onClick={() => handleWidthChange('medium')}
            >
              75%
            </button>
            <button
              type="button"
              className={`px-2 py-1 text-[var(--text-caption)] ${width === 'full' ? 'bg-[var(--surface-hover)]' : ''} hover:bg-[var(--surface-hover)]`}
              onClick={() => handleWidthChange('full')}
            >
              100%
            </button>
            <div className="w-px h-4 bg-[var(--border-default)]" />
            <button
              type="button"
              className="p-1 text-[var(--accent-error)] hover:bg-[var(--status-error-bg)]"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      <input
        ref={captionRef}
        type="text"
        value={block.meta?.caption || ''}
        onChange={handleCaptionChange}
        placeholder="Add a caption..."
        className="w-full mt-2 text-center text-[var(--text-caption)] text-[var(--text-tertiary)] bg-transparent outline-none placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  );
}
