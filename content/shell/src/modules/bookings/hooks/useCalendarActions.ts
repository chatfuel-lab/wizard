import { useCallback, useMemo, useState, type Dispatch, type RefObject } from 'react';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import { signatureOf, type CalendarEvent, type GridLayout } from '../lib/calendarLayout';
import {
  nudgeEdit,
  resizeNudge,
  specialistLabelFor,
  specialistRefFor,
  type SpanContext,
  type SpanEdit,
} from '../lib/gridSpan';
import { selectByIds, type RangeAction, type RangeState } from '../lib/rangeStore';
import type { BookingRecord, DisplayZone, SpecialistRecord } from '../types';
import { NUDGE_MIN } from './useCalendarKeyboard';
import { useEventFlip, type EventFlip } from './useEventFlip';
import { useRangeMutations } from './useRangeMutations';

/** The grid's snap and the keyboard nudge — one number (`playbooks/customize.md`). */
export const SNAP_MIN = NUDGE_MIN;
/** A resize or a create is never shorter than this. */
export const MIN_DURATION_MIN = 15;

export interface CalendarActionsInput {
  /** The surfaces' container — what the FLIP reads blocks from. */
  containerRef: RefObject<HTMLElement | null>;
  state: RangeState;
  dispatch: Dispatch<RangeAction>;
  /** Day/week grid layout; null in month mode and the compact band. */
  layout: GridLayout | null;
  zone: DisplayZone;
  catalog: readonly SpecialistRecord[];
  /** Everything in the window, unfiltered. */
  records: readonly BookingRecord[];
  /** What the view shows. */
  filtered: readonly BookingRecord[];
  hour12: boolean;
}

export interface CalendarActions {
  /** The live-region sentence after a batch settles. */
  announcement: string;
  /** The bookings the delete dialog is asking about; empty for closed. */
  pendingDelete: BookingRecord[];
  deleting: boolean;
  spanCtx: SpanContext;
  eventsById: Map<string, CalendarEvent>;
  /** What the FLIP keys on — changes exactly when a block can have moved. */
  signature: string;
  flip: EventFlip;
  applyEdit: (record: BookingRecord, edit: SpanEdit | null, viaPointer: boolean) => void;
  setStatus: (ids: readonly string[], status: BookingStatus) => Promise<void>;
  requestDelete: (ids: readonly string[]) => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  reassign: (record: BookingRecord, key: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  clearFlash: (id: string) => void;
  onNudge: (eventId: string, nudge: { minutes?: number; columns?: number }) => void;
  onResizeNudge: (eventId: string, minutes: number) => void;
}

/**
 * Everything the calendar DOES: every pointer, keyboard and menu gesture as a
 * callback over `useRangeMutations`, plus the state those gestures need — the
 * announcement, the pending delete, the FLIP and its signature. No effects
 * live here; the view keeps the wiring (keyboard, surfaces, dialogs) and the
 * surfaces receive this one object instead of a callback per prop.
 */
export function useCalendarActions({
  containerRef,
  state,
  dispatch,
  layout,
  zone,
  catalog,
  records,
  filtered,
  hour12,
}: CalendarActionsInput): CalendarActions {
  const mutations = useRangeMutations(dispatch);

  const [announcement, setAnnouncement] = useState('');
  const [pendingDelete, setPendingDelete] = useState<BookingRecord[]>([]);
  const [deleting, setDeleting] = useState(false);

  const spanCtx = useMemo<SpanContext>(
    () => ({ zone, columns: layout?.columns ?? [], catalog, records, hour12 }),
    [zone, layout, catalog, records, hour12],
  );

  const eventsById = useMemo(() => new Map((layout?.events ?? []).map((e) => [e.id, e])), [layout]);
  const signature = useMemo(() => signatureOf(layout, filtered, zone.zone), [layout, filtered, zone.zone]);
  const flip = useEventFlip(containerRef, signature);

  const applyEdit = useCallback(
    (record: BookingRecord, edit: SpanEdit | null, viaPointer: boolean) => {
      if (!edit) return;
      if (viaPointer) flip.skipNext();
      void mutations.editBooking(record, edit.patch, edit.kind, edit.detail);
    },
    [flip, mutations],
  );

  const byId = state.byId;
  const recordsOf = useCallback((ids: readonly string[]) => selectByIds({ byId }, ids), [byId]);

  const setStatus = useCallback(
    async (ids: readonly string[], status: BookingStatus) => {
      const report = await mutations.setStatus(recordsOf(ids), status);
      if (report.phrase) setAnnouncement(report.phrase);
      if (report.done.length > 0) dispatch({ type: 'selectionCleared' });
    },
    [mutations, recordsOf, dispatch],
  );

  const requestDelete = useCallback((ids: readonly string[]) => setPendingDelete(recordsOf(ids)), [recordsOf]);
  const confirmDelete = useCallback(async () => {
    if (pendingDelete.length === 0) return;
    setDeleting(true);
    const report = await mutations.deleteBookings(pendingDelete);
    setDeleting(false);
    setPendingDelete([]);
    if (report.phrase) setAnnouncement(report.phrase);
    dispatch({ type: 'selectionCleared' });
  }, [pendingDelete, mutations, dispatch]);
  const cancelDelete = useCallback(() => {
    if (!deleting) setPendingDelete([]);
  }, [deleting]);

  const reassign = useCallback(
    (record: BookingRecord, key: string) => {
      const ref = specialistRefFor(key, catalog, records);
      if (ref === undefined) return;
      void mutations.editBooking(record, { specialist: ref }, 'reassign', specialistLabelFor(key, catalog, records));
    },
    [catalog, records, mutations],
  );

  const toggleSelect = useCallback((id: string) => dispatch({ type: 'selectionToggled', id }), [dispatch]);
  const clearSelection = useCallback(() => dispatch({ type: 'selectionCleared' }), [dispatch]);
  const selectAll = useCallback(
    () => dispatch({ type: 'selectionSet', ids: filtered.map((r) => r.id) }),
    [dispatch, filtered],
  );
  const clearFlash = useCallback((id: string) => dispatch({ type: 'flashCleared', id }), [dispatch]);

  const onNudge = useCallback(
    (eventId: string, nudge: { minutes?: number; columns?: number }) => {
      const event = eventsById.get(eventId);
      if (!event) return;
      applyEdit(event.record, nudgeEdit(event, nudge, spanCtx), false);
    },
    [eventsById, applyEdit, spanCtx],
  );
  const onResizeNudge = useCallback(
    (eventId: string, minutes: number) => {
      const event = eventsById.get(eventId);
      if (!event) return;
      applyEdit(event.record, resizeNudge(event, minutes, MIN_DURATION_MIN, spanCtx), false);
    },
    [eventsById, applyEdit, spanCtx],
  );

  return {
    announcement,
    pendingDelete,
    deleting,
    spanCtx,
    eventsById,
    signature,
    flip,
    applyEdit,
    setStatus,
    requestDelete,
    confirmDelete,
    cancelDelete,
    reassign,
    toggleSelect,
    clearSelection,
    selectAll,
    clearFlash,
    onNudge,
    onResizeNudge,
  };
}
