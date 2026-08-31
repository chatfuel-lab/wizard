/**
 * The resource fence: which bot does this flow / block / contact / task belong
 * to?
 *
 * The bot fence answers the only question Chatfuel's schema makes easy — most
 * operations name a bot, and a bot id is checked against the caller's set. The
 * rest name something INSIDE a bot: `flowID`, `blockElementID`,
 * `conversationID`, `contactID`. Upstream will not check those either, because
 * behind the master token every customer's bot is one account's, so an id
 * belonging to another tenant is accepted as readily as one's own. The ids are
 * unguessable (24 hex), which is a cost, not a boundary.
 *
 * What this module adds is memory. Every one of those ids reaches a browser
 * exactly once: inside an answer to a request the bot fence had already
 * checked. So the proxy watches its own traffic and writes down which bot each
 * id was handed out under; a later request naming an id known to belong to
 * somebody else is refused before it reaches the master token.
 *
 * Two modes, because the memory is not complete:
 *
 *  - `bound` — refuse an id known to belong to another bot, forward an id
 *    nothing is known about. This is the default with the gate on. It cannot
 *    turn a legitimate request away (an id it has never seen is forwarded
 *    exactly as it is today), and it closes the crossing an attacker needs:
 *    to use a foreign id they must have read it, and reading it is what taught
 *    this store whose it was.
 *  - `strict` — also refuse an id nothing is known about. On this process's
 *    memory alone that breaks a client holding ids from before a restart; with
 *    the shared store below it is the mode to run when refusing too much is
 *    cheaper than forwarding too much.
 *
 * Poisoning, and why it converges: an attacker who already knows a victim's id
 * could try to have it bound to their OWN bot, which would deny the victim
 * their own resource. Two things blunt it. An id the request itself carried is
 * never learned from that request's answer, so echoing one back teaches
 * nothing. And an id later seen under a second bot is marked SHARED rather
 * than re-owned — so the victim's own next read of their own resource undoes
 * the binding, and the fence settles on ids that only ever appeared under one
 * bot. The residual is a window, and its cost is a refusal — not a read of
 * somebody else's data, which is what the fence is here to stop.
 *
 * The memory is one process's, which is what `strict` above is apologising
 * for. A deployment that has a Supabase project can give it a floor: the shared
 * store in resourceStore.ts, consulted when this process holds no binding and
 * written — lazily, only for the ids a caller actually names — when it holds
 * one. With it, `bound` refuses across instances and across restarts, and
 * `strict` refuses an id the DEPLOYMENT has never handed out rather than one
 * this process has not. What `bound` forwards is what its own definition says
 * it forwards: an id no binding has been written down for. `strict` is the
 * setting for a deployment that would rather refuse that one.
 *
 * Pure but for that one collaborator, like queryAnalysis.ts: it holds a Map and
 * reads strings. Vendored into scaffolded apps with the rest of src/.
 */
import type { ResourceRef } from './queryAnalysis.js';
import type { ResourceStore } from './resourceStore.js';

export type ResourceFenceMode = 'off' | 'bound' | 'strict';

/**
 * How many bindings one instance holds. Each is a 24-character key and a small
 * record; 50 000 is a few megabytes and far more than one deployment's live
 * working set — a flow has tens of blocks, a session touches a handful of
 * flows.
 */
const MAX_BINDINGS = 50_000;

/**
 * How long a binding stands. Long, because it only ever loses the fence
 * knowledge: an expired binding is an id the store no longer refuses, which in
 * `bound` mode is exactly where it started.
 */
const BINDING_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How many ids are read out of one answer. A flow list is hundreds; a whole
 * canvas is thousands. The ceiling is here so a large answer cannot cost
 * unbounded work, and stopping early only means fewer bindings learned.
 */
const ANSWER_IDS_MAX = 5_000;

/**
 * A quoted 24-hex string, which is what every opaque Chatfuel id looks like in
 * a JSON answer or a socket frame. Matched over the raw text rather than over
 * a parsed body: the answer is already bytes on their way out, and a parse of
 * every response is a cost paid on the hot path for nothing this needs.
 */
const QUOTED_ID_RE = /"([0-9a-fA-F]{24})"/g;

/**
 * How long an id the shared store did not know stays "asked about recently".
 *
 * Without this note a `strict` client naming the same unknown id in every frame
 * asks Supabase for every frame. Short, because the answer changes the moment
 * any instance binds the id.
 */
const UNSEEN_TTL_MS = 60_000;

