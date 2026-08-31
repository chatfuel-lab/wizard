/**
 * The deployment fence: which Chatfuel bots may this deployment touch at all?
 *
 * The dashboard token sees a whole Chatfuel account, and the account is a tree —
 * workspaces, each holding bots. The app lets a person move between the
 * workspaces that account owns, so the answer to "may this request name that
 * bot?" is "is it a bot of one of those workspaces?", and that answer changes
 * without anybody redeploying: a bot created in the dashboard five minutes ago
 * belongs to the same account as the rest.
 *
 * So the set is asked for rather than configured: `currentUser { workspaces {
 * bots { id } } }` with the master token, cached for `ttlMs`. One refresh at a
 * time — a cold start behind a burst of requests must not become a burst of
 * identical queries upstream.
 *
 * Two failure modes, deliberately different:
 *
 * - nothing known yet and the query fails → `{ ok: false }`, and the caller
 *   refuses the request. Guessing here would mean forwarding a bot id nobody
 *   has vouched for.
 * - a previous answer exists and the refresh fails → that answer is served on,
 *   with a short retry window. An upstream blip must not lock out an app whose
 *   bots have not changed.
 *
 * This is orthogonal to the auth gate (gate.ts): the gate answers "which bots
 * does this SIGNED-IN PERSON own", and where it applies it wins. This file
 * answers the deployment-wide question that applies when there is no gate.
 *
 * fetch only — no `vite`, no `ws`: this file is vendored into scaffolded apps
 * together with core.ts / gate.ts / vite.ts / server.ts.
 */

export interface WorkspaceFenceOptions {
  /** Upstream origin, no trailing slash (e.g. https://panel.chatfuel.com). */
  upstream: string;
  /** The master Chatfuel token. Never logged. */
  token: string;
  /** How long an answer is trusted. Default 60 000. */
  ttlMs?: number;
  /** How long a stale answer is served for after a failed refresh. Default 5 000. */
  retryMs?: number;
  /** Upstream timeout. Default 10 000. */
  timeoutMs?: number;
  /** Test injection; defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Test injection; defaults to Date.now. */
  now?: () => number;
}

export type FenceResult = { ok: true; botIds: ReadonlySet<string> } | { ok: false };

export interface WorkspaceFence {
  /** The bot ids of every workspace this account owns; `{ ok: false }` when that is not knowable. */
  resolve(): Promise<FenceResult>;
  /** Forget the cached answer — the next resolve() asks again. */
  clear(): void;
}

export const FENCE_UNAVAILABLE_MESSAGE =
  'Chatfuel could not be asked which bots this deployment may use — try again shortly';

/** Also asked by the last-bot guard in botRoutes.ts, which reads ONE workspace out of the same answer. */
export const FENCE_QUERY = 'query CfWorkspaceBots { currentUser { id workspaces { id bots { id } } } }';

interface FencePayload {
  data?: { currentUser?: { workspaces?: Array<{ bots?: Array<{ id?: unknown }> }> } };
  errors?: unknown;
}

/**
 * The bot ids in a well-formed answer, or undefined for anything else — an
 * error envelope, a changed shape, a null `currentUser`. Undefined is not an
 * empty set: an account whose workspaces genuinely hold no bots answers with
 * `[]`, and every request then fails the fence, which is correct.
 */
export function botIdsInFenceAnswer(payload: unknown): ReadonlySet<string> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const { data, errors } = payload as FencePayload;
  if (errors !== undefined) return undefined;
  const workspaces = data?.currentUser?.workspaces;
  if (!Array.isArray(workspaces)) return undefined;
  const ids = new Set<string>();
  for (const workspace of workspaces) {
    const bots = workspace?.bots;
    if (!Array.isArray(bots)) return undefined;
    for (const bot of bots) {
      if (typeof bot?.id === 'string') ids.add(bot.id);
    }
  }
  return ids;
}

export function createWorkspaceFence(options: WorkspaceFenceOptions): WorkspaceFence {
  const url = `${options.upstream.replace(/\/+$/, '')}/graphql?op=CfWorkspaceBots`;
  const ttl = options.ttlMs ?? 60_000;
  const retryMs = options.retryMs ?? 5_000;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const body = JSON.stringify({ query: FENCE_QUERY, operationName: 'CfWorkspaceBots' });

  let snapshot: { botIds: ReadonlySet<string>; until: number } | undefined;
  let inFlight: Promise<ReadonlySet<string> | undefined> | undefined;

  async function ask(): Promise<ReadonlySet<string> | undefined> {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${options.token}` },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return undefined;
    }
    if (res.status !== 200) return undefined;
    try {
      return botIdsInFenceAnswer((await res.json()) as unknown);
    } catch {
      return undefined;
    }
  }

  async function resolve(): Promise<FenceResult> {
    const at = now();
    if (snapshot && snapshot.until > at) return { ok: true, botIds: snapshot.botIds };

    inFlight ??= ask().finally(() => {
      inFlight = undefined;
    });
    const fresh = await inFlight;

    const done = now();
    if (fresh) {
      snapshot = { botIds: fresh, until: done + ttl };
      return { ok: true, botIds: fresh };
    }
    if (snapshot) {
      snapshot = { botIds: snapshot.botIds, until: done + retryMs };
      return { ok: true, botIds: snapshot.botIds };
    }
    return { ok: false };
  }

  return {
    resolve,
    clear() {
      snapshot = undefined;
    },
  };
}
