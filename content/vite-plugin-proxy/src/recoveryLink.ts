/**
 * The admin-issued password-recovery link:
 * POST <authPath>/recovery-link {email} → { delivered: 'server-log' }
 * The link itself is written to the server log, never returned to the caller.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GATE_MESSAGES, bearerOf } from './gate.js';
import {
  JSON_BODY_MAX_BYTES,
  readJsonBodyCapped,
  send405,
  refuseOversizedBody,
  sendJson,
  sendSyntheticEnvelope,
} from './envelope.js';
import { MISCONFIGURED_MESSAGE } from './proxyConfig.js';
import { callerWorkspace, rpcAsCaller, rpcRefusal } from './supabaseRpc.js';
import type { ProxyContext } from './context.js';

/** What a deployment that has not been told its own address is answered with. */
const PUBLIC_URL_REQUIRED_MESSAGE = 'PUBLIC_URL is not set — this deployment cannot build a link to its own reset page';

/**
 * What a deployment that has not opted the server log in is answered with.
 * 501 rather than 403: the caller is allowed, the deployment simply has no way
 * to deliver. The app already reads 501 as "not enabled on this deployment".
 */
const LOGGING_OFF_MESSAGE =
  'Recovery links are not enabled on this deployment — the link would be written to the server log, so it is opt-in (AUTH_RECOVERY_LINK_LOG). Configuring SMTP in Supabase is the alternative that needs no log.';

