'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Send, Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import { Button } from '@/components/ui/button';
import { RigidCharacter } from '@/components/ui/rigid-character';
import { mapAIStateToAnimation } from '@/lib/ai/types';
import type { ChatMessage, Citation } from '@/lib/ai/types';
import { useRouterStore } from '@/lib/stores/router';

export function AIChat() {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Access individual state pieces to avoid object destructuring rerenders
  const sendMessage = useAIChatStore((state) => state.sendMessage);
  const isGenerating = useAIChatStore((state) => state.isGenerating);
  const rigidState = useAIChatStore((state) => state.rigidState);
  const mode = useAIChatStore((state) => state.mode);
  const error = useAIChatStore((state) => state.error);
  const allMessages = useAIChatStore((state) => state.messages);
  const currentConversationId = useAIChatStore((state) => state.currentConversationId);
  const navigate = useRouterStore((state) => state.navigate);

  // Memoize filtered messages to prevent infinite loops
  const messages = useMemo(
    () => allMessages.filter(m => m.conversationId === currentConversationId),
    [allMessages, currentConversationId]
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  }, [input, isGenerating, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleCopy = useCallback(async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleCitationClick = useCallback((citation: Citation) => {
    if (citation.route) {
      navigate(citation.route);
      useAIChatStore.getState().close();
    }
  }, [navigate]);

  const animation = mapAIStateToAnimation(rigidState);

  // Get placeholder based on mode
  const getPlaceholder = () => {
    switch (mode) {
      case 'qa':
        return 'Ask about your app, features, or documentation...';
      case 'fix-prompt':
        return 'Describe the issue or paste an issue ID...';
      case 'session-resume':
        return 'Ask "Where did I leave off?" or describe what you want to continue...';
      case 'summary':
        return 'Ask for a summary of the current exploration...';
      default:
        return 'Type your message...';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <RigidCharacter animation="idle" size={48} className="mb-4" />
            <h3 className="text-[var(--text-md)] font-medium text-[var(--text-primary)] mb-2">
              {mode === 'qa' && 'Ask me anything about your app'}
              {mode === 'fix-prompt' && 'Generate fix prompts for issues'}
              {mode === 'session-resume' && 'Pick up where you left off'}
              {mode === 'summary' && 'Summarize your exploration'}
            </h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] max-w-md">
              {mode === 'qa' && 'I can help you understand documentation, find issues, and navigate your explorations.'}
              {mode === 'fix-prompt' && 'Describe an issue or select one from context, and I\'ll generate a prompt for your coding agent.'}
              {mode === 'session-resume' && 'I\'ll analyze your recent activity and suggest what to work on next.'}
              {mode === 'summary' && 'I\'ll create an executive summary of the current exploration\'s findings.'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onCopy={handleCopy}
              copiedId={copiedId}
              onCitationClick={handleCitationClick}
            />
          ))
        )}

        {/* Loading indicator */}
        {isGenerating && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <RigidCharacter animation={animation} size={28} />
            </div>
            <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[var(--text-sm)]">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && !isGenerating && (
          <div className="flex items-center gap-2 p-3 bg-[var(--status-error)]/10 border border-[var(--status-error)]/20 rounded-lg text-[var(--status-error)]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[var(--text-sm)]">{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={isGenerating}
              rows={1}
              className={cn(
                'w-full px-4 py-3 pr-12',
                'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
                'rounded-lg resize-none',
                'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150'
              )}
              style={{ minHeight: '44px', maxHeight: '150px' }}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="h-11 w-11"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Message Bubble Component
// =============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  onCitationClick: (citation: Citation) => void;
}

function MessageBubble({ message, onCopy, copiedId, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isCopied = copiedId === message.id;

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full',
        isUser ? 'bg-[var(--accent)]' : 'bg-transparent'
      )}>
        {isUser ? (
          <span className="text-[var(--text-inverse)] text-[var(--text-sm)] font-medium">U</span>
        ) : (
          <RigidCharacter animation="idle" size={28} />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[80%]',
        isUser && 'flex flex-col items-end'
      )}>
        <div className={cn(
          'rounded-lg px-4 py-3',
          isUser
            ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
          message.error && 'border border-[var(--status-error)]/30'
        )}>
          {/* Message Text with Markdown-like formatting */}
          <div className="prose prose-sm max-w-none">
            <MessageContent content={message.content} />
          </div>

          {/* Error indicator */}
          {message.error && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[var(--text-xs)] text-[var(--status-error)]">
              Error: {message.error}
            </div>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.citations.map((citation, idx) => (
              <button
                key={`${citation.id}-${idx}`}
                onClick={() => onCitationClick(citation)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5',
                  'text-[var(--text-xs)] rounded-full',
                  'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
                  'hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]',
                  'transition-colors cursor-pointer'
                )}
              >
                <span className="capitalize">{citation.type.replace('_', ' ')}</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="truncate max-w-[150px]">{citation.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Copy button for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onCopy(message.content, message.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1',
                'text-[var(--text-xs)] text-[var(--text-tertiary)]',
                'hover:text-[var(--text-secondary)]',
                'transition-colors'
              )}
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Message Content with basic markdown
// =============================================================================

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={idx} className="font-semibold text-[var(--text-primary)]">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={idx} className="font-semibold text-[var(--text-primary)] text-[var(--text-md)]">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={idx} className="font-bold text-[var(--text-primary)] text-[var(--text-lg)]">{line.slice(2)}</h2>;
        }

        // Code blocks (inline)
        if (line.startsWith('```')) {
          return null; // Skip code fence markers
        }

        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[var(--text-tertiary)]">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[var(--text-tertiary)] min-w-[1.5em]">{match[1]}.</span>
                <span>{match[2]}</span>
              </div>
            );
          }
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }

        // Regular paragraphs with inline formatting
        return (
          <p key={idx} className="text-[var(--text-sm)] leading-relaxed">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(text: string): React.ReactNode {
  // Split by code backticks, bold, and italic
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Process inline code
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <code
        key={key++}
        className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[var(--text-sm)] font-mono"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}
