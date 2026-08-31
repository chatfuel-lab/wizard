import { useCallback, useEffect, useReducer } from 'react';
import {
  InboxAttributeDeleteDocument,
  InboxAttributeUpdateDocument,
  InboxContactGetDocument,
  InboxRemoveAssigneeDocument,
  InboxSetAiAssigneeDocument,
  InboxSetAssigneeDocument,
  InboxSetNoteDocument,
  OpenContactUpdatedDocument,
} from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { attributeWriteMessage, confirmAttributeWrite } from '../lib/contactAttributes';
import { messageOf } from '../lib/errors';
import { assigneeFromValue, type ContactDetail } from '../lib/contactPanel';
import { contactReducer, initialContactState, type ContactUpdate } from '../lib/contactStore';

export interface ContactPanelState {
  contact: ContactDetail | null;
  loading: boolean;
  error: string | null;
  /** Attribute name → why the last write to it did not land. */
  writeProblems: Record<string, string>;
  /** Rejects on failure so `~ui`'s `Field` shows it inline, as designed. */
  setNote: (note: string | null) => Promise<void>;
  setAttribute: (name: string, value: string, label: string) => Promise<void>;
  deleteAttribute: (name: string) => Promise<void>;
  /** 'none' | 'ai' | 'u:<UserAccountID>' — see `assigneeValue`. */
  setAssignee: (value: string) => Promise<void>;
}

/**
 * The contact panel's wire half.
 *
 * `OpenContactUpdated` is finally connected here, and the shape of that
 * connection is the whole point: the event carries the LIST's contact, which
 * has no note, no attributes and no scope. So it is applied for what it has and
 * the panel refetches for the rest — a change made in another tab, or in the
 * Chatfuel dashboard, reaches an open panel either way.
 *
 * Subscribed on open and torn down on close, per the module's standing rule
 * about not holding many of these at once. Keyed on the PROP rather than on the
 * reducer's contactId, the same as the thread's message subscription: this is
 * the one effect that must tear down in the same commit as the `opened`
 * dispatch, or the old contact's events land in a panel already cleared for the
 * new one.
 */
