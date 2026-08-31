import { useCallback, useEffect, useRef, useState } from 'react';
import { createThrottle, paginate, type ModuleClient, type TypedDoc } from '~api';
import {
  ContactAssigneeFilterType,
  KbGapChatsDocument,
  KbGapConversationDocument,
} from '~api/generated/knowledge-base/graphql';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { messageFor } from '../lib/errors';
import {
  CHATS_PER_PAGE,
  MAX_CONVERSATIONS,
  MAX_PAGES,
  MESSAGES_PER_CONVERSATION,
  SCAN_CONCURRENCY,
  SCAN_THROTTLE,
} from '../lib/gapScanPolicy';
import { findHandoffQuestion, isFlagged, type GapSample } from '../lib/gaps';
import type { GapContact } from '../types';

/**
 * The conversation sweep behind the Gaps source.
 *
 * It is an EXPLICIT action, never something that happens on mount. It reads
 * other people's conversations - which is why the page is gated on
 * `Inbox: View` - and it costs a page request per twenty contacts plus one
 * request per flagged conversation. A page that quietly spent sixty API calls
 * because somebody clicked the wrong rail row would be indefensible.
 *
 * Shape of one sweep:
 *   1. page the chat list newest-first to a hard cap, keeping the contacts
 *      where the automation handed over or a human now owns the chat;
 *   2. read the tail of those conversations, throttled, a few at a time;
 *   3. pull the question that preceded each hand-off (`lib/gaps.ts`).
 *
 * The result is cached per bot ABOVE the component (see CACHE below): the
 * Gaps page unmounts every time somebody clicks another source in the rail,
 * and a sweep that re-ran on every back-navigation would be the expensive bug
 * this whole design is avoiding.
 */

export interface GapScanProgress {
  /** Chat-list pages fetched. */
  pages: number;
  /** Contacts looked at. */
  swept: number;
  /** Of those, the ones that went to a human. */
  flagged: number;
  /** Conversations opened. */
  read: number;
}

export type GapScanPhase = 'idle' | 'scanning' | 'done' | 'error';

export interface GapScanState {
  phase: GapScanPhase;
  progress: GapScanProgress;
  /** Grows while the scan runs, so the list fills in rather than appearing at the end. */
  samples: readonly GapSample[];
  error: string | null;
  /** The person pressed Stop. Whatever had been read is kept and shown. */
  stopped: boolean;
  /** The sweep stopped at MAX_CONTACTS rather than at the end of the list. */
  reachedContactCap: boolean;
  /** More conversations were flagged than MAX_CONVERSATIONS allowed reading. */
  reachedConversationCap: boolean;
  finishedAt: number | null;
}

export interface GapScan {
  state: GapScanState;
  /** Run a sweep. Safe to call again - it replaces the previous result. */
  start: () => void;
  /** Stop where it is, keeping what has been read. */
  cancel: () => void;
}

const IDLE: GapScanState = {
  phase: 'idle',
  progress: { pages: 0, swept: 0, flagged: 0, read: 0 },
  samples: [],
  error: null,
  stopped: false,
  reachedContactCap: false,
  reachedConversationCap: false,
  finishedAt: null,
};

/**
 * Module-level, keyed by bot, and deliberately not a context.
 *
 * The alternative was hoisting a provider into `KnowledgeBaseApp` for one
 * page's cache, which every other source would then pay for. This is the
 * narrower change: it survives the unmount that switching rail rows causes,
 * which is the only thing it has to do. It is not persisted, so a reload is
 * a fresh sweep - which is correct, the data is a day old by then anyway.
 */
const CACHE = new Map<string, GapScanState>();

/** Read one conversation and reduce it to the question that preceded the hand-off. */
async function readConversation(client: ModuleClient, botId: string, contact: GapContact): Promise<GapSample | null> {
  /* `conversationID` IS the contact id - a server-side alias, not a bug. The
   * conversation node carries the same id and the platform, so it is preferred
   * when present and the contact id is the fallback. */
  const conversationId = contact.conversation?.id ?? contact.id;
  const data = await client.query(KbGapConversationDocument, {
    botID: botId,
    conversationID: conversationId,
    first: MESSAGES_PER_CONVERSATION,
  });
  /* Typed non-null by the schema; a deleted conversation answers null. */
  const messages = data.bot.conversation?.messages.edges.map((edge) => edge.node) ?? [];
  const found = findHandoffQuestion(messages);
  if (!found) return null;

  const fallbackTime = Date.parse(contact.lastConversationMessageTime ?? contact.updatedAt);
  return {
    contactId: contact.id,
    contactName: contact.name,
    platform: contact.conversation?.platform ?? '',
    question: found.question,
    handoff: found.handoff,
    /* A message whose `sentTime` would not parse still belongs on the report;
     * the chat row's own timestamp is close enough to sort and date it. */
    askedAt: found.askedAt !== 0 ? found.askedAt : Number.isFinite(fallbackTime) ? fallbackTime : 0,
    handoffAt: found.handoffAt,
    answeredByHuman: found.answeredByHuman,
  };
}

