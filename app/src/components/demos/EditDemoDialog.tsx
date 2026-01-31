"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface EditDemoDialogProps {
  demoId: string;
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function EditDemoDialog({ demoId: _demoId, currentName, onClose, onSave }: EditDemoDialogProps) {
  const [name, setName] = useState(currentName);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[var(--surface-secondary)] border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Edit Demo</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Demo Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="My Demo"
            autoFocus
            className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
          />
        </div>

        <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
          <button
            onClick={onClose}
            className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || name.trim() === currentName}
            className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
