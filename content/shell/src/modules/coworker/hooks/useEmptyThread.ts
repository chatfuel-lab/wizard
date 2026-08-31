import { useCallback, useEffect, useRef, useState } from 'react';
import { CoworkerStateDocument } from '~api/generated/coworker/graphql';
import { useCoworker } from '../CoworkerContext';

export interface EmptyThread {
  /** Nothing has ever been said in this conversation. */
  empty: boolean;
  /** Something has now been said from here — no round trip to find out. */
  markSent: () => void;
}

/**
 * Whether this conversation has anything in it, for the starter row.
 *
 * This is a debt, and it should be paid by deleting the file. The thread
 * already knows — `useCoworkerThread` has the messages — but the composer's
 * props were frozen before the starter row existed and carry no `empty`, so the
 * one boolean it needs is fetched again here. One `first: 1` page, once per
 * conversation, and the very query the real dashboard runs per row of its list.
 * The moment `CoworkerComposerProps` grows `empty: boolean`, this whole file
 * goes and the composer reads the prop.
 *
 * What it deliberately does NOT do is guess. "The operator has not sent
 * anything since this composer mounted" is available for free and is wrong on
 * every conversation with history in it — which is most of them — and a row of
 * first-message suggestions at the bottom of a long thread is worse than no row
 * at all.
 *
 * A failure answers "not empty". Starters are a nicety; a broken network should
 * cost the operator nothing more than it already has.
 */
export function useEmptyThread(conversationId: string | null): EmptyThread {
  const { client, events } = useCoworker();
  const [empty, setEmpty] = useState(false);
  /* Bumped on every conversation change: a page that lands for the previous
     conversation must not decide anything about this one. */
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    setEmpty(false);
    if (!conversationId) return undefined;

    const gen = generation.current;
    client
      .query(CoworkerStateDocument, { conversationID: conversationId, first: 1 })
      .then((data) => {
        if (generation.current !== gen) return;
        const conversation = data.currentUser.coworkerGetConversation;
        /* Null for a conversation that is missing or belongs to somebody else.
           The thread is showing that in its own words; the composer's job here
           is only not to offer openers for it. */
        if (!conversation) return;
        setEmpty(conversation.messagesConnection.edges.length === 0);
      })
      .catch(() => {
        /* Answered "not empty" by leaving it alone. */
      });

    /* Anything arriving fills the thread — including a message this operator
       sent from another tab, which is the case a mount-time answer alone would
       leave a stale row behind. */
    return events.onEvent((event) => {
      if (event.__typename === 'CoworkerMessageAdded' || event.__typename === 'CoworkerMessageStreamingChunk') {
        if (event.conversationID === conversationId) setEmpty(false);
      }
    });
  }, [client, events, conversationId]);

  /* Sends do not wait for the echo. The row has to go the instant it is used,
     or the operator watches their own suggestion sit there being offered. */
  const markSent = useCallback(() => setEmpty(false), []);

  return { empty, markSent };
}
