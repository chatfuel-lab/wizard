import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  BOTTOM_THRESHOLD_PX,
  buildChatRows,
  distanceFromBottom,
  nextUnreadAnchor,
  preservedScrollTop,
  relativeDay,
  shouldStickToBottom,
  type ChatMessageLike,
  type ChatRow,
  type UnreadAnchor,
} from '../lib/chat/messageList';
import { DEFAULT_OVERSCAN, indexAtOffset, rowOffsets, virtualWindow } from '../lib/chat/virtualList';

/**
 * What the outside can do to the scroller.
 *
 * One method, and it exists because the list's central rule — never move a
 * reader who did not ask to be moved — leaves the module with nowhere to put
 * the other half of that promise. A thread that refuses to jump to a new
 * message owes the reader a way to jump to it themselves ("3 new messages ↓"),
 * and the pill can only be built out of two things this component knows and
 * nothing else does: whether the newest message is on screen, and how to get
 * there. Without them a module ends up hanging an IntersectionObserver off a
 * sentinel it smuggled into `footer` — which works, and lives in the wrong file.
 *
 * A ref rather than a prop because going to the bottom is an event, not a
 * state: "the reader is at the bottom" is not something a caller can assert,
 * and a `scrollToBottom` boolean would have to be set and then unset.
 */
export interface MessageListApi {
  /**
   * Take the reader to the newest message, and re-arm bottom anchoring so the
   * next arrival keeps them there.
   *
   * 'smooth' for a button the reader pressed — the movement is what tells them
   * where they went. 'auto' (the default) for anything the module decided.
   */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export interface MessageListProps<T extends ChatMessageLike> {
  /** Oldest first. The array a module already holds, not a copy. */
  items: readonly T[];
  renderItem: (item: T) => ReactNode;
  /**
   * Identity of the conversation. Changing it is what re-anchors the unread
   * divider and jumps back to the newest message — so it must change when the
   * reader opens a different thread and must NOT change when messages arrive.
   */
  threadKey: string;
  /**
   * The oldest message the reader has not seen, from the server's cursor. Only
   * the first non-null value per thread is used; see `nextUnreadAnchor`.
   */
  firstUnreadId?: string | null;

  /** Height assumed for rows that have never been rendered. Default 64. */
  estimateItemHeight?: number;
  /** Rows kept mounted past each edge. Default 4. */
  overscan?: number;
  /** How near the bottom still counts as "at the bottom". Default 80px. */
  bottomThreshold?: number;
  /**
   * The newest message came on or off screen.
   *
   * Latched, so it fires on the crossing rather than on every scroll event, and
   * it is evaluated after content changes as well — a message arriving under a
   * reader who is not at the bottom pushes them further from it without
   * producing a scroll event of its own, and that is exactly the moment the
   * "N new messages" pill has to appear.
   *
   * Note what it is NOT: it is not the stickiness this component scrolls by.
   * Stickiness un-latches the instant a reader scrolls up by any amount, on
   * purpose (see the file header); "at the bottom" is the plainer geometric
   * question the prop name asks, and it is the one a pill wants — a reader who
   * nudged up thirty pixels can still see the newest message and does not need
   * to be told about it.
   */
  onAtBottomChange?: (atBottom: boolean) => void;

  /** Above the first row, inside the scroller: a "load older" button, usually. */
  header?: ReactNode;
  /** Below the last row: a TypingIndicator, usually. Sticks like a message. */
  footer?: ReactNode;
  /** Shown instead of everything when there are no messages. */
  empty?: ReactNode;

  /** Fired once each time the scroller comes within `topThreshold` of the top. */
  onReachTop?: () => void;
  /** Default 200px — far enough that history has loaded before the reader arrives. */
  topThreshold?: number;

  /** Text for a day separator. Default: Today / Yesterday / a formatted date. */
  dayLabel?: (at: number) => ReactNode;
  /** Text for the unread divider. Default: "N new messages". */
  unreadLabel?: (count: number) => ReactNode;

  /** `scrollToBottom` — see `MessageListApi`. */
  ref?: Ref<MessageListApi>;
  className?: string;
  'aria-label'?: string;
}

/* Built once: an Intl formatter is expensive to construct and this one is
   asked the same question on every render of every thread. */
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function defaultDayLabel(at: number): string {
  switch (relativeDay(at, Date.now())) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    default:
      return DAY_FORMAT.format(at);
  }
}

function defaultUnreadLabel(count: number): string {
  return count === 1 ? '1 new message' : `${count} new messages`;
}

