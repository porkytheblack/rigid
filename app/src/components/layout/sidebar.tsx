"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Video,
  AlertCircle,
  BookOpen,
  Camera,
  Settings,
  Plus,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  shortcut?: string;
}

const mainNavItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    shortcut: "⌘1",
  },
  {
    href: "/checklist",
    label: "Checklist",
    icon: CheckSquare,
    shortcut: "⌘2",
  },
  {
    href: "/sessions",
    label: "Sessions",
    icon: Video,
    shortcut: "⌘3",
  },
  {
    href: "/issues",
    label: "Issues",
    icon: AlertCircle,
    badge: 7,
    shortcut: "⌘4",
  },
  {
    href: "/codex",
    label: "Codex",
    icon: BookOpen,
    shortcut: "⌘5",
  },
  {
    href: "/screenshots",
    label: "Screenshots",
    icon: Camera,
    shortcut: "⌘6",
  },
];

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  onClick?: () => void;
}

const quickActions: QuickAction[] = [
  {
    label: "New Issue",
    icon: Plus,
    shortcut: "⌘I",
  },
  {
    label: "Screenshot",
    icon: Camera,
    shortcut: "⌘⇧S",
  },
  {
    label: "Record",
    icon: Circle,
    shortcut: "⌘⇧R",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent)]">
          <span className="text-[var(--text-inverse)] font-semibold text-sm">
            T
          </span>
        </div>
        <div>
          <h1 className="font-semibold text-[var(--text-primary)] text-sm">
            Taka
          </h1>
          <p className="text-[var(--text-xs)] text-[var(--text-tertiary)]">
            Testing Companion
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium transition-colors",
                        isActive
                          ? "bg-[var(--bg-active)] text-[var(--text-primary)] border-l-2 border-[var(--accent)] -ml-0.5 pl-[calc(0.75rem+2px)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="error">{item.badge}</Badge>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[var(--text-tertiary)]">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
          <p className="px-3 mb-2 text-[var(--text-xs)] text-[var(--text-tertiary)] uppercase tracking-wider">
            Quick Actions
          </p>
          <ul className="space-y-1">
            {quickActions.map((action) => (
              <li key={action.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-3 py-2 h-auto text-[var(--text-sm)] font-medium"
                      onClick={action.onClick}
                    >
                      <action.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{action.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex items-center gap-2">
                      <span>{action.label}</span>
                      <span className="text-[var(--text-tertiary)]">
                        {action.shortcut}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer - Settings */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span>Settings</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex items-center gap-2">
              <span>Settings</span>
              <span className="text-[var(--text-tertiary)]">⌘,</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
