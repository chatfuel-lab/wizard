import { WizardError } from '../errors';
import type { WizardContext } from '../context';
import { normalizeAppUrl, type SignupMode } from '../supabase/authConfig';

/**
 * Judging the auth command line and pasted shapes without prompting anybody —
 * no clack, no network. `run` fires `assertAuthFlags` before the first step
 * spends anything; `authSetup` runs it again so the step is safe on its own.
 */

const PROJECT_URL_RE = /^https:\/\/([a-z0-9-]+)\.supabase\.(?:co|in|red)\/?$/i;

export const NON_INTERACTIVE_HINT =
  'Pass SUPABASE_ACCESS_TOKEN (or --supabase-token) together with --supabase-project <ref> for an existing project, or --supabase-create <name> to make one; or --supabase-url + --supabase-anon-key for the manual path.';

/**
 * `--yes` contract: auth needs a PAT plus a project — an existing ref or a
 * name to create — or URL + anon key. Exported so the check can be
 * unit-tested without prompts.
 */
export function assertNonInteractiveAuthCredentials(ctx: WizardContext): 'pat' | 'manual' {
  const pat = ctx.secrets.supabaseToken;
  if (pat && (ctx.flags.supabaseProject || ctx.flags.supabaseCreate)) return 'pat';
  if (ctx.flags.supabaseUrl && ctx.flags.supabaseAnonKey) return 'manual';
  throw new WizardError('The auth module needs Supabase credentials in non-interactive mode', NON_INTERACTIVE_HINT);
}

/** 1–64 characters — what the Management API accepts as a project name. */
export function validateProjectName(value: string | undefined): string | undefined {
  const name = (value ?? '').trim();
  return name.length === 0 || name.length > 64 ? '1–64 characters' : undefined;
}

/**
 * The shape of the auth flags, judged without asking anybody anything. `run`
 * calls it before the first step, so a mistyped command line is answered by
 * the command line — not after a token prompt, a workspace lookup and two
 * minutes of scaffolding.
 *
 * Exported for the tests; `authSetup` calls it again so the step is safe on
 * its own.
 */
export function assertAuthFlags(ctx: WizardContext): void {
  const { supabaseProject, supabaseCreate, supabaseUrl, appUrl } = ctx.flags;
  if (supabaseProject && supabaseCreate) {
    throw new WizardError(
      '--supabase-project and --supabase-create name two different projects',
      'Use --supabase-project <ref> for a project that exists, or --supabase-create <name> to make one.',
    );
  }
  if (supabaseCreate !== undefined) {
    const problem = validateProjectName(supabaseCreate);
    if (problem) throw new WizardError(`--supabase-create "${supabaseCreate}" is not a project name`, problem);
  }
  if (supabaseUrl !== undefined && validateProjectUrl(supabaseUrl)) {
    throw new WizardError(`--supabase-url "${supabaseUrl.trim()}" is not an https:// URL with no path`);
  }
  const origin = appUrl?.trim();
  if (origin !== undefined && origin !== '' && validateAppUrl(origin)) {
    throw new WizardError(`--app-url "${origin}" must be an https:// URL`);
  }
  const signup = ctx.flags.signup;
  if (signup !== undefined && !SIGNUP_MODES.includes(signup as SignupMode)) {
    throw new WizardError(`--signup "${signup}" is not a sign-up mode`, `One of: ${SIGNUP_MODES.join(', ')}`);
  }
}

/* In one place, because the flag, the prompt and the help text all name them. */
export const SIGNUP_MODES: SignupMode[] = ['open', 'confirm-email', 'closed'];

// clack calls validate with `undefined` when nothing was typed — coalesce.
export const validateAppUrl = (value: string | undefined): string | undefined => {
  const v = (value ?? '').trim();
  if (v === '') return undefined;
  const origin = normalizeAppUrl(v);
  return origin && origin.startsWith('https://') ? undefined : 'Enter an https:// URL, or leave empty';
};

/**
 * What this actually accepts: any https:// host with nothing after it. The
 * message used to promise `https://<ref>.supabase.co` — narrower than the rule
 * behind it, so a URL it took was one it had just said it would not.
 */
export const validateProjectUrl = (value: string | undefined): string | undefined =>
  /^https:\/\/[^\s/]+\/?$/i.test((value ?? '').trim())
    ? undefined
    : 'Expected an https:// URL with no path, e.g. https://<ref>.supabase.co';

/**
 * Whether Supabase itself serves this host — the shape `projectRefFromUrl`
 * can read a ref out of.
 *
 * A false is worth saying out loud and is never a refusal: a project reached
 * through a custom domain is a supported setup, and an unreadable ref is a
 * supported outcome of it (the ref is bookkeeping — see `projectRefFromUrl`).
 * Refusing here would break exactly those projects to catch a typo.
 */
export const isSupabaseHost = (url: string): boolean => PROJECT_URL_RE.test(url.trim());

export const validateKey = (value: string | undefined): string | undefined =>
  (value ?? '').trim().length < 20 ? 'That does not look like a Supabase key' : undefined;

/** Ref from `https://<ref>.supabase.co`, else undefined (custom domains). */
export const projectRefFromUrl = (url: string): string | undefined => PROJECT_URL_RE.exec(url.trim())?.[1];

/**
 * What a Supabase personal access token looks like, checked before the network
 * so the common paste mistakes answer instantly and by name.
 *
 * The page next to the PAT page hands out project API keys, and they are the
 * things people reach for: a legacy anon key is a JWT (`eyJ…`), the new ones
 * are `sb_publishable_…` / `sb_secret_…`. None of them can talk to the
 * Management API, and its refusal — "JWT could not be decoded" — says nothing
 * about which of the four keys on the screen was the wrong one.
 */
export function validatePat(value: string | undefined): string | undefined {
  const pat = (value ?? '').trim();
  if (pat === '') return 'Paste the access token from the page';
  if (/\s/.test(pat)) return 'A token has no spaces — copy it again';
  if (pat.startsWith('eyJ') || pat.startsWith('sb_')) {
    return 'That is a project API key, not an access token. The access token starts with sbp_ and lives on the account page.';
  }
  if (!pat.startsWith('sbp_')) return 'A Supabase access token starts with sbp_';
  return undefined;
}
