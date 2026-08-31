import { useCallback, useMemo, type Dispatch } from 'react';
import { useToast } from '~ui';
import {
  BookingCreateDocument,
  BookingDeleteDocument,
  BookingStatusResolveDocument,
  BookingUpdateDocument,
  type BookingInput,
  type BookingStatus,
} from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import { useBookingsUndo } from '../BookingsUndoContext';
import { customerName, deleteResultPhrase, editResultPhrase, statusResultPhrase } from '../lib/announce';
import { applyPatch, bookingInputOf, type BookingPatch } from '../lib/bookingInput';
import { errorMessage } from '../lib/errors';
import type { RangeAction } from '../lib/rangeStore';
import { isTargetStatus } from '../lib/status';
import { statusUndoEntry, undoLabel, updateUndoEntry, type UndoEntry } from '../lib/undo';
import type { BookingRecord } from '../types';

export type EditKind = 'move' | 'resize' | 'reassign' | 'edit';

/** What actually happened to a batch — the view announces this once. */
export interface BatchReport {
  done: BookingRecord[];
  failed: BookingRecord[];
  /** The live-region sentence. */
  phrase: string;
  /** The first error, for the toast, or null. */
  message: string | null;
}

export interface RangeMutations {
  /**
   * Optimistic edit of one booking (drag, resize, reassign, panel edit): rolls
   * back exactly this booking on failure, offers an undo on success.
   * `detail` is what the toast/announcement says it moved to ("Tue 10:15").
   */
  editBooking: (record: BookingRecord, patch: BookingPatch, what: EditKind, detail?: string) => Promise<boolean>;
  /**
   * Status for several bookings. There is no bulk mutation: N sequential
   * round trips, one report. Optimism is batched. Never into Pending.
   */
  setStatus: (records: readonly BookingRecord[], status: BookingStatus) => Promise<BatchReport>;
  /** Sequential deletes; NOT undoable — ask first. */
  deleteBookings: (records: readonly BookingRecord[]) => Promise<BatchReport>;
  /** Create (wizard / quick create). Publishes the new record on the bus. */
  createBooking: (input: BookingInput) => Promise<BookingRecord>;
}

/**
 * Every write a range view makes. Optimism goes through the store's
 * `editStarted` / `editSucceeded` / `editFailed`; every response is also
 * published on the live bus (`origin: 'own'`) so the OTHER range stores, the
 * panel and the availability cache reconcile through the same path a
 * teammate's change would. Toasts for failures (never `state.error`), an undo
 * entry for successes.
 */
