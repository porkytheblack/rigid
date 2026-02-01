'use client';

import { RigidCharacter, type RigidAnimation } from '@/components/ui/rigid-character';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  animation?: RigidAnimation;
  className?: string;
}

const sizeConfig = {
  sm: { character: 32, text: 'text-sm' },
  md: { character: 48, text: 'text-base' },
  lg: { character: 64, text: 'text-lg' },
};

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  animation = 'work',
  className = '',
}: LoadingStateProps) {
  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <RigidCharacter animation={animation} size={config.character} />
      <div className="flex items-center gap-1">
        <span className={`${config.text} text-[var(--text-secondary)]`}>{message}</span>
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] loader-dot-1" />
          <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] loader-dot-2" />
          <span className="w-1.5 h-1.5 bg-[var(--text-tertiary)] loader-dot-3" />
        </span>
      </div>
    </div>
  );
}

// Inline loading indicator for buttons and small spaces
export function LoadingSpinner({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-spin border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// Full page loading overlay
export function LoadingOverlay({
  message = 'Loading...',
  isVisible = true,
}: {
  message?: string;
  isVisible?: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/80 backdrop-blur-sm modal-backdrop-animated">
      <div className="flex flex-col items-center gap-6 modal-content-animated">
        <RigidCharacter animation="work" size={80} />
        <div className="flex items-center gap-2">
          <span className="text-lg text-[var(--text-primary)] font-medium">{message}</span>
          <span className="flex gap-1">
            <span className="w-2 h-2 bg-[var(--accent)] loader-dot-1" />
            <span className="w-2 h-2 bg-[var(--accent)] loader-dot-2" />
            <span className="w-2 h-2 bg-[var(--accent)] loader-dot-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// Skeleton placeholder with shimmer effect
export function Skeleton({
  className = '',
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div
      className={`skeleton-animated ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? '1rem',
      }}
    />
  );
}

// Card skeleton for loading app/exploration cards
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[var(--surface-secondary)] border border-[var(--border-default)] p-6 ${className}`}>
      <Skeleton height={48} width={48} className="mb-5" />
      <Skeleton height={20} width="70%" className="mb-2" />
      <Skeleton height={16} width="90%" className="mb-1" />
      <Skeleton height={16} width="60%" className="mb-4" />
      <div className="pt-4 border-t border-[var(--border-subtle)]">
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  );
}
