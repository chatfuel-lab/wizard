import type { ConvState, MessageNode } from '../types';
import { entryKey, isNoiseMessage } from './messages';

/**
 * Pure state machine for one open coworker thread — models the async
 * contract (guide.md): chunks buffer per messageID and can arrive BEFORE any
 * other mention of that id; CoworkerMessageAdded is authoritative and
 * OVERWRITES the buffer; your own sends reconcile by clientID.
 */

export interface ThreadEntry {
  node: MessageNode;
  pending?: boolean;
  failed?: boolean;
}

interface StreamBuffer {
  text: string;
  /** Arrival order — streams render after persisted messages, oldest first. */
  order: number;
}

export interface ThreadState {
  conversation: ConvState | null;
  /** Persisted + optimistic messages, keyed by clientID ?? id. */
  messages: ReadonlyMap<string, ThreadEntry>;
  /** Chunk buffers for messageIDs with no persisted message yet. */
  streams: ReadonlyMap<string, StreamBuffer>;
  /** messageIDs already delivered via added() — late chunks get ignored. */
  finalized: ReadonlySet<string>;
  /** Cursor of the OLDEST loaded message — `after` pages backwards. */
  olderCursor: string | null;
  hasOlder: boolean;
  nextStreamOrder: number;
}

export const EMPTY_THREAD: ThreadState = {
  conversation: null,
  messages: new Map(),
  streams: new Map(),
  finalized: new Set(),
  olderCursor: null,
  hasOlder: false,
  nextStreamOrder: 0,
};

/** A streaming delta. Creates the buffer if absent; ignored once finalized. */
export function applyChunk(state: ThreadState, messageID: string, chunk: string): ThreadState {
  if (state.finalized.has(messageID)) return state;
  const streams = new Map(state.streams);
  const existing = streams.get(messageID);
  streams.set(messageID, {
    text: (existing?.text ?? '') + chunk,
    order: existing?.order ?? state.nextStreamOrder,
  });
  return {
    ...state,
    streams,
    nextStreamOrder: existing ? state.nextStreamOrder : state.nextStreamOrder + 1,
  };
}

/**
 * A batch of deltas as one transition.
 *
 * A short answer arrives as hundreds of chunks, and one state update per
 * chunk is that many renders of a virtualized list. The hook accumulates
 * them and hands over what it has; this folds them in order and returns ONE
 * new state — or the same one, when the whole batch was for messages that have
 * already been finalized, so a late burst after `CoworkerMessageAdded` costs
 * no render at all.
 */
export function applyChunks(state: ThreadState, batch: readonly { messageID: string; chunk: string }[]): ThreadState {
  let next = state;
  for (const { messageID, chunk } of batch) next = applyChunk(next, messageID, chunk);
  return next;
}

/** The authoritative full message: drop the stream buffer, upsert the entry. */
export function applyAdded(state: ThreadState, message: MessageNode): ThreadState {
  const finalized = new Set(state.finalized);
  finalized.add(message.id);
  const streams = new Map(state.streams);
  streams.delete(message.id);
  const messages = new Map(state.messages);
  // A matching optimistic entry sits under the same clientID key and is
  // replaced in place (clearing pending); assistant messages key by id.
  messages.set(entryKey(message), { node: message });
  return { ...state, finalized, streams, messages };
}

export function applyConversation(state: ThreadState, conversation: ConvState): ThreadState {
  return { ...state, conversation };
}

/** Optimistic user entry for a send in flight. */
export function applyOptimistic(state: ThreadState, clientID: string, text: string, timeIso: string): ThreadState {
  const messages = new Map(state.messages);
  messages.set(clientID, {
    pending: true,
    node: {
      __typename: 'CoworkerMessage',
      id: `local-${clientID}`,
      clientID,
      role: 'user',
      content: text,
      clientActionType: null,
      time: timeIso,
      attachments: [],
      toolCalls: [],
    } as unknown as MessageNode,
  });
  return { ...state, messages };
}

export function applySendFailed(state: ThreadState, clientID: string): ThreadState {
  const entry = state.messages.get(clientID);
  if (!entry?.pending) return state;
  const messages = new Map(state.messages);
  messages.set(clientID, { ...entry, failed: true });
  return { ...state, messages };
}

/**
 * Put a failed send back in flight, in place.
 *
 * The retry re-uses the SAME clientID, which is the whole reason this is a
 * transition and not a fresh `applyOptimistic`: the server echoes `clientID`
 * back on `CoworkerMessageAdded`, so the row the operator is watching is the
 * row that resolves. A new id would leave the failed one on screen forever and
 * add a second copy beside it.
 */
export function applyRetry(state: ThreadState, clientID: string): ThreadState {
  const entry = state.messages.get(clientID);
  if (!entry?.failed) return state;
  const messages = new Map(state.messages);
  messages.set(clientID, { node: entry.node, pending: true });
  return { ...state, messages };
}

/**
 * Initial page of a freshly opened thread (nodes newest-first). Resets
 * everything and takes the cursor bookkeeping. hasNextPage is unreliable
 * after page 1 (guide.md) — callers page until fewer than `first` edges,
 * so hasOlder derives from the page size.
 */
export function applyInitial(
  state: ThreadState,
  conversation: ConvState | null,
  nodes: readonly MessageNode[],
  endCursor: string | null,
  pageSize: number,
): ThreadState {
  let next: ThreadState = {
    ...EMPTY_THREAD,
    conversation,
    olderCursor: endCursor,
    hasOlder: nodes.length >= pageSize,
  };
  for (const node of nodes) next = applyAdded(next, node);
  return next;
}

/**
 * Refetch merge (reconnect / stall guard): persisted nodes ARE final, so
 * they route through applyAdded — preserving optimistic pendings, older
 * pages already loaded, and any still-unfinalized stream buffers.
 */
export function applySnapshot(
  state: ThreadState,
  conversation: ConvState | null,
  nodes: readonly MessageNode[],
): ThreadState {
  let next: ThreadState = { ...state, conversation: conversation ?? state.conversation };
  for (const node of nodes) next = applyAdded(next, node);
  return next;
}

/** An older page (nodes newest-first within the page). */
export function applyOlderPage(
  state: ThreadState,
  nodes: readonly MessageNode[],
  endCursor: string | null,
  pageSize: number,
): ThreadState {
  let next: ThreadState = {
    ...state,
    olderCursor: endCursor ?? state.olderCursor,
    hasOlder: nodes.length >= pageSize,
  };
  for (const node of nodes) next = applyAdded(next, node);
  return next;
}

interface VisibleStream {
  messageID: string;
  text: string;
}

export interface VisibleThread {
  /** Ascending by time; noise (failed tools, rejections) filtered out. */
  entries: ThreadEntry[];
  /** In-progress streamed messages, after the persisted tail, oldest first. */
  streams: VisibleStream[];
}

export function visibleThread(state: ThreadState): VisibleThread {
  const entries = [...state.messages.values()]
    .filter((entry) => entry.pending || entry.failed || !isNoiseMessage(entry.node))
    .sort((a, b) => (a.node.time < b.node.time ? -1 : a.node.time > b.node.time ? 1 : 0));
  const streams = [...state.streams.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([messageID, buffer]) => ({ messageID, text: buffer.text }));
  return { entries, streams };
}

export function hasActiveStream(state: ThreadState): boolean {
  return state.streams.size > 0;
}
