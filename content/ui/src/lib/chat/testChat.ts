/**
 * The test chat, as pure functions.
 *
 * A "test chat" is a preview conversation: a real conversation on a synthetic
 * contact that the production pipeline answers, opened beside the thing being
 * built — one flow in the flow builder, one automation in Automations. Both
 * surfaces used to carry their own copy of everything below, because a module
 * may not import another module's files; this file is the copy they share.
 *
 * What lives here is everything that is a DECISION rather than a request: how
 * a wire message becomes a row (the host maps its own typenames — the GraphQL
 * fragment differs per surface — but the row it produces is this one), how rows
 * merge, what a restart hides, and the session state machine. The hook is a
 * thin shell over it; the DOM is thinner still.
 *
 * In practice, the
 * subscription takes 1-3 s to become active, a session's echo may arrive with a
 * null `id`, there is no teardown — a restart is a new start plus a client-side
 * watermark — and the typing hint is a message with an expiry rather than a
 * flag.
 */
import type { MessageAction } from '../../chat/MessageActions';

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------

export type TestChatRowKind = 'in' | 'out' | 'typing' | 'system';
export type TestChatSystemKind = 'summary' | 'handoff' | 'other';

/**
 * A button or list row under a bubble.
 *
 * `click` is opaque to `~ui`: the host tags each action with whichever of its
 * own click mutations the press maps to, and gets the tag back on
 * `onAction`. An action with no `click` and no `href`/`phone` is a record of
 * what the contact was offered rather than something to press — a message whose
 * wire `id` is null cannot be clicked at all, because a click is addressed by
 * that id plus the title.
 */
export interface TestChatAction extends MessageAction {
  click?: string;
}

export interface TestChatMedia {
  kind: 'image' | 'video' | 'audio' | 'document';
  url: string;
  /** A document's filename; the alt text of an image. */
  name?: string;
}

/**
 * One message, as the thread needs it.
 *
 * Deliberately neutral: no platform, no `__typename`, no generated types. A
 * host maps its own wire union into this and gets every renderer, every merge
 * rule and every state transition for free.
 */
export interface TestChatRow {
  /** The wire id — may be null on a mutation result, and a click needs it. */
  id: string | null;
  /** `clientId ?? id ?? synthetic` — the identity a message keeps across the echo, the event and a reload. */
  key: string;
  kind: TestChatRowKind;
  /** The body: the text of a text message, the summary of a summary, "" otherwise. */
  text: string;
  /** A structured message's header line (WhatsApp buttons / list / template). */
  header?: string;
  /** Its footer line. */
  footer?: string;
  /** An attachment, or a template's media header. */
  media?: TestChatMedia;
  /** Buttons and list rows, rendered UNDER the bubble. */
  actions?: TestChatAction[];
  sentTime: string;
  /** `sentTime` as epoch ms — what the list sorts and groups by. */
  at: number;
  updatedAt: string;
  /** "You (test)" for the contact, the bot's sender name for the other side. */
  senderLabel: string;
  /** True for the bot's messages, false for the tester's. */
  fromBot: boolean;
  systemKind?: TestChatSystemKind;
  /** Typing hint: shown while this instant is in the future. */
  until?: string;
  /** A typename the fragment selects nothing for — rendered as a muted line, never a throw. */
  supported: boolean;
  /** An optimistic row waiting for its echo. */
  pending?: boolean;
  /** Why the send failed — the row stays, marked. */
  failure?: string | null;
}

let anonymous = 0;

