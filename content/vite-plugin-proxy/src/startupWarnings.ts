/**
 * The startup lines for the two shapes a deployment can be in that nothing
 * inside a running deployment says out loud: this process answering strangers
 * under the master token, and the identities behind the auth gate being ones
 * nobody checked.
 *
 * Neither is a defect. The wizard produces both on purpose, because each is the
 * right shape for a case — open mode is what `npm run dev` on a laptop wants,
 * and a project with no SMTP has to auto-confirm or nobody could finish signing
 * up at all. What makes them worth a line is that they are invisible from the
 * inside: a deployment that meant to be a laptop and ended up on a public
 * hostname looks like every other deployment, and the only moment anyone is
 * reading is the boot.
 *
 * Everything here is advisory. No warning refuses a request — the fences that
 * do that are elsewhere and answer for themselves — and a warning that cannot
 * be worked out is dropped rather than guessed at, because a false alarm on the
 * one line an operator reads is how they learn to stop reading it.
 */
import type { ResolvedProxyConfig } from './proxyConfig.js';
import { outboundFetch } from './egress.js';

export type StartupWarningConfig = Pick<
  ResolvedProxyConfig,
  'authMode' | 'auth' | 'originPolicy' | 'openProxyAcknowledged'
>;

/**
 * The hosts that mean "this machine only".
 *
 * Anything else — `0.0.0.0`, `::`, a LAN address, a name — is a socket someone
 * other than the operator can reach, which is the whole question being asked.
 * The default host is `0.0.0.0`, so the interesting case is also the quiet one.
 */
const LOOPBACK: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function reachableBeyondLoopback(host: string): boolean {
  return !LOOPBACK.has(host.trim().toLowerCase());
}

/**
 * Why this deployment must not serve, or undefined when it may.
 *
 * These two used to be warnings, printed after the socket was already bound and
 * serving. A warning is the right instrument for a shape that is unusual; it is
 * the wrong one for a shape that hands the master token to whoever asks, because
 * the startup line is read once, by the person who already knows, and never
 * again by the deployment that outlived them.
 *
 * The two refusals are not the same kind of thing. Open mode on a public host
 * can be meant — a private network, a proxy in front that authenticates — so it
 * asks for the operator to say so, once, in the environment. `'*'` with no gate
 * cannot be meant: the pair answers any origin WITH credentials, so any page a
 * visitor opens can drive this proxy out of their browser under the master
 * token. Naming the origins that serve the app costs one variable, so there is
 * no override for it.
 *
 * Only hosts that strangers can reach ask. Development binds loopback and is
 * not the subject.
 */
export function serveRefusals(config: StartupWarningConfig, host: string): string[] {
  if (!reachableBeyondLoopback(host)) return [];
  const refusals: string[] = [];
  /* Asked before the gate is looked at, and deliberately: '*' answers any page
     on the internet with credentials, and turning the gate ON does not take
     that away — it only means the page needs a signed-in visitor, which is
     what a neighbouring subdomain has. A refusal that a hardening step removes
     is a refusal pointed the wrong way. */
  if (config.originPolicy.any) {
    refusals.push(
      `REFUSING TO SERVE: ALLOWED_ORIGINS is '*'. The proxy answers any origin with credentials, so any page on the internet may script it out of a visitor's browser — under the master token with the gate off, and as the visitor with it on. Name the origins that actually serve your app. CHATFUEL_OPEN_PROXY does not cover this one.`,
    );
  }
  if (config.authMode !== 'off') return refusals;
  if (!config.openProxyAcknowledged) {
    refusals.push(
      `REFUSING TO SERVE: open mode on a host that is not loopback (${host}). The auth gate is off, so every caller that reaches this server drives Chatfuel under the deployment's master token — no identity is asked for, so none is checked, and none is in the log either. Install the auth module (npx @chatfuel/wizard --embed), bind it to 127.0.0.1 (HOST=127.0.0.1), or — if this deployment is meant to answer strangers under one token — say so with CHATFUEL_OPEN_PROXY=1.`,
    );
  }
  return refusals;
}

