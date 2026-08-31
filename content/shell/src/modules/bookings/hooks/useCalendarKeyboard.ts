import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import { isTypingTarget, parseBindings, resolveHotkey } from '~ui';
import { nextFocus, type FocusFlow, type FocusKey, type FocusableEvent } from '../lib/calendarFocus';
import { bookingIdOf } from '../lib/calendarLayout';
import { CALENDAR_BINDINGS, type CalendarShortcutId } from '../lib/shortcuts';
import { statusForKey } from '../lib/status';

/* Parsed once from the same list the `?` sheet renders (shortcuts.test asserts coverage). */
const PARSED = parseBindings(CALENDAR_BINDINGS);

const NAV_KEY: Partial<Record<CalendarShortcutId, FocusKey>> = {
  focusUp: 'ArrowUp',
  focusDown: 'ArrowDown',
  focusLeft: 'ArrowLeft',
  focusRight: 'ArrowRight',
  focusStart: 'Home',
  focusEnd: 'End',
};

const STATUS_KEY: Partial<Record<CalendarShortcutId, string>> = {
  status1: '1',
  status2: '2',
  status3: '3',
  status4: '4',
  status5: '5',
};

export interface Nudge {
  minutes?: number;
  columns?: number;
}

export interface CalendarKeyboardInput {
  /** The events on screen — grid segments, month chips or agenda rows — with their column. */
  events: readonly FocusableEvent[];
  columnOrder: readonly string[];
  flow: FocusFlow;
  canEdit: boolean;
  /** Booking ids. */
  selection: readonly string[];
  /** Changes exactly when a block may have moved — focus is restored after it. */
  signature: string;
  onOpen: (bookingId: string) => void;
  onToggleSelect: (bookingId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  /** Applies to the selection when the focused booking is in it, else to the focused one. */
  onStatus: (bookingIds: readonly string[], status: BookingStatus) => void;
  onNudge: (eventId: string, nudge: Nudge) => void;
  onResizeNudge: (eventId: string, minutes: number) => void;
  onDelete: (bookingIds: readonly string[]) => void;
}

export interface CalendarKeyboard {
  /** Spread on the element that contains every event node (`[data-event-id]`). */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onFocusCapture: (event: FocusEvent<HTMLElement>) => void;
  /** The event id last focused inside the container, or null. */
  focusedId: string | null;
  /** Move DOM focus to an event by id, when it is on screen. */
  focus: (eventId: string) => void;
}

/** Nudge step in minutes — the grid's snap. */
export const NUDGE_MIN = 15;

/**
 * The calendar's keys, resolved on the focused block against `CALENDAR_BINDINGS`
 * (deals' `useBoardKeyboard` pattern), listening on the CONTAINER so one
 * handler serves the time grid, the month chips and the agenda rows.
 *
 * Order matters and is what makes the split with `~ui` clean: the grid's own
 * handlers run first on the block itself and `preventDefault` what they own
 * (Space grabs; arrows, Enter and Escape WHILE grabbed; plain arrows between
 * events; Enter opens). Anything that reaches here already prevented is
 * theirs and is skipped. What is left — digits, `x`, ⌘A, Escape with a
 * selection, Shift/Alt arrows, Delete — is the module's, plus the plain arrows
 * on surfaces the module renders itself (agenda rows, month chips).
 *
 * Focus is by event id, not position: after a nudge moves a block to another
 * column its node is remounted and the browser drops focus on `<body>`; the
 * layout effect below puts it back on the same booking.
 */
export function useCalendarKeyboard(
  containerRef: RefObject<HTMLElement | null>,
  input: CalendarKeyboardInput,
): CalendarKeyboard {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  const nodeFor = useCallback(
    (eventId: string): HTMLElement | null => {
      const container = containerRef.current;
      if (!container) return null;
      const escaped =
        typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(eventId) : eventId.replace(/["\\]/g, '\\$&');
      return container.querySelector<HTMLElement>(`[data-event-id="${escaped}"]`);
    },
    [containerRef],
  );

  const focus = useCallback(
    (eventId: string) => {
      const node = nodeFor(eventId);
      if (node) {
        setFocusedId(eventId);
        node.focus({ preventScroll: false });
      } else {
        pendingFocus.current = eventId;
      }
    },
    [nodeFor],
  );

  /* Restore after the DOM moved under a keyboard edit. Two guards keep it
     from being a focus thief: only a pending id (set by our own nudge), and
     only when focus actually fell to <body>. */
  useLayoutEffect(() => {
    const wanted = pendingFocus.current;
    if (!wanted) return;
    if (typeof document !== 'undefined' && document.activeElement !== document.body) return;
    const node = nodeFor(wanted);
    if (!node) return;
    pendingFocus.current = null;
    node.focus({ preventScroll: false });
  }, [input.signature, nodeFor]);

  const onFocusCapture = useCallback((event: FocusEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    const node = target?.closest<HTMLElement>('[data-event-id]');
    if (node?.dataset.eventId) setFocusedId(node.dataset.eventId);
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (!target || isTypingTarget(target.tagName, target.isContentEditable, (target as HTMLInputElement).type))
        return;
      const node = target.closest<HTMLElement>('[data-event-id]');
      const eventId = node?.dataset.eventId ?? null;
      const { fired } = resolveHotkey(PARSED, event, null, 0, false);
      if (!fired) return;
      const current = inputRef.current;

      /* ⌘A and Escape work from anywhere inside the container; the rest need a focused block. */
      if (fired === 'selectAll') {
        if (!current.canEdit) return;
        event.preventDefault();
        current.onSelectAll();
        return;
      }
      if (fired === 'clear') {
        if (current.selection.length === 0) return;
        event.preventDefault();
        current.onClearSelection();
        return;
      }
      if (!eventId) return;
      const bookingId = bookingIdOf(eventId);
      const targets = current.selection.includes(bookingId) ? current.selection : [bookingId];

      const navKey = NAV_KEY[fired];
      if (navKey) {
        const next = nextFocus({
          events: current.events,
          columnOrder: current.columnOrder,
          current: eventId,
          key: navKey,
          flow: current.flow,
        });
        if (!next || next === eventId) return;
        event.preventDefault();
        focus(next);
        return;
      }

      const statusKey = STATUS_KEY[fired];
      if (statusKey) {
        if (!current.canEdit) return;
        const status = statusForKey(statusKey);
        if (!status) return;
        event.preventDefault();
        current.onStatus(targets, status);
        return;
      }

      switch (fired) {
        case 'open':
          event.preventDefault();
          current.onOpen(bookingId);
          return;
        case 'toggleSelect':
          if (!current.canEdit) return;
          event.preventDefault();
          current.onToggleSelect(bookingId);
          return;
        case 'grab':
          /* The grid's, on its own surfaces; a bare Space on an agenda row does nothing. */
          return;
        case 'nudgeEarlier':
        case 'nudgeLater':
        case 'nudgeColumnLeft':
        case 'nudgeColumnRight': {
          if (!current.canEdit) return;
          event.preventDefault();
          pendingFocus.current = eventId;
          current.onNudge(eventId, {
            minutes: fired === 'nudgeEarlier' ? -NUDGE_MIN : fired === 'nudgeLater' ? NUDGE_MIN : undefined,
            columns: fired === 'nudgeColumnLeft' ? -1 : fired === 'nudgeColumnRight' ? 1 : undefined,
          });
          return;
        }
        case 'growEnd':
        case 'shrinkEnd':
          if (!current.canEdit) return;
          event.preventDefault();
          pendingFocus.current = eventId;
          current.onResizeNudge(eventId, fired === 'growEnd' ? NUDGE_MIN : -NUDGE_MIN);
          return;
        case 'delete':
          if (!current.canEdit) return;
          event.preventDefault();
          current.onDelete(targets);
          return;
      }
    },
    [focus],
  );

  return { onKeyDown, onFocusCapture, focusedId, focus };
}
