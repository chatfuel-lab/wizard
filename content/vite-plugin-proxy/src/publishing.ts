/**
 * The Instagram publish queue
 *   GET    <publishingPath>/config              → { scheduling }
 *   POST   <publishingPath>/register            → record where this app answers (admin)
 *   GET    <publishingPath>/posts?botID=        → { posts }
 *   POST   <publishingPath>/posts?botID=        → { post }
 *   PATCH  <publishingPath>/posts/<id>?botID=   → { post }
 *   DELETE <publishingPath>/posts/<id>?botID=   → { post }
 *   POST   <publishingPath>/publish-due         → the scheduler's callback
 *   (the media routes live in publishingMedia.ts)
 *
 * WHY ANY OF THIS EXISTS. Chatfuel publishes to Instagram immediately and
 * stores no post: there is no scheduled publish in its API and no draft
 * entity. So a queue that fires while nobody is looking has to be the
 * deployment's own — a table on its database, a job beside it, and these
 * routes joining the two. Everything below the browser needs the service-role
 * key, which is exactly why it is here and not there.
 *
 * The routes are mounted on the same condition as provisioning (the gate on,
 * and a service-role key to reach the database with). When they are not
 * mounted the dispatcher does not claim the paths at all, the host answers
 * 404, and the app reads that as "this deployment keeps its queue in the
 * browser" and offers no schedule control. That 404 is a contract, not an
 * accident.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { GATE_MESSAGES } from './gate.js';
import { FENCE_UNAVAILABLE_MESSAGE } from './workspaceFence.js';
import {
  JSON_BODY_MAX_BYTES,
  readJsonBodyCapped,
  searchOf,
  send405,
  refuseOversizedBody,
  sendJson,
  sendSyntheticEnvelope,
} from './envelope.js';
import { SLOW_FIELD_RE, graphqlErrorCodes } from './queryAnalysis.js';
import { MISCONFIGURED_MESSAGE } from './proxyConfig.js';
import { admitRequest, botAllowed, botBlockedMessage, fenceFor, type Admission } from './admission.js';
import { upstreamGraphql } from './upstream.js';
import { rpcAsAnon, rpcAsService, rpcRefusal } from './supabaseRpc.js';
import { requireAdmin } from './adminSession.js';
import type { ProxyContext } from './context.js';

/**
 * The shape of a post id.
 *
 * Checked here rather than left to the database: the id lands in a `uuid`
 * parameter, so anything else comes back as a type-cast failure in the
 * database's own words — a 400 nobody asked for, saying something no caller can
 * act on. A string that is not a post id names no post, which is a 404.
 */
const POST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One post as the queue hands it over to be published. */
export interface PublishRow {
  id: string;
  botId: string;
  kind: string;
  caption: string;
  media: unknown;
  reel: unknown;
}

/** The four publish mutations, by the kind of post each one is for. */
const INSTAGRAM_PUBLISH_FIELD: Readonly<Record<string, string>> = {
  post: 'instagramAccountPublishImage',
  reel: 'instagramAccountPublishReel',
  story: 'instagramAccountPublishStory',
  carousel: 'instagramAccountPublishCarousel',
};
const INSTAGRAM_INPUT_TYPE: Readonly<Record<string, string>> = {
  post: 'InstagramPublishImageInput!',
  reel: 'InstagramPublishReelInput!',
  story: 'InstagramPublishStoryInput!',
  carousel: 'InstagramPublishCarouselInput!',
};

const asMediaItem = (value: unknown): { type: 'image' | 'video'; url: string } | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as { type?: unknown; url?: unknown };
  const url = typeof item.url === 'string' ? item.url.trim() : '';
  if (!url) return null;
  return { type: item.type === 'video' ? 'video' : 'image', url };
};

/**
 * Why a media address cannot be sent on, or nothing when it can.
 *
 * These urls come from the caller and are fetched by the network the post is
 * published to, so the deployment is naming an address for somebody else to
 * open. `https:` and nothing else: a `file:` or a plaintext `http:` to an
 * address only reachable from inside — `http://169.254.169.254/…` is the
 * famous one — is not a post, it is this proxy asking a third party to go
 * knocking somewhere on its behalf.
 *
 * The scheme is the whole of the check. WHICH https hosts are acceptable is
 * the publishing network's policy, not ours: Instagram fetches the bytes from
 * its own side, and a list invented here would refuse legitimate uploads. That
 * changes the day the platform documents its sources or moves to signed urls.
 *
 * `new URL` is used rather than a prefix test because that is what everything
 * downstream will do with the string, whitespace, backslashes and all.
 */