/** The warnings that follow from the env alone, ready before the socket binds. */
export function configWarnings(config: StartupWarningConfig, host: string): string[] {
  const warnings: string[] = [];
  if (config.authMode === 'off' && config.openProxyAcknowledged && reachableBeyondLoopback(host)) {
    warnings.push(
      `WARNING: CHATFUEL_OPEN_PROXY=1 on ${host}. Every caller that reaches this server drives Chatfuel under the deployment's master token, and that was the acknowledged intent — keep whatever authenticates in front of it in front of it.`,
    );
  }
  return warnings;
}

/**
 * As much of GoTrue's public settings document as decides a warning.
 *
 * It is the unauthenticated one — the same `/auth/v1/settings` the browser SDK
 * reads to know which providers to draw — so asking for it needs no secret and
 * tells the project nothing it did not already publish.
 */
export interface AuthSettings {
  /** GoTrue's own name for it: true means the sign-up form is refused. */
  disableSignup: boolean;
  /** True when an address is confirmed on submission, which is to say never. */
  mailerAutoconfirm: boolean;
}

export function parseAuthSettings(payload: unknown): AuthSettings | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const row = payload as Record<string, unknown>;
  /* Both or neither: a document missing one of them is a GoTrue that answers
     some other shape, and half an answer decides nothing worth printing. */
  if (typeof row.disable_signup !== 'boolean' || typeof row.mailer_autoconfirm !== 'boolean') return undefined;
  return { disableSignup: row.disable_signup, mailerAutoconfirm: row.mailer_autoconfirm };
}

/** What an open project costs, and what an unverified address is not proof of. */
export function signupWarnings(settings: AuthSettings): string[] {
  if (settings.disableSignup) return [];
  const warnings = [
    `WARNING: sign-ups are open on this Supabase project. Anyone who reaches the page gets an account and a workspace of their own, and every bot that workspace creates is created on this deployment's Chatfuel plan, at your expense — cf_bot_cap() and cf_bot_total_cap() in 0001_auth.sql are the two ceilings on that bill. Close sign-ups under Authentication -> Sign In / Providers -> Email -> Allow new users to sign up.`,
  ];
  if (settings.mailerAutoconfirm) {
    warnings.push(
      `WARNING: sign-ups are open AND email confirmation is off (mailer_autoconfirm). An address proves nothing here, so an invite restricted to one proves nothing either: whoever holds an invite link can register the address it names and then accept it, an admin invite included. Configure SMTP under Authentication -> Emails -> SMTP Settings and turn Confirm email back on before this deployment is reachable from the internet.`,
    );
  }
  return warnings;
}

/** Long enough for a cold project to answer, short enough to be over by the first request. */
const SETTINGS_TIMEOUT_MS = 5_000;

export async function fetchAuthSettings(
  supabaseUrl: string,
  anonKey: string,
  fetchImpl: typeof globalThis.fetch = outboundFetch,
  timeoutMs: number = SETTINGS_TIMEOUT_MS,
): Promise<AuthSettings | undefined> {
  let res: Response;
  try {
    res = await fetchImpl(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey, accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return undefined;
  }
  if (res.status !== 200) return undefined;
  try {
    return parseAuthSettings((await res.json()) as unknown);
  } catch {
    return undefined;
  }
}

/**
 * The half that needs the network, kept off the path that binds the socket.
 *
 * The caller does not await it and must not have to: a Supabase that is slow to
 * answer would otherwise be a server that is slow to start serving. It resolves
 * either way and rejects for nothing, so `void`-ing it is safe.
 */
export async function reportAuthSettingsWarnings(
  config: StartupWarningConfig,
  warn: (line: string) => void,
  options: { fetchImpl?: typeof globalThis.fetch; timeoutMs?: number } = {},
): Promise<void> {
  if (config.authMode !== 'on' || !config.auth) return;
  try {
    const settings = await fetchAuthSettings(
      config.auth.supabaseUrl,
      config.auth.anonKey,
      options.fetchImpl,
      options.timeoutMs,
    );
    if (!settings) return;
    for (const line of signupWarnings(settings)) warn(line);
  } catch {
    // A warning that cannot be printed is not worth taking the process down for.
  }
}
