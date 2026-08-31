import type { NewPost, QueuedPost } from '../../types';
import type { QueueBackend } from './types';

/**
 * The queue on the deployment's own database, reached through the proxy.
 *
 * The browser never talks to that database. It calls routes the proxy serves,
 * the proxy checks the caller's session against the same gate every other
 * request goes through, and only then does it read or write. So this file has no
 * credentials in it, no table names, and no knowledge of what is behind the
 * route — which is also what lets the same three methods work in a deployment
 * that keeps its posts somewhere else entirely.
 *
 * This is the backend that can schedule: something runs beside that database on
 * a timer, and it is what makes a post go out while nobody is looking.
 */

/** Mounted by the proxy under its own prefix; `proxyFetch` supplies the prefix. */
const ROOT = '/publishing';

const CONFIG_PATH = `${ROOT}/config`;

export type ProxyFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** What `GET /publishing/config` answers when the routes are mounted. */
export interface QueueConfig {
  /** False until somebody has registered where this deployment answers. */
  scheduling: boolean;
}

async function json<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    /* The routes answer the same envelope the rest of the proxy does, so the
       platform's own words survive as far as the screen. */
    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const body = JSON.parse(text) as { errors?: Array<{ message?: string }> };
      message = body.errors?.[0]?.message ?? message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

/**
 * Ask whether this deployment has the routes at all.
 *
 * The answer is "yes" only for a response that IS the config. Not "anything but
 * a 404" — a host that does not serve these routes does not reliably say 404.
 * A single-page app is served by a catch-all, so an address the proxy never
 * claimed comes back as the app's own HTML with a 200 on it; that is what a dev
 * server does, and what any host whose rewrite order puts the fallback first
 * would do. Parsing that as an envelope throws, and a deployment that simply
 * has no database would then show an error instead of quietly working without
 * one.
 *
 * So: not mounted is not a fault, however it is spelled. What IS a fault is a
 * route that answers and answers badly — a 500, a refusal — because falling
 * back silently from a broken server would hide a schedule that never fires
 * behind a list of drafts that look fine.
 */
export async function probeQueueRoutes(proxyFetch: ProxyFetch): Promise<QueueConfig | null> {
  let response: Response;
  try {
    response = await proxyFetch(CONFIG_PATH, { method: 'GET' });
  } catch {
    return null;
  }
  if (response.status === 404) return null;
  const text = await response.text();
  if (!response.ok) throw new Error(errorMessageIn(text, response));
  return readConfig(text);
}

/**
 * The body as a config, or null when it is not one.
 *
 * `scheduling` has to actually be there and actually be a boolean: an app's own
 * HTML, an empty body and a JSON document that means something else all arrive
 * the same way here, and all of them mean the routes are not there.
 */
export function readConfig(text: string): QueueConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const scheduling = (parsed as { scheduling?: unknown }).scheduling;
  return typeof scheduling === 'boolean' ? { scheduling } : null;
}

/** The platform's own words out of an error body, or the status line. */
function errorMessageIn(text: string, response: Response): string {
  try {
    const body = JSON.parse(text) as { errors?: Array<{ message?: string }> };
    if (body.errors?.[0]?.message) return body.errors[0].message;
  } catch {
    /* not an envelope; the status line says more than a page of HTML would */
  }
  return `${response.status} ${response.statusText}`.trim();
}

export function createProxyBackend(proxyFetch: ProxyFetch, botId: string, scheduling: boolean): QueueBackend {
  const url = (path = ''): string => `${ROOT}/posts${path}?botID=${encodeURIComponent(botId)}`;
  const body = (value: unknown): RequestInit => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });

  return {
    kind: 'proxy',
    canSchedule: scheduling,

    async list() {
      const data = await json<{ posts: QueuedPost[] }>(await proxyFetch(url(), { method: 'GET' }));
      return data.posts;
    },

    async create(post: NewPost) {
      const data = await json<{ post: QueuedPost }>(await proxyFetch(url(), { method: 'POST', ...body(post) }));
      return data.post;
    },

    async update(id, patch) {
      const data = await json<{ post: QueuedPost }>(
        await proxyFetch(url(`/${encodeURIComponent(id)}`), { method: 'PATCH', ...body(patch) }),
      );
      return data.post;
    },

    async remove(id) {
      await json<unknown>(await proxyFetch(url(`/${encodeURIComponent(id)}`), { method: 'DELETE' }));
    },
  };
}
