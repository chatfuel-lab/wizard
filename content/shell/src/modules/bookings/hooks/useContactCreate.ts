import { useCallback } from 'react';
import { BookingWhatsappContactCreateDocument, ContactDashboardSource } from '~api/generated/bookings/graphql';
import { useBookings } from '../BookingsContext';
import { customerFields, type NewCustomerDraft } from '../lib/wizardStore';

/**
 * `BookingWhatsappContactCreate` from a new-customer draft — the one place the
 * module mints a contact. The wizard's create calls it before `BookingCreate`
 * (`useWizardCreate`); the panel's "Attach a customer" calls it before the
 * full-replace update (`components/panel/CustomerSection.tsx`). Both then send
 * the id back as `contactID`, so the payload has to be identical: the fields
 * come from `customerFields`, the same builder `wizardInput` uses for an
 * inline contact.
 *
 * `source` is what tells the contacts dashboard where the contact came from;
 * it is the only field a contact carries that a booking's inline customer does not.
 */
export function useContactCreate(): (draft: NewCustomerDraft) => Promise<string> {
  const { client, botId } = useBookings();
  return useCallback(
    async (draft: NewCustomerDraft) => {
      const data = await client.mutate(BookingWhatsappContactCreateDocument, {
        botID: botId,
        data: { ...customerFields(draft), source: ContactDashboardSource.CalendarBooking },
      });
      return data.whatsappContactCreateV2.id;
    },
    [client, botId],
  );
}
