/**
 * A Supabase stand-in for the gate: one node:http server answering
 *   POST /rest/v1/rpc/cf_my_bot_ids      → the bots the bearer JWT may touch
 *   POST /rest/v1/rpc/cf_my_workspace    → that session's workspace and its bots
 *   POST /rest/v1/rpc/cf_claim_workspace → opens one, with no bots yet
 *   POST /rest/v1/rpc/cf_new_bot         → reserves a row (bot_id still null)
 *   POST /rest/v1/rpc/cf_bot_created     → the service key naming the new bot
 *   POST /rest/v1/rpc/cf_drop_bot_slot   → the service key undoing a reservation
 *   POST /rest/v1/rpc/cf_bot_deleted     → the service key letting go of a deleted bot's id
 *   POST /rest/v1/rpc/cf_bot_for_admin   → one bot, if the caller may administer it
 *   POST /rest/v1/rpc/cf_rename_bot      → renames it, reporting the old name
 *   POST /rest/v1/rpc/cf_admin_new_bot  → the panel reserving a row, workspace or no workspace
 *   POST /rest/v1/rpc/cf_admin_rename_bot → the panel's rename: refuses a name it will not store
 *   POST /rest/v1/rpc/cf_admin_tenants_json → every workspace, its members and its bots
 *   POST /rest/v1/rpc/cf_admin_unassigned_bots_json → the bots no workspace has claimed
 *   POST /rest/v1/rpc/cf_admin_grant_bot   → hand one bot to one person, inside one workspace
 *   POST /rest/v1/rpc/cf_admin_revoke_bot  → take it back
 *   POST /rest/v1/rpc/cf_remove_bot      → deletes the row, once it holds no bot id
 *   POST /rest/v1/rpc/cf_list_members    → the scripted member list (admins only)
 *   POST /rest/v1/rpc/cf_resource_owner_lookup → whose the resource ids are
 *   POST /rest/v1/rpc/cf_resource_bind         → …and one instance saying so
 *   POST /rest/v1/rpc/cf_admin_attempt_{wait,fail,clear} → the admin door's counter,
 *       shared by every instance
 *   POST /auth/v1/admin/generate_link    → { hashed_token } when the service key is right
 *
 * and the Instagram publish queue's own half of the same project:
 *   POST /rest/v1/rpc/cf_pub_config_json  → whether it is registered (never the secrets)
 *   POST /rest/v1/rpc/cf_pub_register     → record the callback address and both secrets
 *   POST /rest/v1/rpc/cf_pub_{list,create,update,delete}  → the posts of ONE bot
 *   POST /rest/v1/rpc/cf_pub_take         → the post a callback names, once only
 *   POST /rest/v1/rpc/cf_pub_report       → the outcome, on the shared secret plus the bot
 *   POST/DELETE /storage/v1/object/cf-pub-media/…  → the durable media bucket
 *   POST /storage/v1/object/list/cf-pub-media    → what is under one bot's prefix
 *   DELETE /storage/v1/object/cf-pub-media       → several objects at once (the sweep)
 * The bot fence is the migration's rule and is tested against a real Postgres;
 * what these stand in for is the shape of each answer and which key opens it.
 *
 * by inspecting the `authorization` header. Tokens are unsigned JWTs built by
 * `fakeJwt` — the real PostgREST verifies signatures; here the script decides.
 *
 * Bots belong to the TENANT, not to the session, so two sessions in one
 * workspace see each other's. `botId` on a session stays as the shorthand most
 * gate tests want ("this session has this one bot") and seeds the tenant with it.
 * Who may open which bot is the migration's rule and is tested against a real
 * Postgres; here every member of a workspace sees every bot in it.
 */
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

/** One row of cf_pub_posts, in the shape the queue answers with. */
export interface MockQueuedPost {
  id: string;
  botId: string;
  kind: string;
  caption: string;
  media: unknown[];
  reel?: unknown;
  scheduledAt: string | null;
  status: string;
  attempts: number;
  mediaId: string | null;
  permalink: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  /** Server-side bookkeeping: set when a callback was answered for this post. */
  takenAt: string | null;
}

/** One object in the media bucket. */
export interface MockStoredObject {
  contentType: string;
  bytes: Buffer;
  /** When it was written — set by a test that wants the sweep to see it as old. */
  createdAt?: string;
}

/** One row of cf_bots. `botId` is null while the bot is still being created. */
export interface MockBot {
  id: string;
  botId: string | null;
  name: string;
  /**
   * When the row was reserved. Only `cf_list_bots` reports it, and only
   * provisioning reads it — to tell a reservation whose run is still going
   * from one whose process died. Absent reads as "just now".
   */
  createdAt?: string;
}

/** One row of cf_members, as the panel reads them back. */
export interface MockMember {
  userId: string;
  role: string;
  email?: string;
  name?: string;
}