/** Epoch ms, or 0 for anything unparseable — callers treat 0 as "no time". */
export function parseTime(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** The label above the tester's own bubbles. */
export const TESTER_LABEL = 'You (test)';

/** A synthetic key for a message that arrived without a clientId or an id. */
export function anonymousKey(sentTime: string): string {
  return `anon-${sentTime}-${(anonymous += 1)}`;
}

/** The optimistic row a send inserts before the mutation resolves. */
export function optimisticRow(clientId: string, text: string, now = new Date()): TestChatRow {
  const iso = now.toISOString();
  return {
    id: null,
    key: clientId,
    kind: 'in',
    text,
    sentTime: iso,
    at: now.getTime(),
    updatedAt: iso,
    senderLabel: TESTER_LABEL,
    fromBot: false,
    supported: true,
    pending: true,
    failure: null,
  };
}

const byTimeThenInsertion = (a: TestChatRow, b: TestChatRow, ia: number, ib: number): number => a.at - b.at || ia - ib;

/**
 * Merge incoming rows into the thread.
 *
 * Identity is `key`; a row that arrives with the same wire `id` under another
 * key (an echo whose clientId the server dropped) is the same message too. A
 * pending row is replaced by whatever arrives for it; between two real records
 * the newer `updatedAt` wins. The typing hint is transient: one at a time, and
 * gone the moment a later message from the bot lands. Order is `sentTime`, then
 * insertion.
 */
export function mergeRows(rows: readonly TestChatRow[], incoming: readonly TestChatRow[]): TestChatRow[] {
  if (incoming.length === 0) return rows.slice();
  const out = rows.slice();
  const indexOfKey = new Map<string, number>();
  const indexOfId = new Map<string, number>();
  out.forEach((row, i) => {
    if (row.kind === 'typing') return; // a hint has no identity worth matching
    indexOfKey.set(row.key, i);
    if (row.id) indexOfId.set(row.id, i);
  });
  for (const row of incoming) {
    if (row.kind === 'typing') {
      // One hint at a time — the newest `until` wins.
      const at = out.findIndex((r) => r.kind === 'typing');
      if (at === -1) out.push(row);
      else if ((out[at]!.until ?? '') <= (row.until ?? '')) out[at] = row;
      continue;
    }
    const existing = indexOfKey.get(row.key) ?? (row.id ? indexOfId.get(row.id) : undefined);
    if (existing === undefined) {
      indexOfKey.set(row.key, out.length);
      if (row.id) indexOfId.set(row.id, out.length);
      out.push(row);
    } else {
      const current = out[existing]!;
      if (current.pending || current.failure || current.updatedAt <= row.updatedAt) {
        out[existing] = { ...row, key: current.key === row.key ? row.key : current.key };
      }
    }
    if (row.fromBot) {
      // A reply arrived: the hint that announced it is done.
      for (let i = out.length - 1; i >= 0; i -= 1) {
        const r = out[i]!;
        if (r.kind === 'typing' && r.at <= row.at) out.splice(i, 1);
      }
    }
  }
  return out
    .map((row, i) => [row, i] as const)
    .sort(([a, ia], [b, ib]) => byTimeThenInsertion(a, b, ia, ib))
    .map(([row]) => row);
}

/** Mark a pending row failed (it stays in the thread, with the reason under it). */
export function markFailed(rows: readonly TestChatRow[], key: string, failure: string): TestChatRow[] {
  return rows.map((row) => (row.key === key && row.pending ? { ...row, failure } : row));
}

/**
 * The typing hint, decided at render time: shown while `until` is ahead of
 * `now`. Returned separately from the messages so the list never keys a row on
 * something that disappears by itself.
 */
export function splitTyping(
  rows: readonly TestChatRow[],
  now: number,
): { messages: TestChatRow[]; typing: boolean; typingUntil: number | null } {
  let typingUntil: number | null = null;
  const messages: TestChatRow[] = [];
  for (const row of rows) {
    if (row.kind !== 'typing') {
      messages.push(row);
      continue;
    }
    const until = row.until ? parseTime(row.until) : 0;
    if (until > now) typingUntil = Math.max(typingUntil ?? 0, until);
  }
  return { messages, typing: typingUntil !== null, typingUntil };
}

/**
 * After the hand-off trio the bot is out of the conversation — an operator owns
 * it now — so nothing would answer another message.
 */
export function isHandedOff(rows: readonly TestChatRow[]): boolean {
  return rows.some((row) => row.systemKind === 'handoff');
}

// ---------------------------------------------------------------------------
// Restart watermark
// ---------------------------------------------------------------------------

/**
 * There is no stop/reset mutation and the preview contact keeps its history, so
 * a restart only moves this watermark: rows older than the new session's
 * `startedAt` are pre-restart noise and are dropped client-side. The skew
 * tolerance absorbs the session service and the message pipeline stamping times
 * on different clocks.
 */
export const RESTART_SKEW_MS = 2_000;

export function visibleAfter(rows: readonly TestChatRow[], sinceIso: string | null): TestChatRow[] {
  if (!sinceIso) return rows.slice();
  const since = parseTime(sinceIso);
  if (since === 0) return rows.slice();
  const cutoff = since - RESTART_SKEW_MS;
  return rows.filter((row) => row.pending || row.at === 0 || row.at >= cutoff);
}

// ---------------------------------------------------------------------------
// Session state machine
// ---------------------------------------------------------------------------

export type TestChatStatus = 'idle' | 'starting' | 'ready' | 'sending' | 'error';

/** What every start mutation answers with, whatever else it also carries. */
export interface TestChatSession {
  /** The conversation every read and every send is addressed by. */
  conversationID: string;
  /** The restart watermark. */
  startedAt: string;
}

export interface TestChatSessionState<S extends TestChatSession = TestChatSession> {
  status: TestChatStatus;
  session: S | null;
  /** The restart watermark = the current session's `startedAt`. */
  visibleSince: string | null;
  /** Bumped by every start and reset; a reply carrying an older one is ignored. */
  generation: number;
  error: string | null;
}

/**
 * `start` and `reset` CARRY the generation rather than incrementing it, so the
 * hook that issues the request knows the number it must attach to the answer
 * before the reducer has run — a `useReducer` dispatch is not synchronous
 * enough to read back.
 */
export type TestChatSessionAction<S extends TestChatSession = TestChatSession> =
  | { type: 'start'; generation: number }
  | { type: 'started'; generation: number; session: S }
  | { type: 'failed'; generation: number; message: string }
  | { type: 'sendStarted' }
  | { type: 'sendSettled' }
  | { type: 'reset'; generation: number };

export function initialSessionState<S extends TestChatSession = TestChatSession>(): TestChatSessionState<S> {
  return { status: 'idle', session: null, visibleSince: null, generation: 0, error: null };
}

/**
 * `idle → starting → ready ⇄ sending`, `starting → error`. A restart is a
 * `start` from any state: it moves the generation so a late `started` of the
 * previous attempt cannot adopt a session nobody asked for, and keeps the old
 * session on screen until the new one is minted (a blank thread for a second
 * reads as a crash). `reset` (the target changed) drops everything.
 */
export function sessionReducer<S extends TestChatSession>(
  state: TestChatSessionState<S>,
  action: TestChatSessionAction<S>,
): TestChatSessionState<S> {
  switch (action.type) {
    case 'start':
      return { ...state, status: 'starting', generation: action.generation, error: null };
    case 'started':
      if (action.generation !== state.generation) return state;
      return {
        ...state,
        status: 'ready',
        session: action.session,
        visibleSince: action.session.startedAt,
        error: null,
      };
    case 'failed':
      if (action.generation !== state.generation) return state;
      return { ...state, status: 'error', error: action.message };
    case 'sendStarted':
      return state.status === 'ready' ? { ...state, status: 'sending' } : state;
    case 'sendSettled':
      return state.status === 'sending' ? { ...state, status: 'ready' } : state;
    case 'reset':
      return { ...initialSessionState<S>(), generation: action.generation };
  }
}

/** The composer is open exactly when a session is minted and nothing is in flight. */
export function isReady(state: TestChatSessionState<TestChatSession>): boolean {
  return state.status === 'ready';
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** "14:07" — the local wall clock; a test session is a thing of the last few minutes. */
export function clockTime(iso: string): string {
  const ms = parseTime(iso);
  return ms === 0 ? '' : TIME.format(ms);
}
