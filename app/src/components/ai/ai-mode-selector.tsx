'use client';

import { MessageSquare, Wrench, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import type { AIMode } from '@/lib/ai/types';

const MODES: { id: AIMode; label: string; icon: typeof MessageSquare; description: string }[] = [
  {
    id: 'qa',
    label: 'Q&A',
    icon: MessageSquare,
    description: 'Ask about your app',
  },
  {
    id: 'fix-prompt',
    label: 'Fix',
    icon: Wrench,
    description: 'Generate fix prompts',
  },
  {
    id: 'session-resume',
    label: 'Resume',
    icon: Clock,
    description: 'Continue your work',
  },
  {
    id: 'summary',
    label: 'Summary',
    icon: FileText,
    description: 'Summarize findings',
  },
];

export function AIModeSelector() {
  // Access individual state pieces to avoid object destructuring rerenders
  const mode = useAIChatStore((state) => state.mode);
  const setMode = useAIChatStore((state) => state.setMode);

  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg">
      {MODES.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          title={description}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md',
            'text-[var(--text-sm)] font-medium',
            'transition-all duration-150',
            mode === id
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
