import { SHELL_DEV_PORT } from '../constants';

/**
 * What the wizard changes in a project's Auth config (`PATCH
 * /v1/projects/{ref}/config/auth`) so the scaffolded app works out of the box:
 *
 * - `external_email_enabled: true` — the email provider on; without it there is
 *   no email + password sign-in to configure.
 * - `mailer_autoconfirm` / `disable_signup` — whichever of the three
 *   `SignupMode`s the run was told to write. The default is the one this has
 *   always written (`open`: autoconfirm on, sign-ups open), because a fresh
 *   project has no SMTP and a confirmation mail nobody receives is a sign-up
 *   that never finishes. It is a choice now rather than an assumption: on this
 *   app an account carries a workspace and a bot created under the master
 *   token, so who may open one is the deployer's decision to make.
 * - `uri_allow_list` — existing entries ∪ the dev origin ∪ the app origin,
 *   ONE comma-separated string (the API's shape), deduped, order kept.
 * - `site_url` — set to the app URL (else the dev origin) ONLY when the current
 *   one is empty or Supabase's default `http://localhost:3000`; one project
 *   serves many tenants, so a custom site_url is somebody's and stays.
 *
 * The first three are written ONLY on a project this run created
 * (`opts.createdProject`). On a project that was already there the patch does
 * not carry them at all: an operator who closed sign-ups or turned email
 * confirmation ON has made a decision about their own project, and a wizard
 * that silently reverts it is a wizard that opens somebody's production
 * database to the world. Not even the permissive value is written back — the
 * API need not report a field, and an absent one is a setting nothing here
 * knows, not a setting that is off. The dev origin is held to the same rule — a permanent
 * `http://localhost:5173/**` in a production allow list is ours to add to a
 * project we made and nobody else's — while the app URL merges either way,
 * because that one is what the run was asked to make work. `site_url` has had
 * this shape all along; the rest now follow it.
 * The recovery email template is a SEPARATE, best-effort patch
 * (`desiredRecoveryPatch`): it points the reset link at the app's
 * `/reset-password?token_hash=…&type=recovery` route (`verifyOtp` in the app —
 * no GoTrue redirect, no browser-bound PKCE verifier, so the link works in any
 * browser). Free-tier projects on the default email provider REFUSE template
 * changes with a 400 ("Email template modification is not available for free
 * tier projects…"), and a refusal must not take the settings above down with
 * it — hence two calls. Without the template, reset still works through the
 * default email and the PKCE `?code=` callback, in the requesting browser only.
 */
export const DEV_ORIGIN = `http://localhost:${SHELL_DEV_PORT}`;
export const SUPABASE_DEFAULT_SITE_URL = 'http://localhost:3000';

const RECOVERY_SUBJECT = 'Reset your password';
const RECOVERY_TEMPLATE = [
  '<h2>Reset your password</h2>',
  '<p>Somebody (hopefully you) asked to reset the password for {{ .Email }}.</p>',
  '<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>',
  '<p>If you did not ask for this, ignore this email — nothing changes.</p>',
].join('\n');

/** The subset of the auth config the wizard reads and writes. Everything else is passed through untouched. */
export interface AuthConfigView {
  site_url?: string | null;
  uri_allow_list?: string | null;
  mailer_autoconfirm?: boolean | null;
  external_email_enabled?: boolean | null;
  disable_signup?: boolean | null;
  mailer_subjects_recovery?: string | null;
  mailer_templates_recovery_content?: string | null;
  /** Emails per hour the default provider will send — 2 on the free plan. Read-only here. */
  rate_limit_email_sent?: number | null;
  [key: string]: unknown;
}

export interface AuthPatch {
  mailer_autoconfirm?: boolean;
  external_email_enabled?: boolean;
  disable_signup?: boolean;
  uri_allow_list: string;
  site_url?: string;
}

/**
 * Who may end up with an account on a project this run created.
 *
 * - `open` — anyone who reaches the app can sign up, and the address is taken
 *   on trust (no confirmation mail). What the wizard has always written, and
 *   what a fresh project with no SMTP can actually deliver.
 * - `confirm-email` — sign-up open, but the address has to be confirmed first.
 *   Needs mail that arrives: the default provider sends a couple an hour, so
 *   this is the choice for a project that has its own SMTP.
 * - `closed` — the sign-up endpoint is off. Accounts exist only where the
 *   operator creates them in the Supabase dashboard. Invite links then work
 *   only for somebody who already has an account, because redeeming one
 *   requires being signed in.
 *
 * The setting matters more here than in a plain Supabase app: a new account
 * gets a workspace, and the server creates a Chatfuel bot for it under the
 * deployment's master token. An open sign-up is therefore a stranger spending
 * the deployer's Chatfuel account, not only a row in a table.
 */
export type SignupMode = 'open' | 'confirm-email' | 'closed';

export interface AuthPatchOptions {
  /** Where the app will live, when the run knows it. Merged into the allow list either way. */
  appUrl?: string;
  /**
   * True only for a project THIS run created. The three sign-in settings are
   * asserted on it and left alone on anything else — see the header.
   */
  createdProject?: boolean;
  /** Which of the three the run chose. Read only on a project it created; default `open`. */
  signup?: SignupMode;
}

export interface RecoveryTemplatePatch {
  mailer_subjects_recovery: string;
  mailer_templates_recovery_content: string;
}

/** existing ∪ additions, one comma-separated string, deduped, blanks dropped, order kept. */
export function mergeAllowList(existing: string | null | undefined, additions: string[]): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...(existing ?? '').split(','), ...additions]) {
    const item = raw.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out.join(',');
}

