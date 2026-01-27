'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import type { AIProvider } from '@/lib/tauri/types';
import { useAIStore } from '@/lib/stores/ai';

interface APIKeyInputProps {
  provider: AIProvider;
  hasKey?: boolean;
  onSave?: () => void;
}

export function APIKeyInput({ provider, hasKey, onSave }: APIKeyInputProps) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { setApiKey, removeApiKey } = useAIStore();

  const handleSave = async () => {
    if (!value.trim()) return;

    setSaving(true);
    try {
      await setApiKey(provider, value.trim());
      setValue('');
      onSave?.();
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeApiKey(provider);
      onSave?.();
    } catch (error) {
      console.error('Failed to remove API key:', error);
    } finally {
      setRemoving(false);
    }
  };

  const placeholder =
    provider === 'openrouter'
      ? 'sk-or-...'
      : provider === 'anthropic'
        ? 'sk-ant-...'
        : provider === 'openai'
          ? 'sk-...'
          : 'Enter API key';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasKey ? '••••••••••••••••' : placeholder}
            className="w-full px-3 py-2 pr-10 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="px-3 py-2 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </button>

        {hasKey && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="px-3 py-2 text-sm font-medium bg-[var(--status-error)]/10 text-[var(--status-error)] rounded-lg hover:bg-[var(--status-error)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {removing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {hasKey && (
        <p className="text-xs text-[var(--text-tertiary)]">
          API key is stored. Enter a new key to replace it.
        </p>
      )}
    </div>
  );
}
