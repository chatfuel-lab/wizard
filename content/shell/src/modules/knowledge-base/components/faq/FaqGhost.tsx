import { IconGrip } from '~ui';

export interface FaqGhostProps {
  question: string;
  /** How many rows are moving with it. 1 means just this one. */
  count: number;
}

/**
 * What follows the pointer: the grabbed question, plus two offset shells and a
 * count when a whole selection is moving. The stack is what tells the person
 * their selection is coming with them, before any row has moved.
 */
export function FaqGhost({ question, count }: FaqGhostProps) {
  const extra = count - 1;
  return (
    <div className="relative">
      {extra > 0 ? (
        <>
          <span
            aria-hidden
            className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-card border border-border bg-surface-raised"
          />
          <span
            aria-hidden
            className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-card border border-border bg-surface-raised"
          />
        </>
      ) : null}
      <div className="relative flex items-center gap-2 rounded-card border border-accent bg-surface-raised px-2 py-1.5">
        <IconGrip size={14} className="shrink-0 text-text-faint" />
        <span className="min-w-0 truncate text-sm font-medium text-text">{question || 'No question yet'}</span>
        {extra > 0 ? (
          <span className="ml-auto shrink-0 rounded-chip bg-accent px-1.5 py-0.5 text-nano font-medium tabular-nums text-accent-fg">
            +{extra}
          </span>
        ) : null}
      </div>
    </div>
  );
}
