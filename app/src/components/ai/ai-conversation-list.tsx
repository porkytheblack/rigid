'use client';

import { useMemo } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import type { Conversation } from '@/lib/ai/types';

export function AIConversationList() {
  // Access individual state pieces to avoid object destructuring rerenders
  const conversations = useAIChatStore((state) => state.conversations);
  const currentConversationId = useAIChatStore((state) => state.currentConversationId);
  const selectConversation = useAIChatStore((state) => state.selectConversation);
  const deleteConversation = useAIChatStore((state) => state.deleteConversation);
  const mode = useAIChatStore((state) => state.mode);

  // Memoize filtered conversations to prevent infinite loops
  const filteredConversations = useMemo(
    () => conversations.filter(c => c.mode === mode),
    [conversations, mode]
  );

  if (filteredConversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
          No conversations yet
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {filteredConversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={conversation.id === currentConversationId}
          onSelect={() => selectConversation(conversation.id)}
          onDelete={() => deleteConversation(conversation.id)}
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({ conversation, isSelected, onSelect, onDelete }: ConversationItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'w-full flex items-start gap-2 px-3 py-2 text-left cursor-pointer',
        'group transition-colors',
        isSelected
          ? 'bg-[var(--bg-hover)]'
          : 'hover:bg-[var(--bg-hover)]/50'
      )}
    >
      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-[var(--text-tertiary)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-[var(--text-sm)] truncate',
          isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
        )}>
          {conversation.title}
        </div>
        <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
          {formatDate(conversation.updatedAt)}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className={cn(
          'p-1 rounded opacity-0 group-hover:opacity-100',
          'text-[var(--text-tertiary)] hover:text-[var(--status-error)]',
          'hover:bg-[var(--status-error)]/10',
          'transition-all'
        )}
        title="Delete conversation"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