function mediaUrlProblem(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `This post carries something that is not a web address: ${url}`;
  }
  if (parsed.protocol !== 'https:') {
    return `Media on a post must be at an https address, and this one is ${parsed.protocol.replace(':', '')}: ${url}`;
  }
  return undefined;
}

/**
 * The mutation one queued post turns into.
 *
 * Every one of the four takes the same thing — a botID and an input carrying
 * PUBLICLY REACHABLE urls, because the network fetches the bytes itself — and
 * differs only in which fields that input has. A Story has no caption at all,
 * which is a fact about the input type and not an oversight.
 *
 * A post that could not possibly be published says so as a sentence rather than
 * being sent anyway: the answer lands in the row for somebody to read later,
 * and "a carousel needs at least two things in it" is worth more there than
 * whatever the platform would have said about an empty list.
 */
export function publishOperation(
  row: Pick<PublishRow, 'kind' | 'caption' | 'media' | 'reel'>,
): { field: string; query: string; variables: Record<string, unknown> } | { error: string } {
  const field = INSTAGRAM_PUBLISH_FIELD[row.kind];
  if (!field) return { error: `This post is of a kind that cannot be published: ${row.kind}` };
  /* Refused, not filtered. A dropped item used to leave silently: a carousel of
     ten with one bad address went out as a carousel of nine, and its author
     found out by looking at the published post. The row carries the sentence
     instead. */
  const items: Array<{ type: 'image' | 'video'; url: string }> = [];
  for (const value of Array.isArray(row.media) ? row.media : []) {
    const item = asMediaItem(value);
    if (!item) return { error: 'One of the things on this post has no address to publish from' };
    const problem = mediaUrlProblem(item.url);
    if (problem) return { error: problem };
    items.push(item);
  }
  const caption = typeof row.caption === 'string' && row.caption.length > 0 ? row.caption : null;

  let input: Record<string, unknown>;
  if (row.kind === 'carousel') {
    if (items.length < 2 || items.length > 10) {
      return { error: 'A carousel holds between two and ten items' };
    }
    input = {
      items: items.map((item) => ({ mediaType: item.type === 'video' ? 'Video' : 'Image', mediaURL: item.url })),
      caption,
    };
  } else {
    const first = items[0];
    if (!first) return { error: 'This post has nothing to publish' };
    if (row.kind === 'post') {
      if (first.type !== 'image') return { error: 'A feed post is published from an image' };
      input = { imageURL: first.url, caption };
    } else if (row.kind === 'reel') {
      if (first.type !== 'video') return { error: 'A reel is published from a video' };
      const options = row.reel && typeof row.reel === 'object' ? (row.reel as Record<string, unknown>) : {};
      /* The cover never passes through `asMediaItem` — it is read straight off
         the row — so it is checked here or nowhere. */
      if (typeof options.coverURL === 'string' && options.coverURL) {
        const problem = mediaUrlProblem(options.coverURL.trim());
        if (problem) return { error: problem };
      }
      input = {
        videoURL: first.url,
        caption,
        ...(typeof options.coverURL === 'string' && options.coverURL ? { coverURL: options.coverURL } : {}),
        ...(typeof options.shareToFeed === 'boolean' ? { shareToFeed: options.shareToFeed } : {}),
        ...(typeof options.thumbOffset === 'number' ? { thumbOffset: Math.trunc(options.thumbOffset) } : {}),
      };
    } else {
      input = { mediaType: first.type === 'video' ? 'Video' : 'Image', mediaURL: first.url };
    }
  }

  return {
    field,
    query: `mutation CfInstagramPublish($botID: BotID!, $input: ${INSTAGRAM_INPUT_TYPE[row.kind]}) { ${field}(botID: $botID, input: $input) { id permalink } }`,
    variables: { input },
  };
}

/** What the scheduler presents to show a callback really came from this deployment's database. */
const PUBLISH_KEY_HEADER = 'x-chatfuel-publish-key';

