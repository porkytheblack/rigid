"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Settings,
  Key,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  Cpu,
  Trash2,
} from "lucide-react";
import { useRouterStore, useSettingsStore, useAIStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import type { AIProvider } from "@/lib/tauri/types";
import { RigidLogo } from "@/components/ui/rigid-logo";

const AI_PROVIDERS: { id: AIProvider; name: string; description: string }[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4, GPT-4 Vision, and other OpenAI models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Opus, and other Claude models",
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Local models via Ollama (no API key required)",
  },
];

export function SettingsView() {
  const { navigate, goBack, canGoBack } = useRouterStore();
  const { addToast } = useToast();
  const {
    items: settings,
    loading: settingsLoading,
    load: loadSettings,
    set: setSetting,
  } = useSettingsStore();
  const {
    configured,
    currentProvider,
    providerStatuses,
    models,
    loading: aiLoading,
    error: aiError,
    checkAvailability,
    configureProvider,
    setApiKey,
    removeApiKey,
    loadModels,
    restoreConfiguration,
    clearError,
  } = useAIStore();

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    loadSettings();
    checkAvailability();
    restoreConfiguration();
  }, [loadSettings, checkAvailability, restoreConfiguration]);

  useEffect(() => {
    if (currentProvider) {
      loadModels();
    }
  }, [currentProvider, loadModels]);

  const handleBack = () => {
    if (canGoBack()) {
      goBack();
    } else {
      navigate({ name: "home" });
    }
  };

  const handleSaveApiKey = async (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key?.trim()) return;

    setSavingKey(provider);
    try {
      await setApiKey(provider, key.trim());
      setApiKeys((prev) => ({ ...prev, [provider]: "" }));
      addToast({
        type: "success",
        title: "API key saved",
        description: `Your ${AI_PROVIDERS.find(p => p.id === provider)?.name} API key has been saved.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Failed to save API key",
        description: "Please check your API key and try again.",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemoveApiKey = async (provider: AIProvider) => {
    try {
      await removeApiKey(provider);
      addToast({
        type: "success",
        title: "API key removed",
        description: `Your ${AI_PROVIDERS.find(p => p.id === provider)?.name} API key has been removed.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Failed to remove API key",
        description: "Please try again.",
      });
    }
  };

  const handleSelectProvider = async (provider: AIProvider) => {
    try {
      await configureProvider(provider, selectedModel || undefined);
      addToast({
        type: "success",
        title: "Provider activated",
        description: `${AI_PROVIDERS.find(p => p.id === provider)?.name} is now your active AI provider.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Failed to activate provider",
        description: "Please try again.",
      });
    }
  };

  const handleSelectModel = async (model: string) => {
    setSelectedModel(model);
    if (currentProvider) {
      await configureProvider(currentProvider, model);
    }
  };

  const getProviderStatus = (provider: AIProvider) => {
    return providerStatuses.find((s) => s.provider === provider);
  };

  return (
    <div className="h-screen overflow-auto bg-[var(--surface-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--surface-primary)]">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[var(--text-primary)]">
              <Settings size={20} className="text-[var(--text-inverse)]" />
            </div>
            <h1 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)]">
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Error Banner */}
        {aiError && (
          <div className="mb-6 flex items-center justify-between border border-[var(--accent-error)]/30 bg-[var(--status-error-bg)] px-4 py-3">
            <p className="text-[var(--text-body-sm)] text-[var(--accent-error)]">{aiError}</p>
            <button
              onClick={clearError}
              className="text-[var(--accent-error)] hover:opacity-70"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* AI Configuration Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
            AI Provider
          </h2>
          <p className="mb-6 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
            Configure an AI provider to enable automatic screenshot descriptions
            and intelligent issue analysis.
          </p>

          <div className="space-y-4">
            {AI_PROVIDERS.map((provider) => {
              const status = getProviderStatus(provider.id);
              const isConfigured = status?.available;
              const isActive = currentProvider === provider.id;
              const needsKey = provider.id !== "ollama";

              return (
                <div
                  key={provider.id}
                  className={`border p-5 transition-colors ${
                    isActive
                      ? "border-[var(--border-strong)] bg-[var(--surface-hover)]"
                      : "border-[var(--border-default)] bg-[var(--surface-secondary)]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center ${
                          isActive
                            ? "bg-[var(--text-primary)]"
                            : "bg-[var(--surface-elevated)]"
                        }`}
                      >
                        <Cpu
                          size={24}
                          className={
                            isActive
                              ? "text-[var(--text-inverse)]"
                              : "text-[var(--text-secondary)]"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[var(--text-primary)]">
                            {provider.name}
                          </h3>
                          {isActive && (
                            <span className="bg-[var(--text-primary)] px-2 py-0.5 text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--text-inverse)]">
                              Active
                            </span>
                          )}
                          {isConfigured && !isActive && (
                            <span className="bg-[var(--status-success-bg)] px-2 py-0.5 text-[var(--text-caption)] font-medium uppercase tracking-wide text-[var(--accent-success)]">
                              Ready
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                          {provider.description}
                        </p>
                      </div>
                    </div>

                    {isConfigured && !isActive && (
                      <button
                        onClick={() => handleSelectProvider(provider.id)}
                        disabled={aiLoading}
                        className="bg-[var(--text-primary)] px-4 py-2 text-[var(--text-body-sm)] font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {aiLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          "Use"
                        )}
                      </button>
                    )}
                  </div>

                  {/* API Key Input */}
                  {needsKey && (
                    <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                      <div className="flex items-center gap-2">
                        <Key
                          size={14}
                          className="text-[var(--text-tertiary)]"
                        />
                        <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">
                          API Key
                        </span>
                        {isConfigured && (
                          <Check size={14} className="text-[var(--accent-success)]" />
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showKeys[provider.id] ? "text" : "password"}
                            value={apiKeys[provider.id] || ""}
                            onChange={(e) =>
                              setApiKeys((prev) => ({
                                ...prev,
                                [provider.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              isConfigured
                                ? "••••••••••••••••"
                                : `Enter ${provider.name} API key`
                            }
                            className="w-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 pr-10 text-[var(--text-body-sm)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--border-strong)]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowKeys((prev) => ({
                                ...prev,
                                [provider.id]: !prev[provider.id],
                              }))
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                          >
                            {showKeys[provider.id] ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => handleSaveApiKey(provider.id)}
                          disabled={
                            !apiKeys[provider.id]?.trim() ||
                            savingKey === provider.id
                          }
                          className="bg-[var(--text-primary)] px-4 py-2 text-[var(--text-body-sm)] font-medium text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {savingKey === provider.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </button>
                        {isConfigured && (
                          <button
                            onClick={() => handleRemoveApiKey(provider.id)}
                            className="border border-[var(--accent-error)]/30 px-3 py-2 text-[var(--accent-error)] transition-colors hover:bg-[var(--status-error-bg)]"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ollama special case */}
                  {!needsKey && (
                    <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                      <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                        {isConfigured
                          ? "Ollama is running and available."
                          : "Make sure Ollama is running locally on port 11434."}
                      </p>
                      {!isConfigured && (
                        <button
                          onClick={() => checkAvailability()}
                          disabled={aiLoading}
                          className="mt-2 text-[var(--text-body-sm)] text-[var(--text-primary)] underline hover:no-underline"
                        >
                          Check again
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Model Selection */}
        {currentProvider && models.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
              Model
            </h2>
            <p className="mb-4 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
              Select which model to use for AI features.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => handleSelectModel(model)}
                  className={`border p-3 text-left text-[var(--text-body-sm)] transition-colors ${
                    selectedModel === model
                      ? "border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium"
                      : "border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* General Settings */}
        <section className="mb-8">
          <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
            General
          </h2>

          <div className="space-y-4">
            {/* Auto-describe screenshots */}
            <div className="flex items-center justify-between border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  Auto-describe screenshots
                </h3>
                <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                  Automatically generate descriptions for new screenshots using
                  AI
                </p>
              </div>
              <ToggleSwitch
                enabled={settings["auto_describe_screenshots"] === "true"}
                onChange={(enabled) =>
                  setSetting(
                    "auto_describe_screenshots",
                    enabled ? "true" : "false"
                  )
                }
                disabled={!configured || settingsLoading}
              />
            </div>

            {/* Screenshot format */}
            <div className="border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
              <h3 className="font-medium text-[var(--text-primary)]">
                Screenshot format
              </h3>
              <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                Image format for captured screenshots
              </p>
              <div className="mt-3 flex gap-2">
                {["png", "jpg"].map((format) => (
                  <button
                    key={format}
                    onClick={() => setSetting("screenshot_format", format)}
                    className={`px-4 py-2 text-[var(--text-body-sm)] font-medium uppercase tracking-wide transition-colors ${
                      (settings["screenshot_format"] || "png") === format
                        ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Video format */}
            <div className="border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
              <h3 className="font-medium text-[var(--text-primary)]">
                Video format
              </h3>
              <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                Format for screen recordings
              </p>
              <div className="mt-3 flex gap-2">
                {["mov", "mp4"].map((format) => (
                  <button
                    key={format}
                    onClick={() => setSetting("video_format", format)}
                    className={`px-4 py-2 text-[var(--text-body-sm)] font-medium uppercase tracking-wide transition-colors ${
                      (settings["video_format"] || "mov") === format
                        ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                        : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Record audio */}
            <div className="flex items-center justify-between border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  Record audio
                </h3>
                <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                  Include system audio in screen recordings
                </p>
              </div>
              <ToggleSwitch
                enabled={settings["record_audio"] === "true"}
                onChange={(enabled) =>
                  setSetting("record_audio", enabled ? "true" : "false")
                }
                disabled={settingsLoading}
              />
            </div>

            {/* Show cursor */}
            <div className="flex items-center justify-between border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">
                  Show cursor in recordings
                </h3>
                <p className="mt-1 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                  Include mouse cursor in screen recordings
                </p>
              </div>
              <ToggleSwitch
                enabled={settings["show_cursor"] !== "false"}
                onChange={(enabled) =>
                  setSetting("show_cursor", enabled ? "true" : "false")
                }
                disabled={settingsLoading}
              />
            </div>
          </div>
        </section>

        {/* Permissions */}
        <section className="mb-8">
          <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
            Permissions
          </h2>
          <p className="mb-4 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
            Grant access to screen recording and microphone for capture features.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => import("@/lib/tauri/commands").then(m => m.capture.openPrivacySettings("screen_recording"))}
              className="w-full flex items-center justify-between border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[var(--surface-elevated)]">
                  <Settings size={20} className="text-[var(--text-secondary)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-[var(--text-primary)]">Screen Recording</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">Required for video recording</p>
                </div>
              </div>
              <span className="text-[var(--text-body-sm)] text-[var(--text-primary)] font-medium">Open Settings →</span>
            </button>
            <button
              onClick={() => import("@/lib/tauri/commands").then(m => m.capture.openPrivacySettings("microphone"))}
              className="w-full flex items-center justify-between border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[var(--surface-elevated)]">
                  <Settings size={20} className="text-[var(--text-secondary)]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-[var(--text-primary)]">Microphone</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">Required for audio recording</p>
                </div>
              </div>
              <span className="text-[var(--text-body-sm)] text-[var(--text-primary)] font-medium">Open Settings →</span>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
            About
          </h2>
          <div className="border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4">
            <div className="flex items-center gap-3">
              <RigidLogo size={48} />
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">
                  Rigid Systems
                </h3>
                <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                  Version 0.1.0
                </p>
              </div>
            </div>
            <p className="mt-4 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
              Build rigid systems. Coding with AI agents is more like sculpting
              and less precise. Rigid helps you explore, document and deliver
              your app by giving you the tools for focused testing and analysis
              of an app you did not write.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative h-6 w-11 transition-colors ${
        enabled ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
