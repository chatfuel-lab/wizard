export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  /** Text centred in the rule ("or", "Today"). Horizontal only. */
  label?: string;
  className?: string;
}

/**
 * A rule.
 *
 * `role="separator"` only when there is no label — a labelled divider is a
 * heading for the group beneath it, and announcing it as a separator would
 * throw the text away.
 */
export function Separator({ orientation = 'horizontal', label, className = '' }: SeparatorProps) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`inline-block w-px self-stretch bg-border ${className}`}
      />
    );
  }

  if (label === undefined) {
    return <hr className={`h-px border-0 bg-border ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-text-faint">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
