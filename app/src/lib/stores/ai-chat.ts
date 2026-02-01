import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AIMode,
  ChatMessage,
  Conversation,
  ContextData,
  AISettings,
  RigidAIState,
} from '@/lib/ai/types';
import { DEFAULT_AI_SETTINGS } from '@/lib/ai/types';
import { gatherContextForRoute, extractCitationsFromResponse } from '@/lib/ai/context-service';
import { providerRegistry } from '@/lib/ai/providers';
import { useRouterStore } from './router';
import { deepClone } from '@/lib/utils';

// =============================================================================
// Utility Functions
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generateConversationTitle(mode: AIMode): string {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const modeLabels: Record<AIMode, string> = {
    'qa': 'Q&A',
    'fix-prompt': 'Fix Prompt',
    'session-resume': 'Session Resume',
    'summary': 'Summary',
  };
  return `${modeLabels[mode]} - ${time}`;
}

// =============================================================================
// Store State & Actions
// =============================================================================

interface AIChatState {
  // Panel state
  isOpen: boolean;
  mode: AIMode;
  rigidState: RigidAIState;

  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: ChatMessage[];

  // Generation state
  isGenerating: boolean;
  streamingContent: string;

  // Context
  contextData: ContextData | null;

  // Settings
  settings: AISettings;

  // Error state
  error: string | null;
}

interface AIChatActions {
  // Panel control
  open: (mode?: AIMode) => void;
  close: () => void;
  setMode: (mode: AIMode) => void;

  // Conversation management
  createConversation: (mode?: AIMode) => string;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearAllConversations: () => void;
  renameConversation: (conversationId: string, title: string) => void;

  // Messaging
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  // Context
  refreshContext: () => Promise<void>;

  // Settings
  updateSettings: (settings: Partial<AISettings>) => void;

  // State management
  setRigidState: (state: RigidAIState) => void;
  clearError: () => void;
}

type AIChatStore = AIChatState & AIChatActions;

// =============================================================================
// Store Implementation
// =============================================================================

