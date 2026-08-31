import type { AttachmentKind } from '~ui';
import type { ConversationMessagesQuery } from '~api/generated/livechat/graphql';
import type { ConversationInfo, MessageNode } from '../types';
import { applyConversationPatch, type ConversationPatch } from './conversationPatch';
import type { TemplateContent } from './messagePayload';

/**
 * One open thread as a pure reducer.
 *
 * The rules a live thread has to hold used to live inside a hook, where a
 * node-only vitest cannot reach them. They are not obvious rules, and every one
 * of them was already being broken:
 *
 * - Messages merge by `clientId`. `Message.id` is nullable, so it is not a key
 *   at all, and the subscription echo of a message routinely arrives BEFORE the
 *   mutation that created it responds. Which of two records for one clientId is
 *   the truth is decided by `updatedAt`, never by arrival order.
 * - A response MERGES into what is on screen instead of replacing it. The old
 *   code built a fresh map from the page, so any message that arrived between
 *   the query going out and its response landing was thrown away — including
 *   the reply the operator had just sent.
 * - Every request-shaped action carries the `epoch` it was issued under. An
 *   older-messages page that resolves after the operator has switched
 *   conversations used to be merged into whatever thread was open by then.
 * - An optimistic send holds no server record at all. Inventing one meant
 *   inventing a `__typename`, and the invented one began with `System`, which
 *   is exactly the prefix MessageView drops — so a sent message stayed
 *   invisible until the server echoed it back.
 *
 * The reducer never reads the clock: `now` arrives in the action.
 */

/**
 * What an optimistic attachment row shows.
 *
 * Deliberately not the staged file: the tray's entry carries an upload id, a
 * progress number and a failure, none of which mean anything once the file is
 * up and the message is on its way. This is the part that survives — a name and
 * a thumbnail, so the bubble is not an empty rectangle for the second or two
 * before the server echoes the real message back.
 */
export interface PendingAttachment {
  kind: AttachmentKind;
  name: string;
  /** The object URL from the picker, or null. */
  previewUrl: string | null;
}

/**
 * What an optimistic WhatsApp template row shows.
 *
 * The echo is a `WhatsAppOutTemplateMessage` carrying the rendered header,
 * body, footer and buttons — and NO template name; the wire does not have
 * one. So the row is built to look like the echo will: the same
 * `TemplateContent` the thread reads off the echo, filled from the copy the
 * operator just sent (see `templateContentOf` in `lib/templatePreview.ts`).
 * The name is kept for the merge key's story only; the bubble does not show
 * it in either state, because the echo cannot.
 */
export interface PendingTemplate {
  name: string;
  content: TemplateContent;
}

/** An outgoing message the server has not echoed yet. */
export interface PendingSend {
  /** What was typed. Rendered until the echo replaces it. Empty for a file. */
  text: string;
  /** Local clock at send time — the sort key until the server supplies one. */
  sentTime: string;
  /** The mutation rejected: no echo is coming, and the bubble says so. */
  failed: boolean;
  /** Why, in the operator's words — see `sendFailureText`. Set with `failed`. */
  failure?: string;
  /** Set when this message is a file rather than text. */
  attachment?: PendingAttachment;
  /** Set when this message is a WhatsApp template rather than text. */
  template?: PendingTemplate;
}

/** One row of the thread, as the components consume it. */
export interface MessageEntry {
  /** The merge key. `Message.id` is nullable and unusable as one. */
  clientId: string;
  /** Ascending sort key: the server's time, or the local one while pending. */
  sentTime: string;
  /** The server record, or null while this is only an optimistic local send. */
  node: MessageNode | null;
  /** Set only while `node` is null. */
  localText?: string;
  /** Set only while `node` is null. */
  failed?: boolean;
  /** Set only while `node` is null and `failed`: the sentence under the row. */
  failure?: string;
  /** Set only while `node` is null, and only for an attachment. */
  attachment?: PendingAttachment;
  /** Set only while `node` is null, and only for a template. */
  template?: PendingTemplate;
}

