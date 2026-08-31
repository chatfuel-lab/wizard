/**
 * The panel's whole conversation with the server.
 *
 * Everything rides `client.proxyFetch`, which is how a module reaches a proxy
 * route that is not GraphQL — where the proxy is mounted is the shell's
 * business and never a module's. Two things are added to every call:
 *
 *   * the `x-cf-admin` header, which the server insists on. With the session
 *     cookie being SameSite=Strict that is a second lock on the same door: a
 *     form posted from another site can carry a cookie but cannot set a header.
 *   * `credentials: 'same-origin'`, so the cookie actually rides along — the
 *     default is enough for a same-origin fetch, and stating it means an embed
 *     that rewrites this call does not lose the session by accident.
 *
 * Refusals arrive as the same envelope every other proxy route uses, so they
 * are unwrapped once, here, into an AdminError carrying the server's own
 * sentence.
 */
import type { ModuleClient } from '~api';
import { AdminError, UNREACHABLE_MESSAGE } from './adminErrors';
import type {
  AdminBotDetail,
  AdminHealth,
  AdminOverview,
  AdminTenant,
  AdminUnassignedBot,
  AdminWorkspaceDetail,
} from '../types';

/** What the boot probe can find. */
export type AdminSession =
  | 'unknown'
  | 'unlocked'
  | 'locked'
  /** No ADMIN_PASSWORD: the routes are not mounted and the host answers its own 404. */
  | 'absent'
  /** A password too short to run behind. */
  | 'misconfigured';

interface Envelope {
  errors?: { message?: unknown; extensions?: { code?: unknown } }[];
}

const refusalOf = (body: unknown, status: number): AdminError => {
  const first = (body as Envelope | null)?.errors?.[0];
  const message = typeof first?.message === 'string' && first.message ? first.message : UNREACHABLE_MESSAGE;
  const code = typeof first?.extensions?.code === 'string' ? first.extensions.code : 'AdminRequestFailed';
  return new AdminError(message, code, status);
};

/**
 * The same call, addressed from the proxy's root rather than from `/admin`.
 *
 * One route the panel needs is not an admin route: registering the publish
 * callback lives with the queue it configures. It takes the same admin cookie
 * and the same header - `requireAdmin` is the whole check on it - so the only
 * thing that differs is where it is mounted.
 */
async function callPath<T>(client: ModuleClient, path: string, init?: RequestInit): Promise<T> {
  if (!client.proxyFetch) {
    throw new AdminError('This app has no proxy to ask', 'AdminUnavailable', 0);
  }
  let response: Response;
  try {
    response = await client.proxyFetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'x-cf-admin': '1', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new AdminError(UNREACHABLE_MESSAGE, 'AdminUnavailable', 0);
  }

  /* A route that is not mounted is answered by the HOST, not by the proxy — so
     it is HTML, and reading it as an envelope would report "unexpected token"
     where the honest answer is "there is no panel here". */
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw refusalOf(body, response.status);
  return body as T;
}

const call = <T>(client: ModuleClient, path: string, init?: RequestInit): Promise<T> =>
  callPath(client, `/admin${path}`, init);

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

/** Where this browser stands, without asking anybody to type anything. */
export async function probeSession(client: ModuleClient): Promise<AdminSession> {
  try {
    await call<{ unlocked: boolean }>(client, '/session');
    return 'unlocked';
  } catch (err) {
    if (!(err instanceof AdminError)) return 'absent';
    if (err.status === 404 || err.status === 0) return 'absent';
    if (err.code === 'AdminMisconfigured') return 'misconfigured';
    return 'locked';
  }
}

export const unlock = (client: ModuleClient, password: string): Promise<{ unlocked: boolean }> =>
  call(client, '/session', { method: 'POST', body: JSON.stringify({ password }) });

export const lock = (client: ModuleClient): Promise<{ unlocked: boolean }> =>
  call(client, '/session', { method: 'DELETE' });

/* -------------------------------------------------------------------------- */
/* The account                                                                */
/* -------------------------------------------------------------------------- */

export const fetchOverview = (client: ModuleClient): Promise<AdminOverview> => call(client, '/overview');

export const fetchWorkspace = (client: ModuleClient, id: string): Promise<AdminWorkspaceDetail> =>
  call(client, `/workspaces/${encodeURIComponent(id)}`);

export const fetchBot = (client: ModuleClient, id: string): Promise<AdminBotDetail> =>
  call(client, `/bots/${encodeURIComponent(id)}`);

export const fetchHealth = (client: ModuleClient): Promise<AdminHealth> => call(client, '/health');

export const fetchTenants = (
  client: ModuleClient,
): Promise<{ tenants: AdminTenant[]; unassigned: AdminUnassignedBot[] }> => call(client, '/tenants');

/* -------------------------------------------------------------------------- */
/* Changing things                                                            */
/* -------------------------------------------------------------------------- */

export interface CreatedBot {
  id: string;
  title: string;
  workspaceId: string;
  slotId: string | null;
}

export const createBot = (
  client: ModuleClient,
  input: { workspaceId: string; name: string; tenantId?: string | null },
): Promise<CreatedBot> =>
  call(client, '/bots', {
    method: 'POST',
    body: JSON.stringify({ workspaceId: input.workspaceId, name: input.name, tenantId: input.tenantId ?? undefined }),
  });

export const renameBot = (client: ModuleClient, botId: string, name: string): Promise<{ id: string; title: string }> =>
  call(client, `/bots/${encodeURIComponent(botId)}`, { method: 'PATCH', body: JSON.stringify({ name }) });

/**
 * `force` is the second half of a two-step refusal, not a shortcut past it: the
 * server answers `WorkspaceGoesWithIt` the first time a last-bot delete is
 * asked for, and the panel only sends this once somebody has read that and
 * clicked again. The deployment's own workspace is refused either way.
 */
export const deleteBot = (
  client: ModuleClient,
  botId: string,
  force = false,
): Promise<{ id: string; workspaceId: string; workspaceDeleted: boolean }> =>
  call(client, `/bots/${encodeURIComponent(botId)}${force ? '?force=1' : ''}`, { method: 'DELETE' });

/**
 * Point the publish queue's timer at this deployment.
 *
 * Nothing here says WHERE: the address is `PUBLIC_URL` on the server and a body
 * field for it is refused, because registering records where a credential gets
 * posted every minute from then on, and letting the request choose that address
 * would let whoever makes the request choose it. So this is a button with no
 * form behind it, and a deployment that has not been told its own name is told
 * so in the server's own words.
 */
export const registerScheduler = (client: ModuleClient): Promise<{ scheduling: boolean; publishUrl: string }> =>
  callPath(client, '/publishing/register', { method: 'POST' });

/* `tenantId` is only read for a bot that has no workspace yet: it is the one
   the grant was started from, which is the answer the database cannot work out
   for a person who stands in more than one. */
export const grantBot = (client: ModuleClient, botId: string, userId: string, tenantId?: string): Promise<unknown> =>
  call(client, '/grants', { method: 'POST', body: JSON.stringify({ botId, userId, tenantId }) });

export const revokeBot = (client: ModuleClient, botId: string, userId: string): Promise<unknown> =>
  call(client, `/grants?botId=${encodeURIComponent(botId)}&userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
