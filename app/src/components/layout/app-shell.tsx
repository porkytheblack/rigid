"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ExportIndicator } from "./export-indicator";
import { AIPanel } from "@/components/ai";
import { providerRegistry } from "@/lib/ai/providers";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Initialize AI provider registry on app startup
  useEffect(() => {
    providerRegistry.initialize().catch(console.warn);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <ConfirmDialogProvider>
          {children}
          <ExportIndicator />
          <AIPanel />
        </ConfirmDialogProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
