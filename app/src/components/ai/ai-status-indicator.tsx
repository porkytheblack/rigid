'use client';

import { useEffect } from 'react';
import { Bot, BotOff } from 'lucide-react';
import { useAIStore } from '@/lib/stores/ai';

export function AIStatusIndicator() {
  const { configured, currentProvider, refreshStatus, restoreConfiguration } = useAIStore();

  useEffect(() => {
    restoreConfiguration();
  }, [restoreConfiguration]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (!configured) {
    return (
      <div
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-tertiary)]"
        title="AI not configured"
      >
        <BotOff className="w-3.5 h-3.5" />
      </div>
    );
  }

  const providerLabels: Record<string, string> = {
    ollama: 'Ollama',
    openrouter: 'OpenRouter',
    anthropic: 'Claude',
    openai: 'GPT',
  };

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-full"
      title={`AI: ${providerLabels[currentProvider || ''] || currentProvider}`}
    >
      <Bot className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
      <span className="font-medium">
        {providerLabels[currentProvider || ''] || 'AI'}
      </span>
    </div>
  );
}
