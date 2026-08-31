/**
 * The Fuely record as a pure reducer.
 *
 * Three things this file exists to hold:
 *
 * 1. **The FAQ list has no ids on the wire.** `fuelyConfigSetFAQs` replaces the
 *    whole array and entries are identified by position, so selection, drag,
 *    inline editing and undo would all break on every save. The store mints a
 *    stable local key per entry and re-attaches the same keys to the next
 *    server list by content, so a save that changes one answer does not
 *    re-key — and therefore does not drop — the rest of the selection.
 * 2. **`epoch` lives in state, not in a ref**, so the stale-response guard is
 *    unit-testable: every load carries the epoch it was issued under and a
 *    response from an older epoch is dropped.
 * 3. **`full` is a server verdict, not a threshold.** The schema exposes no
 *    limit, so the only honest way to say "the knowledge base is full" is to
 *    have been told so by a failed write.
 *
 * The reducer never reads the clock or the network.
 */
import type { FaqEntry, FaqRow, KnowledgeBaseInfo, UsageInfo } from '../types';

export interface KnowledgeState {
  loading: boolean;
  /** A LOAD failure. Write failures are toasts, not this. */
  error: string | null;
  kb: KnowledgeBaseInfo | null;
  usage: UsageInfo | null;
  /** The server's FAQ list, each entry carrying a key stable across saves. */
  faqs: FaqRow[];
  /** Set by a write that came back with a limit error; cleared by a successful reload. */
  full: boolean;
  epoch: number;
  /** Bumped on every applied server response - views watch it to re-derive. */
  tick: number;
}

export type KnowledgeAction =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; kb: KnowledgeBaseInfo; usage: UsageInfo }
  | { type: 'failed'; epoch: number; error: string }
  | { type: 'unavailable'; epoch: number }
  | { type: 'kbPatched'; kb: Partial<KnowledgeBaseInfo>; usage?: UsageInfo }
  | { type: 'faqsReplaced'; faqs: readonly FaqEntry[]; usage?: UsageInfo }
  | { type: 'usagePatched'; usage: UsageInfo }
  | { type: 'limitHit' };

export const initialKnowledgeState: KnowledgeState = {
  loading: true,
  error: null,
  kb: null,
  usage: null,
  faqs: [],
  full: false,
  epoch: 0,
  tick: 0,
};

let keySeed = 0;
/** Module-local and monotonic; never persisted, never sent. */
export const mintFaqKey = (): string => `faq-${++keySeed}`;

/** Content identity: the pair, not the position. */
const faqIdentity = (faq: FaqEntry): string => `${faq.question}\u0000${faq.answer}`;

/**
 * Re-attach the previous keys to the next server list.
 *
 * Greedy by content: identical pairs keep their key in order, everything else
 * gets a fresh one. Two entries that are byte-identical are interchangeable by
 * definition, so matching them in order is enough - and it means the common
 * case (one answer edited, ten untouched) re-keys exactly one row.
 */
export function reconcileFaqKeys(previous: readonly FaqRow[], next: readonly FaqEntry[]): FaqRow[] {
  const pool = new Map<string, string[]>();
  for (const row of previous) {
    const identity = faqIdentity(row);
    const bucket = pool.get(identity);
    if (bucket) bucket.push(row.key);
    else pool.set(identity, [row.key]);
  }
  return next.map((entry) => {
    const bucket = pool.get(faqIdentity(entry));
    const key = bucket && bucket.length > 0 ? bucket.shift()! : mintFaqKey();
    return { ...entry, key };
  });
}

export function knowledgeReducer(state: KnowledgeState, action: KnowledgeAction): KnowledgeState {
  switch (action.type) {
    case 'reset':
      return { ...state, loading: true, error: null, epoch: state.epoch + 1 };

    case 'loaded':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        loading: false,
        error: null,
        kb: action.kb,
        usage: action.usage,
        faqs: reconcileFaqKeys(state.faqs, action.kb.faqs),
        /* A clean reload is the only thing that can take back "full": the
           person may have just deleted half the catalog. */
        full: false,
        tick: state.tick + 1,
      };

    case 'unavailable':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: null, kb: null, usage: null, faqs: [] };

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.error };

    case 'kbPatched': {
      if (!state.kb) return state;
      const kb = { ...state.kb, ...action.kb };
      return {
        ...state,
        kb,
        usage: action.usage ?? state.usage,
        faqs: action.kb.faqs ? reconcileFaqKeys(state.faqs, action.kb.faqs) : state.faqs,
        tick: state.tick + 1,
      };
    }

    case 'faqsReplaced': {
      if (!state.kb) return state;
      return {
        ...state,
        kb: { ...state.kb, faqs: [...action.faqs] },
        usage: action.usage ?? state.usage,
        faqs: reconcileFaqKeys(state.faqs, action.faqs),
        tick: state.tick + 1,
      };
    }

    case 'usagePatched':
      return { ...state, usage: action.usage, tick: state.tick + 1 };

    case 'limitHit':
      return state.full ? state : { ...state, full: true };
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** The very first load, before anything has ever arrived - what shows a skeleton. */
export const isInitialLoad = (state: KnowledgeState): boolean => state.loading && state.kb === null;

/** The bot has no Fuely configuration at all - a different screen from a load error. */
export const isUnavailable = (state: KnowledgeState): boolean =>
  !state.loading && state.kb === null && state.error === null;

export const faqCount = (state: KnowledgeState): number => state.faqs.length;

/** Strip the local keys - what goes on the wire. */
export const toFaqInput = (rows: readonly FaqRow[]): FaqEntry[] =>
  rows.map(({ question, answer }) => ({ question, answer }));

/** Did the server list move under a draft? Compared by content and order. */
export function faqsDiffer(a: readonly FaqEntry[], b: readonly FaqEntry[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((entry, index) => faqIdentity(entry) !== faqIdentity(b[index]!));
}
