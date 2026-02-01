'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import { getContextSummary } from '@/lib/ai/context-service';

export function AIContextIndicator() {
  const contextData = useAIChatStore((state) => state.contextData);
  const hasInitialized = useRef(false);

  // Refresh context only once on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      useAIChatStore.getState().refreshContext();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    useAIChatStore.getState().refreshContext();
  }, []);

  const summary = contextData ? getContextSummary(contextData) : 'Loading context...';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--text-secondary)]">
        <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <span className="truncate max-w-md">{summary}</span>
      </div>
      <button
        onClick={handleRefresh}
        className={cn(
          'p-1 rounded text-[var(--text-tertiary)]',
          'hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
          'transition-colors'
        )}
        title="Refresh context"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