/** A signed-in session as the mock database sees it. */
export interface MockSession {
  /** Undefined until the session claims a workspace. */
  tenantId?: string;
  /** Shorthand: the one bot this session's workspace starts with. */
  botId?: string | null;
  name?: string;
  role?: string;
  /** Bots from OTHER workspaces this session was invited into. */
  alsoBotIds?: string[];
}

export type GateAnswer = MockSession | 401 | 500 | 'timeout';

export interface RecordedRpcCall {
  path: string;
  apikey: string | undefined;
  authorization: string | undefined;
  body: unknown;
}

export interface MockSupabase {
  url: string;
  anonKey: string;
  serviceKey: string;
  calls: RecordedRpcCall[];
  /** Calls to rpc/cf_my_bot_ids only (derived from `calls`, so `calls.length = 0` resets it). */
  readonly gateCalls: number;
  /**
   * Hold the gate's answer this long before sending it — for the tests that
   * need something to happen while the proxy is awaiting it.
   */
  holdGate(ms: number): void;
  /** token → the session | 401 (PostgREST rejects the JWT) | 500 | 'timeout' (never answers). */
  answers: Map<string, GateAnswer>;
  /**
   * Members returned by cf_list_members, and what cf_recovery_authorize decides
   * from. `otherTenants` is the workspaces the same ACCOUNT also stands in —
   * what makes a recovery link for it reach past this workspace.
   */
  members: Array<{ user_id: string; role: string; email: string; otherTenants?: string[] }>;
  /** The rows cf_recovery_authorize wrote — the table cf_recovery_events stands for. */
  recoveryEvents: Array<{ tenant_id: string; issuer: string; target: string; target_email: string }>;
  /** The hashed_token generate_link answers for an email (deterministic, for assertions). */
  hashedTokenFor(email: string): string;
  /**
   * The bots of each workspace, by tenant id — the table cf_bots stands for.
   * The empty-string key is the workspace-less bucket: rows whose tenant_id is
   * null, which the panel can create and only a grant can claim.
   */
  tenantBots: Map<string, MockBot[]>;
  /** The people of each workspace, by tenant id — the table cf_members stands for. */
  tenantMembers: Map<string, MockMember[]>;
  /**
   * Who holds an explicit grant on which bot row, by slot id — cf_bot_members.
   * Keyed by slot rather than by Chatfuel bot id for the migration's reason:
   * the grant outlives the bot being renamed, and a slot can exist before its
   * bot does.
   */
  botGrants: Map<string, Set<string>>;
  /** Make cf_bot_created fail, to exercise the provisioning rollback. */
  failAttach(value: boolean): void;
  /** The publish queue's posts, by id — the table cf_pub_posts stands for. */
  igPosts: Map<string, MockQueuedPost>;
  /** The one cf_pub_config row. The hash is what the scheduler would send. */
  igConfig: { publishUrl: string | null; bypassSecret: string | null; callbackSecretHash: string | null };
  /** What is in the media bucket, by object key. */
  storage: Map<string, MockStoredObject>;
  /**
   * The shared resource fence — cf_resource_owner, id → bot, `null` shared.
   * Read and written by the service key only, which is the table's whole point.
   */
  resourceOwners: Map<string, string | null>;
  /**
   * The admin door's shared attempt counter — cf_admin_attempts, key → the
   * instant the caller may try again and how many they have got wrong. The
   * service key only, like the fence above.
   */
  adminAttempts: Map<string, { fails: number; until: number }>;
  /** Answer every storage write with a failure, to exercise the upload path's. */
  failStorage(value: boolean): void;
  /** Add a post the way the queue would, for tests that start from one. */
  seedPost(post: Partial<MockQueuedPost> & { id: string; botId: string }): MockQueuedPost;
  close(): Promise<void>;
}

/**
 * The issuer the gate expects, filled in once this mock knows its own port.
 * `fakeJwt` stamps it so a test token looks like one this project minted; pass
 * `iss` explicitly to make one that does not.
 */
let mockIssuer = '';