export function useContactStore(contactId: string | null): ContactPanelState {
  const { client, botId } = useLivechat();
  const [state, dispatch] = useReducer(contactReducer, contactId, initialContactState);
  const { epoch, stale } = state;
  const openId = state.contactId;

  useEffect(() => {
    if (openId !== contactId) dispatch({ type: 'opened', contactId });
  }, [contactId, openId]);

  useEffect(() => {
    if (!openId) return;
    let cancelled = false;
    client
      .query(InboxContactGetDocument, { botID: botId, contactID: openId })
      .then((data) => {
        if (!cancelled) dispatch({ type: 'loaded', epoch, contact: data.bot?.contact ?? null });
      })
      .catch((err: unknown) => {
        if (!cancelled) dispatch({ type: 'failed', epoch, message: messageOf(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, openId, epoch]);

  useEffect(() => {
    if (!contactId) return;
    const off = client.subscribe(
      OpenContactUpdatedDocument,
      { botID: botId, contactID: contactId },
      {
        next: (data) => {
          const updated = data.contactUpdated;
          if (!updated) return;
          /* Named field by field. The event's `conversation` carries a
             lastMessage the panel's does not, and spreading the whole node
             would put a shape into state that no consumer's type describes. */
          const update: ContactUpdate = {
            id: updated.id,
            name: updated.name,
            profilePictureUrl: updated.profilePictureUrl,
            updatedAt: updated.updatedAt,
            unreadMessagesCount: updated.unreadMessagesCount,
            unhandledSwitchToHuman: updated.unhandledSwitchToHuman,
            lastConversationMessageTime: updated.lastConversationMessageTime,
            salesStageV2: updated.salesStageV2,
            assignee: updated.assignee,
          };
          dispatch({ type: 'live', update });
        },
        error: () => {
          /* A dropped live channel does not make what is on screen untrue, and
             the panel is not the place to report a socket. The reconnect below
             re-reads the contact, which is the part that matters. */
        },
      },
    );
    const offReconnect = client.onReconnect(() => dispatch({ type: 'refetch' }));
    return () => {
      off();
      offReconnect();
    };
  }, [client, botId, contactId]);

  /* The other half of the subscription's shortfall: an event proves something
     changed, and the fields it cannot carry are exactly the ones the panel is
     made of. One query per event, self-limiting — `loaded` clears the flag. */
  useEffect(() => {
    if (stale) dispatch({ type: 'refetch' });
  }, [stale]);

  /* Deliberately not caught: `Field` reports a rejected save inline, and the
     note is the one write here that either succeeds or throws — it is a plain
     String on the contact rather than a name the server has to recognise. */
  const setNote = useCallback(
    async (note: string | null) => {
      if (!openId) return;
      const data = await client.mutate(InboxSetNoteDocument, { contactID: openId, note });
      dispatch({
        type: 'noteChanged',
        contactId: openId,
        note: data.contactSetNote.note ?? null,
        updatedAt: data.contactSetNote.updatedAt,
      });
    },
    [client, openId],
  );

  /**
   * Write an attribute, then check whether it is actually there.
   *
   * The mutation answers with the whole contact and does not error on a name
   * the server will not store — so the response is the only evidence, and this
   * is the one place that reads it. `written` re-renders the panel from that
   * response rather than from anything this browser assumed.
   */
  const setAttribute = useCallback(
    async (name: string, value: string, label: string) => {
      if (!openId) return;
      dispatch({ type: 'attributeProblem', contactId: openId, name, message: null });
      try {
        const data = await client.mutate(InboxAttributeUpdateDocument, {
          contactID: openId,
          attrName: name,
          attrValue: value,
        });
        const contact = data.contactAttributeUpdate;
        dispatch({ type: 'written', contact });
        const message = attributeWriteMessage(confirmAttributeWrite(contact, name, value), label);
        dispatch({ type: 'attributeProblem', contactId: openId, name, message });
      } catch (err) {
        dispatch({ type: 'attributeProblem', contactId: openId, name, message: messageOf(err) });
      }
    },
    [client, openId],
  );

  const deleteAttribute = useCallback(
    async (name: string) => {
      if (!openId) return;
      dispatch({ type: 'attributeProblem', contactId: openId, name, message: null });
      try {
        const data = await client.mutate(InboxAttributeDeleteDocument, {
          contactID: openId,
          attrName: name,
        });
        dispatch({ type: 'written', contact: data.contactAttributeDelete });
      } catch (err) {
        dispatch({ type: 'attributeProblem', contactId: openId, name, message: messageOf(err) });
      }
    },
    [client, openId],
  );

  /**
   * Three mutations, one control.
   *
   * `assigneeID` is `member.user.id` — a UserAccountID — and NOT `member.id`,
   * which is a BotTeamMemberID. Both are opaque strings hanging off the same
   * object, so the wrong one fails at runtime and never at compile time; the
   * picker is built from `member.user.id` for that reason alone.
   */
  const setAssignee = useCallback(
    async (value: string) => {
      if (!openId) return;
      const next = assigneeFromValue(value);
      try {
        if (next.kind === 'ai') {
          const data = await client.mutate(InboxSetAiAssigneeDocument, { contactID: openId });
          dispatch({
            type: 'assigneeChanged',
            contactId: openId,
            assignee: data.contactSetFuelyAIAssignee.assignee ?? null,
            updatedAt: data.contactSetFuelyAIAssignee.updatedAt,
          });
          return;
        }
        if (next.kind === 'user') {
          const data = await client.mutate(InboxSetAssigneeDocument, {
            contactID: openId,
            assigneeID: next.id,
          });
          dispatch({
            type: 'assigneeChanged',
            contactId: openId,
            assignee: data.contactSetAssignee.assignee ?? null,
            updatedAt: data.contactSetAssignee.updatedAt,
          });
          return;
        }
        const data = await client.mutate(InboxRemoveAssigneeDocument, { contactID: openId });
        dispatch({
          type: 'assigneeChanged',
          contactId: openId,
          assignee: data.contactRemoveAssignee.assignee ?? null,
          updatedAt: data.contactRemoveAssignee.updatedAt,
        });
      } catch {
        /* The control shows what the server last confirmed, so a failed write
           simply leaves it where it was — and a refetch is on its way if the
           change landed anyway. */
        dispatch({ type: 'refetch' });
      }
    },
    [client, openId],
  );

  return {
    contact: state.contact,
    loading: state.loading,
    error: state.error,
    writeProblems: state.writeProblems,
    setNote,
    setAttribute,
    deleteAttribute,
    setAssignee,
  };
}
