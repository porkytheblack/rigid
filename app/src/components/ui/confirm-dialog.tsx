"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(true);
    setResolvePromise(null);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-0">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center ${
                  options.variant === "destructive"
                    ? "bg-[var(--status-error-bg)]"
                    : "bg-[var(--surface-elevated)]"
                }`}
              >
                {options.icon || (
                  options.variant === "destructive" ? (
                    <Trash2 className="w-6 h-6 text-[var(--accent-error)]" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-[var(--accent-warning)]" />
                  )
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[var(--text-heading-md)] font-semibold text-[var(--text-primary)]">
                  {options.title}
                </h2>
                {options.description && (
                  <p className="mt-2 text-[var(--text-body-sm)] text-[var(--text-secondary)]">
                    {options.description}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="p-1.5 -mr-1.5 -mt-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
              >
                {options.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 font-medium transition-colors ${
                  options.variant === "destructive"
                    ? "bg-[var(--accent-error)] text-white hover:opacity-90"
                    : "bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90"
                }`}
              >
                {options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return context.confirm;
}