export const useAIChatStore = create<AIChatStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      isOpen: false,
      mode: 'qa',
      rigidState: 'idle',
      conversations: [],
      currentConversationId: null,
      messages: [],
      isGenerating: false,
      streamingContent: '',
      contextData: null,
      settings: DEFAULT_AI_SETTINGS,
      error: null,

      // Panel control
      open: (mode) => {
        const state = get();
        const targetMode = mode || state.mode;

        set((s) => {
          s.isOpen = true;
          s.mode = targetMode;
          s.rigidState = 'idle';
          s.error = null;
        });

        // Select most recent conversation for this mode if exists, don't create new
        const existingConversation = state.conversations.find(c => c.mode === targetMode);
        if (existingConversation && state.currentConversationId !== existingConversation.id) {
          set((s) => {
            s.currentConversationId = existingConversation.id;
          });
        }

        // Refresh context when opening
        get().refreshContext();
      },

      close: () => {
        set((state) => {
          state.isOpen = false;
          state.rigidState = 'idle';
        });
      },

      setMode: (mode) => {
        const state = get();

        set((s) => {
          s.mode = mode;
        });

        // Find most recent conversation for this mode, select it if exists
        const existingConversation = state.conversations.find(c => c.mode === mode);
        if (existingConversation) {
          set((s) => {
            s.currentConversationId = existingConversation.id;
          });
        } else {
          // No conversation for this mode - set to null (will create on first message)
          set((s) => {
            s.currentConversationId = null;
          });
        }

        get().refreshContext();
      },

      // Conversation management
      createConversation: (mode) => {
        const conversationMode = mode || get().mode;
        const id = generateId();
        const conversation: Conversation = {
          id,
          title: generateConversationTitle(conversationMode),
          mode: conversationMode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => {
          state.conversations.unshift(conversation);
          state.currentConversationId = id;
          // Don't clear messages - they're stored per conversation and filtered when rendering
          state.error = null;
        });

        return id;
      },

      selectConversation: (conversationId) => {
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (!conversation) return;

        set((state) => {
          state.currentConversationId = conversationId;
          state.mode = conversation.mode;
          // Don't filter messages - they're filtered by selector when rendering
        });
      },

      deleteConversation: (conversationId) => {
        set((state) => {
          state.conversations = state.conversations.filter(c => c.id !== conversationId);
          state.messages = state.messages.filter(m => m.conversationId !== conversationId);

          // If we deleted the current conversation, select the first one or create new
          if (state.currentConversationId === conversationId) {
            if (state.conversations.length > 0) {
              state.currentConversationId = state.conversations[0].id;
            } else {
              state.currentConversationId = null;
            }
          }
        });
      },

      clearAllConversations: () => {
        set((state) => {
          state.conversations = [];
          state.messages = [];
          state.currentConversationId = null;
        });
      },

      renameConversation: (conversationId, title) => {
        set((state) => {
          const conversation = state.conversations.find(c => c.id === conversationId);
          if (conversation) {
            conversation.title = title;
            conversation.updatedAt = Date.now();
          }
        });
      },

      // Messaging
      sendMessage: async (content) => {
        const state = get();
        const { currentConversationId, contextData, settings, mode } = state;

        if (!content.trim()) return;

        // Ensure we have a conversation
        let conversationId = currentConversationId;
        if (!conversationId) {
          conversationId = get().createConversation();
        }

        // Create user message - deep clone to ensure no frozen references
        const userMessage: ChatMessage = deepClone({
          id: generateId(),
          conversationId,
          role: 'user',
          content: content.trim(),
          timestamp: Date.now(),
        });

        set((s) => {
          s.messages.push(userMessage);
          s.isGenerating = true;
          s.rigidState = 'thinking';
          s.error = null;
          s.streamingContent = '';
        });

        try {
          // Check if AI is configured via provider registry (async to ensure fresh from backend)
          const activeProvider = await providerRegistry.getActiveProviderAsync();
          if (!activeProvider) {
            throw new Error('AI provider not configured. Please configure an AI provider in settings.');
          }

          // Build system prompt based on mode
          const systemPrompt = buildSystemPrompt(mode, contextData);
          // Create fresh message objects to avoid any frozen state issues
          const conversationMessages = get().messages
            .filter(m => m.conversationId === conversationId && m.role !== 'system')
            .map(m => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }));
          const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationMessages,
          ];

          set((s) => {
            s.rigidState = 'working';
          });

          // Call AI via provider registry
          const response = await providerRegistry.complete({
            messages,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature,
            model: settings.model || undefined,
          });

          // Extract citations from response
          const citations = contextData
            ? extractCitationsFromResponse(response.content, contextData)
            : [];

          // Create assistant message - deep clone to ensure no frozen references
          const assistantMessage: ChatMessage = deepClone({
            id: generateId(),
            conversationId,
            role: 'assistant',
            content: response.content,
            timestamp: Date.now(),
            citations,
          });

          set((s) => {
            s.messages.push(assistantMessage);
            s.isGenerating = false;
            s.rigidState = 'success';
            s.streamingContent = '';

            // Update conversation timestamp
            const conversation = s.conversations.find(c => c.id === conversationId);
            if (conversation) {
              conversation.updatedAt = Date.now();
            }
          });

          // Reset to idle after celebration
          setTimeout(() => {
            set((s) => {
              if (s.rigidState === 'success') {
                s.rigidState = 'idle';
              }
            });
          }, 2000);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Create error message - deep clone to ensure no frozen references
          const errorChatMessage: ChatMessage = deepClone({
            id: generateId(),
            conversationId,
            role: 'assistant',
            content: 'I encountered an error while processing your request.',
            timestamp: Date.now(),
            error: errorMessage,
          });

          set((s) => {
            s.messages.push(errorChatMessage);
            s.isGenerating = false;
            s.rigidState = 'error';
            s.error = errorMessage;
            s.streamingContent = '';
          });

          // Reset to idle after showing error
          setTimeout(() => {
            set((s) => {
              if (s.rigidState === 'error') {
                s.rigidState = 'idle';
              }
            });
          }, 3000);
        }
      },

      clearMessages: () => {
        const { currentConversationId } = get();
        set((state) => {
          state.messages = state.messages.filter(m => m.conversationId !== currentConversationId);
        });
      },

      // Context
      refreshContext: async () => {
        try {
          const route = useRouterStore.getState().route;
          // gatherContextForRoute already returns fully cloned data
          const contextData = await gatherContextForRoute(route);
          set((state) => {
            state.contextData = contextData;
          });
        } catch (error) {
          console.error('Failed to refresh context:', error);
        }
      },

      // Settings
      updateSettings: (newSettings) => {
        set((state) => {
          state.settings = { ...state.settings, ...newSettings };
        });
      },

      // State management
      setRigidState: (rigidState) => {
        set((state) => {
          state.rigidState = rigidState;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    {
      name: 'rigid-ai-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
        settings: state.settings,
      }),
    }
  )
);

