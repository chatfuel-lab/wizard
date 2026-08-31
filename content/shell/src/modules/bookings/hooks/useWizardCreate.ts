import { useCallback } from 'react';
import { useToast } from '~ui';
import { BookingCreateDocument } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { useBookingsLive } from '../BookingsLiveContext';
import { customerName } from '../lib/announce';
import { errorMessage } from '../lib/errors';
import { whenLabel, type LabelOptions } from '../lib/panelForm';
import { resolvedCustomer, stepValid, wizardInput, type WizardAction, type WizardState } from '../lib/wizardStore';
import { useContactCreate } from './useContactCreate';
import type { BookingRecord, DisplayZone } from '../types';

export interface WizardCreateInput {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  /** The bot's IANA zone, or null — instants are SENT in it (see `lib/zone.ts`). */
  botZone: string | null;
  zone: DisplayZone;
  labels: LabelOptions;
  /** The created record — the workspace opens it in the panel. */
  onCreated: (booking: BookingRecord) => void;
}

/**
 * The wizard's create: an optional `BookingWhatsappContactCreate` first, then
 * `BookingCreate` with instants in the bot's offset, the record published on
 * the live bus (`origin: 'own'`) so every range store and the availability
 * cache reconcile, then `onCreated` opens the panel on it.
 */
export function useWizardCreate({
  state,
  dispatch,
  botZone,
  zone,
  labels,
  onCreated,
}: WizardCreateInput): () => Promise<void> {
  const { client, botId } = useBookings();
  const { bus } = useBookingsLive();
  const createContact = useContactCreate();
  const toast = useToast();

  return useCallback(async () => {
    if (state.submitting || !stepValid(state, 'confirm')) return;
    dispatch({ type: 'submitStarted' });
    try {
      let contactId: string | undefined;
      const customer = resolvedCustomer(state);
      if (customer.kind === 'new' && customer.draft.createContact) contactId = await createContact(customer.draft);
      const input = wizardInput(state, botZone, { contactId });
      const data = await client.mutate(BookingCreateDocument, { botID: botId, req: input });
      const created = data.bookingCreateV2 as BookingRecord;
      bus.publish({ kind: 'upsert', booking: created, origin: 'own' });
      toast.show({
        title: `Booked ${customerName(created)} · ${whenLabel(created, zone.zone, labels)}`,
        tone: 'success',
        duration: 4000,
      });
      dispatch({ type: 'submitDone' });
      onCreated(created);
    } catch (err) {
      dispatch({ type: 'submitFailed', message: errorMessage(err) });
    }
  }, [state, client, botId, botZone, bus, createContact, toast, zone.zone, labels, onCreated, dispatch]);
}
