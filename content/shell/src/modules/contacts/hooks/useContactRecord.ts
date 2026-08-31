import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ContactAttributeDeleteDocument,
  ContactAttributeUpdateDocument,
  ContactGetDocument,
  ContactLiveDocument,
  ContactRemoveAssigneeDocument,
  ContactSetAssigneeDocument,
  ContactSetFuelyAiAssigneeDocument,
  ContactSetNoteDocument,
  ContactSetStageDocument,
  ContactUpdateNameDocument,
  type SalesStageV2,
} from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import { attributeWriteMessage, confirmAttributeWrite, mergeLiveRecord } from '../lib/attributeValue';
import type { ContactRecord } from '../types';

export interface ContactRecordApi {
  contact: ContactRecord | null;
  loading: boolean;
  error: string | null;
  /**
   * Attribute name → why the last write to it did not land.
   *
   * Not decoration. `contactAttributeUpdate` answers 200 with a contact that
   * simply does not carry the attribute when the server declines the name, so
   * the ONLY evidence a write landed is the contact the mutation answers with.
   */
  problems: Record<string, string>;
  /** A write is in flight — the header shows it once rather than per field. */
  busy: boolean;
  reload: () => void;
  /**
   * Fence a field while it is being edited, so a `contactUpdated` echo does not
   * replace the value under the cursor. Released on blur.
   */
  holdField: (name: string) => void;
  releaseField: (name: string) => void;
  rename: (name: string) => Promise<void>;
  setNote: (note: string) => Promise<void>;
  setStage: (stage: SalesStageV2) => Promise<void>;
  /** An empty value DELETES the attribute — the only way this API clears a field. */
  setAttribute: (name: string, value: string, label?: string) => Promise<void>;
  deleteAttribute: (name: string) => Promise<void>;
  assignTo: (userAccountId: string) => Promise<void>;
  assignToAi: () => Promise<void>;
  unassign: () => Promise<void>;
}

/**
 * One open contact and everything that writes to it.
 *
 * Two mutation shapes, deliberately kept apart:
 *
 * - `contactAttributeUpdate` / `contactAttributeDelete` answer with the WHOLE
 *   contact, so the response IS the new record and there is nothing to merge.
 * - the others answer with a few fields, which are merged over what is there.
 *
 * Nothing here is optimistic, and that is not caution for its own sake: a write
 * the server declines does not error (see `problems`), so an optimistic value
 * would never be contradicted and would go on showing something that exists
 * nowhere but in this browser. Every one of these round-trips in well under the
 * time a person takes to look at the next field.
 *
 * `onPatched` is how the list behind the panel stays honest — one record cache,
 * written from whichever surface the user touched. It fires for every record
 * this hook produces, the first read included: a fresher copy of the row is
 * never worse than the one the list is holding.
 */
