import { useCallback, useMemo } from 'react';
import { useToast } from '~ui';
import {
  BookingGoogleCalendarDisconnectDocument,
  BookingGoogleCalendarLinkCreateDocument,
  BookingGoogleCalendarLinkDeleteDocument,
  BookingGoogleCalendarLinkInfoDocument,
  BookingSpecialistCreateDocument,
  BookingSpecialistDeleteDocument,
  BookingSpecialistUpdateDocument,
  type SpecialistInfoInput,
} from '~api/generated/bookings/graphql';
import { useCatalog } from '../BookingsCatalogContext';
import { useBookings } from '../BookingsContext';
import { specialistName } from '../lib/catalogStore';
import { errorMessage } from '../lib/errors';
import type { SpecialistRecord } from '../types';

export type ConnectionLink = NonNullable<SpecialistRecord['googleCalendarConnectionLink']>;

export interface LinkInfo {
  id: string;
  specialistName: string;
  botTitle: string;
  createdBy: { id: string; name: string };
}

export interface StaffMutations {
  /**
   * Create (`id === null`) or full-replace update. Resolves with the saved
   * record after the catalog has adopted it; rejects with the API error so
   * the form can map its code to a field. No toast on failure — the form
   * shows it inline and keeps the draft.
   */
  saveSpecialist: (id: string | null, input: SpecialistInfoInput) => Promise<SpecialistRecord>;
  /** Not undoable; ask first. Bookings keep a `DeletedSpecialist` reference. */
  deleteSpecialist: (record: SpecialistRecord) => Promise<void>;
  createLink: (record: SpecialistRecord) => Promise<ConnectionLink>;
  deleteLink: (record: SpecialistRecord) => Promise<void>;
  linkInfo: (linkId: string) => Promise<LinkInfo>;
  disconnectCalendar: (record: SpecialistRecord) => Promise<void>;
}

/**
 * Every write the staff section makes, minus the sync task (which has its own
 * hook because it subscribes). Each mutation's payload goes straight into the
 * catalog — create/delete/link-delete answer with the whole list
 * (`specialistsReplaced`), update/disconnect with the one record
 * (`specialistWritten`), link-create with just the link (patched onto the
 * record). Successes toast; failures are the caller's to show inline, except
 * where noted.
 */
export function useStaffMutations(): StaffMutations {
  const { client, botId } = useBookings();
  const catalog = useCatalog();
  const toast = useToast();

  const saveSpecialist = useCallback<StaffMutations['saveSpecialist']>(
    async (id, input) => {
      if (id === null) {
        const before = new Set(catalog.state.specialists.map((s) => s.id));
        const data = await client.mutate(BookingSpecialistCreateDocument, { botID: botId, info: input });
        const list = data.specialistCreate.specialists;
        catalog.dispatch({ type: 'specialistsReplaced', specialists: list });
        // The payload is the whole list; the new one is the id we did not have — or, failing that, the name we sent.
        const wanted = [input.profile.firstName, input.profile.lastName].filter(Boolean).join(' ').trim();
        const created =
          list.find((s) => !before.has(s.id)) ??
          list.find((s) => specialistName(s.profile) === wanted) ??
          list[list.length - 1];
        if (!created) throw new Error('The specialist was created but did not come back in the list — refresh.');
        toast.show({ title: `${specialistName(created.profile)} added`, tone: 'success', duration: 3000 });
        return created;
      }
      const data = await client.mutate(BookingSpecialistUpdateDocument, {
        botID: botId,
        specialistID: id,
        info: input,
      });
      const saved = data.specialistUpdate;
      catalog.dispatch({ type: 'specialistWritten', specialist: saved });
      toast.show({
        id: `staff-saved-${id}`,
        title: `${specialistName(saved.profile)} saved`,
        tone: 'success',
        duration: 3000,
      });
      return saved;
    },
    [client, botId, catalog, toast],
  );

  const deleteSpecialist = useCallback<StaffMutations['deleteSpecialist']>(
    async (record) => {
      try {
        const data = await client.mutate(BookingSpecialistDeleteDocument, { botID: botId, specialistID: record.id });
        catalog.dispatch({ type: 'specialistsReplaced', specialists: data.specialistDelete.specialists });
        toast.show({
          title: `${specialistName(record.profile)} deleted`,
          description: 'Their bookings keep the name.',
          tone: 'info',
          duration: 4000,
        });
      } catch (err) {
        toast.show({
          title: `Could not delete ${specialistName(record.profile)}`,
          description: errorMessage(err),
          tone: 'danger',
        });
        throw err;
      }
    },
    [client, botId, catalog, toast],
  );

  const createLink = useCallback<StaffMutations['createLink']>(
    async (record) => {
      const data = await client.mutate(BookingGoogleCalendarLinkCreateDocument, {
        botID: botId,
        specialistID: record.id,
      });
      const link = data.specialistCreateGoogleCalendarConnectionLink;
      catalog.dispatch({ type: 'specialistWritten', specialist: { ...record, googleCalendarConnectionLink: link } });
      toast.show({ title: 'Connection link created', tone: 'success', duration: 3000 });
      return link;
    },
    [client, botId, catalog, toast],
  );

  const deleteLink = useCallback<StaffMutations['deleteLink']>(
    async (record) => {
      const data = await client.mutate(BookingGoogleCalendarLinkDeleteDocument, {
        botID: botId,
        specialistID: record.id,
      });
      catalog.dispatch({
        type: 'specialistsReplaced',
        specialists: data.specialistDeleteGoogleCalendarConnectionLink.specialists,
      });
      toast.show({ title: 'Connection link deleted', tone: 'info', duration: 3000 });
    },
    [client, botId, catalog, toast],
  );

  const linkInfo = useCallback<StaffMutations['linkInfo']>(
    async (linkId) => {
      const data = await client.query(BookingGoogleCalendarLinkInfoDocument, { linkID: linkId });
      return data.specialistGoogleCalendarLinkInfo;
    },
    [client],
  );

  const disconnectCalendar = useCallback<StaffMutations['disconnectCalendar']>(
    async (record) => {
      const calendar = record.connectedGoogleCalendar;
      if (!calendar) return;
      const data = await client.mutate(BookingGoogleCalendarDisconnectDocument, {
        botID: botId,
        specialistID: record.id,
        googleCalendarID: calendar.id,
      });
      catalog.dispatch({ type: 'specialistWritten', specialist: data.specialistDisconnectGoogleCalendar });
      toast.show({
        title: 'Google Calendar disconnected',
        description: calendar.summary,
        tone: 'info',
        duration: 4000,
      });
    },
    [client, botId, catalog, toast],
  );

  return useMemo(
    () => ({ saveSpecialist, deleteSpecialist, createLink, deleteLink, linkInfo, disconnectCalendar }),
    [saveSpecialist, deleteSpecialist, createLink, deleteLink, linkInfo, disconnectCalendar],
  );
}
