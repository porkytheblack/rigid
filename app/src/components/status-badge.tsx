import { cn } from '@/lib/utils';
import type { ChecklistStatus, IssueStatus, RecordingStatus } from '@/lib/tauri/types';

type StatusType = ChecklistStatus | IssueStatus | RecordingStatus;

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Checklist statuses
  untested: {
    label: 'Untested',
    className: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  },
  passing: {
    label: 'Passing',
    className: 'bg-green-500/10 text-[var(--status-success)]',
  },
  failing: {
    label: 'Failing',
    className: 'bg-red-500/10 text-[var(--status-error)]',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-orange-500/10 text-[var(--status-warning)]',
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  // Issue statuses
  open: {
    label: 'Open',
    className: 'bg-blue-500/10 text-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-500/10 text-yellow-400',
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-500/10 text-[var(--status-success)]',
  },
  closed: {
    label: 'Closed',
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  wont_fix: {
    label: "Won't Fix",
    className: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
  },
  // Recording statuses
  ready: {
    label: 'Ready',
    className: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  },
  recording: {
    label: 'Recording',
    className: 'bg-red-500/10 text-[var(--status-error)]',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-[var(--status-success)]',
  },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config?.className,
        className
      )}
    >
      {config?.label || status}
    </span>
  );
}
