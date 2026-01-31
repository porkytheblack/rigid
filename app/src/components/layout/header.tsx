"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RecordingIndicator } from "./recording-indicator";

interface HeaderProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

// Page title mapping
const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/checklist": "Checklist",
  "/sessions": "Sessions",
  "/issues": "Issues",
  "/codex": "Codex",
  "/screenshots": "Screenshots",
  "/settings": "Settings",
};

export function Header({ title, description, actions }: HeaderProps) {
  const pathname = usePathname();

  // Build breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const label = pageTitles[href] || segment;
    return { href, label };
  });

  // Get page title
  const pageTitle = title || pageTitles[pathname] || "Rigid";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-6 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
      {/* Left side - Title and Breadcrumbs */}
      <div className="flex flex-col justify-center min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--text-tertiary)]">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-3 h-3" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-[var(--text-secondary)]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)] truncate">
          {pageTitle}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] truncate">
            {description}
          </p>
        )}
      </div>

      {/* Right side - Search and Actions */}
      <div className="flex items-center gap-3">
        {/* Recording Indicator */}
        <RecordingIndicator />

        {/* Command Palette Trigger */}
        <Button
          variant="secondary"
          size="sm"
          className={cn(
            "hidden md:flex items-center gap-2 px-3 text-[var(--text-tertiary)]",
            "hover:text-[var(--text-secondary)]"
          )}
          onClick={() => {
            // TODO: Open command palette
          }}
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="ml-2 text-[var(--text-xs)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </Button>

        {/* Page-specific actions */}
        {actions}
      </div>
    </header>
  );
}
