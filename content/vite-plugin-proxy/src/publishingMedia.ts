/**
 * Durable storage for what a scheduled post is made of.
 *
 * The platform's own uploads are short-lived, and its API does not expose the
 * deadline at all — so a post composed this afternoon and due tomorrow morning
 * would be published from a URL that had stopped resolving, and the failure
 * would come back from the network saying nothing useful. The bytes therefore go in this deployment's own bucket, which is
 * public because the network fetches them itself and can present no
 * credential.
 *
 * A public bucket behind an authenticated route is still somewhere a person
 * could park arbitrary files, which is what the ceiling and the type list
 * below are for. The host may enforce a smaller request-body limit of its own,
 * before any of this runs.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readBodyCapped, refuseOversizedBody, searchOf, send405, sendJson, sendSyntheticEnvelope } from './envelope.js';
import { MISCONFIGURED_MESSAGE } from './proxyConfig.js';
import { admitRequest } from './admission.js';
import { instagramBotOf } from './publishing.js';
import { rpcAsService } from './supabaseRpc.js';
import type { ProxyContext } from './context.js';

/**
 * One named file out of a multipart/form-data body.
 *
 * Hand-rolled because this directory is vendored into the app it serves and may
 * import nothing but node's own built-ins: the whole of what is needed is the
 * part with a given `name`, its declared content type and its bytes, and none of
 * that wants a parser with a dependency tree. Null means the body was not
 * multipart, carried no boundary, or had no such part.
 */
export function parseMultipartFile(
  body: Buffer,
  contentType: string | undefined,
  field: string,
): { filename: string; contentType: string; bytes: Buffer } | null {
  const declared = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
  const marker = (declared?.[1] ?? declared?.[2])?.trim();
  if (!marker) return null;
  const delimiter = Buffer.from(`--${marker}`);

  let at = body.indexOf(delimiter);
  while (at >= 0) {
    let start = at + delimiter.length;
    // `--` straight after the boundary is the closing delimiter: no more parts.
    if (body.subarray(start, start + 2).toString('latin1') === '--') return null;
    if (body.subarray(start, start + 2).toString('latin1') === '\r\n') start += 2;
    const headEnd = body.indexOf('\r\n\r\n', start);
    if (headEnd < 0) return null;
    const head = body.subarray(start, headEnd).toString('utf8');
    const next = body.indexOf(delimiter, headEnd);
    // The CRLF before the next delimiter belongs to the delimiter, not the file.
    const bodyStart = headEnd + 4;
    const bodyEnd = Math.max(next < 0 ? body.length : next - 2, bodyStart);

    const disposition = /content-disposition:[^\r\n]*/i.exec(head)?.[0] ?? '';
    if (/\bname="([^"]*)"/i.exec(disposition)?.[1] === field) {
      return {
        filename: /\bfilename="([^"]*)"/i.exec(disposition)?.[1] ?? '',
        contentType: (/content-type:\s*([^\r\n;]+)/i.exec(head)?.[1] ?? '').trim().toLowerCase(),
        bytes: body.subarray(bodyStart, bodyEnd),
      };
    }
    if (next < 0) return null;
    at = next;
  }
  return null;
}

const INSTAGRAM_MEDIA_MAX_BYTES = 25 * 1024 * 1024;
const INSTAGRAM_MEDIA_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/**
 * What the FIRST BYTES say the file is, which is the only party to this that
 * has no motive.
 *
 * The multipart `content-type` is the caller's claim about their own upload,
 * and the bucket is public: believing the claim means an authenticated caller
 * can park arbitrary bytes at a stable URL on the deployment's own Supabase
 * domain, labelled `image/jpeg` and served with the content type they chose.
 * That is somebody else's phishing page, hosted by the operator.
 *
 * So the claim has to survive the bytes. Five formats, five signatures:
 *   JPEG  FF D8 FF
 *   PNG   89 50 4E 47 0D 0A 1A 0A
 *   WebP  'RIFF' ???? 'WEBP'
 *   MP4   ???? 'ftyp' — the box length comes first, then the brand
 *   MOV   the same ISO-BMFF container; the brand inside `ftyp` separates them
 *
 * MP4 and MOV are one container with different brands, and the brand list is
 * long and vendor-extended, so both are accepted for either claim: the point is
 * that the bytes are an ISO base-media file rather than a script, not which
 * editor wrote them.
 */
