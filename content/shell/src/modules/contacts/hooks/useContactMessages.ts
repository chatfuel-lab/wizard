import { useCallback, useEffect, useRef, useState } from 'react';
import { ContactMessagesDocument } from '~api/generated/contacts/graphql';
import { useContacts } from '../ContactsContext';
import {
  historyCursor,
  historyExhausted,
  mergeMessages,
  toRecordMessages,
  type MessageEdgeLike,
  type RecordMessage,
} from '../lib/contactMessages';

export interface ContactConversation {
  id: string;
  platform: string;
  status: string;
}

export interface ContactMessagesApi {
  /** Oldest first — what `~ui`'s MessageList takes. */
  messages: RecordMessage[];
  /** Null when this contact has never had a conversation. */
  conversation: ContactConversation | null;
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  /** There may be older messages AND asking for them has been producing some. */
  hasOlder: boolean;
  loadOlder: () => void;
  reload: () => void;
}

/** One page. Small: this is a record page, not the inbox. */
const PAGE = 30;

/**
 * The conversation behind one contact.
 *
 * ## Why a contact can have no conversation at all
 *
 * `conversation` is nullable and genuinely null: a contact created through
 * `whatsappContactCreateV2` or by a CSV import has never messaged the bot.
 * That is not an error and not an empty thread; it is a different sentence,
 * and the tab says it.
 *
 * ## Why paging is defensive
 *
 * `ContactMessages` pages with `before`, and the connection returns newest
 * first. The sibling inbox operation, in practice, walks the same
 * kind of connection into HISTORY with `after`, which is the opposite spelling.
 * Rather than pick a winner from a comment, this asks with `before` and then
 * checks whether the answer actually added anything: one empty answer retires
 * the button. Worst case the tab shows the most recent page and says so;
 * nothing loops, and nothing claims to be a full history it did not get.
 */
export function useContactMessages(contactId: string | null): ContactMessagesApi {
  const { client, botId } = useContacts();
  const [messages, setMessages] = useState<RecordMessage[]>([]);
  const [conversation, setConversation] = useState<ContactConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [token, setToken] = useState(0);

  /* Which contact the page is on right now. A response that resolves after the
     user has stepped to the next neighbour belongs to nobody. */
  const openRef = useRef<string | null>(contactId);
  openRef.current = contactId;
  const messagesRef = useRef<RecordMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    setMessages([]);
    setConversation(null);
    setExhausted(false);
    setError(null);
    if (!contactId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    client
      .query(ContactMessagesDocument, { botID: botId, contactID: contactId, first: PAGE, before: null })
      .then((data) => {
        if (cancelled || openRef.current !== contactId) return;
        const thread = data.bot.contact.conversation ?? null;
        setConversation(
          thread ? { id: thread.id, platform: String(thread.platform), status: String(thread.status) } : null,
        );
        const page = thread?.messages.edges ?? [];
        setMessages(mergeMessages([], toRecordMessages(page as readonly MessageEdgeLike[])));
        /* Nothing to page from is not the same as "history exhausted"; but an
           empty first page has no cursor either, so the button never appears. */
        setExhausted(page.length < PAGE);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not read this conversation');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, botId, contactId, token]);

  const loadOlder = useCallback(() => {
    const id = openRef.current;
    if (!id || loadingOlder || exhausted) return;
    const cursor = historyCursor(messagesRef.current);
    if (!cursor) return;
    setLoadingOlder(true);
    client
      .query(ContactMessagesDocument, { botID: botId, contactID: id, first: PAGE, before: cursor })
      .then((data) => {
        if (openRef.current !== id) return;
        const page = data.bot.contact.conversation?.messages.edges ?? [];
        const before = messagesRef.current;
        const after = mergeMessages(before, toRecordMessages(page as readonly MessageEdgeLike[]));
        setMessages(after);
        setExhausted(historyExhausted(before, after));
        setLoadingOlder(false);
      })
      .catch(() => {
        if (openRef.current !== id) return;
        /* One failure is not proof there is no history — the button stays, and
           the reader can ask again. */
        setLoadingOlder(false);
      });
  }, [client, botId, loadingOlder, exhausted]);

  return {
    messages,
    conversation,
    loading,
    loadingOlder,
    error,
    hasOlder: !exhausted && messages.length > 0,
    loadOlder,
    reload: useCallback(() => setToken((n) => n + 1), []),
  };
}
