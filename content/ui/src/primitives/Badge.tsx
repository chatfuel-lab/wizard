export interface BadgeProps {
  count: number;
  /** Values above max render as "max+". Default 99. */
  max?: number;
  /**
   * 'muted' keeps the number without the shout. A muted conversation still has
   * unread messages and the reader still wants the count — what they asked for
   * is not to be pulled towards it, and an accent pill in a list of grey ones
   * is exactly the pull.
   */
  tone?: 'accent' | 'muted';
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  accent: 'bg-accent text-accent-fg',
  muted: 'bg-translucent-strong text-text-muted',
};

/** Unread-count pill. Renders nothing for count <= 0. */
export function Badge({ count, max = 99, tone = 'accent' }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro font-semibold ${TONE_CLASSES[tone]}`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