// =============================================================================
// System Prompt Builders
// =============================================================================

function buildSystemPrompt(mode: AIMode, context: ContextData | null): string {
  const basePrompt = `You are Rigid, an AI assistant integrated into a QA and product documentation platform. You help users understand their applications, track bugs, and document features.

## Response Guidelines
1. Be concise and direct - no unnecessary fluff
2. When referencing sources, use the format [Type: Title] so citations can be extracted
3. If information is not available in the context, say so clearly
4. Use markdown formatting for clarity

## Available Context
${context ? formatContextForPrompt(context) : 'No context available for current view.'}
`;

  const modePrompts: Record<AIMode, string> = {
    'qa': `## Your Role
Answer questions about the application based on the provided context. Help users understand:
- How features work based on documentation and annotations
- What issues have been found and their status
- What explorations and tests have been conducted
- Architecture and system design from documentation

When answering, cite specific sources like [Screenshot: Login Page] or [Issue: #42] so users can navigate to them.`,

    'fix-prompt': `## Your Role
Generate clear, actionable bug fix prompts for coding AI agents (like Claude Code, Cursor, Copilot).

When the user asks about an issue, generate a prompt that includes:
1. Clear description of the bug
2. Steps to reproduce (if available from annotations)
3. Expected vs actual behavior
4. Relevant file paths or components (if mentioned in context)
5. Priority and severity

Format the output as markdown that can be copied directly to a coding agent.`,

    'session-resume': `## Your Role
Help users pick up where they left off by analyzing the current context and suggesting next steps.

Based on the available context, identify:
1. Recent work and incomplete items
2. Open issues that need attention
3. Features in progress
4. Suggested next actions

Prioritize actionable suggestions.`,

    'summary': `## Your Role
Generate executive summaries of exploration sessions.

Create a concise summary (2-3 paragraphs) covering:
1. What was tested or explored
2. Key findings (bugs, issues, observations)
3. Recommendations for next steps

Focus on insights that would be valuable for team communication or future reference.`,
  };

  return basePrompt + '\n\n' + modePrompts[mode];
}

function formatContextForPrompt(context: ContextData): string {
  // Import from context-service for formatting
  const { formatContextAsPrompt } = require('@/lib/ai/context-service');
  return formatContextAsPrompt(context);
}

// =============================================================================
// Selectors
// =============================================================================

export const selectCurrentConversation = (state: AIChatStore): Conversation | null => {
  return state.conversations.find(c => c.id === state.currentConversationId) || null;
};

export const selectCurrentMessages = (state: AIChatStore): ChatMessage[] => {
  return state.messages.filter(m => m.conversationId === state.currentConversationId);
};

export const selectConversationsByMode = (state: AIChatStore, mode: AIMode): Conversation[] => {
  return state.conversations.filter(c => c.mode === mode);
};