/** The only hosts that are still themselves over plain HTTP. */
const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/;

/**
 * `https://app.example.com/` → `https://app.example.com` (origin only, no path).
 *
 * What this value becomes is a redirect target: it goes into `uri_allow_list`
 * as `<origin>/**` and, on a project that has never been configured, into
 * `site_url`. Supabase sends the recovery and confirmation links there with the
 * token in the URL, so an `http://` origin is that token crossing the network
 * in the clear and sitting in every proxy log on the way. Loopback is the
 * exception the dev server needs and the one address no network carries.
 *
 * A refusal here is silent by design — the caller treats an unusable app URL as
 * an app URL that was not given, and the dev origin still gets allowed — so the
 * flag layer says so out loud before the run gets this far.
 */
export function normalizeAppUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:') return parsed.origin;
    if (parsed.protocol === 'http:' && LOOPBACK.test(parsed.hostname)) return parsed.origin;
    return undefined;
  } catch {
    return undefined;
  }
}

export function desiredAuthPatch(current: AuthConfigView, opts: AuthPatchOptions = {}): AuthPatch {
  const appUrl = normalizeAppUrl(opts.appUrl);
  const ours = opts.createdProject === true;
  const additions = ours ? [`${DEV_ORIGIN}/**`] : [];
  if (appUrl) additions.push(`${appUrl}/**`);
  const patch: AuthPatch = {
    uri_allow_list: mergeAllowList(current.uri_allow_list, additions),
  };
  if (ours) {
    /* The provider goes on either way — without it there is no email + password
       sign-in at all, and even a closed project needs it to sign the accounts
       its operator creates by hand. The other two are the choice. */
    const signup = opts.signup ?? 'open';
    patch.external_email_enabled = true;
    patch.mailer_autoconfirm = signup === 'open';
    patch.disable_signup = signup === 'closed';
  }
  const site = (current.site_url ?? '').trim();
  if (site === '' || site === SUPABASE_DEFAULT_SITE_URL) {
    patch.site_url = appUrl ?? DEV_ORIGIN;
  }
  return patch;
}

/**
 * The defences a project already had, in words — so a run that quietly did NOT
 * switch email sign-in on says why, and the person is not left waiting for a
 * confirmation mail the wizard decided not to disable.
 *
 * Read from the CONFIG, not from the patch: on a project the wizard did not
 * create the patch carries none of these three at all. Only values the API
 * actually reported are named — a field it did not send is one nothing here
 * knows, and a guess printed as a fact is worse than a line not printed.
 */
export function keptAuthDefences(current: AuthConfigView): string[] {
  const kept: string[] = [];
  if (current.mailer_autoconfirm === false) kept.push('email confirmation stays ON (mailer_autoconfirm)');
  if (current.external_email_enabled === false) kept.push('the email provider stays OFF (external_email_enabled)');
  if (current.disable_signup === true) kept.push('sign-ups stay CLOSED (disable_signup)');
  return kept;
}

/**
 * What an email-restricted invite is worth on this project, when it is worth
 * less than it reads.
 *
 * This module's invites can name an address, and the server does check it
 * (`cf_accept_invite`, `email_mismatch`). But the check is against the address
 * in the caller's JWT, and with `mailer_autoconfirm` on — which is what
 * `signup: 'open'` sets, and the default — an account is created without ever
 * opening the mailbox. So the restriction addresses the link; it does not prove
 * the mailbox. The real secret is the token itself: 24 random bytes, stored as
 * a sha256, single-use, and expiring.
 *
 * Read from the patch first and the current config second, because the patch is
 * what the project is about to become; `null` when the answer is "confirmation
 * is on" or when nothing here knows (a project the wizard is not configuring
 * reports no such field, and a guess printed as a fact is worse than silence).
 */
export function inviteEmailCaveat(current: AuthConfigView, patch: AuthPatch): string | null {
  const autoconfirm = patch.mailer_autoconfirm ?? current.mailer_autoconfirm;
  if (autoconfirm !== true) return null;
  return [
    'Email confirmation is OFF, so an invite restricted to an address is addressing, not proof:',
    'signing up as that address needs no access to the mailbox. What keeps an invite link private is',
    'the token in it — single-use, hashed in the database, and expiring. Keep the expiry short, and',
    'turn "Confirm email" on (Authentication → Providers → Email) once you have SMTP if the address',
    'should be a second factor.',
  ].join(' ');
}

/**
 * The recovery template patch, or `undefined` when the project already has it.
 * Applied on its own and allowed to fail — see the header.
 */
export function desiredRecoveryPatch(current: AuthConfigView): RecoveryTemplatePatch | undefined {
  if (
    current.mailer_subjects_recovery === RECOVERY_SUBJECT &&
    current.mailer_templates_recovery_content === RECOVERY_TEMPLATE
  ) {
    return undefined;
  }
  return {
    mailer_subjects_recovery: RECOVERY_SUBJECT,
    mailer_templates_recovery_content: RECOVERY_TEMPLATE,
  };
}

/** The fields the PATCH would change vs the current config — for the dry-run print and the log. */
export function authPatchDiff(current: AuthConfigView, patch: AuthPatch | RecoveryTemplatePatch): string[] {
  const changed: string[] = [];
  for (const [key, next] of Object.entries(patch as unknown as Record<string, unknown>)) {
    const prev = current[key];
    if (prev !== next) changed.push(key);
  }
  return changed;
}