const publishingMisconfigured = (res: ServerResponse): void =>
  sendSyntheticEnvelope(
    res,
    500,
    'PUBLISHING_SECRET is not set — this deployment cannot schedule posts',
    'ProxyInstagramMisconfigured',
  );

/** sha256, base64 — the same string the database stores and the scheduler sends. */
const sha256b64 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('base64');

/**
 * Constant time, and length-independent because both sides are hashed first:
 * timingSafeEqual throws on a length mismatch, and the length of what somebody
 * guessed is not a thing worth leaking either.
 */
const secretsMatch = (provided: string, expected: string): boolean =>
  timingSafeEqual(
    createHash('sha256').update(provided, 'utf8').digest(),
    createHash('sha256').update(expected, 'utf8').digest(),
  );

/** What a deployment that has not been told its own address is answered with. */
const PUBLIC_URL_REQUIRED_MESSAGE =
  'PUBLIC_URL is not set — this deployment cannot say where the scheduler should call back';

/** Answer a refusal the database wrote, or 503 when it could not be asked at all. */
async function sendQueueFailure(res: ServerResponse, response: Response | null): Promise<void> {
  const refused = response ? await rpcRefusal(response, 'QueueRequestRefused') : null;
  if (refused) {
    sendSyntheticEnvelope(res, refused.status, refused.message, refused.code);
    return;
  }
  sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
}

/**
 * Whether this deployment can actually make a post go out unattended: the
 * database knows where to knock, it has a credential to knock with, and this
 * side still holds the secret that credential is derived from. All three, or
 * the app must not offer a time picker at all.
 */
export async function instagramScheduling(
  ctx: ProxyContext,
): Promise<{ ok: true; scheduling: boolean } | { ok: false }> {
  try {
    const response = await rpcAsService(ctx, 'cf_pub_config_json', {});
    if (response.status !== 200) return { ok: false };
    const row = (await response.json()) as { publish_url?: unknown; has_secret?: unknown } | null;
    const registered = typeof row?.publish_url === 'string' && row.publish_url.length > 0;
    return {
      ok: true,
      scheduling: registered && row?.has_secret === true && Boolean(ctx.config.instagram?.publishSecret),
    };
  } catch {
    return { ok: false };
  }
}

export async function handlePublishingConfig(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const admission = await admitRequest(ctx, req, res);
  if (!admission) return;
  if ((req.method ?? 'GET').toUpperCase() !== 'GET') {
    send405(res, 'GET');
    return;
  }
  const state = await instagramScheduling(ctx);
  if (!state.ok) {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }
  sendJson(res, 200, { scheduling: state.scheduling });
}

/**
 * Record where the scheduler should knock.
 *
 * One row of this exists for the whole deployment, and what goes in it decides
 * where the database posts a credential — the callback key, and the host's
 * protection bypass — every minute from then on. Both halves of this route
 * follow from that.
 *
 * THE ADDRESS IS `PUBLIC_URL` AND NOTHING ELSE. Not a body field, not
 * `x-forwarded-host`, and not `host` either. A platform routes by `host` and
 * will not deliver a request for a name it does not serve — but that is the
 * platform's property and not this code's, and a server run directly answers to
 * whatever name it is handed. A deployment that has not said which name it
 * answers to cannot register, and is told so.
 *
 * THE CALLER IS THE ADMIN PANEL'S HOLDER, not a signed-in user. Workspace role
 * is the wrong question for a row that belongs to the deployment rather than to
 * any workspace in it: `cf_claim_workspace` makes every sign-up the owner of
 * the workspace it opens for them, so `role = 'owner'` is not a smaller set
 * than "anybody who registered an account" — and in a deployment serving an
 * agency's clients it never was. `requireAdmin` asks the one question that
 * matches the scope of the write: does this caller hold ADMIN_PASSWORD.
 *
 * The admin check comes before the secret check on purpose, so a caller who is
 * not the admin cannot learn whether PUBLISHING_SECRET is set.
 */