/**
 * …and how long it stays that way when the store did not answer at all. The
 * note is written either way, and this is why: without it the caller is asked
 * to wait for the same lookup again immediately, and on a socket that is a
 * frame queue that never drains. It is deliberately as short as the store's own
 * sleep after a failure.
 */
const UNSEEN_RETRY_MS = 5_000;

/** What a caller is told instead of having a foreign resource forwarded. */
export const resourceBlockedMessage = (argument: string): string =>
  `The ${argument} in this request belongs to another workspace`;

/** …and when the id is simply one this proxy has never handed out (`strict`). */
export const resourceUnknownMessage = (argument: string): string =>
  `This proxy cannot tell which bot that ${argument} belongs to, and does not forward what it cannot check`;

export interface ResourceRefusal {
  ref: ResourceRef;
  /** True when the id is known to be another bot's; false when it is unknown. */
  known: boolean;
}

export interface ResourceFence {
  readonly mode: Exclude<ResourceFenceMode, 'off'>;
  /**
   * The first resource this caller may not name, or undefined.
   *
   * `allowed` is the caller's bot fence — `undefined` means no fence applies at
   * all, and then neither does this one: there is nobody to be foreign to.
   */
  refuse(resources: readonly ResourceRef[], allowed: ReadonlySet<string> | undefined): ResourceRefusal | undefined;
  /**
   * Learn from an answer that was produced for exactly one bot. `request` is
   * the text the caller sent, and every id in it is skipped — an answer only
   * teaches this store about ids the caller did not already have.
   */
  learn(botId: string, answer: string, request: string): void;
  /**
   * True when the shared store may hold a binding this process does not — the
   * synchronous question a caller asks before deciding to await `hydrate`.
   * False without a store, and false once every id here has been asked about.
   */
  needsLookup(resources: readonly ResourceRef[]): boolean;
  /**
   * Fill this process's memory from the shared store, for the ids it holds
   * nothing about. A no-op without a store.
   *
   * Guarantees progress: every id it asked about is either bound or noted as
   * unknown when it resolves, however the lookup went — so `needsLookup` on the
   * same resources is false afterwards, and a caller that waits on this and
   * retries cannot loop.
   */
  hydrate(resources: readonly ResourceRef[]): Promise<void>;
  /** The bot an id is bound to, `null` when it is shared, undefined when unknown. */
  owner(id: string): string | null | undefined;
  readonly size: number;
  clear(): void;
}

/**
 * Cheap pre-check before a parse: is there anything in this text to learn from?
 * Most socket frames carry none — a ping, an ack, a completion — and the scan
 * is what keeps the parse off them.
 */
export function mayCarryResourceIds(text: string): boolean {
  QUOTED_ID_RE.lastIndex = 0;
  return QUOTED_ID_RE.test(text);
}

/** Every 24-hex id a JSON text quotes, lowercased, up to the ceiling. */
export function idsInText(text: string, into: Set<string>): void {
  QUOTED_ID_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = QUOTED_ID_RE.exec(text)) !== null) {
    into.add(match[1]!.toLowerCase());
    if (into.size >= ANSWER_IDS_MAX) return;
  }
}

export interface ResourceFenceOptions {
  mode: Exclude<ResourceFenceMode, 'off'>;
  maxBindings?: number;
  ttlMs?: number;
  /** Test injection; defaults to Date.now. */
  now?: () => number;
  /** The deployment-wide store this memory sits on, when there is one. */
  store?: ResourceStore;
}

