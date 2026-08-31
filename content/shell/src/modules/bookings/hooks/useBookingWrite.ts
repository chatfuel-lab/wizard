import { useCallback, useMemo, type Dispatch } from 'react';
import { useToast } from '~ui';
import {
  BookingContactSetNoteDocument,
  BookingDeleteDocument,
  BookingInlineContactSetNoteDocument,
  BookingStatusResolveDocument,
  BookingUpdateDocument,
  type BookingStatus,
  type BookingUpdateInput,
} from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import { useBookingsUndo } from '../BookingsUndoContext';
import { customerName, deleteResultPhrase, editResultPhrase, statusResultPhrase } from '../lib/announce';
import { bookingInputOf } from '../lib/bookingInput';
import type { DetailAction, DetailState } from '../lib/detailStore';
import { errorMessage } from '../lib/errors';
import { statusMeta } from '../lib/status';
import { statusUndoEntry, undoLabel, updateUndoEntry, type UndoEntry } from '../lib/undo';
import type { BookingRecord } from '../types';

export type PanelEditKind = 'move' | 'resize' | 'reassign' | 'edit';

export interface BookingWrite {
  /**
   * A full-replace update from an input the panel built (`bookingInputOf(next)`
   * for a time / service / specialist edit, or the current input plus a
   * customer for "attach"). Not optimistic: the panel shows `saving` and
   * takes the server's record. Undo is the previous input sent back.
   * Resolves true when it landed; the error is toasted (and returned) otherwise.
   */
  writeInput: (
    input: BookingUpdateInput,
    what: PanelEditKind,
    detail?: string,
  ) => Promise<{ ok: boolean; error: unknown }>;
  /** Convenience over `writeInput` for a patched record. */
  writeRecord: (next: BookingRecord, what: PanelEditKind, detail?: string) => Promise<{ ok: boolean; error: unknown }>;
  /** `BookingStatusResolve`; never into Pending (the menu never offers it). Undo goes back to the previous status. */
  setStatus: (status: BookingStatus) => Promise<boolean>;
  /** The customer's note: `BookingContactSetNote` for a real contact, `BookingInlineContactSetNote` for an inline one. Rejects with a readable message (the `Field` shows it). */
  setNote: (note: string) => Promise<void>;
  /** `BookingDelete`. Not undoable — the caller asks first. */
  deleteBooking: () => Promise<boolean>;
}

/**
 * Every write the booking panel makes — non-optimistic on purpose (a panel
 * shows one record and a spinner; nothing to roll back), but on the same
 * rails as `useRangeMutations`: each response goes to the detail store
 * (`written`) AND on the live bus (`origin: 'own'`) so the calendar, the
 * lists and the availability cache reconcile through the one path; failures
 * toast (never `state.error`); undo is a compensating forward mutation
 * (`lib/undo.ts`) offered on time / service / specialist / customer edits and
 * on status changes; delete asks first and is final.
 */