export async function handleRecoveryLink(ctx: ProxyContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { gate, supabaseFetch } = ctx;
  const { auth } = ctx.config;
  if (!gate || !auth?.serviceRoleKey) {
    // Never mounted without both — but answer rather than hang if a host ever
    // calls this directly.
    sendSyntheticEnvelope(res, 500, MISCONFIGURED_MESSAGE, 'ProxyAuthMisconfigured');
    return;
  }
  if (req.method !== 'POST') {
    send405(res, 'POST');
    return;
  }
  const callerJwt = bearerOf(req.headers.authorization);
  // Checked here rather than left to the gate so the token is a string from
  // this line down: an RPC "as the caller" with no caller is an RPC as the
  // anon key, which is a different request than the one that was asked for.
  if (!callerJwt) {
    sendSyntheticEnvelope(res, 401, GATE_MESSAGES.AuthSessionRequired, 'AuthSessionRequired');
    return;
  }
  const caller = await gate.verify(callerJwt);
  if (!caller.ok) {
    sendSyntheticEnvelope(res, caller.status, caller.message, caller.code);
    return;
  }
  const workspace = await callerWorkspace(ctx, callerJwt);
  if (workspace === 'unavailable') {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }
  if (!workspace || (workspace.role !== 'owner' && workspace.role !== 'admin')) {
    sendSyntheticEnvelope(res, 403, 'Only admins can issue recovery links', 'NotEnoughPermissions');
    return;
  }
  // Refused before anything is minted. The link this route would build is a
  // working credential for somebody else's account, and the server log is the
  // whole of its delivery — so a deployment that has not said its logs are a
  // fit place for one gets no link, rather than a link it did not ask for.
  //
  // Asked here rather than first: whether this deployment writes links to its
  // log is a fact about its configuration, and the people who may learn it are
  // the ones the route admits. A caller with no session cannot tell an opted-in
  // deployment from an opted-out one — both answer 401.
  if (!ctx.config.recoveryLinkLogging) {
    sendSyntheticEnvelope(res, 501, LOGGING_OFF_MESSAGE, 'RecoveryLinkNotEnabled');
    return;
  }
  // The address is PUBLIC_URL and nothing else. `Origin`, `X-Forwarded-Host`
  // and `Host` are all written by whoever sent the request, and this link
  // carries a working reset token for someone else's account: an admin who
  // chose the host would be handing the operator a link that mails the token
  // to a domain of the admin's choosing. Unset means refuse, not guess.
  const origin = ctx.config.publicUrl;
  if (!origin) {
    sendSyntheticEnvelope(res, 409, PUBLIC_URL_REQUIRED_MESSAGE, 'ProxyPublicUrlMissing');
    return;
  }
  const body = await readJsonBodyCapped(req, JSON_BODY_MAX_BYTES);
  if (body.tooLarge) {
    refuseOversizedBody(req, res);
    return;
  }
  const asked = body.value as { email?: unknown } | null | undefined;
  const email = typeof asked?.email === 'string' ? asked.email.trim().toLowerCase() : undefined;
  if (!email || !email.includes('@')) {
    sendSyntheticEnvelope(res, 400, 'Body must be {"email": "<member email>"}', 'InvalidRequest');
    return;
  }

  // Every question about the target is the database's, asked with the CALLER's
  // JWT so it is answered against their identity and not the server's: is that
  // email a member here, do they rank below the caller, and — the one this
  // route cannot see for itself — do they stand in some OTHER workspace too. A
  // recovery link resets the account, not the membership, so a target who
  // belongs elsewhere would carry an admin of this workspace into one they were
  // never admitted to. The same call writes the audit row: the link goes to the
  // server log, and a log is not a record of who asked for one.
  let authorized: Response;
  try {
    authorized = await rpcAsCaller(
      ctx,
      'cf_recovery_authorize',
      { p_tenant_id: workspace.tenantId, p_email: email },
      callerJwt,
    );
  } catch {
    sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
    return;
  }
  if (authorized.status < 200 || authorized.status >= 300) {
    const refusal = await rpcRefusal(authorized, 'NotEnoughPermissions');
    if (!refusal) {
      sendSyntheticEnvelope(res, 503, GATE_MESSAGES.ProxyAuthUnavailable, 'ProxyAuthUnavailable');
      return;
    }
    sendSyntheticEnvelope(res, refusal.status, refusal.message, refusal.code);
    return;
  }

  let hashedToken: string | undefined;
  try {
    const genRes = await supabaseFetch(`${auth.supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: auth.serviceRoleKey,
        authorization: `Bearer ${auth.serviceRoleKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ type: 'recovery', email }),
      signal: AbortSignal.timeout(10_000),
    });
    if (genRes.status < 200 || genRes.status >= 300) throw new Error(`generate_link ${genRes.status}`);
    // GoTrue answers a flat object (hashed_token, action_link, …); supabase-js
    // wraps the same fields under `properties` — accept both shapes.
    const parsed = (await genRes.json()) as { hashed_token?: unknown; properties?: { hashed_token?: unknown } };
    const raw = parsed.hashed_token ?? parsed.properties?.hashed_token;
    hashedToken = typeof raw === 'string' && raw.length > 0 ? raw : undefined;
  } catch {
    hashedToken = undefined;
  }
  if (!hashedToken) {
    sendSyntheticEnvelope(res, 502, 'Supabase could not issue a recovery link', 'RecoveryLinkFailed');
    return;
  }

  const url = `${origin}/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
  // Never returned to the caller: a link handed back over the API is an account
  // takeover primitive for any authenticated admin. It goes to the server log
  // instead, where the reach is the deployment's log access, not a session.
  //
  // That reach is real, and it is the price of a deployment with no mail
  // channel: WHOEVER CAN READ THIS DEPLOYMENT'S LOGS CAN TAKE THE ACCOUNT THE
  // LINK NAMES, until the link is used or expires. On the hosts this app is
  // built to run on that is every member of the Vercel project, anyone with
  // shell or journal access on your own server, and anyone who can run
  // `docker logs` — a wider set than the owners and admins this route admits.
  // Which is why the write is opt-in above. Configure SMTP in Supabase and this
  // route is not the one to use at all.
  //
  // Written as one greppable line, and saying what it is rather than only what
  // it names: an operator who has to find every credential their logs ever held
  // — to redact a shipped log, or after somebody left — needs a marker, and
  // `RECOVERY-LINK` is it. The workspace and the asking role come along because
  // a log read months later is read without the audit table open; who exactly
  // asked is in cf_recovery_events, which is the record that cannot be rotated
  // away with the logs.
  console.error(
    `[chatfuel-proxy] RECOVERY-LINK issued by ${workspace.role} of workspace ${workspace.tenantId} for ${email} — this URL is that account until it is used: ${url}`,
  );
  sendJson(res, 200, { delivered: 'server-log' });
}