/**
 * The thread scroller.
 *
 * Three behaviours, and all three are the same behaviour stated three ways —
 * *the list never moves the reader against their will*:
 *
 * 1. **Bottom anchoring is conditional.** New messages scroll into view only if
 *    the reader was already at the bottom when they arrived. Someone scrolled
 *    up reading yesterday stays exactly where they are. The measurement is
 *    taken in the scroll handler, BEFORE the new content lands, because
 *    afterwards the answer is always "no" and the question is meaningless.
 * 2. **Prepended history does not move the view.** Loading older messages grows
 *    the content upward; scrollTop is pushed down by exactly as much, so the
 *    message the reader was looking at stays under their eyes.
 * 3. **The unread divider is placed once.** It marks where the reader had got
 *    to, which is a fact about the past — so it is pinned per thread and does
 *    not chase the server's advancing unread cursor.
 *
 * Every one of those decisions is a pure function in `lib/chat/messageList.ts` with
 * tests; what is left here is DOM plumbing. Virtualization comes from
 * `lib/chat/virtualList.ts` and is expressed as two spacer heights rather than
 * absolute offsets, so rows stay in normal flow and remain selectable.
 *
 * The promise has a second half, added later: a list that refuses to move a
 * reader owes them a way to move themselves. `onAtBottomChange` reports whether
 * the newest message is on screen and `ref.scrollToBottom` goes there, which
 * between them are everything a "3 new messages ↓" pill is made of. Without
 * them a module has to hang an IntersectionObserver off a sentinel smuggled
 * into `footer` — which works, and lives in the wrong file.
 *
 * `header` and `footer` render around an EMPTY thread as well as a full one.
 * They used to be replaced by `empty` along with everything else, which meant a
 * conversation with no messages yet could not show a typing indicator or a
 * first answer still streaming in — and on an assistant that is the one moment
 * that matters most. On an empty thread the footer sits at the foot of the
 * viewport with the empty state centred above it, rather than one viewport
 * further down; see the render.
 *
 * Sizing: this is a flex child that fills its parent (`min-h-0 flex-1`). It has
 * to be inside a column flex container with a bounded height, or the scroller
 * has nothing to scroll and every row renders.
 */
