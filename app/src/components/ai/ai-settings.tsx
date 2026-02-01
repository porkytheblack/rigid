'use client';

import { useState, useMemo } from 'react';
import { Settings2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatStore } from '@/lib/stores/ai-chat';
import { Button } from '@/components/ui/button';
import { AIProviderConfig } from './ai-provider-config';
import { TOKEN_LIMITS } from '@/lib/ai/models';
import { providerRegistry, PROVIDER_CONFIGS } from '@/lib/ai/providers';

interface AISettingsProps {
  showButton?: boolean;
}

export function AISettings({ showButton }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  const settings = useAIChatStore((state) => state.settings);
  const updateSettings = useAIChatStore((state) => state.updateSettings);

  // Read from provider registry only when panel is open (sync without useEffect)
  const activeProvider = useMemo(
    () => isOpen ? providerRegistry.getActiveProvider() : null,
    [isOpen]
  );
  const activeModel = useMemo(
    () => isOpen ? providerRegistry.getActiveModel() : null,
    [isOpen]
  );

  const handleMaxTokensChange = (value: number) => {
    updateSettings({ maxTokens: value });
  };

  if (showButton) {
    return (
      <>
        <Button onClick={() => setIsOpen(true)} variant="secondary">
          <Settings2 className="w-4 h-4 mr-2" />
          Configure AI
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsOpen(false)}
            />

            {/* Centered Dialog */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[28rem] max-h-[80vh] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden flex flex-col">
              <AIProviderConfig onClose={() => setIsOpen(false)} />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
        className={cn(isOpen && 'bg-[var(--bg-hover)]')}
      >
        <Settings2 className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setShowProviderConfig(false);
            }}
          />

          {/* Settings Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden max-h-[80vh] flex flex-col">
            {showProviderConfig ? (
              <AIProviderConfig onClose={() => setShowProviderConfig(false)} />
            ) : (
              <>
                <div className="p-4 border-b border-[var(--border-subtle)]">
                  <h3 className="text-[var(--text-md)] font-semibold text-[var(--text-primary)]">
                    AI Settings
                  </h3>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                  {/* Current Provider Status */}
                  <div>
                    <label className="block text-[var(--text-sm)] font-medium text-[var(--text-secondary)] mb-2">
                      Active Provider
                    </label>
                    <button
                      onClick={() => setShowProviderConfig(true)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2',
                        'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
                        'rounded-md text-left hover:bg-[var(--bg-hover)] transition-colors'
                      )}
                    >
                      <div>
                        {activeProvider ? (
                          <>
                            <div className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
                              {PROVIDER_CONFIGS[activeProvider as keyof typeof PROVIDER_CONFIGS]?.name || activeProvider}
                            </div>
                            <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                              {activeModel || 'No model selected'}
                            </div>
                          </>
                        ) : (
                          <div className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
                            Click to configure a provider
                          </div>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </button>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">
                        Max Tokens
                      </label>
                      <span className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
                        {settings.maxTokens.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={TOKEN_LIMITS.min}
                      max={TOKEN_LIMITS.max}
                      step={TOKEN_LIMITS.step}
                      value={settings.maxTokens}
                      onChange={(e) => handleMaxTokensChange(Number(e.target.value))}
                      className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                      <span>{TOKEN_LIMITS.min}</span>
                      <span>{TOKEN_LIMITS.max.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">
                        Temperature
                      </label>
                      <span className="text-[var(--text-sm)] text-[var(--text-tertiary)]">
                        {settings.temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={settings.temperature}
                      onChange={(e) => updateSettings({ temperature: Number(e.target.value) })}
                      className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[var(--text-xs)] text-[var(--text-tertiary)] mt-1">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Configure Providers Button */}
                  <Button
                    onClick={() => setShowProviderConfig(true)}
                    variant="secondary"
                    className="w-full"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Manage Providers
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