export interface ThreadState {
  conversationId: string | null;
  conversation: ConversationInfo | null;
  /** clientId → the server record. The ONE place a message exists. */
  byClientId: Record<string, MessageNode>;
  /** clientId → an optimistic send. Cleared by the echo, not by the response. */
  pending: Record<string, PendingSend>;
  /** clientIds, ascending — oldest at the top, composer at the bottom. */
  order: string[];
  /** Cursor of the OLDEST loaded message: `after` walks backwards into history. */
  olderCursor: string | null;
  hasOlder: boolean;
  /** A history page is in flight; the button must not fire again. */
  loadingOlder: boolean;
  /** Epoch ms the typing indicator runs until, or null. */
  typingUntil: number | null;
  epoch: number;
  loading: boolean;
  error: string | null;
}

/** One `ConversationMessages` response, newest-first exactly as it arrives. */
export interface LoadedThreadPage {
  conversation: ConversationInfo | null;
  nodes: readonly MessageNode[];
  hasNext: boolean;
  endCursor: string | null;
}

/** A `ConversationMessages` response, shaped for `loaded` / `olderLoaded`. */
export const toPage = (data: ConversationMessagesQuery): LoadedThreadPage => {
  const conversation = data.bot?.conversation ?? null;
  const page = conversation?.messages;
  return {
    conversation,
    nodes: (page?.edges ?? []).map((edge) => edge.node),
    hasNext: page?.pageInfo.hasNextPage ?? false,
    endCursor: page?.pageInfo.endCursor ?? null,
  };
};

export type ThreadAction =
  | { type: 'opened'; conversationId: string | null }
  | { type: 'refetch' }
  | { type: 'loaded'; epoch: number; page: LoadedThreadPage }
  | { type: 'olderRequested'; epoch: number }
  | { type: 'olderLoaded'; epoch: number; page: LoadedThreadPage }
  | { type: 'olderFailed'; epoch: number }
  | { type: 'live'; node: MessageNode; now: number }
  | {
      type: 'sendStarted';
      clientId: string;
      text: string;
      sentTime: string;
      attachment?: PendingAttachment;
      template?: PendingTemplate;
    }
  | { type: 'sendFailed'; clientId: string; failure?: string }
  | { type: 'conversationChanged'; patch: ConversationPatch }
  | { type: 'typingExpired' }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'liveFailed'; message: string };

export function initialThreadState(conversationId: string | null): ThreadState {
  return {
    conversationId,
    conversation: null,
    byClientId: {},
    pending: {},
    order: [],
    olderCursor: null,
    hasOlder: false,
    loadingOlder: false,
    typingUntil: null,
    epoch: 0,
    loading: conversationId !== null,
    error: null,
  };
}

export function isTypingMessage(
  node: MessageNode,
): node is MessageNode & { __typename: 'SystemTypingMessage'; until: string } {
  return node.__typename === 'SystemTypingMessage';
}

/**
 * Two records for one clientId: which one is the truth?
 *
 * `updatedAt` decides. `messageUpdated` carries delivery-status and error
 * transitions, and the echo of a send can beat the send's own response, so
 * neither arrival order nor the presence of an id says anything about age.
 *
 * The tie-breaks exist so that merging is order-independent: folding a batch
 * left-to-right and right-to-left must land on the same record, or two clients
 * watching the same conversation disagree about it. At the same instant a
 * record the server has issued an id for wins, and past that the id itself
 * decides — arbitrary, but total, which is the whole requirement.
 */
export function fresher(a: MessageNode, b: MessageNode): MessageNode {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  const aId = a.id ?? '';
  const bId = b.id ?? '';
  if (aId !== bId) return aId > bId ? a : b;
  return a;
}

/**
 * Rebuild the render order from the two maps.
 *
 * Ascending by `sentTime`, ties broken by `clientId`. The tie-break is not
 * decoration: the previous comparator answered "after" for equal times, which
 * makes it inconsistent, and V8 duly swapped equal-timestamped messages on
 * every re-sort — so a bulk-sent pair changed places every time any event
 * touched the thread.
 *
 * A full rebuild per action is O(n log n) on a few hundred messages, which is
 * nothing, and it is obviously correct — which for a merge rule that has never
 * had a test is worth more than the constant factor.
 */
