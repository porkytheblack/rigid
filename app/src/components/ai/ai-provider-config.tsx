'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  providerRegistry,
  PROVIDER_CONFIGS,
  getCloudProviders,
  getLocalProviders,
  type ProviderType,
  type ProviderStatus,
} from '@/lib/ai/providers';

interface AIProviderConfigProps {
  onClose?: () => void;
}

export function AIProviderConfig({ onClose }: AIProviderConfigProps) {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ProviderType | null>(
    () => providerRegistry.getActiveProvider()
  );
  const [activeModel, setActiveModel] = useState<string | null>(
    () => providerRegistry.getActiveModel()
  );
  const [expandedProvider, setExpandedProvider] = useState<ProviderType | null>(null);
  const hasInitialized = useRef(false);

  const loadProviderStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = await providerRegistry.checkAllProviders();
      setProviderStatuses(statuses);
      // Refresh active provider/model from registry after loading
      const currentProvider = await providerRegistry.getActiveProviderAsync();
      const currentModel = providerRegistry.getActiveModel();
      setActiveProvider(currentProvider);
      setActiveModel(currentModel);
    } catch (error) {
      console.error('Failed to check providers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial state only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadProviderStatuses();
    }
  }, [loadProviderStatuses]);

  const handleSelectProvider = useCallback(async (provider: ProviderType, model?: string) => {
    try {
      await providerRegistry.setActiveProvider(provider, model);
      setActiveProvider(provider);
      if (model) {
        setActiveModel(model);
      }
    } catch (error) {
      console.error('Failed to set provider:', error);
    }
  }, []);

  const getStatusForProvider = (provider: ProviderType): ProviderStatus | undefined => {
    return providerStatuses.find(s => s.provider === provider);
  };

  const cloudProviders = getCloudProviders();
  const localProviders = getLocalProviders();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">
          AI Provider Settings
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadProviderStatuses}
            disabled={loading}
            title="Refresh providers"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Cloud Providers */}
        <section>
          <h3 className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Cloud Providers
          </h3>
          <div className="space-y-2">
            {cloudProviders.map(config => {
              const status = getStatusForProvider(config.id);
              return (
                <ProviderCard
                  key={config.id}
                  provider={config.id}
                  status={status}
                  isActive={activeProvider === config.id}
                  activeModel={activeProvider === config.id ? activeModel : null}
                  isExpanded={expandedProvider === config.id}
                  onExpand={() => setExpandedProvider(
                    expandedProvider === config.id ? null : config.id
                  )}
                  onSelect={handleSelectProvider}
                                    onRefresh={loadProviderStatuses}
                />
              );
            })}
          </div>
        </section>

        {/* Local Providers */}
        <section>
          <h3 className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            Local Providers
          </h3>
          <div className="space-y-2">
            {localProviders.map(config => {
              const status = getStatusForProvider(config.id);
              return (
                <ProviderCard
                  key={config.id}
                  provider={config.id}
                  status={status}
                  isActive={activeProvider === config.id}
                  activeModel={activeProvider === config.id ? activeModel : null}
                  isExpanded={expandedProvider === config.id}
                  onExpand={() => setExpandedProvider(
                    expandedProvider === config.id ? null : config.id
                  )}
                  onSelect={handleSelectProvider}
                                    onRefresh={loadProviderStatuses}
                />
              );
            })}
          </div>
        </section>

        {/* Current Selection */}
        {activeProvider && (
          <section className="pt-4 border-t border-[var(--border-subtle)]">
            <h3 className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Active Configuration
            </h3>
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
                    {PROVIDER_CONFIGS[activeProvider].name}
                  </div>
                  <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                    {activeModel || 'No model selected'}
                  </div>
                </div>
                <Check className="w-5 h-5 text-[var(--accent)]" />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Provider Card Component
// =============================================================================

interface ProviderCardProps {
  provider: ProviderType;
  status?: ProviderStatus;
  isActive: boolean;
  activeModel: string | null;
  isExpanded: boolean;
  onExpand: () => void;
  onSelect: (provider: ProviderType, model?: string) => void;
  onRefresh: () => void;
}

function ProviderCard({
  provider,
  status,
  isActive,
  activeModel,
  isExpanded,
  onExpand,
  onSelect,
  onRefresh,
}: ProviderCardProps) {
  const config = PROVIDER_CONFIGS[provider];

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(config.defaultBaseUrl || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  // Load credentials asynchronously when expanded
  useEffect(() => {
    if (isExpanded && !credentialsLoaded) {
      providerRegistry.getCredentials(provider).then((creds) => {
        if (creds) {
          setApiKey(creds.apiKey || '');
          setBaseUrl(creds.baseUrl || config.defaultBaseUrl || '');
        }
        setCredentialsLoaded(true);
      });
    }
  }, [isExpanded, credentialsLoaded, provider, config.defaultBaseUrl]);

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      await providerRegistry.setCredentials(provider, {
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to save credentials:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCredentials = async () => {
    setSaving(true);
    try {
      await providerRegistry.removeCredentials(provider);
      setApiKey('');
      onRefresh();
    } catch (error) {
      console.error('Failed to remove credentials:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectWithDefaultModel = () => {
    const defaultModel = status?.models.find(m => m.isDefault) || status?.models[0];
    onSelect(provider, defaultModel?.id);
  };

  const isAvailable = status?.available ?? false;
  const isConfigured = status?.configured ?? false;

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-all',
      isActive
        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
        : 'border-[var(--border-default)] bg-[var(--bg-surface)]',
      isExpanded && 'shadow-sm'
    )}>
      {/* Header */}
      <button
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className={cn(
          'flex-shrink-0 w-2 h-2 rounded-full',
          isAvailable ? 'bg-[var(--status-success)]' : 'bg-[var(--text-tertiary)]'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-sm)] font-medium text-[var(--text-primary)]">
              {config.name}
            </span>
            {isActive && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--accent)] text-[var(--text-inverse)] rounded">
                Active
              </span>
            )}
          </div>
          <div className="text-[var(--text-xs)] text-[var(--text-tertiary)] truncate">
            {status?.error || config.description}
          </div>
        </div>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-subtle)]">
          {/* API Key Input */}
          {config.requiresApiKey && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[var(--text-sm)] font-medium text-[var(--text-secondary)]">
                  API Key
                </label>
                {config.apiKeyUrl && (
                  <a
                    href={config.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--accent)] hover:underline"
                  >
                    Get API Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config.apiKeyPlaceholder || 'Enter API key...'}
                  className={cn(
                    'w-full px-3 py-2 pr-20',
                    'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
                    'rounded-md text-[var(--text-sm)] text-[var(--text-primary)]',
                    'placeholder:text-[var(--text-tertiary)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleRemoveCredentials}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--status-error)]"
                      title="Remove API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Base URL Input */}
          {config.baseUrlConfigurable && (
            <div>
              <label className="block text-[var(--text-sm)] font-medium text-[var(--text-secondary)] mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={config.defaultBaseUrl || 'Enter base URL...'}
                className={cn(
                  'w-full px-3 py-2',
                  'bg-[var(--bg-secondary)] border border-[var(--border-default)]',
                  'rounded-md text-[var(--text-sm)] text-[var(--text-primary)]',
                  'placeholder:text-[var(--text-tertiary)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
                )}
              />
            </div>
          )}

          {/* Save Button */}
          {(config.requiresApiKey || config.baseUrlConfigurable) && (
            <Button
              onClick={handleSaveCredentials}
              disabled={saving || (config.requiresApiKey && !apiKey)}
              size="sm"
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Verify'
              )}
            </Button>
          )}

          {/* Model Selection */}
          {status?.models && status.models.length > 0 && isConfigured && (
            <div>
              <label className="block text-[var(--text-sm)] font-medium text-[var(--text-secondary)] mb-2">
                Model
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {status.models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelect(provider, model.id);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-md text-left',
                      'transition-colors',
                      isActive && activeModel === model.id
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    )}
                  >
                    <div>
                      <div className="text-[var(--text-sm)] font-medium">
                        {model.name}
                      </div>
                      <div className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
                        {model.contextWindow?.toLocaleString()} context
                        {model.supportsVision && ' • Vision'}
                      </div>
                    </div>
                    {isActive && activeModel === model.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Use This Provider Button */}
          {isConfigured && !isActive && (
            <Button
              onClick={handleSelectWithDefaultModel}
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={!isAvailable}
            >
              Use {config.name}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