const ISO_BMFF_AT = 4;
const ISO_BMFF = Buffer.from('ftyp', 'latin1');

function looksLike(bytes: Buffer, contentType: string): boolean {
  const starts = (...prefix: number[]): boolean =>
    bytes.length >= prefix.length && prefix.every((byte, at) => bytes[at] === byte);
  switch (contentType) {
    case 'image/jpeg':
      return starts(0xff, 0xd8, 0xff);
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/webp':
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
        bytes.subarray(8, 12).toString('latin1') === 'WEBP'
      );
    case 'video/mp4':
    case 'video/quicktime':
      return bytes.length >= ISO_BMFF_AT + ISO_BMFF.length && bytes.subarray(ISO_BMFF_AT, 8).equals(ISO_BMFF);
    default:
      return false;
  }
}

/**
 * How much of the bucket one bot has already taken — after the objects nothing
 * points at any more have been let go.
 *
 * The per-file ceiling is not a ceiling on the bucket: 25 MB at a time, as often
 * as an authenticated caller likes, is unbounded storage on somebody else's bill,
 * served publicly. So the upload route asks the bucket what is there before it
 * adds to it, and refuses past the quota.
 *
 * The same listing pays for the sweep. The composer uploads BEFORE it saves, so
 * a draft abandoned mid-compose leaves bytes behind that no post will ever name:
 * old and unreferenced together make an object safe to drop, and neither does on
 * its own — recent-and-unreferenced is the post somebody is still writing, and
 * old-and-referenced is a post that went out last spring and is still on screen.
 *
 * Both are per bot, because the prefix is the only tenancy this bucket has.
 */
const MEDIA_PAGE = 100;
const MEDIA_PAGES = 40;
const MEDIA_SWEEP_MAX = 100;
/** What cf_pub_list stops at — past it, its answer is not the whole truth. */
const POST_LIST_LIMIT = 1000;

/** One object as the storage API lists it; every field is the network's word. */
interface StoredObject {
  name?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  metadata?: { size?: unknown } | null;
}

/** The service-role headers every call in this file sends. */
const asService = (ctx: ProxyContext): Record<string, string> => ({
  apikey: ctx.config.auth!.serviceRoleKey!,
  authorization: `Bearer ${ctx.config.auth!.serviceRoleKey!}`,
  'content-type': 'application/json',
  accept: 'application/json',
});

/**
 * Everything under `${botId}/`, or null when the bucket would not say.
 *
 * `truncated` means the listing stopped before the bucket did: the caller may
 * not conclude anything about the total from a partial answer, and treats it as
 * over the quota rather than under it.
 */
