"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { ExportIndicator } from "./export-indicator";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        <ConfirmDialogProvider>
          {children}
          <ExportIndicator />
        </ConfirmDialogProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
