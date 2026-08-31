import type { ReactNode } from 'react';

export interface TagProps {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

const TONE_CLASSES: Record<NonNullable<TagProps['tone']>, string> = {
  neutral: 'bg-translucent text-text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/** Label chip (platform, stage, availability). Badge stays the count pill. */
export function Tag({ children, tone = 'neutral' }: TagProps) {
  return (
    <span className={`inline-flex items-center rounded-chip px-1.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
