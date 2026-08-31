import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Spinner, virtualWindow } from '~ui';
import { ESTIMATED_ROW_HEIGHT, ROW_OVERSCAN, shouldLoadMore } from '../lib/inboxList';
import type { ChatNode } from '../types';
import { ChatListItem } from './ChatListItem';

export interface ChatListRowsProps {
  chats: ChatNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The live search text, for highlighting only. */
  query: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /**
   * Changes when the rows stop being answers to the same question. The scroll
   * position is meaningless across that boundary, so it goes back to the top.
   */
  resetToken: unknown;
}

/**
 * The scroller: virtualized rows, and the two ways to reach page two.
 *
 * **Why virtualize a contact list at all.** Because it pages, and paging is
 * what makes it unbounded. Fifty rows is nothing; an inbox walked down to two
 * thousand is eight thousand DOM nodes, each with an avatar, all of them
 * re-laid-out every time a live update re-sorts the order — which this list
 * does on every batch the subscription delivers.
 *
 * Rows are UNIFORM, so this is much smaller than the thread's version of the
 * same problem. Every row is a fixed-size avatar beside three lines of
 * `truncate` text: nothing wraps, so nothing has a height of its own. One
 * measured row is therefore the exact height of all of them, and `virtualWindow`
 * is handed a flat estimate with no per-row `measure` callback and no height
 * cache to invalidate. The measurement exists only so the number tracks the
 * type scale and the density instead of being a constant that quietly rots.
 *
 * **Reaching conversation 51.** Two affordances, because they fail in different
 * places. Scrolling near the end requests the next page, which is what a mouse
 * or a thumb wants and what makes the list feel endless. A real button appears
 * whenever there is more, which is what a keyboard wants — and what anyone
 * wants when the pane is tall enough to show every loaded row at once, because
 * then there is no scroll to trigger and the sentinel approach never fires at
 * all.
 */
export function ChatListRows({
  chats,
  selectedId,
  onSelect,
  query,
  hasMore,
  loadingMore,
  onLoadMore,
  resetToken,
}: ChatListRowsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(ESTIMATED_ROW_HEIGHT);

  /* The scroller's own height. Without the observer this is measured once, and
     a pane that is resized — the split dragged, the window changed, the
     keyboard opening on a phone — keeps rendering a window sized for the height
     it had at mount. */
  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    setViewportHeight(element.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* One row is every row. Guarded against sub-pixel churn, which a fractional
     layout produces on every frame and which would otherwise re-render forever
     without moving anything. */
  const measureRow = useCallback((element: HTMLButtonElement | null) => {
    if (!element) return;
    const height = element.offsetHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    setRowHeight((current) => (Math.abs(current - height) < 0.5 ? current : height));
  }, []);

  /* A new question: whatever was on screen is gone, so the reader belongs at
     the top of the new answer rather than 400 rows into a list that no longer
     has them. Layout effect, so the jump happens before paint. */
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (element) element.scrollTop = 0;
    setScrollTop(0);
  }, [resetToken]);

  const visible = virtualWindow({
    count: chats.length,
    viewportHeight,
    scrollTop,
    estimateHeight: rowHeight,
    overscan: ROW_OVERSCAN,
  });

  /* Paging as a consequence of the window, not of the scroll event. The two
     differ exactly when there is no scroll — a pane taller than everything
     loaded — and that is the case where a scroll-handler version of this stops
     at row 50 forever. */
  const { end } = visible;
  useEffect(() => {
    if (shouldLoadMore({ end, count: chats.length, hasMore, loadingMore })) onLoadMore();
  }, [end, chats.length, hasMore, loadingMore, onLoadMore]);

  return (
    <div
      ref={scrollerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div style={{ paddingTop: visible.paddingTop, paddingBottom: visible.paddingBottom }}>
        {chats.slice(visible.start, visible.end).map((chat, offset) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            selected={chat.id === selectedId}
            onSelect={onSelect}
            query={query}
            /* Only the first rendered row is measured: they are all the same
               height, and asking each of them for its offsetHeight would force
               a synchronous layout per row on every scroll frame. */
            rowRef={offset === 0 ? measureRow : undefined}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center p-3">
          <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? <Spinner size={14} /> : null}
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