export function useContactRecord(
  contactId: string | null,
  onPatched?: (contact: ContactRecord) => void,
): ContactRecordApi {
  const { client, botId } = useContacts();
  const [contact, setContact] = useState<ContactRecord | null>(null);
  const [loading, setLoading] = useState(contactId !== null);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(0);
  const [token, setToken] = useState(0);

  /* `onPatched` is held in a ref rather than named in a dependency array. The
     caller is a page component and the natural way to pass this is an inline
     arrow, which is a new function on every render — and a subscription keyed
     on its identity would close the socket and open a new one on every render
     of the record page: every stage change, every spinner, every tab click.
     Nothing here needs the newest closure at any particular moment; it needs
     the newest one at the moment it fires, which is what a ref gives. */
  const patchedRef = useRef(onPatched);
  patchedRef.current = onPatched;
  /** The record identity the list has already been told about. */
  const notifiedRef = useRef<ContactRecord | null>(null);

  /* A ref, not state: holding a field must not re-render the page, and the
     subscription's callback has to read the CURRENT set rather than the one
     captured when it was installed. */
  const heldRef = useRef<Set<string>>(new Set());
  const holdField = useCallback((name: string) => {
    heldRef.current.add(name);
  }, []);
  const releaseField = useCallback((name: string) => {
    heldRef.current.delete(name);
  }, []);

  /* Which contact the surface is on RIGHT NOW. A subscription frame or a query
     response already in flight when the user steps to the next neighbour must
     be dropped, and the effect's own cleanup is one tick too late for that. */
  const openRef = useRef<string | null>(contactId);
  openRef.current = contactId;

  useEffect(() => {
    setProblems({});
    if (!contactId) {
      setContact(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .query(ContactGetDocument, { botID: botId, contactID: contactId })
      .then((data) => {
        if (cancelled || openRef.current !== contactId) return;
        setContact(data.bot.contact);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not open this contact');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, contactId, token]);

  /* Live, per contact. The SDL warns against opening many of these, and this
     is the one place that opens exactly one. `contactUpdated` fires on
     attribute writes too, including this page's own — which
     is precisely why the merge has to know what is being edited. */
  useEffect(() => {
    if (!contactId) return undefined;
    return client.subscribe(
      ContactLiveDocument,
      { botID: botId, contactID: contactId },
      {
        next: (data) => {
          const updated = data.contactUpdated;
          if (!updated) return;
          if (openRef.current !== contactId) return;
          setContact((current) => mergeLiveRecord(current, updated, [...heldRef.current]));
        },
        error: () => {
          /* A dead socket leaves the record readable; the reload button is the answer. */
        },
      },
    );
  }, [client, botId, contactId]);

  /* The list is told from an effect rather than from inside the writes, and
     that is not tidiness. `merge` and the live handler both produce their next
     record inside a `setContact(current => …)` updater, and an updater runs
     during React's RENDER phase whenever another update is already queued —
     calling the list's setState from there is the "cannot update a component
     while rendering a different component" warning, appearing only under that
     timing. Every path ends in a new `contact` identity, so watching that one
     thing covers all of them: query, mutation and live echo alike. */
  useEffect(() => {
    if (!contact || notifiedRef.current === contact) return;
    notifiedRef.current = contact;
    patchedRef.current?.(contact);
  }, [contact]);

  const adopt = useCallback((next: ContactRecord) => {
    if (openRef.current !== next.id) return;
    setContact(next);
  }, []);

  const merge = useCallback((patch: Partial<ContactRecord> & { id: string }) => {
    setContact((current) => {
      if (!current || current.id !== patch.id) return current;
      return { ...current, ...patch } as ContactRecord;
    });
  }, []);

  const requireId = useCallback((): string => {
    if (!contactId) throw new Error('No contact is open');
    return contactId;
  }, [contactId]);

  /* One counter rather than a boolean: two fields can be saving at once and a
     boolean would be cleared by whichever finished first. */
  const track = useCallback(async <T>(run: () => Promise<T>): Promise<T> => {
    setPending((n) => n + 1);
    try {
      return await run();
    } finally {
      setPending((n) => Math.max(0, n - 1));
    }
  }, []);

  const noteProblem = useCallback((name: string, message: string | null) => {
    setProblems((current) => {
      if (message === null) {
        if (!(name in current)) return current;
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: message };
    });
  }, []);

  return useMemo<ContactRecordApi>(
    () => ({
      contact,
      loading,
      error,
      problems,
      busy: pending > 0,
      reload: () => setToken((n) => n + 1),
      holdField,
      releaseField,

      rename: (name: string) =>
        track(async () => {
          const data = await client.mutate(ContactUpdateNameDocument, { contactID: requireId(), name });
          merge(data.contactUpdateName as Partial<ContactRecord> & { id: string });
        }),

      setNote: (note: string) =>
        track(async () => {
          /* `note` is nullable and null is how it is cleared — there is no
             separate delete, and writing "" would leave an empty note behind. */
          const data = await client.mutate(ContactSetNoteDocument, {
            contactID: requireId(),
            note: note.trim() === '' ? null : note,
          });
          merge(data.contactSetNote as Partial<ContactRecord> & { id: string });
        }),

      setStage: (stage: SalesStageV2) =>
        track(async () => {
          const data = await client.mutate(ContactSetStageDocument, { contactID: requireId(), stage });
          merge(data.contactSetSalesStage as Partial<ContactRecord> & { id: string });
        }),

      /* An empty value is a delete: `contactAttributeUpdate` would store "" and
         every IS_EMPTY filter would then disagree with what the field looks
         like. Deleting the last contact's value also removes the field from the
         bot catalog altogether, which is why the Fields tab
         says so rather than treating a clear as a small thing. */
      setAttribute: (name: string, value: string, label?: string) =>
        track(async () => {
          const id = requireId();
          if (value.trim() === '') {
            const data = await client.mutate(ContactAttributeDeleteDocument, { contactID: id, attrName: name });
            noteProblem(name, null);
            adopt(data.contactAttributeDelete);
            return;
          }
          const data = await client.mutate(ContactAttributeUpdateDocument, {
            contactID: id,
            attrName: name,
            attrValue: value,
          });
          const result = confirmAttributeWrite(data.contactAttributeUpdate.attributes, name, value);
          noteProblem(name, attributeWriteMessage(result, label ?? name));
          adopt(data.contactAttributeUpdate);
        }),

      deleteAttribute: (name: string) =>
        track(async () => {
          const data = await client.mutate(ContactAttributeDeleteDocument, {
            contactID: requireId(),
            attrName: name,
          });
          noteProblem(name, null);
          adopt(data.contactAttributeDelete);
        }),

      assignTo: (userAccountId: string) =>
        track(async () => {
          /* `member.user.id` — a UserAccountID. `member.id` is a different id
             and this mutation rejects it. */
          const data = await client.mutate(ContactSetAssigneeDocument, {
            contactID: requireId(),
            assigneeID: userAccountId,
          });
          merge(data.contactSetAssignee as Partial<ContactRecord> & { id: string });
        }),

      assignToAi: () =>
        track(async () => {
          const data = await client.mutate(ContactSetFuelyAiAssigneeDocument, { contactID: requireId() });
          merge(data.contactSetFuelyAIAssignee as Partial<ContactRecord> & { id: string });
        }),

      unassign: () =>
        track(async () => {
          const data = await client.mutate(ContactRemoveAssigneeDocument, { contactID: requireId() });
          merge(data.contactRemoveAssignee as Partial<ContactRecord> & { id: string });
        }),
    }),
    [
      contact,
      loading,
      error,
      problems,
      pending,
      client,
      requireId,
      adopt,
      merge,
      track,
      noteProblem,
      holdField,
      releaseField,
    ],
  );
}