export async function handlePublishingRegister(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { auth, instagram, publishingPath } = ctx.config;
  if (!ctx.gate || !auth?.serviceRoleKey) {
    // Never mounted without both — but answer rather than hang if a host ever
    // calls this directly.
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    send405(res, 'POST');
    return;
  }
  if (!requireAdmin(ctx, req, res)) return;
  if (!instagram?.publishSecret) {
    publishingMisconfigured(res);
    return;
  }
  const origin = ctx.config.publicUrl;
  if (!origin) {
    sendSyntheticEnvelope(res, 409, PUBLIC_URL_REQUIRED_MESSAGE, 'ProxyPublicUrlMissing');
    return;
  }

  const url = `${origin}${publishingPath}/publish-due`;
  try {
    const recorded = await rpcAsService(ctx, 'cf_pub_register', {
      p_url: url,
      // The deployment's own protection bypass, so the callback is not turned
      // away at the edge before any of this runs.
      p_bypass: instagram.bypassSecret ?? null,
      // The database is given the HASH and never the secret: it sends this
      // back as the callback's credential, and this side proves itself in the
      // other direction with the value the hash was made from.
      p_secret_hash: sha256b64(instagram.publishSecret),
    });
    if (recorded.status !== 200) {
      await sendQueueFailure(res, recorded);
      return;
    }
  } catch {
    await sendQueueFailure(res, null);
    return;
  }
  sendJson(res, 200, { scheduling: true, publishUrl: url });
}

/**
 * The bot this request is about, checked against the ones the caller may
 * actually open. Returns undefined when the answer has already been written.
 *
 * Every queue route goes through this, and every one of them REQUIRES a bot:
 * a request that named none would be a request to read the whole deployment's
 * posts, which is precisely what must not be possible.
 */
export async function instagramBotOf(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  admission: Admission,
): Promise<string | undefined> {
  const botId = new URLSearchParams(searchOf(req).slice(1)).get('botID')?.trim();
  if (!botId) {
    sendSyntheticEnvelope(res, 400, 'A botID is required', 'InvalidRequest');
    return undefined;
  }
  const lookup = await fenceFor(ctx, admission);
  if (!lookup.ok) {
    sendSyntheticEnvelope(res, 503, FENCE_UNAVAILABLE_MESSAGE, 'ProxyFenceUnavailable');
    return undefined;
  }
  if (!botAllowed(botId, lookup.ids)) {
    if (admission.botIds?.size === 0) {
      sendSyntheticEnvelope(res, 403, GATE_MESSAGES.AuthTenantForbidden, 'AuthTenantForbidden');
      return undefined;
    }
    sendSyntheticEnvelope(res, 403, botBlockedMessage(botId, Boolean(admission.botIds)), 'BotNotAllowed');
    return undefined;
  }
  return botId;
}

/** The one place a queue RPC's answer becomes a response. */
async function sendQueueRpc(
  ctx: ProxyContext,
  res: ServerResponse,
  name: string,
  body: unknown,
  key: 'post' | 'posts',
): Promise<void> {
  let response: Response;
  try {
    response = await rpcAsService(ctx, name, body);
  } catch {
    await sendQueueFailure(res, null);
    return;
  }
  if (response.status !== 200) {
    await sendQueueFailure(res, response);
    return;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    await sendQueueFailure(res, null);
    return;
  }
  sendJson(res, 200, { [key]: payload });
}