function reorder(byClientId: Record<string, MessageNode>, pending: Record<string, PendingSend>): string[] {
  const keys = new Map<string, string>();
  for (const [clientId, node] of Object.entries(byClientId)) {
    keys.set(clientId, `${node.sentTime}\u0000${clientId}`);
  }
  for (const [clientId, send] of Object.entries(pending)) {
    if (!keys.has(clientId)) keys.set(clientId, `${send.sentTime}\u0000${clientId}`);
  }
  return [...keys.keys()].sort((a, b) => {
    const ka = keys.get(a)!;
    const kb = keys.get(b)!;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/**
 * Merge server records in. Typing messages never enter the map — they are a
 * transient hint, not a row. An echo retires the optimistic copy it answers.
 */
function mergeNodes(state: ThreadState, nodes: readonly MessageNode[]): ThreadState {
  const byClientId = { ...state.byClientId };
  const pending = { ...state.pending };
  let changed = false;
  for (const node of nodes) {
    if (isTypingMessage(node)) continue;
    const existing = byClientId[node.clientId];
    const winner = existing ? fresher(existing, node) : node;
    if (pending[node.clientId]) {
      delete pending[node.clientId];
      changed = true;
    }
    if (winner === existing) continue;
    byClientId[node.clientId] = winner;
    changed = true;
  }
  if (!changed) return state;
  return { ...state, byClientId, pending, order: reorder(byClientId, pending) };
}

export function threadReducer(state: ThreadState, action: ThreadAction): ThreadState {
  switch (action.type) {
    /* A different conversation — or none. Nothing survives, and the epoch bump
     * is what makes the previous thread's in-flight responses inert. */
    case 'opened':
      if (action.conversationId === state.conversationId) return state;
      return { ...initialThreadState(action.conversationId), epoch: state.epoch + 1 };

    /* Same conversation, asked again: a reconnect, a take-over, or a page
     * request that came back stale. The messages stay on screen — the response
     * merges into them, so history the operator already paged in is not thrown
     * away and the view does not jump. */
    case 'refetch':
      return {
        ...state,
        loadingOlder: false,
        epoch: state.epoch + 1,
        loading: state.conversationId !== null,
        error: null,
      };

    /* Merges rather than replaces. A message that arrived while this very
     * request was in flight is not on the page it answers with. */
    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      const { page } = action;
      const merged = mergeNodes({ ...state, conversation: page.conversation }, page.nodes);
      return {
        ...merged,
        // Newest-first page: endCursor points at the OLDEST edge on it.
        olderCursor: page.endCursor,
        hasOlder: page.hasNext,
        loading: false,
        error: null,
      };
    }

    /* Marks the request in flight so the "load older" button cannot fire twice
     * for the same page. A no-op when there is nothing more to fetch. */
    case 'olderRequested': {
      if (action.epoch !== state.epoch) return state;
      if (state.loadingOlder || !state.hasOlder || !state.olderCursor) return state;
      return { ...state, loadingOlder: true };
    }

    case 'olderLoaded': {
      if (action.epoch !== state.epoch) return state;
      const { page } = action;
      const merged = mergeNodes(state, page.nodes);
      /* An empty page ends the walk whatever hasNextPage claims, and above all
       * does not adopt its cursor: a null endCursor would restart `after` at
       * the newest message and page the same history forever. */
      const empty = page.nodes.length === 0;
      return {
        ...merged,
        olderCursor: empty ? state.olderCursor : page.endCursor,
        hasOlder: empty ? false : page.hasNext,
        loadingOlder: false,
      };
    }

    case 'olderFailed':
      return action.epoch === state.epoch ? { ...state, loadingOlder: false } : state;

    case 'live': {
      /* A typing hint is transient state, not a message: it must never reach
       * the map, and one that has already expired is not a hint. */
      if (isTypingMessage(action.node)) {
        const until = Date.parse(action.node.until);
        if (!Number.isFinite(until) || until <= action.now) return state;
        const next = Math.max(state.typingUntil ?? 0, until);
        return next === state.typingUntil ? state : { ...state, typingUntil: next };
      }
      return mergeNodes(state, [action.node]);
    }

    /* The optimistic row. It deliberately carries no node: nothing about the
     * server's copy is known yet, and the previous invented one was dropped
     * unrendered by MessageView's System* rule. */
    case 'sendStarted': {
      const send: PendingSend = { text: action.text, sentTime: action.sentTime, failed: false };
      if (action.attachment) send.attachment = action.attachment;
      if (action.template) send.template = action.template;
      const pending = { ...state.pending, [action.clientId]: send };
      return { ...state, pending, order: reorder(state.byClientId, pending) };
    }

    /* Only while the send is still only local. Once the echo has landed the
     * message exists on the server whatever the mutation's own answer was. */
    case 'sendFailed': {
      const send = state.pending[action.clientId];
      if (!send || state.byClientId[action.clientId]) return state;
      const failed: PendingSend = { ...send, failed: true };
      if (action.failure) failed.failure = action.failure;
      return { ...state, pending: { ...state.pending, [action.clientId]: failed } };
    }

    /* A lifecycle answer for the open conversation. Not epoch-gated: the
     * mutation was issued against this conversation by id, and the patch
     * carries that id, so a switch already makes it inert — `conversation` is
     * null or belongs to someone else, and `applyConversationPatch` refuses
     * both. The `updatedAt` rule inside it is what makes a late answer safe. */
    case 'conversationChanged': {
      if (!state.conversation) return state;
      const conversation = applyConversationPatch(state.conversation, action.patch);
      return conversation === state.conversation ? state : { ...state, conversation };
    }

    case 'typingExpired':
      return state.typingUntil === null ? state : { ...state, typingUntil: null };

    case 'failed':
      return action.epoch === state.epoch ? { ...state, loading: false, error: action.message } : state;

    /* The live channel dropping is not a load failure: whatever is on screen is
     * still true, so `loading` is left alone and the pane keeps rendering it. */
    case 'liveFailed':
      return { ...state, error: action.message };
  }
}

/** The thread the components render, oldest first. */
export function selectEntries(state: ThreadState): MessageEntry[] {
  const entries: MessageEntry[] = [];
  for (const clientId of state.order) {
    const node = state.byClientId[clientId];
    if (node) {
      entries.push({ clientId, sentTime: node.sentTime, node });
      continue;
    }
    const send = state.pending[clientId];
    if (send) {
      const entry: MessageEntry = {
        clientId,
        sentTime: send.sentTime,
        node: null,
        localText: send.text,
        failed: send.failed,
      };
      if (send.failure) entry.failure = send.failure;
      if (send.attachment) entry.attachment = send.attachment;
      if (send.template) entry.template = send.template;
      entries.push(entry);
    }
  }
  return entries;
}

export function selectTyping(state: ThreadState, now: number): boolean {
  return state.typingUntil !== null && state.typingUntil > now;
}

/**
 * The `before` argument for MarkConversationRead: the newest message that has
 * an id, or null when there is nothing to mark.
 *
 * Derived rather than stored because the old stored copy was written once, by
 * the first page load, and never again — so every message that arrived while
 * the thread was open left the conversation unread.
 *
 * `canEdit` is Live chat: Edit, and it is required rather than defaulted:
 * marking read is the one write nobody asks for — it fires from an effect the
 * moment a thread is opened — so a reader with view-only rights would clear the
 * badge for the whole team. A caller that has not decided cannot compile.
 */
export function selectMarkReadTarget(state: ThreadState, canEdit: boolean): string | null {
  if (!canEdit) return null;
  for (let i = state.order.length - 1; i >= 0; i -= 1) {
    const node = state.byClientId[state.order[i]!];
    if (node?.id) return node.id;
  }
  return null;
}
