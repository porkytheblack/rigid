"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, X, Check } from "lucide-react";
import { useExportsStore, type Export } from "@/lib/stores";
import { useShallow } from "zustand/react/shallow";
import { RigidCharacterMini } from "@/components/ui/rigid-character";

// Format time for display (e.g., "2:15" or "1:23:45")
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export function ExportIndicator() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use shallow comparison to prevent infinite re-renders
  const exportsRecord = useExportsStore(useShallow((state) => state.exports));
  const init = useExportsStore((state) => state.init);
  const cleanup = useExportsStore((state) => state.cleanup);
  const clearCompleted = useExportsStore((state) => state.clearCompleted);

  // Memoize the exports array
  const exports = useMemo(() => Object.values(exportsRecord), [exportsRecord]);

  // Initialize export event listeners
  useEffect(() => {
    init();
    return () => {
      cleanup();
    };
  }, [init, cleanup]);

  // Get active exports for the indicator
  const activeExports = exports.filter(
    (e) => e.status === 'pending' || e.status === 'encoding'
  );
  const recentCompleted = exports.filter(
    (e) => e.status === 'complete' || e.status === 'error'
  ).slice(0, 3);

  const hasActiveExport = activeExports.length > 0;
  const hasAnyExport = exports.length > 0;

  // Auto-expand when a new export starts
  useEffect(() => {
    if (hasActiveExport) {
      setIsExpanded(true);
    }
  }, [hasActiveExport]);

  // Don't show anything if no exports
  if (!hasAnyExport) {
    return null;
  }

  // Get the most recent active export for the mini indicator
  const primaryExport = activeExports[0] || recentCompleted[0];
  if (!primaryExport) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view - small indicator */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-lg hover:bg-[var(--surface-hover)] transition-colors btn-animated"
        >
          {primaryExport.status === 'encoding' || primaryExport.status === 'pending' ? (
            <>
              <RigidCharacterMini animation="work" size={18} />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {primaryExport.progress.toFixed(0)}%
              </span>
            </>
          ) : primaryExport.status === 'complete' ? (
            <>
              <RigidCharacterMini animation="celebrate" size={18} />
              <span className="text-sm text-[var(--status-success)]">Done!</span>
            </>
          ) : (
            <>
              <RigidCharacterMini animation="sad" size={18} />
              <span className="text-sm text-[var(--accent-error)]">Failed</span>
            </>
          )}
        </button>
      )}

      {/* Expanded view - full panel */}
      {isExpanded && (
        <div className="w-80 bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Exports</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Export list */}
          <div className="max-h-80 overflow-y-auto">
            {activeExports.map((exp) => (
              <ExportItem key={exp.id} export={exp} />
            ))}
            {recentCompleted.map((exp) => (
              <ExportItem key={exp.id} export={exp} />
            ))}
          </div>

          {/* Footer */}
          {recentCompleted.length > 0 && (
            <div className="px-3 py-2 border-t border-[var(--border-default)]">
              <button
                onClick={() => clearCompleted()}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportItem({ export: exp }: { export: Export }) {
  const isActive = exp.status === 'pending' || exp.status === 'encoding';
  const isComplete = exp.status === 'complete';
  const isError = exp.status === 'error';

  // Get filename from path
  const filename = exp.outputPath.split('/').pop() || 'Export';

  return (
    <div className="px-3 py-2 border-b border-[var(--border-default)] last:border-b-0">
      <div className="flex items-start gap-2">
        {/* Animated status character */}
        <div className="mt-0.5">
          {isActive && <RigidCharacterMini animation="work" size={16} />}
          {isComplete && <RigidCharacterMini animation="celebrate" size={16} />}
          {isError && <RigidCharacterMini animation="sad" size={16} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate" title={filename}>
            {filename}
          </div>

          {isActive && (
            <>
              {/* Progress bar */}
              <div className="mt-1 h-1.5 bg-[var(--surface-active)] overflow-hidden rounded-full">
                <div
                  className="h-full bg-[var(--text-primary)] transition-all duration-300"
                  style={{ width: `${exp.progress}%` }}
                />
              </div>
              {/* Progress details */}
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>{exp.progress.toFixed(1)}%</span>
                <span>
                  {exp.estimatedRemainingSecs != null
                    ? `${formatDuration(exp.estimatedRemainingSecs)} remaining`
                    : 'Calculating...'}
                </span>
              </div>
            </>
          )}

          {isComplete && (
            <div className="text-xs text-[var(--text-tertiary)]">
              Completed in {formatDuration(exp.elapsedSecs)}
            </div>
          )}

          {isError && (
            <div className="text-xs text-[var(--accent-error)] truncate" title={exp.error || ''}>
              {exp.error || 'Export failed'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
