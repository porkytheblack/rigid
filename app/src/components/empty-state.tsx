import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RigidCharacter } from '@/components/ui/rigid-character';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  showCharacter?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  showCharacter = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center empty-state-animated">
      {showCharacter ? (
        <div className="mb-6">
          <RigidCharacter animation="wave" size={64} trackMouse />
        </div>
      ) : Icon ? (
        <div className="flex h-16 w-16 items-center justify-center bg-[var(--bg-hover)] mb-4">
          <Icon className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
      ) : null}
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="btn-animated">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