async function listBotMedia(
  ctx: ProxyContext,
  botId: string,
): Promise<{ objects: StoredObject[]; truncated: boolean } | null> {
  const auth = ctx.config.auth!;
  const objects: StoredObject[] = [];
  for (let page = 0; page < MEDIA_PAGES; page += 1) {
    let listed: unknown;
    try {
      const response = await ctx.supabaseFetch(`${auth.supabaseUrl}/storage/v1/object/list/${ctx.config.mediaBucket}`, {
        method: 'POST',
        headers: asService(ctx),
        body: JSON.stringify({
          prefix: `${botId}/`,
          limit: MEDIA_PAGE,
          offset: page * MEDIA_PAGE,
          sortBy: { column: 'name', order: 'asc' },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) return null;
      listed = await response.json();
    } catch {
      return null;
    }
    if (!Array.isArray(listed)) return null;
    objects.push(...(listed as StoredObject[]));
    if (listed.length < MEDIA_PAGE) return { objects, truncated: false };
  }
  return { objects, truncated: true };
}

/**
 * The object names this bot's posts still mention, or null when the answer
 * would be incomplete — in which case NOTHING is swept.
 *
 * Read out of the whole serialised row rather than out of `media[].url`: a reel
 * carries a cover of its own, and a shape this side does not know about is
 * exactly the shape whose bytes would go missing.
 */
async function referencedMedia(ctx: ProxyContext, botId: string): Promise<ReadonlySet<string> | null> {
  let posts: unknown;
  try {
    const listed = await rpcAsService(ctx, 'cf_pub_list', { p_bot_id: botId });
    if (!listed.ok) return null;
    posts = await listed.json();
  } catch {
    return null;
  }
  if (!Array.isArray(posts) || posts.length >= POST_LIST_LIMIT) return null;
  const literal = (value: string): string => value.replace(/[.]/g, '\\.');
  const mention = new RegExp(`${literal(ctx.config.mediaBucket)}/${literal(botId)}/([A-Za-z0-9._-]+)`, 'g');
  const names = new Set<string>();
  for (const post of posts) {
    for (const [, name] of JSON.stringify(post).matchAll(mention)) names.add(name!);
  }
  return names;
}

/** When the storage API says an object appeared, or NaN when it did not say. */
const storedAt = (object: StoredObject): number => {
  const stamp = typeof object.created_at === 'string' ? object.created_at : object.updated_at;
  return typeof stamp === 'string' ? Date.parse(stamp) : Number.NaN;
};

/** What it weighs, as far as the listing knows. */
const sizeOf = (object: StoredObject): number => {
  const size = Number(object.metadata?.size);
  return Number.isFinite(size) && size > 0 ? size : 0;
};

/**
 * Bytes this bot holds after the sweep, or null when they could not be counted.
 *
 * Null is the transient case — the bucket did not answer — and the caller lets
 * the upload through on it: a storage hiccup that stopped every upload would be
 * a worse outage than a quota that was briefly not enforced, and the per-file
 * ceiling still holds. Infinity is the other kind of not-counted: more objects
 * than the listing walks, which is over any quota by construction.
 */
async function reclaimAndMeasure(ctx: ProxyContext, botId: string): Promise<number | null> {
  const listing = await listBotMedia(ctx, botId);
  if (!listing) return null;
  if (listing.truncated) return Number.POSITIVE_INFINITY;

  const staleBefore = Date.now() - ctx.config.mediaTtlMs;
  const stale = listing.objects.filter((object) => {
    const at = storedAt(object);
    // An object with no readable date is not old; it is unknown, and unknown
    // does not get deleted.
    return Number.isFinite(at) && at < staleBefore && typeof object.name === 'string' && object.name.length > 0;
  });

  const gone = new Set<string>();
  if (stale.length > 0) {
    const referenced = await referencedMedia(ctx, botId);
    const orphans = referenced
      ? stale.map((object) => object.name as string).filter((name) => !referenced.has(name))
      : [];
    if (orphans.length > 0) {
      const batch = orphans.slice(0, MEDIA_SWEEP_MAX);
      try {
        const removed = await ctx.supabaseFetch(
          `${ctx.config.auth!.supabaseUrl}/storage/v1/object/${ctx.config.mediaBucket}`,
          {
            method: 'DELETE',
            headers: asService(ctx),
            body: JSON.stringify({ prefixes: batch.map((name) => `${botId}/${name}`) }),
            signal: AbortSignal.timeout(60_000),
          },
        );
        // A sweep that did not happen is not an error anybody needs to hear
        // about; those bytes stay counted and the next upload tries again.
        if (removed.ok) for (const name of batch) gone.add(name);
      } catch {
        /* keep counting them */
      }
    }
  }

  let used = 0;
  for (const object of listing.objects) {
    if (typeof object.name === 'string' && gone.has(object.name)) continue;
    used += sizeOf(object);
  }
  return used;
}

/** The object's public address — the one a publish input carries. */
const mediaUrlOf = (ctx: ProxyContext, key: string): string =>
  `${ctx.config.auth!.supabaseUrl}/storage/v1/object/public/${ctx.config.mediaBucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

export async function handlePublishingMedia(
  ctx: ProxyContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { supabaseFetch } = ctx;
  const { auth } = ctx.config;
  if (!auth?.serviceRoleKey) {
    // Never mounted without the key — but answer rather than hang if a host
    // ever calls this directly.
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  const admission = await admitRequest(ctx, req, res);
  if (!admission) return;
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'DELETE') {
    send405(res, 'POST, DELETE');
    return;
  }
  const botId = await instagramBotOf(ctx, req, res, admission);
  if (botId === undefined) return;
  /* Object keys start with the bot id, which is what keeps one tenant's media
     separable from another's — so a bot id that is not key-shaped has no key
     to be given. Every id that gets this far is one this account really owns. */
  if (!/^[A-Za-z0-9_-]+$/.test(botId)) {
    sendSyntheticEnvelope(res, 422, 'This bot cannot store media', 'BadBotId');
    return;
  }

  if (method === 'DELETE') {
    const key = new URLSearchParams(searchOf(req).slice(1)).get('key')?.trim() ?? '';
    // The same fence, one layer down: a key outside this bot's own prefix is
    // somebody else's object however the caller came by it. The shape is the
    // one this route writes, so anything else names nothing it could delete.
    //
    // `.` and `..` are named separately because the file half of the pattern
    // has to allow dots — real names carry extensions — and `..` therefore
    // matches it. What happens to a key with a `..` segment is then whatever
    // the storage side does when it normalises, which is not a question this
    // route should be asking on a DELETE.
    const name = key.slice(key.indexOf('/') + 1);
    if (
      !key ||
      !key.startsWith(`${botId}/`) ||
      name === '.' ||
      name === '..' ||
      !/^[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(key)
    ) {
      sendSyntheticEnvelope(res, 404, 'No such file', 'MediaNotFound');
      return;
    }
    try {
      const removed = await supabaseFetch(`${auth.supabaseUrl}/storage/v1/object/${ctx.config.mediaBucket}/${key}`, {
        method: 'DELETE',
        headers: { apikey: auth.serviceRoleKey, authorization: `Bearer ${auth.serviceRoleKey}` },
        signal: AbortSignal.timeout(30_000),
      });
      // Already gone is the state this asks for, not a failure.
      if (removed.status >= 400 && removed.status !== 404) throw new Error(`storage ${removed.status}`);
    } catch {
      sendSyntheticEnvelope(res, 502, 'That file could not be removed', 'MediaDeleteFailed');
      return;
    }
    sendJson(res, 200, { key });
    return;
  }

  let body: Buffer | null;
  try {
    body = await readBodyCapped(req, INSTAGRAM_MEDIA_MAX_BYTES);
  } catch {
    return; // the upload was abandoned halfway; there is nobody left to answer
  }
  if (body === null) {
    refuseOversizedBody(req, res, 'MediaTooLarge', 'That file is too large');
    return;
  }
  const part = parseMultipartFile(body, req.headers['content-type'], 'file');
  if (!part || part.bytes.length === 0) {
    sendSyntheticEnvelope(res, 400, 'The body must carry a file', 'InvalidRequest');
    return;
  }
  const extension = INSTAGRAM_MEDIA_TYPES[part.contentType];
  if (!extension) {
    sendSyntheticEnvelope(res, 415, 'That kind of file cannot be published', 'MediaTypeNotAllowed');
    return;
  }
  /* The header said what this is; the bytes have to agree. Same status as an
     unlisted type, because from the caller's side it is the same answer: this
     file is not one of the five kinds that can be published. */
  if (!looksLike(part.bytes, part.contentType)) {
    sendSyntheticEnvelope(res, 415, 'That file is not the kind of file it says it is', 'MediaTypeMismatch');
    return;
  }
  /* What this bot already keeps, minus what nothing points at any more. A file
     that would not fit is refused before it is stored — 507 because the request
     is not the problem, the room is. */
  const used = await reclaimAndMeasure(ctx, botId);
  if (used !== null && used + part.bytes.length > ctx.config.mediaQuotaBytes) {
    sendSyntheticEnvelope(
      res,
      507,
      'This bot is holding as much media as the deployment keeps for one bot — delete something first',
      'MediaQuotaExceeded',
    );
    return;
  }
  const key = `${botId}/${randomUUID()}.${extension}`;
  try {
    const stored = await supabaseFetch(`${auth.supabaseUrl}/storage/v1/object/${ctx.config.mediaBucket}/${key}`, {
      method: 'POST',
      headers: {
        apikey: auth.serviceRoleKey,
        authorization: `Bearer ${auth.serviceRoleKey}`,
        'content-type': part.contentType,
        // The name carries a random id, so the bytes behind it never change.
        'cache-control': 'public, max-age=31536000, immutable',
      },
      // A Buffer IS a Uint8Array and needs no copy to be sent; only the fetch
      // typings insist otherwise, and copying 25 MB to please them would not.
      body: part.bytes as unknown as BodyInit,
      signal: AbortSignal.timeout(120_000),
    });
    if (stored.status < 200 || stored.status >= 300) throw new Error(`storage ${stored.status}`);
  } catch {
    sendSyntheticEnvelope(res, 502, 'That file could not be stored', 'MediaUploadFailed');
    return;
  }
  sendJson(res, 200, { url: mediaUrlOf(ctx, key), key });
}
