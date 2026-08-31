import type { ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons';
import { paginationRange } from '../lib/data/pagination';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** Pages shown on each side of the current one. Default 1. */
  siblings?: number;
  /** Left-aligned summary, e.g. "1–20 of 128". */
  summary?: ReactNode;
  className?: string;
}

const SLOT = 'inline-flex h-field-sm min-w-7 items-center justify-center rounded-control px-2 text-xs font-medium';

export function Pagination({ page, pageCount, onChange, siblings = 1, summary, className = '' }: PaginationProps) {
  if (pageCount <= 1 && summary === undefined) return null;
  const slots = paginationRange(page, pageCount, siblings);

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-between gap-3 ${className}`}>
      {summary !== undefined ? <span className="text-xs tabular-nums text-text-muted">{summary}</span> : <span />}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={`${SLOT} text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint disabled:hover:bg-transparent`}
        >
          <IconChevronLeft size={14} />
        </button>

        {slots.map((slot, index) =>
          slot === 'gap' ? (
            /* aria-hidden: "…" is a rendering artefact, not a destination. */
            <span key={`gap-${index}`} aria-hidden className={`${SLOT} text-text-faint`}>
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              aria-label={`Page ${slot}`}
              aria-current={slot === page ? 'page' : undefined}
              onClick={() => onChange(slot)}
              className={`${SLOT} tabular-nums transition-colors duration-fast ease-standard focus-visible:focus-ring ${
                slot === page ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              {slot}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className={`${SLOT} text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint disabled:hover:bg-transparent`}
        >
          <IconChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
