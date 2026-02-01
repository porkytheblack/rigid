"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { RigidCharacterMini, type RigidAnimation } from "@/components/ui/rigid-character";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; color: string; bgColor: string; animation: RigidAnimation }> = {
  success: { icon: CheckCircle, color: "var(--accent-success)", bgColor: "var(--status-success-bg)", animation: "celebrate" },
  error: { icon: AlertCircle, color: "var(--accent-error)", bgColor: "var(--status-error-bg)", animation: "shake" },
  info: { icon: Info, color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)", animation: "wave" },
  warning: { icon: AlertTriangle, color: "var(--accent-warning)", bgColor: "var(--status-warning-bg)", animation: "think" },
};

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-lg toast-animated-enter ${toast.type === 'success' ? 'toast-success-pop' : ''}`}
            style={{ borderLeftWidth: "3px", borderLeftColor: config.color }}
          >
            {/* Animated character instead of static icon */}
            <div className="flex-shrink-0 mt-0.5">
              <RigidCharacterMini animation={config.animation} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-1 text-[var(--text-caption)] text-[var(--text-secondary)]">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors btn-animated"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
