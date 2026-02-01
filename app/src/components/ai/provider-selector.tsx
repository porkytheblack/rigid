'use client';

import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import type { AIProvider, ProviderStatus } from '@/lib/tauri/types';
import { useAIStore } from '@/lib/stores/ai';

const PROVIDER_INFO: Record<AIProvider, { label: string; description: string }> = {
  ollama: {
    label: 'Ollama',
    description: 'Local AI inference (free, private)',
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Multiple models via API',
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude models',
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT models',
  },
};

interface ProviderSelectorProps {
  onSelect?: (provider: AIProvider) => void;
}

export function ProviderSelector({ onSelect }: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentProvider, providerStatuses, configureProvider, loading } = useAIStore();

  const handleSelect = async (provider: AIProvider) => {
    try {
      await configureProvider(provider);
      onSelect?.(provider);
    } catch (error) {
      console.error('Failed to configure provider:', error);
    }
    setIsOpen(false);
  };

  const getStatusForProvider = (provider: AIProvider): ProviderStatus | undefined => {
    return providerStatuses.find((s) => s.provider === provider);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg hover:border-[var(--border-secondary)] transition-colors"
      >
        <span>
          {currentProvider
            ? PROVIDER_INFO[currentProvider]?.label
            : 'Select AI Provider'}
        </span>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg overflow-hidden">
          {(Object.keys(PROVIDER_INFO) as AIProvider[]).map((provider) => {
            const status = getStatusForProvider(provider);
            const isAvailable = status?.available ?? false;
            const isSelected = provider === currentProvider;

            return (
              <button
                key={provider}
                type="button"
                onClick={() => isAvailable && handleSelect(provider)}
                disabled={!isAvailable}
                className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm transition-colors
                  ${isAvailable ? 'hover:bg-[var(--bg-tertiary)]' : 'opacity-50 cursor-not-allowed'}
                  ${isSelected ? 'bg-[var(--bg-tertiary)]' : ''}`}
              >
                <div>
                  <div className="font-medium">{PROVIDER_INFO[provider].label}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {!isAvailable && status?.error
                      ? status.error
                      : PROVIDER_INFO[provider].description}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
