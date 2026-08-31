import { forwardRef, type ReactNode, type UIEventHandler } from 'react';

/** Which content-measure token caps the column. `none` fills the width. */
export type PageMeasure = 'none' | 'form' | 'prose' | 'app';

const MEASURE: Record<PageMeasure, string> = {
  none: '',
  form: 'mx-auto w-full max-w-form',
  prose: 'mx-auto w-full max-w-prose',
  app: 'mx-auto w-full max-w-app',
};

export interface PageBodyProps {
  children: ReactNode;
  /** Off when the child owns its own padding (a table, a board, a canvas). */
  padded?: boolean;
  /**
   * Cap the content column. A settings form stretched across a 2560px screen is
   * unreadable, and every module that had one solved it with a different
   * arbitrary `max-w-2xl`.
   */
  measure?: PageMeasure;
  /**
   * Fires on the scrolling element itself, not on a wrapper — a thread that
   * pins to the bottom has to know when the reader has scrolled away from it.
   */
  onScroll?: UIEventHandler<HTMLDivElement>;
  className?: string;
}

/**
 * The scrolling region below the header. It owns the scroll, which is why
 * `min-h-0` is not optional: a flex child defaults to `min-height: auto` and
 * would push the container instead of scrolling inside it.
 *
 * The forwarded ref and `onScroll` land on the element that actually scrolls,
 * never on the measure wrapper inside it. Reading `scrollTop` off the wrapper
 * would return a constant zero, which is the kind of bug that looks like a
 * broken feature rather than a wrong element.
 */
export const PageBody = forwardRef<HTMLDivElement, PageBodyProps>(function PageBody(
  { children, padded = true, measure = 'none', onScroll, className },
  ref,
) {
  const inner = MEASURE[measure];
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={`min-h-0 flex-1 overflow-y-auto ${padded ? 'p-gutter' : ''} ${className ?? ''}`}
    >
      {inner ? <div className={inner}>{children}</div> : children}
    </div>
  );
});
