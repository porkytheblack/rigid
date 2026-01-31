"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { DemoFormat } from "@/lib/tauri/types";

interface CreateVideoDialogProps {
  demoId: string;
  onClose: () => void;
  onCreate: (name: string, format: DemoFormat, width: number, height: number) => void;
}

const formatOptions: { format: DemoFormat; label: string; width: number; height: number }[] = [
  { format: "youtube", label: "YouTube", width: 1920, height: 1080 },
  { format: "youtube_4k", label: "YouTube 4K", width: 3840, height: 2160 },
  { format: "tiktok", label: "TikTok / Reels", width: 1080, height: 1920 },
  { format: "square", label: "Square", width: 1080, height: 1080 },
];

export function CreateVideoDialog({ demoId: _demoId, onClose, onCreate }: CreateVideoDialogProps) {
  const [name, setName] = useState("My Video");
  const [selectedFormat, setSelectedFormat] = useState<DemoFormat>("youtube");

  const handleCreate = () => {
    if (!name.trim()) return;
    const formatOption = formatOptions.find(f => f.format === selectedFormat);
    if (formatOption) {
      onCreate(name.trim(), selectedFormat, formatOption.width, formatOption.height);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleCreate();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Create Video</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Video Name */}
          <div>
            <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Video Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Video"
              autoFocus
              className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
            />
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map(({ format, label, width, height }) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-4 border text-center transition-colors ${
                    selectedFormat === format
                      ? "border-[var(--text-primary)] bg-[var(--surface-hover)]"
                      : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    {format === "youtube" || format === "youtube_4k" ? (
                      <div className="w-16 h-9 border-2 border-current flex items-center justify-center">
                        <span className="text-[10px] font-medium">16:9</span>
                      </div>
                    ) : format === "tiktok" ? (
                      <div className="w-6 h-10 border-2 border-current flex items-center justify-center">
                        <span className="text-[8px] font-medium">9:16</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 border-2 border-current flex items-center justify-center">
                        <span className="text-[10px] font-medium">1:1</span>
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                    {width} × {height}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