export async function handlePublishingPosts(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<void> {
  const admission = await admitRequest(ctx, req, res);
  if (!admission) return;
  const method = (req.method ?? 'GET').toUpperCase();
  const root = `${ctx.config.publishingPath}/posts`;
  const rest = pathname === root ? '' : pathname.slice(`${root}/`.length);
  let postId: string | undefined;
  try {
    postId = rest ? decodeURIComponent(rest) : '';
  } catch {
    postId = undefined; // a malformed escape names no post
  }
  if (postId === undefined || rest.includes('/') || (postId !== '' && !POST_ID_RE.test(postId))) {
    sendSyntheticEnvelope(res, 404, 'No such post', 'PostNotFound');
    return;
  }
  const allowed = postId === '' ? method === 'GET' || method === 'POST' : method === 'PATCH' || method === 'DELETE';
  if (!allowed) {
    send405(res, postId === '' ? 'GET, POST' : 'PATCH, DELETE');
    return;
  }

  const botId = await instagramBotOf(ctx, req, res, admission);
  if (botId === undefined) return;

  if (method === 'GET') {
    await sendQueueRpc(ctx, res, 'cf_pub_list', { p_bot_id: botId }, 'posts');
    return;
  }
  if (method === 'DELETE') {
    await sendQueueRpc(ctx, res, 'cf_pub_delete', { p_bot_id: botId, p_id: postId }, 'post');
    return;
  }

  const read = await readJsonBodyCapped(req, JSON_BODY_MAX_BYTES);
  if (read.tooLarge) {
    refuseOversizedBody(req, res);
    return;
  }
  const body = read.value;
  if (!body || typeof body !== 'object') {
    sendSyntheticEnvelope(res, 400, 'The body must be a post', 'InvalidRequest');
    return;
  }
  if (method === 'POST') {
    await sendQueueRpc(ctx, res, 'cf_pub_create', { p_bot_id: botId, p_post: body }, 'post');
    return;
  }
  await sendQueueRpc(ctx, res, 'cf_pub_update', { p_bot_id: botId, p_id: postId, p_patch: body }, 'post');
}

/**
 * The scheduler's callback: publish ONE post, then write down what happened.
 *
 * There is no session on this request — nothing signed in sent it — so a
 * shared secret is the whole of its authentication, compared in constant time
 * against the hash this side derives from the secret it holds.
 *
 * WHAT THE PRESENTED VALUE AUTHORIZES. The caller presents the sha256 of the
 * secret, which is the same value cf_pub_config stores — so whoever can read
 * that column can call this route. That reads worse than it is, and the reach
 * is worth stating exactly rather than as "compromise of the DB":
 *
 *   - The column is not readable by the app's own key. cf_pub_config has RLS on
 *     with no policies and `revoke all … from anon, authenticated, service_role`,
 *     and cf_pub_config_json() answers with `has_secret` booleans, never the
 *     hash. Reading it takes owner-level access to the project.
 *   - Presenting it publishes nothing of the caller's choosing. The body is one
 *     post id, and cf_pub_take only yields a row already at `status =
 *     'publishing'` with `taken_at is null` — a row cf_pub_claim_due flipped
 *     this minute and whose callback has not landed yet. The content published
 *     is the row's, which the caller did not write.
 *
 * So the value is bearer-equivalent for a race with the scheduler over a post
 * the scheduler had already decided to publish, and for nothing else. Anyone
 * who can read it can also rewrite the queue rows and let cron publish for
 * them a minute later, which is strictly more. Hence no second credential
 * here: it would protect a capability its holder already has by other means.
 *
 * The outcome is written back from here rather than read out of this
 * response, and that is the point: the request that triggered it is
 * fire-and-forget, and a publish that sits for five minutes waiting on a
 * transcode will routinely outlive any record of the answer. So the work
 * finishing and the caller hearing about it are separate events, and only the
 * first one matters.
 */
export async function handlePublishDue(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { auth, instagram, token } = ctx.config;
  if (!auth?.serviceRoleKey) {
    // Never mounted without the key — but answer rather than hang if a host
    // ever calls this directly.
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
    send405(res, 'POST');
    return;
  }
  const secret = instagram?.publishSecret;
  if (!secret) {
    publishingMisconfigured(res);
    return;
  }
  const presented = req.headers[PUBLISH_KEY_HEADER];
  const provided = typeof presented === 'string' ? presented : '';
  if (!provided || !secretsMatch(provided, sha256b64(secret))) {
    sendSyntheticEnvelope(res, 401, 'Not allowed', 'NotAllowed');
    return;
  }
  if (!token) {
    sendSyntheticEnvelope(res, 500, ctx.tokenMissingMessage, 'ProxyTokenMissing');
    return;
  }

  const body = await readJsonBodyCapped(req, JSON_BODY_MAX_BYTES);
  if (body.tooLarge) {
    refuseOversizedBody(req, res);
    return;
  }
  const asked = body.value as { id?: unknown } | null | undefined;
  const postId = typeof asked?.id === 'string' && asked.id ? asked.id : undefined;
  if (!postId || !POST_ID_RE.test(postId)) {
    sendSyntheticEnvelope(res, 400, 'Body must be {"id": "<post id>"}', 'InvalidRequest');
    return;
  }

  // Taking the post is a write, so a callback delivered twice publishes once.
  let row: PublishRow;
  try {
    const taken = await rpcAsService(ctx, 'cf_pub_take', { p_id: postId });
    if (taken.status !== 200) {
      await sendQueueFailure(res, taken);
      return;
    }
    row = (await taken.json()) as PublishRow;
  } catch {
    await sendQueueFailure(res, null);
    return;
  }

  const operation = publishOperation(row);
  if ('error' in operation) {
    await reportPublish(ctx, secret, postId, row.botId, 'failed', null, null, operation.error);
    sendJson(res, 200, { id: postId, status: 'failed' });
    return;
  }

  const outcome = await publishToChatfuel(ctx, row, operation);
  await reportPublish(
    ctx,
    secret,
    postId,
    row.botId,
    outcome.ok ? 'published' : 'failed',
    outcome.ok ? outcome.mediaId : null,
    outcome.ok ? outcome.permalink : null,
    outcome.ok ? null : outcome.error,
  );
  sendJson(res, 200, { id: postId, status: outcome.ok ? 'published' : 'failed' });
}

/** One publish, with the budget a transcode needs rather than the ordinary one. */
async function publishToChatfuel(
  ctx: ProxyContext,
  row: PublishRow,
  operation: { field: string; query: string; variables: Record<string, unknown> },
): Promise<{ ok: true; mediaId: string | null; permalink: string | null } | { ok: false; error: string }> {
  const { timeoutMs, slowTimeoutMs } = ctx.config;
  let payload: unknown;
  try {
    payload = await upstreamGraphql(
      ctx,
      operation.query,
      { botID: row.botId, ...operation.variables },
      // The same rule the forwarded path uses, read off the same field names:
      // these four mutations sit inside the request while the network
      // transcodes, and the ordinary budget turns every video publish into a
      // failure that had already succeeded.
      SLOW_FIELD_RE.test(operation.query) ? slowTimeoutMs : timeoutMs,
    );
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return {
      ok: false,
      error: timedOut ? 'Publishing took too long and was given up on' : 'Chatfuel could not be reached',
    };
  }

  const published = (payload as { data?: Record<string, { id?: unknown; permalink?: unknown } | null> })?.data?.[
    operation.field
  ];
  if (published && typeof published === 'object') {
    return {
      ok: true,
      mediaId: typeof published.id === 'string' ? published.id : null,
      permalink: typeof published.permalink === 'string' && published.permalink ? published.permalink : null,
    };
  }
  /* The platform's own code, verbatim: it sits two `extensions` deep inside a
     generic wrapper, and it names the thing that is wrong (a caption over the
     limit, a carousel of the wrong size, an account whose permissions have
     lapsed) far better than a sentence of ours would. */
  const code = graphqlErrorCodes(payload)[0];
  const message = (payload as { errors?: Array<{ message?: unknown }> })?.errors?.[0]?.message;
  return {
    ok: false,
    error: code ?? (typeof message === 'string' && message ? message : 'Chatfuel refused this post'),
  };
}

/**
 * Write the outcome down, with the shared secret rather than the project's
 * high-value key: recording what happened to one post is all this needs to be
 * able to do. A failure to record is the one thing that cannot be recovered
 * from here — the reaper is what notices it, ten minutes later.
 *
 * The bot goes with it, and it is the bot cf_pub_take just handed back rather
 * than anything the caller of this route said: the secret is one value for the
 * whole deployment, and cf_pub_report refuses a row that belongs to a different
 * bot, so the pair narrows the secret from every post in the project to the
 * posts of one bot.
 */
async function reportPublish(
  ctx: ProxyContext,
  secret: string,
  postId: string,
  botId: string,
  status: 'published' | 'failed',
  mediaId: string | null,
  permalink: string | null,
  error: string | null,
): Promise<void> {
  try {
    await rpcAsAnon(ctx, 'cf_pub_report', {
      p_secret: secret,
      p_id: postId,
      p_bot_id: botId,
      p_status: status,
      p_media_id: mediaId,
      p_permalink: permalink,
      p_error: error,
    });
  } catch {
    /* Nothing useful to say here and nowhere to say it: the request that
       started this may already be gone. The claim goes stale and is swept. */
  }
}
