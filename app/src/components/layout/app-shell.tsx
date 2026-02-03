"use client";

import { AIPanel } from "@/components/ai";
import { ActionNotesScratchpad } from "@/components/recording/ActionNotesScratchpad";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotification } from "@/components/update";
import { useRecordingShortcuts } from "@/hooks/useRecordingShortcuts";
import { providerRegistry } from "@/lib/ai/providers";
import { useEffect } from "react";
import { ExportIndicator } from "./export-indicator";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Initialize AI provider registry on app startup
  useEffect(() => {
    providerRegistry.initialize().catch(console.warn);
  }, []);

  // Register global recording shortcuts
  useRecordingShortcuts();

  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <ConfirmDialogProvider>
          {children}
          <ExportIndicator />
          <UpdateNotification />
          <AIPanel />
          <ActionNotesScratchpad />
        </ConfirmDialogProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