export function useRangeMutations(dispatch: Dispatch<RangeAction>): RangeMutations {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const undo = useBookingsUndo();
  const toast = useToast();

  const publish = useCallback(
    (booking: BookingRecord) => bus.publish({ kind: 'upsert', booking, origin: 'own' }),
    [bus],
  );

  const offerUndo = useCallback(
    (entry: UndoEntry | null, run: () => Promise<void>) => {
      if (!entry) return;
      undo.push(entry, run);
    },
    [undo],
  );

  const editBooking = useCallback<RangeMutations['editBooking']>(
    async (record, patch, what, detail) => {
      const next = applyPatch(record, patch);
      const before = bookingInputOf(record);
      dispatch({ type: 'editStarted', id: record.id, next });
      const name = customerName(record);
      try {
        const data = await client.mutate(BookingUpdateDocument, {
          botID: botId,
          bookingID: record.id,
          req: bookingInputOf(next),
        });
        const saved = data.bookingUpdateV2 as BookingRecord;
        dispatch({ type: 'editSucceeded', id: record.id, booking: saved });
        publish(saved);
        const entry = updateUndoEntry(record.id, before, what, Date.now());
        /* The runner guards itself: the toast button and ⌘Z both reach it, and
         * the toast's closure is a render behind `undo.run` (deals' lesson —
         * a `run` captured before `push` sees a null entry and does nothing,
         * or runs the previous one). So the toast calls the runner directly,
         * `done` makes a second call a no-op, and it clears the offer so ⌘Z
         * cannot fire it again either. */
        let done = false;
        const runner = async () => {
          if (done) return;
          done = true;
          undo.clear();
          try {
            const back = await client.mutate(BookingUpdateDocument, {
              botID: botId,
              bookingID: record.id,
              req: before,
            });
            const restored = back.bookingUpdateV2 as BookingRecord;
            dispatch({ type: 'editSucceeded', id: record.id, booking: restored });
            publish(restored);
          } catch (err) {
            toast.show({ title: 'Could not undo', description: errorMessage(err), tone: 'danger' });
          }
        };
        offerUndo(entry, runner);
        toast.show({
          id: `edit-${record.id}`,
          title: editResultPhrase(name, what, true, detail),
          tone: 'success',
          duration: 4000,
          action: { label: undoLabel(entry), onClick: () => void runner() },
        });
        return true;
      } catch (err) {
        dispatch({ type: 'editFailed', id: record.id, now: Date.now() });
        toast.show({ title: editResultPhrase(name, what, false), description: errorMessage(err), tone: 'danger' });
        return false;
      }
    },
    [client, botId, dispatch, publish, offerUndo, toast, undo],
  );

  const setStatus = useCallback<RangeMutations['setStatus']>(
    async (records, status) => {
      const pending = records.filter((r) => r.status !== status);
      if (pending.length === 0) return { done: [], failed: [], phrase: '', message: null };
      for (const record of pending)
        dispatch({ type: 'editStarted', id: record.id, next: { ...record, status } as BookingRecord });

      const done: BookingRecord[] = [];
      const failed: BookingRecord[] = [];
      let message: string | null = null;
      for (const record of pending) {
        try {
          const data = await client.mutate(BookingStatusResolveDocument, {
            botID: botId,
            bookingID: record.id,
            status,
          });
          const saved = data.bookingStatusResolveV2 as BookingRecord;
          dispatch({ type: 'editSucceeded', id: record.id, booking: saved });
          publish(saved);
          done.push(record);
        } catch (err) {
          dispatch({ type: 'editFailed', id: record.id, now: Date.now() });
          failed.push(record);
          message ??= errorMessage(err);
        }
      }

      const phrase = statusResultPhrase(done.map(customerName), failed.map(customerName), status);
      const entry = statusUndoEntry(
        done.map((r) => ({ id: r.id, from: r.status })),
        status,
        Date.now(),
      );
      let ran = false;
      const runner = async () => {
        if (ran || !entry) return;
        ran = true;
        undo.clear();
        for (const r of done) {
          if (!isTargetStatus(r.status)) continue; // a Pending origin cannot be restored
          try {
            const back = await client.mutate(BookingStatusResolveDocument, {
              botID: botId,
              bookingID: r.id,
              status: r.status,
            });
            const restored = back.bookingStatusResolveV2 as BookingRecord;
            dispatch({ type: 'editSucceeded', id: r.id, booking: restored });
            publish(restored);
          } catch (err) {
            toast.show({ title: 'Could not undo', description: errorMessage(err), tone: 'danger' });
          }
        }
      };
      if (entry) offerUndo(entry, runner);
      if (failed.length > 0) {
        toast.show({ title: phrase, description: message ?? undefined, tone: done.length > 0 ? 'warning' : 'danger' });
      } else if (done.length > 0) {
        toast.show({
          id: 'status-batch',
          title: phrase,
          tone: 'success',
          duration: 4000,
          action: entry ? { label: undoLabel(entry), onClick: () => void runner() } : undefined,
        });
      }
      return { done, failed, phrase, message };
    },
    [client, botId, dispatch, publish, offerUndo, toast, undo],
  );

  const deleteBookings = useCallback<RangeMutations['deleteBookings']>(
    async (records) => {
      const done: BookingRecord[] = [];
      const failed: BookingRecord[] = [];
      let message: string | null = null;
      for (const record of records) {
        try {
          await client.mutate(BookingDeleteDocument, { botID: botId, bookingID: record.id });
          bus.publish({ kind: 'remove', id: record.id, origin: 'own' });
          done.push(record);
        } catch (err) {
          failed.push(record);
          message ??= errorMessage(err);
        }
      }
      const phrase = deleteResultPhrase(done.map(customerName), failed.map(customerName));
      if (failed.length > 0) toast.show({ title: phrase, description: message ?? undefined, tone: 'danger' });
      else if (done.length > 0) toast.show({ title: phrase, tone: 'info', duration: 3000 });
      return { done, failed, phrase, message };
    },
    [client, botId, bus, toast],
  );

  const createBooking = useCallback<RangeMutations['createBooking']>(
    async (input) => {
      const data = await client.mutate(BookingCreateDocument, { botID: botId, req: input });
      const created = data.bookingCreateV2 as BookingRecord;
      publish(created);
      return created;
    },
    [client, botId, publish],
  );

  return useMemo(
    () => ({ editBooking, setStatus, deleteBookings, createBooking }),
    [editBooking, setStatus, deleteBookings, createBooking],
  );
}
