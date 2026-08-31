import { useCallback, useMemo } from 'react';
import {
  ContactAttributeDeleteDocument,
  ContactAttributeUpdateDocument,
  ContactDashboardSource,
  ContactRemoveAssigneeDocument,
  ContactSetAssigneeDocument,
  ContactSetFuelyAiAssigneeDocument,
  ContactSetNoteDocument,
  ContactSetStageDocument,
  ContactUpdateNameDocument,
  WhatsAppContactCreateDocument,
  type AttributeDataType,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import type { ApiClient, ContactRow } from '../types';
import { optimisticPatch, rowLabel, wireValue, type RowAction } from '../lib/bulk';

export type RowResult = { ok: true } | { ok: false; message: string };

export interface RowStore {
  editStarted: (id: string, patch: Partial<ContactRow>) => void;
  editSucceeded: (id: string, row: ContactRow | null) => void;
  editFailed: (id: string) => void;
}

export interface NewContactInput {
  /** E.164: a leading `+` and digits. The API validates it and names the fault. */
  phone: string;
  name: string;
  note: string;
}

export interface UseRowMutationsOptions {
  store: RowStore;
  dataTypeOf: (name: string) => AttributeDataType | undefined;
  /** The attribute columns on screen: the names a refreshed row may carry. */
  attrNames: readonly string[];
}

export interface RowMutationsApi {
  /** Optimism, then the request, then the store lifecycle. Never throws. */
  apply: (row: ContactRow, action: RowAction) => Promise<RowResult>;
  /**
   * Optimism only. A bulk run applies every patch at once so the table settles
   * in one frame, and only then starts the requests, one at a time.
   */
  beginOptimism: (row: ContactRow, action: RowAction) => void;
  /** The request half, for a row whose optimism is already on screen. */
  send: (row: ContactRow, action: RowAction) => Promise<RowResult>;
  /** The API's only create. WhatsApp only, see the comment at the call. */
  createWhatsappContact: (input: NewContactInput) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
}

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message.trim() !== '' ? err.message : fallback;

/**
 * The row's attribute list, refreshed from a whole-contact answer.
 *
 * `contactAttributeUpdate` returns every attribute the contact has; the row
 * asked for only the ones its columns need (`attributes(names: $attrNames)`).
 * Narrowing the answer back down is what stops one edit from silently widening
 * every later render's payload, and the two shapes are identical, both being
 * `ContactAttributeInfo`.
 *
 * `wanted` is the COLUMNS' names plus whatever the row already had, not just
 * the latter: filling in a field that was empty on this row is the common case,
 * and reading the wanted set off the row alone would drop the value that was
 * just written.
 */
function pickAttributes(
  row: ContactRow,
  all: ContactRow['attributes'],
  attrNames: readonly string[],
): ContactRow['attributes'] {
  const wanted = new Set([...attrNames, ...row.attributes.map((entry) => entry.attr.name)]);
  return all.filter((entry) => wanted.has(entry.attr.name));
}

/** The request, and the fields of its answer worth adopting. */
async function request(
  client: ApiClient,
  row: ContactRow,
  action: RowAction,
  dataTypeOf: (name: string) => AttributeDataType | undefined,
  attrNames: readonly string[],
): Promise<Partial<ContactRow> | null> {
  const deleteAttribute = async (name: string): Promise<Partial<ContactRow>> => {
    const data = await client.mutate(ContactAttributeDeleteDocument, { contactID: row.id, attrName: name });
    return {
      attributes: pickAttributes(row, data.contactAttributeDelete.attributes, attrNames),
    } as Partial<ContactRow>;
  };

  switch (action.kind) {
    case 'stage': {
      const data = await client.mutate(ContactSetStageDocument, { contactID: row.id, stage: action.stage });
      const next = data.contactSetSalesStage;
      return {
        salesStageV2: next.salesStageV2,
        lastSalesStageUpdateTime: next.lastSalesStageUpdateTime,
        updatedAt: next.updatedAt,
      } as Partial<ContactRow>;
    }

    case 'rename': {
      const data = await client.mutate(ContactUpdateNameDocument, { contactID: row.id, name: action.name });
      return { name: data.contactUpdateName.name } as Partial<ContactRow>;
    }

    case 'note': {
      /* `note: null` is how the API is told to clear it; "" would store an
         empty string, and the note would then read as present but blank. */
      const data = await client.mutate(ContactSetNoteDocument, {
        contactID: row.id,
        note: action.note.trim() === '' ? null : action.note,
      });
      return { note: data.contactSetNote.note ?? null } as Partial<ContactRow>;
    }

    case 'assign': {
      if (action.to.kind === 'none') {
        const data = await client.mutate(ContactRemoveAssigneeDocument, { contactID: row.id });
        return { assignee: data.contactRemoveAssignee.assignee ?? null } as Partial<ContactRow>;
      }
      if (action.to.kind === 'ai') {
        const data = await client.mutate(ContactSetFuelyAiAssigneeDocument, { contactID: row.id });
        return { assignee: data.contactSetFuelyAIAssignee.assignee ?? null } as Partial<ContactRow>;
      }
      /* `assigneeID` is a UserAccountID, which is `member.user.id` and never
         `member.id`. The mutation rejects the other one with a generic error. */
      const data = await client.mutate(ContactSetAssigneeDocument, {
        contactID: row.id,
        assigneeID: action.to.userAccountId,
      });
      return { assignee: data.contactSetAssignee.assignee ?? null } as Partial<ContactRow>;
    }

    case 'setField': {
      const wire = wireValue(dataTypeOf(action.name), action.value);
      /* An empty value is a DELETE, not an update: `contactAttributeUpdate`
         would store "" and every IS_EMPTY filter would then disagree with what
         the cell looks like. `contactAttributeDelete` is the only way this API
         has to clear a field. */
      if (wire === '') return deleteAttribute(action.name);
      const data = await client.mutate(ContactAttributeUpdateDocument, {
        contactID: row.id,
        attrName: action.name,
        attrValue: wire,
      });
      return {
        attributes: pickAttributes(row, data.contactAttributeUpdate.attributes, attrNames),
      } as Partial<ContactRow>;
    }

    case 'clearField':
      return deleteAttribute(action.name);

    default:
      return null;
  }
}

/**
 * Every write the list can make, wired to the store's optimistic lifecycle.
 *
 * The lifecycle is `editStarted` then `editSucceeded` / `editFailed`, and the
 * failure path is why everything goes through it: `editFailed` restores exactly
 * one row from exactly its own inverse patch, so a failure inside a batch can
 * never revert a concurrent success, and it flashes the row that actually
 * failed rather than the table.
 *
 * The success path reuses the same pair, `editStarted(confirmed)` followed
 * immediately by `editSucceeded`, rather than inventing a third action. That is
 * not a trick: the server re-stamps `lastSalesStageUpdateTime` and `updatedAt`,
 * this module's only clocks, and adopting the answer is how the row stops
 * showing a time the optimistic patch made up. `editSucceeded` then drops the
 * pending entry, and the inverse recorded a moment earlier goes with it.
 */
export function useRowMutations({ store, dataTypeOf, attrNames }: UseRowMutationsOptions): RowMutationsApi {
  const { client, botId } = useContacts();
  const { editStarted, editSucceeded, editFailed } = store;

  /* Compared by value: the caller rebuilds `attrNames` on every render, and
     depending on the array identity would rebuild every callback below it. */
  const namesKey = attrNames.join(' ');
  const names = useMemo(() => namesKey.split(' ').filter((name) => name !== ''), [namesKey]);

  const beginOptimism = useCallback(
    (row: ContactRow, action: RowAction) => {
      const patch = optimisticPatch(action, row, dataTypeOf);
      /* Null means the optimistic form would have to be invented, as writing
         "abc" into a `long` attribute would. The row keeps its old value and
         waits for the answer, which is better than showing a wrong one. */
      if (patch) editStarted(row.id, patch);
    },
    [editStarted, dataTypeOf],
  );

  const send = useCallback(
    async (row: ContactRow, action: RowAction): Promise<RowResult> => {
      try {
        const confirmed = await request(client, row, action, dataTypeOf, names);
        if (confirmed) editStarted(row.id, confirmed);
        editSucceeded(row.id, null);
        return { ok: true };
      } catch (err) {
        /* Fires whether or not there was an optimistic patch: with one it rolls
           the row back, without one it still marks which row failed. */
        editFailed(row.id);
        return { ok: false, message: errorText(err, `Could not update ${rowLabel(row)}`) };
      }
    },
    [client, names, dataTypeOf, editStarted, editSucceeded, editFailed],
  );

  const apply = useCallback(
    async (row: ContactRow, action: RowAction): Promise<RowResult> => {
      beginOptimism(row, action);
      return send(row, action);
    },
    [beginOptimism, send],
  );

  const createWhatsappContact = useCallback(
    async (input: NewContactInput) => {
      try {
        const data = await client.mutate(WhatsAppContactCreateDocument, {
          botID: botId,
          data: {
            phoneNumber: input.phone.trim(),
            name: input.name.trim() === '' ? null : input.name.trim(),
            note: input.note.trim() === '' ? null : input.note.trim(),
            /* `ContactDashboardSource` has exactly one member. There is no
               value meaning "added by hand", so a contact created here is
               recorded as CalendarBooking. That is the API's word, not ours,
               and nothing in the UI repeats it. */
            source: ContactDashboardSource.CalendarBooking,
          },
        });
        return { ok: true as const, id: data.whatsappContactCreateV2.id };
      } catch (err) {
        return { ok: false as const, message: errorText(err, 'Could not create the contact') };
      }
    },
    [client, botId],
  );

  return useMemo(
    () => ({ apply, beginOptimism, send, createWhatsappContact }),
    [apply, beginOptimism, send, createWhatsappContact],
  );
}
