import type { FlowT, InboundLink } from '../types';

/**
 * The last `FlowStructure` result, kept on the device so the next open paints
 * before the network answers.
 *
 * There are no flow-builder subscriptions, which is the whole reason this is
 * safe: nothing pushes at this module, so a flow shown from yesterday's copy is
 * exactly as fresh as the one shown a second before the user pressed Refresh —
 * and the store's epoch already guarantees that the real response replaces it
 * and cannot be replaced by it. The copy is a first paint, marked as such,
 * never a source of truth.
 *
 * ## Everything read back is untrusted
 *
 * The same rule `deals/lib/savedViews` states about the user storage item, for
 * the same reasons and one more: this payload is a whole flow, and the canvas
 * indexes into it — `block.blockElements.map`, `element.__typename` — on the
 * very first render, before any network response could paper over a mismatch.
 * A payload from an older build with a different shape does not degrade, it
 * white-screens, and it white-screens on every reload until someone clears
 * storage. So the key carries a version AND a fingerprint of the query text,
 * `parseSnapshot` refuses anything it cannot see the shape of, and every
 * failure is `null`, never a throw.
 *
 * ## The two halves of the key
 *
 * `SNAPSHOT_VERSION` is for this file — the envelope, what is stored beside
 * the flow. `shape` is for the flow itself: the caller passes a fingerprint of
 * the printed `FlowStructure` document, so a fragment gaining a field the card
 * reads changes the key without anyone remembering to bump anything. A
 * constant alone is a promise to remember; the fingerprint is what keeps it.
 */

/** Bump when what is stored BESIDE the flow changes. The flow's own shape is the fingerprint's job. */
export const SNAPSHOT_VERSION = 1;

/** Every key this module writes starts with this — it is what eviction sweeps. */
export const SNAPSHOT_PREFIX = 'chatfuel.flow-builder.snapshot.';

/**
 * Serialised characters, not bytes. localStorage is a shared origin budget of
 * roughly five megabytes and it is shared with the host page; a snapshot is a
 * cache and must not be the thing that fills it. A megabyte of JSON parses in
 * single-digit milliseconds, which is still a paint that beats any network, and
 * it leaves room for several flows and whatever the host keeps of its own.
 */
export const MAX_SNAPSHOT_CHARS = 1_000_000;

export interface FlowSnapshot {
  flow: FlowT;
  inboundLinks: readonly InboundLink[];
  /** Epoch ms. For the mark's tooltip; nothing decides on it. */
  savedAt: number;
}

export interface SnapshotScope {
  botId: string;
  flowId: string;
  /** Fingerprint of the query this snapshot answers — see `shapeFingerprint`. */
  shape: string;
}

/** The subset of `Storage` this file touches; a `Map`-backed fake satisfies it in tests. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * FNV-1a over the string, as eight hex digits. Not cryptographic and not
 * meant to be: two builds whose `FlowStructure` prints differently must get
 * different keys, and this is a cheap way to say so in a key that stays short.
 */
export function shapeFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function snapshotKey({ botId, flowId, shape }: SnapshotScope): string {
  return `${SNAPSHOT_PREFIX}v${SNAPSHOT_VERSION}.${shape}.${botId}.${flowId}`;
}

/** Null when the snapshot is over the cap — the caller then writes nothing. */
export function serializeSnapshot(snapshot: FlowSnapshot, cap: number = MAX_SNAPSHOT_CHARS): string | null {
  const text = JSON.stringify({
    v: SNAPSHOT_VERSION,
    savedAt: snapshot.savedAt,
    flow: snapshot.flow,
    inboundLinks: snapshot.inboundLinks,
  });
  return text.length > cap ? null : text;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Enough of the shape to survive the first render: what the canvas indexes into
 * before anything else has had a chance to. Deeper than this the fingerprint
 * vouches, and beyond the fingerprint the server will shortly overwrite.
 */
function looksLikeFlow(value: unknown): value is FlowT {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return false;
  if (!Array.isArray(value.blocks) || !Array.isArray(value.connections)) return false;
  for (const block of value.blocks) {
    if (!isRecord(block)) return false;
    if (typeof block.id !== 'string' || typeof block.__typename !== 'string') return false;
    if (typeof block.name !== 'string') return false;
    if (typeof block.positionX !== 'number' || typeof block.positionY !== 'number') return false;
    if (!Array.isArray(block.blockElements)) return false;
    for (const element of block.blockElements) {
      if (!isRecord(element)) return false;
      if (typeof element.id !== 'string' || typeof element.__typename !== 'string') return false;
    }
  }
  for (const connection of value.connections) {
    if (!isRecord(connection)) return false;
    if (typeof connection.__typename !== 'string') return false;
    if (typeof connection.sourceBlockID !== 'string' || typeof connection.targetBlockID !== 'string') {
      return false;
    }
  }
  return true;
}

/** Never throws. Corrupt, foreign, over-cap or wrong-version input is `null`. */
export function parseSnapshot(raw: string | null | undefined): FlowSnapshot | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_SNAPSHOT_CHARS) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== SNAPSHOT_VERSION) return null;
  if (!looksLikeFlow(parsed.flow)) return null;
  const inboundLinks = Array.isArray(parsed.inboundLinks) ? parsed.inboundLinks.filter(isRecord) : [];
  return {
    flow: parsed.flow,
    inboundLinks: inboundLinks as InboundLink[],
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
  };
}

/** Null storage — private mode, a locked-down embed — reads as no snapshot. */
export function readSnapshot(storage: StorageLike | null, scope: SnapshotScope): FlowSnapshot | null {
  if (!storage) return null;
  try {
    return parseSnapshot(storage.getItem(snapshotKey(scope)));
  } catch {
    return null;
  }
}

/**
 * Drop every snapshot this module has ever written, except `keep`.
 *
 * Old versions, old shapes, other flows: all of it is cache, and this runs when
 * the cache is what stands between a write and the quota. Keys are collected
 * before anything is removed, because `removeItem` renumbers `key(i)`.
 */
export function evictSnapshots(storage: StorageLike, keep?: string): number {
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key.startsWith(SNAPSHOT_PREFIX) && key !== keep) doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
  return doomed.length;
}

/**
 * Write, and if the origin is full, make room once and try again. `false`
 * means the flow was over the cap or storage refused twice; either way nothing
 * is thrown, because a cache that cannot be written is a cache that is not
 * there, and that is a state the reader already handles.
 */
export function writeSnapshot(storage: StorageLike | null, scope: SnapshotScope, snapshot: FlowSnapshot): boolean {
  if (!storage) return false;
  const text = serializeSnapshot(snapshot);
  if (text === null) return false;
  const key = snapshotKey(scope);
  try {
    storage.setItem(key, text);
    return true;
  } catch {
    /* Quota. Everything else this module wrote is fair game — it is all cache
       and this flow is the one being looked at. */
  }
  try {
    evictSnapshots(storage, key);
    storage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * The browser's storage, or null where there is none to be had. Reading
 * `localStorage` throws outright when cookies are blocked, and Safari's private
 * mode has offered a storage that refuses every write; both read as "no cache".
 */
export function browserStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}
