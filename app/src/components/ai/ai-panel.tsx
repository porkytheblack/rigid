'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Trash2, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import { providerRegistry, PROVIDER_CONFIGS } from '@/lib/ai/providers';
import { AIChat } from './ai-chat';
import { AIModeSelector } from './ai-mode-selector';
import { AISettings } from './ai-settings';
import { AIContextIndicator } from './ai-context-indicator';
import { AIConversationList } from './ai-conversation-list';
import { RigidCharacter } from '@/components/ui/rigid-character';
import { mapAIStateToAnimation } from '@/lib/ai/types';
import { Button } from '@/components/ui/button';

export function AIPanel() {
  // Access individual state pieces to avoid object destructuring rerenders
  const isOpen = useAIChatStore((state) => state.isOpen);
  const close = useAIChatStore((state) => state.close);
  const mode = useAIChatStore((state) => state.mode);
  const rigidState = useAIChatStore((state) => state.rigidState);
  const createConversation = useAIChatStore((state) => state.createConversation);
  const clearAllConversations = useAIChatStore((state) => state.clearAllConversations);
  const conversations = useAIChatStore((state) => state.conversations);
  const currentConversationId = useAIChatStore((state) => state.currentConversationId);

  // Memoize current conversation to prevent infinite loops
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === currentConversationId) || null,
    [conversations, currentConversationId]
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [providerCheckKey, setProviderCheckKey] = useState(0);

  // Get active provider - rechecks when isOpen, mode, or providerCheckKey changes
  const activeProvider = useMemo(() => {
    if (!isOpen) return null;
    return providerRegistry.getActiveProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, providerCheckKey]);

  // Recheck provider when panel opens or periodically while open
  useEffect(() => {
    if (!isOpen) return;

    // Immediate check
    setProviderCheckKey(k => k + 1);

    // Also set up an interval to recheck (in case settings change)
    const interval = setInterval(() => {
      setProviderCheckKey(k => k + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Global keyboard shortcut: Cmd+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          useAIChatStore.getState().open();
        }
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        close();
      }
      // Cmd+Shift+F to toggle fullscreen when panel is open
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'f' && isOpen) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const handleNewConversation = useCallback(() => {
    createConversation(mode);
  }, [createConversation, mode]);

  const animation = mapAIStateToAnimation(rigidState);
  const isConfigured = !!activeProvider;
  const providerName = activeProvider
    ? PROVIDER_CONFIGS[activeProvider as keyof typeof PROVIDER_CONFIGS]?.name || activeProvider
    : null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed z-50',
            'bg-[var(--bg-surface)] border border-[var(--border-subtle)]',
            'shadow-2xl',
            'flex flex-col overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            isFullscreen
              ? 'inset-0 rounded-none'
              : 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-4xl h-[80vh] max-h-[700px] rounded-[var(--radius-lg)]',
            !isFullscreen && 'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            !isFullscreen && 'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div>
                <Dialog.Title className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
                  Rigid AI
                </Dialog.Title>
                <Dialog.Description className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
                  {currentConversation?.title || 'New conversation'}
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode Selector */}
              <AIModeSelector />

              {/* New Conversation */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewConversation}
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit fullscreen (⌘⇧F)' : 'Fullscreen (⌘⇧F)'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>

              {/* Settings Toggle */}
              <AISettings />

              {/* Close Button */}
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" title="Close (Esc)">
                  <X className="w-4 h-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          {/* Context Indicator */}
          <AIContextIndicator />

          {/* Main Content */}
          <div className="flex flex-1 min-h-0">
            {/* Conversation Sidebar */}
            {conversations.length > 0 && (
              <div className="w-56 border-r border-[var(--border-subtle)] flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">
                    History
                  </span>
                  {conversations.length > 0 && (
                    <button
                      onClick={clearAllConversations}
                      className="text-[var(--text-tertiary)] hover:text-[var(--status-error)] transition-colors"
                      title="Clear all conversations"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <AIConversationList />
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {!isConfigured ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <RigidCharacter animation="sad" size={64} className="mb-4" />
                  <h3 className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-2">
                    AI Not Configured
                  </h3>
                  <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mb-4 max-w-md">
                    Please configure an AI provider to use Rigid AI. Click the settings icon to add your API key.
                  </p>
                  <AISettings showButton />
                </div>
              ) : (
                <AIChat />
              )}
            </div>
          </div>

          {/* Footer with keyboard hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-4 text-[var(--text-xs)] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px]">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px]">⇧</kbd>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px]">A</kbd>
                <span className="ml-1">Toggle panel</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px]">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px]">↵</kbd>
                <span className="ml-1">Send</span>
              </span>
            </div>
            <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
              {providerName && `Using ${providerName}`}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