export function createResourceFence(options: ResourceFenceOptions): ResourceFence {
  const now = options.now ?? Date.now;
  const max = options.maxBindings ?? MAX_BINDINGS;
  const ttl = options.ttlMs ?? BINDING_TTL_MS;

  const store = options.store;

  /** `botId: null` means the id was seen under more than one bot — shared. */
  type Binding = { botId: string | null; until: number };
  const bindings = new Map<string, Binding>();
  /**
   * Ids the shared store was asked about and did not know, with when the note
   * expires. Kept apart from `bindings` on purpose: this is the absence of a
   * binding, and the fence must go on treating it as one.
   */
  const unseen = new Map<string, number>();

  /**
   * Room for one more. Expired entries first; when a sweep frees nothing, the
   * oldest go — insertion order is age order, since a re-seen binding is
   * refreshed in place rather than reinserted.
   */
  const makeRoom = (at: number): void => {
    if (bindings.size < max) return;
    for (const [key, entry] of bindings) {
      if (entry.until <= at) bindings.delete(key);
    }
    for (const key of bindings.keys()) {
      if (bindings.size < max) break;
      bindings.delete(key);
    }
  };

  const read = (id: string, at: number): Binding | undefined => {
    const entry = bindings.get(id.toLowerCase());
    if (!entry) return undefined;
    if (entry.until <= at) {
      bindings.delete(id.toLowerCase());
      return undefined;
    }
    return entry;
  };

  /** An id worth asking the shared store about: unbound here, and not asked about lately. */
  const wanted = (id: string, at: number): boolean => {
    if (read(id, at)) return false;
    const until = unseen.get(id);
    if (until === undefined) return true;
    if (until > at) return false;
    unseen.delete(id);
    return true;
  };

  /**
   * Take the shared store's word for an id. The merge is `learn`'s, for the same
   * reason: two bots for one id is not a change of owner, it is a shared id, and
   * a shared id is never refused.
   */
  const adopt = (id: string, botId: string | null, at: number): void => {
    unseen.delete(id);
    const entry = bindings.get(id);
    if (!entry || entry.until <= at) {
      makeRoom(at);
      bindings.set(id, { botId, until: at + ttl });
      return;
    }
    if (entry.botId !== botId) entry.botId = null;
    entry.until = at + ttl;
  };

  return {
    mode: options.mode,

    refuse(resources, allowed) {
      if (!allowed || resources.length === 0) return undefined;
      const at = now();
      for (const ref of resources) {
        const entry = read(ref.id, at);
        if (!entry) {
          if (options.mode === 'strict') return { ref, known: false };
          continue;
        }
        // A shared id belongs to no one bot, so no bot is foreign to it.
        if (entry.botId !== null && !allowed.has(entry.botId)) return { ref, known: true };
        /* Named by a caller and allowed: THIS is the binding worth the write.
           Learning is free and happens for thousands of ids an answer carries;
           the shared store only ever needs the few a request actually names,
           and it needs the shared ones most of all — a null here is the
           correction that tells another instance to stop refusing. */
        store?.remember(entry.botId, ref.id.toLowerCase());
      }
      return undefined;
    },

    learn(botId, answer, request) {
      const found = new Set<string>();
      idsInText(answer, found);
      if (found.size === 0) return;
      const carried = new Set<string>();
      idsInText(request, carried);
      const at = now();
      const until = at + ttl;
      for (const id of found) {
        // The bot's own id travels in its answers; it is the bot fence's, and
        // binding it would refuse the very request that names it.
        if (id === botId.toLowerCase()) continue;
        // Whatever the shared store did not know a moment ago, this process
        // now does.
        unseen.delete(id);
        // Echoed back from the request: this answer is not evidence of whose
        // it is, only that the caller already had it.
        if (carried.has(id)) continue;
        const entry = bindings.get(id);
        if (!entry || entry.until <= at) {
          makeRoom(at);
          bindings.set(id, { botId, until });
          continue;
        }
        // Seen under a second bot: the id is shared rather than either one's,
        // and a shared id is never refused. This is what undoes a mistaken
        // binding — including one an attacker arranged.
        if (entry.botId !== null && entry.botId !== botId) entry.botId = null;
        entry.until = until;
      }
    },

    needsLookup(resources) {
      if (!store || resources.length === 0) return false;
      const at = now();
      return resources.some((ref) => wanted(ref.id.toLowerCase(), at));
    },

    async hydrate(resources) {
      if (!store || resources.length === 0) return;
      const at = now();
      const ask = [...new Set(resources.map((ref) => ref.id.toLowerCase()))].filter((id) => wanted(id, at));
      if (ask.length === 0) return;
      const answer = await store.lookup(ask);
      const done = now();
      /* Every id asked about gets an answer here, including when there was
         none: a note that expires with the store's own sleep. That is what
         makes this method's progress guarantee hold, and a caller that waits
         on it — the WebSocket relay holds a frame queue behind this — cannot
         be handed the same question forever. */
      const miss = done + (answer.ok ? UNSEEN_TTL_MS : UNSEEN_RETRY_MS);
      for (const id of ask) {
        const bound = answer.rows.get(id);
        if (bound === undefined) unseen.set(id, miss);
        else adopt(id, bound, done);
      }
    },

    owner(id) {
      return read(id, now())?.botId;
    },

    get size() {
      return bindings.size;
    },

    clear() {
      bindings.clear();
      unseen.clear();
    },
  };
}
