"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Settings,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouterStore, useSettingsStore } from "@/lib/stores";
import { RigidLogo } from "@/components/ui/rigid-logo";
import { AIProviderConfig } from "@/components/ai/ai-provider-config";
import { ThemeSettings } from "@/components/settings";

export function SettingsView() {
  const { navigate, goBack, canGoBack } = useRouterStore();
  const {
    items: settings,
    loading: settingsLoading,
    load: loadSettings,
    set: setSetting,
  } = useSettingsStore();
  const [aiSectionExpanded, setAiSectionExpanded] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleBack = () => {
    if (canGoBack()) {
      goBack();
    } else {
      navigate({ name: "home" });
    }
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
            <h1 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] leading-10">
              Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* General Settings */}
        <section className="mb-8">
          <h2 className="mb-4 text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
            General
          </h2>

          <div className="space-y-4">
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

        {/* Appearance / Themes */}
        <ThemeSettings />

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

        {/* AI Settings */}
        <section className="mb-8">
          <button
            onClick={() => setAiSectionExpanded(!aiSectionExpanded)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center bg-[var(--text-primary)]">
                <Bot size={16} className="text-[var(--text-inverse)]" />
              </div>
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                AI Providers
              </h2>
            </div>
            {aiSectionExpanded ? (
              <ChevronUp size={20} className="text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown size={20} className="text-[var(--text-secondary)]" />
            )}
          </button>

          {aiSectionExpanded && (
            <div className="border border-[var(--border-default)] bg-[var(--surface-secondary)] overflow-hidden">
              <AIProviderConfig />
            </div>
          )}
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