export function MessageList<T extends ChatMessageLike>({
  items,
  renderItem,
  threadKey,
  firstUnreadId,
  estimateItemHeight = 64,
  overscan = DEFAULT_OVERSCAN,
  bottomThreshold = BOTTOM_THRESHOLD_PX,
  onAtBottomChange,
  header,
  footer,
  empty,
  onReachTop,
  topThreshold = 200,
  dayLabel = defaultDayLabel,
  unreadLabel = defaultUnreadLabel,
  ref,
  className = '',
  'aria-label': ariaLabel = 'Messages',
}: MessageListProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  /* Derived from props, not state: `nextUnreadAnchor` returns the same object
     when nothing changed, so re-running it on a double-render (StrictMode) is
     idempotent and no re-render is ever needed to hold it. */
  const unreadAnchorRef = useRef<UnreadAnchor | null>(null);
  const unreadAnchor = nextUnreadAnchor(unreadAnchorRef.current, threadKey, firstUnreadId);
  unreadAnchorRef.current = unreadAnchor;

  const rows = useMemo(
    () => buildChatRows<T>({ items, unreadAnchorId: unreadAnchor.messageId }),
    [items, unreadAnchor.messageId],
  );
  const rowIndex = useMemo(() => {
    const index = new Map<string, number>();
    rows.forEach((row, at) => index.set(row.key, at));
    return index;
  }, [rows]);

  // ── measurement ─────────────────────────────────────────────────────────
  /* Heights are keyed by ROW key rather than by index: a prepended page shifts
     every index by the size of the page, and an index-keyed cache would hand
     each row the height of a different one for a frame. */
  const heightsRef = useRef(new Map<string, number>());
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [, remeasured] = useReducer((tick: number) => tick + 1, 0);

  const record = useCallback((key: string, height: number): boolean => {
    if (!Number.isFinite(height) || height <= 0) return false;
    const known = heightsRef.current.get(key);
    /* Sub-pixel churn is what a fractional layout produces every frame; acting
       on it would re-render forever without moving anything. */
    if (known !== undefined && Math.abs(known - height) < 0.5) return false;
    heightsRef.current.set(key, height);
    return true;
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    /* Rows also measure themselves as they mount, below. This observer exists
       for the heights that arrive later and without a render — an image
       finishing its download is the whole reason. */
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const key = element.dataset.rowKey;
        if (key && record(key, element.offsetHeight)) changed = true;
      }
      if (changed) remeasured();
    });
    observerRef.current = observer;
    for (const element of elementsRef.current.values()) observer.observe(element);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [record]);

  useLayoutEffect(() => {
    const observer = observerRef.current;
    /* React hands a ref callback `null` on unmount without saying which element
       left, so a row that scrolled out of the window can only be found by
       noticing it is no longer connected. Without this sweep the observer keeps
       every row it has ever seen alive. */
    for (const [key, element] of elementsRef.current) {
      if (element.isConnected) continue;
      observer?.unobserve(element);
      elementsRef.current.delete(key);
    }
  });

  const rowRef = (key: string) => (element: HTMLDivElement | null) => {
    if (!element) return;
    element.dataset.rowKey = key;
    if (elementsRef.current.get(key) !== element) {
      elementsRef.current.set(key, element);
      observerRef.current?.observe(element);
    }
    if (record(key, element.offsetHeight)) remeasured();
  };

  // ── the window ──────────────────────────────────────────────────────────
  const measure = useCallback(
    (index: number) => {
      const row = rows[index];
      return row ? heightsRef.current.get(row.key) : undefined;
    },
    [rows],
  );

  /* scrollTop is measured from the top of the SCROLL CONTENT, which includes
     the header and any padding; the row offsets start at the first row. Left
     uncorrected the two disagree by exactly the header's height, and the
     window renders a header's worth of blank at the top of the viewport. */
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentOffset, setContentOffset] = useState(0);

  /* Built here rather than inside virtualWindow because the scroll anchor below
     needs the same numbers, and two identical O(n) passes per commit is a cost
     with nothing to show for it. */
  const offsets = rowOffsets(rows.length, estimateItemHeight, measure);

  const visible = virtualWindow({
    count: rows.length,
    viewportHeight,
    scrollTop: scrollTop - contentOffset,
    estimateHeight: estimateItemHeight,
    measure,
    overscan,
    offsets,
  });

  // ── scrolling ───────────────────────────────────────────────────────────
  const stickRef = useRef(true);
  const nearTopRef = useRef(false);
  const previousRef = useRef({
    threadKey: '',
    scrollHeight: 0,
    mounted: false,
    /* The row at the top of the viewport and where its top edge WAS, in scroll
       coordinates. After the content changes shape the scroller moves by
       exactly how far that edge moved — a shift added to wherever the reader
       is now, never a position restored from the past. */
    anchor: null as { key: string; top: number } | null,
  });

  /* Where the effect below last pinned the scroller, until the browser has
     delivered the scroll event for that pin. The event is asynchronous — it
     comes a frame later — and by then rows may have changed height: an image
     decoded, an estimate got corrected. Measured against the new content, the
     pin's own event read as "the reader is 256px above the bottom",
     stickiness flipped off, and the next remeasure held the thread there
     instead of at the newest message. A programmatic pin is not the reader's
     decision, so its event must not overrule the pin. */
  const pinnedAtRef = useRef<number | null>(null);
  const lastTopRef = useRef(0);

  const pinToBottom = (element: HTMLElement) => {
    const before = element.scrollTop;
    element.scrollTop = element.scrollHeight;
    /* Only a pin that MOVED produces an event; recording one that did not
       would make the reader's next scroll pass for the pin's. */
    if (element.scrollTop !== before) pinnedAtRef.current = element.scrollTop;
  };

  /* Latched, and the callback is held in a ref: the layout effect that also
     has to ask this question is deliberately dependency-free, and a caller
     passing an inline arrow — which is all of them — would otherwise be a new
     identity on every render with nothing to do about it. */
  const atBottomRef = useRef(true);
  const atBottomCallbackRef = useRef(onAtBottomChange);
  atBottomCallbackRef.current = onAtBottomChange;

  const reportAtBottom = (element: HTMLElement) => {
    const atBottom =
      distanceFromBottom({
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }) <= bottomThreshold;
    if (atBottom === atBottomRef.current) return;
    atBottomRef.current = atBottom;
    atBottomCallbackRef.current?.(atBottom);
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: (behavior = 'auto') => {
        const element = scrollerRef.current;
        if (!element) return;
        /* Re-arm first. Going to the bottom on purpose is a statement that the
           reader wants to follow the thread again, and without this the next
           arrival would leave them behind a second time. */
        stickRef.current = true;
        if (behavior === 'smooth') {
          /* A smooth scroll is a run of ordinary downward scroll events, which
             the handler reads correctly on its own; `pinnedAtRef` is for an
             instant jump, whose single event has to be told apart from the
             reader's. */
          lastTopRef.current = element.scrollTop;
          element.scrollTo({ top: element.scrollHeight, behavior });
        } else {
          pinToBottom(element);
        }
      },
    }),
    [],
  );

  const onScroll = () => {
    const element = scrollerRef.current;
    if (!element) return;
    const top = element.scrollTop;
    setScrollTop(top);
    /* Direction decides. Scrolling UP — by any amount — un-sticks: the reader
       has left the newest message on purpose, and holding a threshold instead
       (as this used to) meant every remeasure of a row they were scrolling
       past pinned them back to the bottom, 80px at a time, until a trackpad
       could not climb the history at all. Scrolling down re-sticks once they
       are back within the threshold. A pin's own event is downward (or a
       clamp, when rows above shrank), and it sticks. */
    const movedUp = top < lastTopRef.current;
    lastTopRef.current = top;
    const pinnedAt = pinnedAtRef.current;
    pinnedAtRef.current = null;
    if (movedUp) {
      stickRef.current = false;
    } else if (pinnedAt !== null) {
      stickRef.current = true;
    } else {
      stickRef.current = shouldStickToBottom(
        { scrollTop: top, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight },
        bottomThreshold,
      );
    }
    reportAtBottom(element);
    /* Latched: without it, "load older" fires on every scroll event for as long
       as the reader sits near the top, which is a request per frame. */
    const nearTop = element.scrollTop <= topThreshold;
    if (nearTop && !nearTopRef.current) onReachTop?.();
    nearTopRef.current = nearTop;
  };

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    setViewportHeight(element.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* Deliberately dependency-free. The scroll position has to be re-pinned after
     ANY commit that changed the content height — a new message, a measurement
     correcting an estimate, a footer appearing — and enumerating those as
     dependencies means listing every ReactNode prop, which is a new array
     identity on every render anyway.

     Which is exactly why every branch that moves the scroller is gated on the
     content height having CHANGED. Scrolling re-renders this component (the
     window is a function of scrollTop), so an ungated "if sticking, go to the
     bottom" fires on the reader's own scroll: nudge up forty pixels — still
     inside the stick threshold — and the effect drags you back down. The scroll
     handler decides; only new content is allowed to act on that decision. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const previous = previousRef.current;
    const resized = element.scrollHeight !== previous.scrollHeight;

    const content = contentRef.current;
    const elementTop = element.getBoundingClientRect().top;
    const contentTop = content ? content.getBoundingClientRect().top - elementTop + element.scrollTop : 0;

    /* Where a row's top edge sits in scroll coordinates — read from the DOM
       when the row is mounted, from the offsets only when it is not.

       The offsets are the RENDER's idea of the heights. Rows the window has
       just brought in were rendered at their estimate; `rowRef` measures them
       during the commit and asks for a re-render, but THIS effect runs before
       that re-render, against a DOM that already has the real heights. An
       anchor restored from estimated offsets — 64px per row where a video row
       is 300 — landed the thread hundreds of pixels off, once per newly
       mounted tall row, and the reader scrolling up through history saw it
       lurch down every time. The DOM knows where the row is right now; ask it. */
    const rowTop = (key: string, index: number): number => {
      const row = elementsRef.current.get(key);
      if (row?.isConnected) return row.getBoundingClientRect().top - elementTop + element.scrollTop;
      return contentTop + offsets[index]!;
    };

    if (!previous.mounted || previous.threadKey !== threadKey) {
      /* A thread opens at its newest message, always. */
      stickRef.current = true;
      lastTopRef.current = 0;
      pinToBottom(element);
    } else if (stickRef.current && resized) {
      pinToBottom(element);
    } else if (resized && previous.anchor) {
      /* Hold the row that was at the top of the viewport exactly where it was.
         This is what makes scrolling UP through history smooth: rows the reader
         has never seen are rendered at their estimated height, measured on
         arrival, and every correction changes the height of the content ABOVE
         them. Without an anchor the whole thread slides under the cursor by the
         error, once per row. It also covers the prepend case for free — the
         anchor row simply has a larger offset once a page is inserted above. */
      const index = rowIndex.get(previous.anchor.key);
      if (index !== undefined) {
        /* ADDED to the current scrollTop, not assigned over it. This effect
           runs on the same frame as the reader's own scroll, and while a
           thread is being scrolled the window mounts rows every frame, so
           `resized` is true nearly every frame. Restoring the anchor to its
           old position — "put the row back where it was" — also put the
           READER back where they were: it cancelled the frame's scroll delta.
           With a mouse wheel that lost the odd 100px step; with a trackpad,
           whose deltas are small and every frame, it held the thread in place
           and the history could not be climbed at all. Only the movement of
           the anchor row's edge is the correction; the reader's movement is
           theirs. */
        const shift = rowTop(previous.anchor.key, index) - previous.anchor.top;
        if (Math.abs(shift) >= 0.5) element.scrollTop += shift;
      } else if (element.scrollHeight > previous.scrollHeight) {
        /* The anchor row is gone — trimmed, or its key changed. All that is
           left to go on is how much taller everything got. */
        element.scrollTop = preservedScrollTop(element.scrollTop, previous.scrollHeight, element.scrollHeight);
      }
    }

    /* Re-recorded on EVERY run, including the ones caused by the reader's own
       scrolling — an anchor from before the last scroll would restore a
       position they have already left. */
    const rowsTop = element.scrollTop - contentTop;
    const anchorIndex = indexAtOffset(offsets, rowsTop);
    const anchorRow = rows[anchorIndex];

    previousRef.current = {
      threadKey,
      scrollHeight: element.scrollHeight,
      mounted: true,
      anchor: anchorRow ? { key: anchorRow.key, top: rowTop(anchorRow.key, anchorIndex) } : null,
    };

    if (element.scrollTop !== scrollTop) setScrollTop(element.scrollTop);
    if (content && Math.abs(contentTop - contentOffset) >= 0.5) setContentOffset(contentTop);
    /* Content that grew under a reader who is not at the bottom moved them
       further from it without producing a scroll event, so the answer has to be
       re-taken here as well as in the handler. */
    reportAtBottom(element);
  });

  // ── render ──────────────────────────────────────────────────────────────
  const renderRow = (row: ChatRow<T>): ReactNode => {
    switch (row.kind) {
      case 'day':
        return (
          <div ref={rowRef(row.key)} key={row.key} className="flex justify-center py-2">
            <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-micro font-medium text-text-muted">
              {dayLabel(row.at)}
            </span>
          </div>
        );
      case 'unread':
        /* Plain markup rather than role="separator": a separator is decorative
           to a screen reader and its children are not announced, which would
           throw away the only part of this row that carries meaning. */
        return (
          <div ref={rowRef(row.key)} key={row.key} className="flex items-center gap-2 py-2">
            <span className="h-px flex-1 bg-accent/40" />
            <span className="text-micro font-semibold text-accent">{unreadLabel(row.count)}</span>
            <span className="h-px flex-1 bg-accent/40" />
          </div>
        );
      case 'message':
        return (
          <div ref={rowRef(row.key)} key={row.key} className="py-0.5">
            {renderItem(row.item)}
          </div>
        );
    }
  };

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      role="log"
      /* A virtualized log adds and removes nodes on every scroll frame, so the
         polite region role="log" implies would read the thread aloud each time
         the reader moved. A module that wants arrivals announced renders its
         own live region holding just the new message. */
      aria-live="off"
      aria-label={ariaLabel}
      /* Scrollable regions need a tab stop, or the keyboard cannot reach the
         history at all. */
      tabIndex={0}
      /* `overflow-anchor: none` — one anchoring system, not two. Chrome's own
         scroll anchoring moves scrollTop the instant a row above the viewport
         grows (an image decodes); the effect above then restores the anchor
         it recorded BEFORE that growth, from offsets that do not know about it
         yet, and undoes part of Chrome's move. The reader sees the thread
         lurch down by the difference on every measured image while scrolling
         up through history. This component keeps its own anchor; the browser
         must not keep another. */
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter [overflow-anchor:none] focus-visible:focus-ring ${
        className ?? ''
      }`}
    >
      {/* `empty` replaces the ROWS, not the whole scroller. It used to replace
          everything, which meant an empty thread could not show a typing
          indicator, a first answer still streaming in, or a "load older"
          affordance — and on an assistant the first reply to a brand-new
          conversation is the one moment that matters most.

          The empty branch is the one place in this component that lays out with
          flexbox, and it is worth the exception: an empty state is written to
          fill its box (`h-full`, centred), so stacking a footer under it in
          normal flow makes the content one viewport PLUS a typing indicator —
          a scrollbar on a thread with nothing in it, pinned to the bottom, with
          the empty state's heading pushed off the top. One viewport, the empty
          state centred in what is left, the footer at the foot of it. Nothing
          here touches the rows path: no virtualization, no measurement and no
          scroll anchoring runs while the thread is empty. */}
      {header}
      {rows.length === 0 ? (
        <div className="flex min-h-full flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-center">{empty ?? null}</div>
          {footer}
        </div>
      ) : (
        <>
          <div ref={contentRef} style={{ paddingTop: visible.paddingTop, paddingBottom: visible.paddingBottom }}>
            {rows.slice(visible.start, visible.end).map(renderRow)}
          </div>
          {footer}
        </>
      )}
    </div>
  );
}