/** An unsigned JWT with the given claims (base64url header.payload.signature). */
export function fakeJwt(claims: { sub: string; exp?: number; [key: string]: unknown }): string {
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ iss: mockIssuer, ...claims })}.sig`;
}

/** The key of the workspace-less bucket in `tenantBots` — cf_bots.tenant_id null. */
export const UNASSIGNED = '';

export async function startMockSupabase(): Promise<MockSupabase> {
  const anonKey = 'sb_publishable_test';
  const serviceKey = 'sb_secret_test';
  const calls: RecordedRpcCall[] = [];
  const answers = new Map<string, GateAnswer>();
  const members: MockSupabase['members'] = [];
  const recoveryEvents: MockSupabase['recoveryEvents'] = [];
  const resourceOwners = new Map<string, string | null>();
  const adminAttempts = new Map<string, { fails: number; until: number }>();
  const tenantBots = new Map<string, MockBot[]>();
  const tenantMembers = new Map<string, MockMember[]>();
  const botGrants = new Map<string, Set<string>>();
  const pending = new Set<import('node:http').ServerResponse>();
  let attachFails = false;
  /** See holdGate: how long the gate's answer is held before it is sent. */
  let gateDelayMs = 0;
  let slots = 0;
  let storageFails = false;
  const igPosts = new Map<string, MockQueuedPost>();
  const igConfig: MockSupabase['igConfig'] = { publishUrl: null, bypassSecret: null, callbackSecretHash: null };
  const storage = new Map<string, MockStoredObject>();

  const nowIso = (): string => new Date().toISOString();
  const seedPost: MockSupabase['seedPost'] = (post) => {
    const row: MockQueuedPost = {
      kind: 'post',
      caption: '',
      media: [],
      scheduledAt: null,
      status: 'draft',
      attempts: 0,
      mediaId: null,
      permalink: null,
      error: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      takenAt: null,
      ...post,
    };
    igPosts.set(row.id, row);
    return row;
  };
  /** What the app sees: the server's own bookkeeping columns never go out. */
  const postJson = (row: MockQueuedPost): unknown => {
    const { takenAt: _takenAt, botId: _botId, ...rest } = row;
    return rest;
  };

  const bearer = (value: string | undefined): string | undefined => /^bearer\s+(.+)$/i.exec(value ?? '')?.[1];

  /**
   * A claimed workspace is named after the JWT's `sub`. It used to be named
   * after the last few characters of the token, which collide between sessions
   * — harmless while a workspace held one bot on the session itself, and not
   * harmless now that bots hang off the tenant: two unrelated sign-ups shared a
   * workspace and the second one looked already provisioned.
   */
  const subjectOf = (jwt: string | undefined): string => {
    try {
      const payload = JSON.parse(Buffer.from((jwt ?? '').split('.')[1] ?? '', 'base64url').toString()) as {
        sub?: unknown;
      };
      return typeof payload.sub === 'string' && payload.sub ? payload.sub : 'anon';
    } catch {
      return 'anon';
    }
  };

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      let body: unknown;
      try {
        body = JSON.parse(raw.toString() || 'null');
      } catch {
        body = undefined;
      }
      const path = req.url ?? '';
      const authorization = req.headers.authorization;
      calls.push({ path, apikey: req.headers.apikey as string | undefined, authorization, body });
      const json = (status: number, value: unknown) => {
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(value));
      };

      /** The session behind the bearer, or a scripted transport failure. */
      const sessionFor = (): MockSession | 401 | 500 | 'timeout' | undefined => {
        const jwt = bearer(authorization);
        return jwt ? answers.get(jwt) : undefined;
      };
      /* cf_bots.tenant_id is null: a row the panel reserved for no workspace. */
      const botsOf = (tenantId: string): MockBot[] => {
        let rows = tenantBots.get(tenantId);
        if (!rows) {
          rows = [];
          tenantBots.set(tenantId, rows);
        }
        return rows;
      };
      /** The `botId` shorthand becomes a real row the first time it is looked at. */
      const seed = (session: MockSession): void => {
        if (!session.tenantId || !session.botId) return;
        const rows = botsOf(session.tenantId);
        if (!rows.some((row) => row.botId === session.botId)) {
          rows.push({ id: `slot-${session.botId}`, botId: session.botId, name: session.name ?? 'Workspace' });
        }
      };
      const isAdmin = (session: MockSession): boolean =>
        (session.role ?? 'owner') === 'owner' || session.role === 'admin';
      /** The row in the caller's own workspace, if it is theirs to administer. */
      const slotFor = (session: MockSession, slotId: string | undefined): MockBot | undefined =>
        session.tenantId && slotId ? botsOf(session.tenantId).find((row) => row.id === slotId) : undefined;
      const workspaceOf = (session: MockSession): unknown => {
        if (!session.tenantId) return null;
        seed(session);
        return {
          tenant_id: session.tenantId,
          name: session.name ?? 'Workspace',
          role: session.role ?? 'owner',
          bots: botsOf(session.tenantId).map((row) => ({ id: row.id, bot_id: row.botId, name: row.name })),
        };
      };

      if (path === '/rest/v1/rpc/cf_my_bot_ids' && req.method === 'POST') {
        const session = sessionFor();
        if (session === undefined) return json(401, { message: 'JWT expired' });
        if (session === 401) return json(401, { message: 'invalid JWT' });
        if (session === 500) return json(500, { message: 'boom' });
        if (session === 'timeout') {
          pending.add(res);
          return;
        }
        seed(session);
        const own = session.tenantId
          ? botsOf(session.tenantId).flatMap((row) => (row.botId ? [row.botId] : []))
          : session.botId
            ? [session.botId]
            : [];
        const answer = [...own, ...(session.alsoBotIds ?? [])];
        if (gateDelayMs > 0) {
          setTimeout(() => json(200, answer), gateDelayMs).unref();
          return;
        }
        return json(200, answer);
      }
      if (path === '/rest/v1/rpc/cf_my_workspace' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        return json(200, workspaceOf(session));
      }
      if (path === '/rest/v1/rpc/cf_claim_workspace' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        if (!session.tenantId) {
          session.tenantId = `t_${subjectOf(bearer(authorization))}`;
          session.botId = null;
          session.role = 'owner';
          session.name = session.name ?? ((body as { p_name?: string } | undefined)?.p_name || 'Claimed workspace');
        }
        return json(200, workspaceOf(session));
      }
      if (path === '/rest/v1/rpc/cf_new_bot' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        if (!session.tenantId) {
          return json(404, { code: 'PT404', message: 'You are not in a workspace yet', hint: 'tenant_not_found' });
        }
        if (!isAdmin(session)) {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        const name = (body as { p_name?: string } | undefined)?.p_name?.trim();
        if (!name) return json(422, { code: 'PT422', message: 'A name is required', hint: 'bad_name' });
        slots += 1;
        const row: MockBot = { id: `slot-${slots}`, botId: null, name, createdAt: nowIso() };
        botsOf(session.tenantId).push(row);
        return json(200, { id: row.id, tenant_id: session.tenantId, name });
      }
      /* The panel reserving a row. Mirrors the migration: a name it will not
         store is refused, and a missing workspace is an answer rather than a
         missing argument — the row lands in the workspace-less bucket. */
      if (path === '/rest/v1/rpc/cf_admin_new_bot' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const args = body as { p_tenant_id?: string | null; p_name?: string } | undefined;
        const name = (args?.p_name ?? '').trim();
        if (!name) return json(422, { code: 'PT422', message: 'A name is required', hint: 'bad_name' });
        if (name.length > 80) {
          return json(422, { code: 'PT422', message: 'That name is too long', hint: 'name_too_long' });
        }
        const tenant = args?.p_tenant_id ?? UNASSIGNED;
        const row: MockBot = { id: `slot-${++slots}`, botId: null, name };
        botsOf(tenant).push(row);
        return json(200, { id: row.id, tenant_id: args?.p_tenant_id ?? null, name });
      }
      if (path === '/rest/v1/rpc/cf_bot_created' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        if (attachFails) return json(500, { message: 'attach exploded' });
        const args = body as { p_slot?: string; p_bot_id?: string } | undefined;
        for (const rows of tenantBots.values()) {
          const row = rows.find((candidate) => candidate.id === args?.p_slot);
          if (!row) continue;
          if (row.botId && row.botId !== args?.p_bot_id) {
            return json(409, { code: 'PT409', message: 'This row already has a bot', hint: 'bot_already_attached' });
          }
          row.botId = args?.p_bot_id ?? null;
          return json(200, { id: row.id, bot_id: row.botId });
        }
        return json(404, { code: 'PT404', hint: 'bot_not_found' });
      }
      /* The panel's own rename, service-keyed. Mirrors the migration: it
         refuses a name the deployment will not store, and answers 200 with a
         null row for a bot it has never heard of — two outcomes the proxy has
         to tell apart. */
      if (path === '/rest/v1/rpc/cf_admin_rename_bot' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const args = body as { p_bot_id?: string; p_name?: string } | undefined;
        const name = args?.p_name?.trim();
        if (!name) return json(422, { code: 'PT422', message: 'A name is required', hint: 'bad_name' });
        if (name.length > 80) {
          return json(422, { code: 'PT422', message: 'That name is too long', hint: 'name_too_long' });
        }
        for (const rows of tenantBots.values()) {
          const row = rows.find((candidate) => candidate.botId === args?.p_bot_id);
          if (!row) continue;
          const previous = row.name;
          row.name = name;
          return json(200, { id: row.id, bot_id: row.botId, previous_name: previous });
        }
        return json(200, { id: null, bot_id: args?.p_bot_id ?? null, previous_name: null });
      }
      /* The panel's three service-keyed access calls. The one rule worth
         mirroring exactly is the migration's: a grant may not cross workspaces,
         and that check is the whole of the isolation — there is no caller here
         for row-level security to reason about. */
      if (path === '/rest/v1/rpc/cf_admin_tenants_json' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const ids = new Set([...tenantBots.keys(), ...tenantMembers.keys()]);
        return json(
          200,
          [...ids].sort().map((id) => ({
            id,
            name: id,
            createdAt: nowIso(),
            members: (tenantMembers.get(id) ?? []).map((m) => ({
              userId: m.userId,
              role: m.role,
              email: m.email ?? null,
              name: m.name ?? null,
            })),
            bots: (tenantBots.get(id) ?? []).map((row) => ({
              slotId: row.id,
              botId: row.botId,
              name: row.name,
              granted: [...(botGrants.get(row.id) ?? [])].sort(),
            })),
          })),
        );
      }
      if (path === '/rest/v1/rpc/cf_admin_unassigned_bots_json' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        return json(
          200,
          (tenantBots.get(UNASSIGNED) ?? [])
            .filter((row) => row.botId)
            .map((row) => ({ slotId: row.id, botId: row.botId, name: row.name, createdAt: nowIso() })),
        );
      }
      if (
        (path === '/rest/v1/rpc/cf_admin_grant_bot' || path === '/rest/v1/rpc/cf_admin_revoke_bot') &&
        req.method === 'POST'
      ) {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const wanted = body as { p_bot_id?: string; p_user_id?: string; p_tenant_id?: string | null } | undefined;
        let slot: MockBot | undefined;
        let tenant: string | undefined;
        for (const [id, rows] of tenantBots) {
          const row = rows.find((candidate) => candidate.botId === wanted?.p_bot_id);
          if (row) {
            slot = row;
            tenant = id;
            break;
          }
        }
        if (!slot || tenant === undefined) {
          return json(404, {
            code: 'PT404',
            message: 'This bot is not in any workspace of this app',
            hint: 'bot_not_found',
          });
        }
        const held = botGrants.get(slot.id) ?? new Set<string>();
        botGrants.set(slot.id, held);
        if (path.endsWith('cf_admin_revoke_bot')) {
          held.delete(String(wanted?.p_user_id ?? ''));
          return json(200, { bot_id: wanted?.p_bot_id, user_id: wanted?.p_user_id });
        }
        /* A row still in the workspace-less bucket: the grant settles where it
           belongs, and says so rather than guessing between two workspaces. */
        let adopting: string | null = null;
        if (tenant === UNASSIGNED) {
          let adopted = wanted?.p_tenant_id ?? '';
          if (adopted) {
            if (!tenantMembers.has(adopted) && !tenantBots.has(adopted)) {
              return json(404, { code: 'PT404', message: 'No such workspace', hint: 'tenant_not_found' });
            }
          } else {
            const standsIn = [...tenantMembers]
              .filter(([, people]) => people.some((m) => m.userId === wanted?.p_user_id))
              .map(([id]) => id);
            if (standsIn.length === 0) {
              return json(404, {
                code: 'PT404',
                message: 'That person is in no workspace of this app',
                hint: 'member_not_found',
              });
            }
            if (standsIn.length > 1) {
              return json(409, {
                code: 'PT409',
                message: 'This bot has no workspace yet, and that person is in several',
                hint: 'tenant_ambiguous',
              });
            }
            adopted = standsIn[0]!;
          }
          adopting = adopted;
          tenant = adopted;
        }
        const inWorkspace = (tenantMembers.get(tenant) ?? []).some((m) => m.userId === wanted?.p_user_id);
        if (!inWorkspace) {
          return json(404, {
            code: 'PT404',
            message: "That person is not in this bot's workspace",
            hint: 'member_not_found',
          });
        }
        /* After the membership check, never before: the function writes the
           workspace onto the row only once it knows the person is in it, and a
           raise there rolls the write back. A mock that adopted first left a
           refused grant having moved the bot anyway. */
        if (adopting !== null) {
          const bucket = tenantBots.get(UNASSIGNED)!;
          bucket.splice(bucket.indexOf(slot), 1);
          botsOf(adopting).push(slot);
        }
        held.add(String(wanted?.p_user_id ?? ''));
        return json(200, { bot_id: wanted?.p_bot_id, user_id: wanted?.p_user_id, tenant_id: tenant });
      }
      if (path === '/rest/v1/rpc/cf_drop_bot_slot' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const slotId = (body as { p_slot?: string } | undefined)?.p_slot;
        for (const rows of tenantBots.values()) {
          const at = rows.findIndex((row) => row.id === slotId && row.botId === null);
          if (at >= 0) rows.splice(at, 1);
        }
        return json(200, null);
      }
      if (path === '/rest/v1/rpc/cf_bot_deleted' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'service key required' });
        }
        const slotId = (body as { p_slot?: string } | undefined)?.p_slot;
        for (const rows of tenantBots.values()) {
          const row = rows.find((entry) => entry.id === slotId);
          if (!row) continue;
          const had = row.botId;
          row.botId = null;
          return json(200, { id: slotId, bot_id: had });
        }
        return json(200, { id: slotId, bot_id: null });
      }
      if (
        (path === '/rest/v1/rpc/cf_bot_for_admin' ||
          path === '/rest/v1/rpc/cf_rename_bot' ||
          path === '/rest/v1/rpc/cf_remove_bot') &&
        req.method === 'POST'
      ) {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        const args = body as { p_slot?: string; p_name?: string } | undefined;
        const row = slotFor(session, args?.p_slot);
        if (!row) return json(404, { code: 'PT404', message: 'Bot not found', hint: 'bot_not_found' });
        if (!isAdmin(session)) {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        if (path === '/rest/v1/rpc/cf_bot_for_admin') {
          return json(200, { id: row.id, tenant_id: session.tenantId, bot_id: row.botId, name: row.name });
        }
        if (path === '/rest/v1/rpc/cf_rename_bot') {
          const name = args?.p_name?.trim();
          if (!name) return json(422, { code: 'PT422', message: 'A name is required', hint: 'bad_name' });
          const previous = row.name;
          row.name = name;
          return json(200, { id: row.id, bot_id: row.botId, name, previous_name: previous });
        }
        /* The real function refuses while the row still names a bot: the id is
           let go by cf_bot_deleted, which only the service key may call. */
        if (row.botId !== null) {
          return json(409, {
            code: 'PT409',
            message: 'This bot has not been deleted from Chatfuel yet',
            hint: 'bot_still_upstream',
          });
        }
        const rows = botsOf(session.tenantId!);
        rows.splice(rows.indexOf(row), 1);
        return json(200, { id: row.id, bot_id: row.botId, name: row.name });
      }
      if (path === '/rest/v1/rpc/cf_list_bots' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        if (!isAdmin(session)) {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        const tenantId = String((body as { p_tenant_id?: unknown })?.p_tenant_id ?? '');
        if (!tenantId || tenantId !== session.tenantId) {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        seed(session);
        /* `returns table`, so PostgREST answers an ARRAY — and unlike
           cf_my_bots_json this one carries created_at. */
        return json(
          200,
          botsOf(tenantId).map((row) => ({
            id: row.id,
            bot_id: row.botId,
            name: row.name,
            created_at: row.createdAt ?? nowIso(),
            members: [],
          })),
        );
      }
      if (path === '/rest/v1/rpc/cf_recovery_authorize' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        if (!isAdmin(session)) {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        const wanted = String((body as { p_email?: unknown } | null)?.p_email ?? '')
          .trim()
          .toLowerCase();
        const target = members.find((m) => m.email.trim().toLowerCase() === wanted);
        if (!target) {
          return json(403, {
            code: 'PT403',
            message: 'That email is not a member of this workspace',
            hint: 'not_member',
          });
        }
        const rank = (role: string): number => ({ owner: 3, admin: 2, member: 1 })[role] ?? 0;
        if (rank(target.role) >= rank(session.role ?? 'owner')) {
          return json(403, {
            code: 'PT403',
            message: 'You can only issue recovery links for members below your role',
            hint: 'rank',
          });
        }
        if ((target.otherTenants ?? []).length > 0) {
          return json(403, {
            code: 'PT403',
            message: 'That member belongs to another workspace too — only their own workspace can reset them',
            hint: 'cross_tenant',
          });
        }
        recoveryEvents.push({
          tenant_id: String((body as { p_tenant_id?: unknown } | null)?.p_tenant_id ?? ''),
          issuer: subjectOf(bearer(authorization)),
          target: target.user_id,
          target_email: wanted,
        });
        // PostgREST answers a `returns void` function with 204 and no body.
        res.statusCode = 204;
        return res.end();
      }
      if (path === '/rest/v1/rpc/cf_list_members' && req.method === 'POST') {
        const session = sessionFor();
        if (!session || typeof session !== 'object') return json(401, { message: 'JWT expired' });
        if (session.role !== 'owner' && session.role !== 'admin') {
          return json(403, { code: 'PT403', message: 'Only admins can do that', hint: 'not_admin' });
        }
        return json(200, members);
      }
      // ---------------------------------------------------------------- the publish queue
      const args = (body ?? {}) as Record<string, unknown>;
      const serviceKeyed = bearer(authorization) === serviceKey && req.headers.apikey === serviceKey;
      const needsService = (): boolean => {
        if (serviceKeyed) return false;
        json(401, { message: 'service key required' });
        return true;
      };
      const ownPost = (): MockQueuedPost | undefined => {
        const row = igPosts.get(String(args.p_id ?? ''));
        return row && row.botId === args.p_bot_id ? row : undefined;
      };

      if (path === '/rest/v1/rpc/cf_pub_config_json' && req.method === 'POST') {
        if (needsService()) return;
        return json(200, {
          publish_url: igConfig.publishUrl,
          has_bypass: igConfig.bypassSecret !== null,
          has_secret: igConfig.callbackSecretHash !== null,
          updated_at: nowIso(),
        });
      }
      if (path === '/rest/v1/rpc/cf_pub_register' && req.method === 'POST') {
        if (needsService()) return;
        const url = typeof args.p_url === 'string' ? args.p_url.trim() : '';
        if (!/^https?:\/\//.test(url)) {
          return json(422, {
            code: 'PT422',
            message: 'The callback address must be an http or https URL',
            hint: 'bad_url',
          });
        }
        igConfig.publishUrl = url;
        if (typeof args.p_bypass === 'string') igConfig.bypassSecret = args.p_bypass;
        if (typeof args.p_secret_hash === 'string') igConfig.callbackSecretHash = args.p_secret_hash;
        return json(200, {
          publish_url: igConfig.publishUrl,
          has_bypass: igConfig.bypassSecret !== null,
          has_secret: igConfig.callbackSecretHash !== null,
          updated_at: nowIso(),
        });
      }
      if (path === '/rest/v1/rpc/cf_pub_list' && req.method === 'POST') {
        if (needsService()) return;
        return json(200, [...igPosts.values()].filter((row) => row.botId === args.p_bot_id).map(postJson));
      }
      if (path === '/rest/v1/rpc/cf_pub_create' && req.method === 'POST') {
        if (needsService()) return;
        const sent = (args.p_post ?? {}) as Record<string, unknown>;
        const at = typeof sent.scheduledAt === 'string' && sent.scheduledAt ? sent.scheduledAt : null;
        return json(
          200,
          postJson(
            seedPost({
              id: randomUUID(),
              botId: String(args.p_bot_id ?? ''),
              kind: typeof sent.kind === 'string' ? sent.kind : 'post',
              caption: typeof sent.caption === 'string' ? sent.caption : '',
              media: Array.isArray(sent.media) ? sent.media : [],
              ...(sent.reel !== undefined ? { reel: sent.reel } : {}),
              scheduledAt: at,
              status: at === null ? 'draft' : 'scheduled',
            }),
          ),
        );
      }
      if (path === '/rest/v1/rpc/cf_pub_update' && req.method === 'POST') {
        if (needsService()) return;
        const row = ownPost();
        if (!row) return json(404, { code: 'PT404', message: 'No such post', hint: 'post_not_found' });
        Object.assign(row, (args.p_patch ?? {}) as Record<string, unknown>, { updatedAt: nowIso() });
        return json(200, postJson(row));
      }
      if (path === '/rest/v1/rpc/cf_pub_delete' && req.method === 'POST') {
        if (needsService()) return;
        const row = ownPost();
        if (!row) return json(404, { code: 'PT404', message: 'No such post', hint: 'post_not_found' });
        igPosts.delete(row.id);
        return json(200, postJson(row));
      }
      if (path === '/rest/v1/rpc/cf_pub_take' && req.method === 'POST') {
        if (needsService()) return;
        const row = igPosts.get(String(args.p_id ?? ''));
        if (!row || row.status !== 'publishing' || row.takenAt !== null) {
          return json(409, { code: 'PT409', message: 'This post is not waiting to be published', hint: 'not_claimed' });
        }
        row.takenAt = nowIso();
        return json(200, {
          id: row.id,
          botId: row.botId,
          kind: row.kind,
          caption: row.caption,
          media: row.media,
          reel: row.reel ?? null,
          attempts: row.attempts,
        });
      }
      if (path === '/rest/v1/rpc/cf_pub_report' && req.method === 'POST') {
        // The one function a shared secret opens rather than the project's key.
        const given = typeof args.p_secret === 'string' ? args.p_secret : '';
        const hash = createHash('sha256').update(given, 'utf8').digest('base64');
        if (!igConfig.callbackSecretHash || hash !== igConfig.callbackSecretHash) {
          return json(401, { code: 'PT401', message: 'Not allowed', hint: 'bad_secret' });
        }
        const bot = typeof args.p_bot_id === 'string' ? args.p_bot_id.trim() : '';
        if (bot === '') return json(422, { code: 'PT422', message: 'A bot is required', hint: 'bad_bot_id' });
        const row = igPosts.get(String(args.p_id ?? ''));
        // The bot is part of the row the report is about: the secret is one
        // value for the whole deployment, so a report naming another bot's post
        // is not found, exactly as in the migration.
        if (!row || row.botId !== bot) {
          return json(404, { code: 'PT404', message: 'No such post', hint: 'post_not_found' });
        }
        row.status = String(args.p_status ?? '');
        row.mediaId = typeof args.p_media_id === 'string' ? args.p_media_id : row.mediaId;
        row.permalink = typeof args.p_permalink === 'string' ? args.p_permalink : row.permalink;
        row.error = row.status === 'failed' ? ((args.p_error as string | null) ?? null) : null;
        row.takenAt = null;
        row.updatedAt = nowIso();
        return json(200, postJson(row));
      }

      // ---------------------------------------------------------------- media bucket
      // What is under a prefix, in pages — the quota's and the sweep's question.
      if (path === '/storage/v1/object/list/cf-pub-media' && req.method === 'POST') {
        if (needsService()) return;
        if (storageFails) return json(500, { message: 'storage exploded' });
        const prefix = String(args.prefix ?? '');
        const limit = Number(args.limit ?? 100);
        const offset = Number(args.offset ?? 0);
        const under = [...storage.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return json(
          200,
          under.slice(offset, offset + limit).map(([key, object]) => ({
            // Storage lists names relative to the prefix it was asked for.
            name: key.slice(prefix.length),
            created_at: object.createdAt ?? nowIso(),
            updated_at: object.createdAt ?? nowIso(),
            metadata: { size: object.bytes.length, mimetype: object.contentType },
          })),
        );
      }
      // Several objects at once, by full key — how the sweep lets go.
      if (path === '/storage/v1/object/cf-pub-media' && req.method === 'DELETE') {
        if (needsService()) return;
        if (storageFails) return json(500, { message: 'storage exploded' });
        const prefixes = Array.isArray(args.prefixes) ? (args.prefixes as unknown[]) : [];
        const removed: string[] = [];
        for (const name of prefixes) {
          if (typeof name === 'string' && storage.delete(name)) removed.push(name);
        }
        return json(
          200,
          removed.map((name) => ({ name })),
        );
      }
      const bucketPath = /^\/storage\/v1\/object\/cf-pub-media\/(.+)$/.exec(path.split('?')[0] ?? '');
      if (bucketPath) {
        if (needsService()) return;
        const key = decodeURIComponent(bucketPath[1]!);
        if (storageFails) return json(500, { message: 'storage exploded' });
        if (req.method === 'POST' || req.method === 'PUT') {
          storage.set(key, { contentType: String(req.headers['content-type'] ?? ''), bytes: raw, createdAt: nowIso() });
          return json(200, { Key: `cf-pub-media/${key}` });
        }
        if (req.method === 'DELETE') {
          const had = storage.delete(key);
          return json(had ? 200 : 404, { message: had ? 'Successfully deleted' : 'Object not found' });
        }
      }

      if (path.startsWith('/rest/v1/rpc/cf_admin_attempt_') && req.method === 'POST') {
        // The service key or nothing: this counter is the door's, and a caller
        // who could clear it would be a caller who could turn the door off.
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'Invalid API key' });
        }
        const asked = body as { p_key?: unknown; p_max_ms?: unknown } | undefined;
        const key = typeof asked?.p_key === 'string' ? asked.p_key.slice(0, 100) : '';
        const entry = adminAttempts.get(key);
        if (path.endsWith('_wait')) {
          return json(200, entry ? Math.max(0, entry.until - Date.now()) : null);
        }
        if (path.endsWith('_clear')) {
          adminAttempts.delete(key);
          return json(200, null);
        }
        // The migration's curve: three free, then doubling up to the ceiling.
        const ceiling = typeof asked?.p_max_ms === 'number' ? asked.p_max_ms : 0;
        const fails = (entry?.fails ?? 0) + 1;
        const wait = fails > 3 ? Math.min(1000 * 2 ** Math.min(fails - 4, 20), ceiling) : 0;
        adminAttempts.set(key, { fails, until: Date.now() + wait });
        return json(200, wait);
      }

      if (
        (path === '/rest/v1/rpc/cf_resource_owner_lookup' || path === '/rest/v1/rpc/cf_resource_bind') &&
        req.method === 'POST'
      ) {
        // The service key or nothing: a caller who could read this table could
        // ask which bot an id belongs to, which is the question it exists to
        // refuse.
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { message: 'Invalid API key' });
        }
        const asked = (body as { p_ids?: unknown } | undefined)?.p_ids;
        const ids = Array.isArray(asked) ? asked.filter((id): id is string => typeof id === 'string') : [];
        if (path === '/rest/v1/rpc/cf_resource_owner_lookup') {
          return json(
            200,
            ids
              .filter((id) => resourceOwners.has(id))
              .map((id) => ({ resource_id: id, bot_id: resourceOwners.get(id) ?? null })),
          );
        }
        const asBot = (body as { p_bot_id?: unknown } | undefined)?.p_bot_id;
        const bot = typeof asBot === 'string' && asBot ? asBot.toLowerCase() : null;
        for (const id of ids) {
          // cf_resource_bind's conflict rule: a second bot makes the id shared
          // rather than moving it, so no write can hand a resource over.
          const held = resourceOwners.get(id);
          resourceOwners.set(id, held !== undefined && held !== bot ? null : bot);
        }
        return json(200, null);
      }

      if (path === '/auth/v1/admin/generate_link' && req.method === 'POST') {
        if (bearer(authorization) !== serviceKey || req.headers.apikey !== serviceKey) {
          return json(401, { msg: 'Invalid API key' });
        }
        const email = (body as { email?: string } | undefined)?.email ?? '';
        return json(200, {
          action_link: `${url}/auth/v1/verify?token=x&type=recovery`,
          hashed_token: hashedTokenFor(email),
          verification_type: 'recovery',
          email,
        });
      }
      json(404, { message: 'not found' });
    });
  });

  const hashedTokenFor = (email: string) => `pkce_${Buffer.from(email).toString('base64url')}`;

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  const url = `http://127.0.0.1:${port}`;
  mockIssuer = `${url}/auth/v1`;

  return {
    url,
    anonKey,
    serviceKey,
    calls,
    tenantBots,
    tenantMembers,
    botGrants,
    resourceOwners,
    adminAttempts,
    get gateCalls() {
      return calls.filter((c) => c.path === '/rest/v1/rpc/cf_my_bot_ids').length;
    },
    holdGate(ms: number) {
      gateDelayMs = ms;
    },
    failAttach(value: boolean) {
      attachFails = value;
    },
    recoveryEvents,
    igPosts,
    igConfig,
    storage,
    failStorage(value: boolean) {
      storageFails = value;
    },
    seedPost,
    answers,
    members,
    hashedTokenFor,
    close: () =>
      new Promise<void>((resolve) => {
        for (const res of pending) res.destroy();
        pending.clear();
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