export function useBookingWrite(state: DetailState, dispatch: Dispatch<DetailAction>): BookingWrite {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const undo = useBookingsUndo();
  const toast = useToast();
  const booking = state.booking;

  const publish = useCallback(
    (record: BookingRecord) => bus.publish({ kind: 'upsert', booking: record, origin: 'own' }),
    [bus],
  );

  /**
   * Registers the entry and returns the runner the TOAST button holds directly.
   * It cannot go through `undo.run`: that callback is rebuilt from the pending
   * entry, so the one `toast.show` captures is still the previous render's and
   * would do nothing (deals' BoardView documents the same trap). Clearing first
   * is what keeps the toast button and ⌘Z from firing the same compensating
   * mutation twice.
   */
  const offerUndo = useCallback(
    (entry: UndoEntry, run: () => Promise<void>): (() => void) => {
      const runUndo = () => {
        undo.clear();
        void run();
      };
      undo.push(entry, runUndo);
      return runUndo;
    },
    [undo],
  );

  const writeInput = useCallback<BookingWrite['writeInput']>(
    async (input, what, detail) => {
      if (!booking) return { ok: false, error: null };
      const id = booking.id;
      const before = bookingInputOf(booking);
      const name = customerName(booking);
      dispatch({ type: 'saveStarted' });
      try {
        const data = await client.mutate(BookingUpdateDocument, { botID: botId, bookingID: id, req: input });
        const saved = data.bookingUpdateV2 as BookingRecord;
        dispatch({ type: 'written', booking: saved });
        publish(saved);
        const entry = updateUndoEntry(id, before, what, Date.now());
        const runUndo = offerUndo(entry, async () => {
          try {
            const back = await client.mutate(BookingUpdateDocument, { botID: botId, bookingID: id, req: before });
            const restored = back.bookingUpdateV2 as BookingRecord;
            dispatch({ type: 'written', booking: restored });
            publish(restored);
          } catch (err) {
            toast.show({ title: 'Could not undo', description: errorMessage(err), tone: 'danger' });
          }
        });
        toast.show({
          id: `panel-edit-${id}`,
          title: editResultPhrase(name, what, true, detail),
          tone: 'success',
          duration: 4000,
          action: { label: undoLabel(entry), onClick: runUndo },
        });
        return { ok: true, error: null };
      } catch (err) {
        dispatch({ type: 'saveFailed' });
        toast.show({ title: editResultPhrase(name, what, false), description: errorMessage(err), tone: 'danger' });
        return { ok: false, error: err };
      }
    },
    [booking, client, botId, dispatch, publish, offerUndo, toast],
  );

  const writeRecord = useCallback<BookingWrite['writeRecord']>(
    (next, what, detail) => writeInput(bookingInputOf(next), what, detail),
    [writeInput],
  );

  const setStatus = useCallback<BookingWrite['setStatus']>(
    async (status) => {
      if (!booking || booking.status === status) return false;
      const id = booking.id;
      const from = booking.status;
      const name = customerName(booking);
      dispatch({ type: 'saveStarted' });
      try {
        const data = await client.mutate(BookingStatusResolveDocument, { botID: botId, bookingID: id, status });
        const saved = data.bookingStatusResolveV2 as BookingRecord;
        dispatch({ type: 'written', booking: saved });
        publish(saved);
        const entry = statusUndoEntry([{ id, from }], status, Date.now());
        let runUndo: (() => void) | null = null;
        if (entry) {
          runUndo = offerUndo(entry, async () => {
            try {
              const back = await client.mutate(BookingStatusResolveDocument, {
                botID: botId,
                bookingID: id,
                status: from,
              });
              const restored = back.bookingStatusResolveV2 as BookingRecord;
              dispatch({ type: 'written', booking: restored });
              publish(restored);
            } catch (err) {
              toast.show({ title: 'Could not undo', description: errorMessage(err), tone: 'danger' });
            }
          });
        }
        toast.show({
          id: `panel-status-${id}`,
          title: statusResultPhrase([name], [], status),
          tone: 'success',
          duration: 4000,
          action: entry && runUndo ? { label: undoLabel(entry), onClick: runUndo } : undefined,
        });
        return true;
      } catch (err) {
        dispatch({ type: 'saveFailed' });
        toast.show({
          title: `${name} could not be marked ${statusMeta(status).label}.`,
          description: errorMessage(err),
          tone: 'danger',
        });
        return false;
      }
    },
    [booking, client, botId, dispatch, publish, offerUndo, toast],
  );

  const setNote = useCallback<BookingWrite['setNote']>(
    async (note) => {
      if (!booking) return;
      const value = note.trim() === '' ? null : note;
      dispatch({ type: 'saveStarted' });
      try {
        if (booking.contact) {
          const data = await client.mutate(BookingContactSetNoteDocument, {
            contactID: booking.contact.id,
            note: value,
          });
          const contact = { ...booking.contact, note: data.contactSetNote.note ?? null } as BookingRecord['contact'];
          const next = { ...booking, contact } as BookingRecord;
          dispatch({ type: 'written', booking: next });
          publish(next);
        } else if (booking.inlineContact) {
          const data = await client.mutate(BookingInlineContactSetNoteDocument, {
            inlineContactID: booking.inlineContact.id,
            note: value,
          });
          const next = {
            ...booking,
            inlineContact: { ...booking.inlineContact, note: data.bookingInlineContactSetNote.note ?? null },
          } as BookingRecord;
          dispatch({ type: 'written', booking: next });
          publish(next);
        } else {
          dispatch({ type: 'saveFailed' });
        }
      } catch (err) {
        dispatch({ type: 'saveFailed' });
        throw new Error(errorMessage(err), { cause: err });
      }
    },
    [booking, client, dispatch, publish],
  );

  const deleteBooking = useCallback<BookingWrite['deleteBooking']>(async () => {
    if (!booking) return false;
    const name = customerName(booking);
    dispatch({ type: 'saveStarted' });
    try {
      await client.mutate(BookingDeleteDocument, { botID: botId, bookingID: booking.id });
      dispatch({ type: 'saveFailed' }); // saving off; the `gone` flag comes from the bus event below
      bus.publish({ kind: 'remove', id: booking.id, origin: 'own' });
      toast.show({ title: deleteResultPhrase([name], []), tone: 'info', duration: 3000 });
      return true;
    } catch (err) {
      dispatch({ type: 'saveFailed' });
      toast.show({ title: deleteResultPhrase([], [name]), description: errorMessage(err), tone: 'danger' });
      return false;
    }
  }, [booking, client, botId, dispatch, bus, toast]);

  return useMemo(
    () => ({ writeInput, writeRecord, setStatus, setNote, deleteBooking }),
    [writeInput, writeRecord, setStatus, setNote, deleteBooking],
  );
}
