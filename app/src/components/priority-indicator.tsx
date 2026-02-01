import { cn } from '@/lib/utils';
import type { IssuePriority } from '@/lib/tauri/types';

const priorityConfig: Record<IssuePriority, { label: string; className: string }> = {
  critical: {
    label: 'Critical',
    className: 'bg-[var(--status-error)]',
  },
  high: {
    label: 'High',
    className: 'bg-[var(--status-warning)]',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-400',
  },
  low: {
    label: 'Low',
    className: 'bg-[var(--text-tertiary)]',
  },
};

interface PriorityIndicatorProps {
  priority: IssuePriority;
  showLabel?: boolean;
  className?: string;
}

export function PriorityIndicator({
  priority,
  showLabel = false,
  className,
}: PriorityIndicatorProps) {
  const config = priorityConfig[priority];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('h-2 w-2 rounded-full', config.className)}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-xs text-[var(--text-secondary)]">{config.label}</span>
      )}
    </span>
  );
}
