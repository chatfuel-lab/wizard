export interface ProgressProps {
  /** Omit for an indeterminate bar — "working", with no idea how long. */
  value?: number;
  max?: number;
  /** Required: a bare bar has nothing to announce. */
  label: string;
  /** Renders the label and a percentage above the track. */
  showLabel?: boolean;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<ProgressProps['tone']>, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const SIZE_CLASSES: Record<NonNullable<ProgressProps['size']>, string> = {
  sm: 'h-1',
  md: 'h-2',
};

export function Progress({
  value,
  max = 100,
  label,
  showLabel = false,
  tone = 'accent',
  size = 'md',
  className = '',
}: ProgressProps) {
  const indeterminate = value === undefined;
  const clamped = indeterminate ? 0 : Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0;

  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-text-muted">{label}</span>
          {indeterminate ? null : <span className="tabular-nums text-text-faint">{percent}%</span>}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : clamped}
        className={`w-full overflow-hidden rounded-full bg-surface-sunken ${SIZE_CLASSES[size]}`}
      >
        {indeterminate ? (
          /* A short bar sweeping the track. Under reduced motion the token
             collapses to `none` and this parks at the left as a static hint. */
          <div className={`h-full w-1/4 rounded-full animate-progress ${TONE_CLASSES[tone]}`} />
        ) : (
          <div
            style={{ width: `${percent}%` }}
            className={`h-full rounded-full transition-[width] duration-base ease-standard ${TONE_CLASSES[tone]}`}
          />
        )}
      </div>
    </div>
  );
}