export function useGapScan(): GapScan {
  const { client, botId } = useKnowledgeBase();
  const [state, setState] = useState<GapScanState>(() => CACHE.get(botId) ?? IDLE);

  /* Bumped to cancel. Every await checkpoint compares against the id it
   * started under, so a stopped sweep stops writing state instead of racing
   * the next one. */
  const runRef = useRef(0);

  useEffect(() => {
    setState(CACHE.get(botId) ?? IDLE);
    /* Also the unmount path: a sweep still in flight when the rail moves to
     * another source must not call setState afterwards. */
    return () => {
      runRef.current += 1;
    };
  }, [botId]);

  useEffect(() => {
    if (state.phase === 'done' || state.phase === 'error') CACHE.set(botId, state);
  }, [botId, state]);

  const cancel = useCallback(() => {
    runRef.current += 1;
    setState((current) =>
      current.phase === 'scanning' ? { ...current, phase: 'done', stopped: true, finishedAt: Date.now() } : current,
    );
  }, []);

  const start = useCallback(() => {
    const run = ++runRef.current;
    const alive = () => runRef.current === run;
    const throttle = createThrottle(SCAN_THROTTLE);
    /* Every request in the sweep goes through the same token bucket, the chat
     * list included - the pages are cheap but they are not free. */
    const executor = {
      query: <TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars) =>
        throttle(() => client.query(doc, variables)),
    };

    setState({ ...IDLE, phase: 'scanning' });

    void (async () => {
      const progress: GapScanProgress = { pages: 0, swept: 0, flagged: 0, read: 0 };
      const flagged: GapContact[] = [];
      let reachedContactCap = false;

      try {
        for await (const contacts of paginate(
          executor,
          KbGapChatsDocument,
          { botID: botId, first: CHATS_PER_PAGE, assigneeFilter: { type: ContactAssigneeFilterType.Any } },
          (data) => data.bot.contactChatsConnection,
        )) {
          if (!alive()) return;
          progress.pages += 1;
          progress.swept += contacts.length;
          for (const contact of contacts) if (isFlagged(contact)) flagged.push(contact);
          progress.flagged = flagged.length;
          setState((current) => ({ ...current, progress: { ...progress } }));
          if (progress.pages >= MAX_PAGES) {
            reachedContactCap = true;
            break;
          }
        }
      } catch (error: unknown) {
        if (alive())
          setState((current) => ({ ...current, phase: 'error', error: messageFor(error), finishedAt: Date.now() }));
        return;
      }

      const targets = flagged.slice(0, MAX_CONVERSATIONS);
      const reachedConversationCap = flagged.length > MAX_CONVERSATIONS;
      const samples: GapSample[] = [];

      /* Batched rather than one big Promise.all: the throttle would happily
       * queue fifty tasks, but then Stop could not stop them and progress
       * would arrive in one lump at the end. */
      for (let at = 0; at < targets.length; at += SCAN_CONCURRENCY) {
        if (!alive()) return;
        const batch = targets.slice(at, at + SCAN_CONCURRENCY);
        const read = await Promise.all(
          /* One unreadable conversation is not a failed report. */
          batch.map((contact) => throttle(() => readConversation(client, botId, contact)).catch(() => null)),
        );
        if (!alive()) return;
        progress.read += batch.length;
        for (const sample of read) if (sample) samples.push(sample);
        setState((current) => ({ ...current, progress: { ...progress }, samples: [...samples] }));
      }

      if (!alive()) return;
      setState((current) => ({
        ...current,
        phase: 'done',
        progress: { ...progress },
        samples,
        reachedContactCap,
        reachedConversationCap,
        finishedAt: Date.now(),
      }));
    })();
  }, [client, botId]);

  return { state, start, cancel };
}
