import * as p from '@clack/prompts';
import pc from 'picocolors';
import { stepArt } from '../art';
import { WizardError } from '../errors';
import { registerSecret } from '../log';
import type { AuthAnswers, WizardContext } from '../context';
import {
  authPatchDiff,
  desiredAuthPatch,
  desiredRecoveryPatch,
  DEV_ORIGIN,
  inviteEmailCaveat,
  keptAuthDefences,
  normalizeAppUrl,
  type SignupMode,
} from '../supabase/authConfig';
import { classifyAnonKey, pickKeys, type PickedKeys } from '../supabase/keys';
import { FINE_GRAINED_SCOPES, PAT_HELP_URL, type ManagementClient, type Project } from '../supabase/management';
import {
  describePriorInstall,
  PRIOR_INSTALL_QUERY,
  readPriorInstall,
  type PriorInstall,
} from '../supabase/priorInstall';
import { loadMigrations } from '../supabase/sql';
import {
  assertAuthFlags,
  assertNonInteractiveAuthCredentials,
  isSupabaseHost,
  NON_INTERACTIVE_HINT,
  projectRefFromUrl,
  validateAppUrl,
  validateKey,
  validateProjectUrl,
} from './authSetupFlags';
import { asWizardError, pickOrCreateProject, verifiedClient, type AuthSetupDeps } from './authSetupProject';

/**
 * The auth step: turn "the user picked the auth module" into a Supabase
 * project that is migrated and configured for email + password — or, on the
 * manual path, into the URL + keys the app needs plus SQL files the user runs
 * in the dashboard. Runs right after workspacePick (whose workspace names the
 * default project) and before the scaffold (which writes .env from
 * ctx.answers.env and copies the SQL).
 *
 * Two paths. PAT (recommended): a Supabase personal access token drives the
 * Management API — verify the token, pick or create a project, wait for it to
 * be healthy, read the API keys, run the migration, patch the Auth config.
 * Manual: paste URL + anon key (+ optional secret key), no network; the outro
 * prints the SQL-editor instructions.
 *
 * `--dry-run` skips the three mutating calls (create project / migration /
 * auth PATCH) and prints what they would do; env is still resolved.
 * `--yes` never prompts; it creates a project only when `--supabase-create`
 * names one, and reuses the project already carrying that name.
 *
 * Secrets discipline: the PAT, the secret key and the anon key are never
 * printed (the log scrubber masks them anyway).
 */

// The module's public surface stays here; the implementations live in the sibling files.
export { assertAuthFlags, assertNonInteractiveAuthCredentials, projectRefFromUrl, validatePat } from './authSetupFlags';
export type { AuthSetupDeps } from './authSetupProject';

const cancelled = () => new WizardError('Cancelled.');

/** The proxy's own name for the switch — one spelling, and it is the .env key. */
export const RECOVERY_LINK_LOG_ENV = 'AUTH_RECOVERY_LINK_LOG';

async function askDeployUrl(ctx: WizardContext): Promise<{ appUrl?: string }> {
  // A malformed --app-url was already refused by assertAuthFlags.
  let appUrl = ctx.flags.appUrl?.trim();
  if (!ctx.flags.yes && appUrl === undefined) {
    const answer = await p.text({
      message: 'Where will the app be deployed? (https URL, optional — Enter to skip)',
      placeholder: 'https://app.example.com',
      defaultValue: '',
      validate: validateAppUrl,
    });
    if (p.isCancel(answer)) throw cancelled();
    appUrl = answer.trim();
  }
  return { appUrl: appUrl ? normalizeAppUrl(appUrl) : undefined };
}

/**
 * Who may open an account, asked out loud instead of assumed.
 *
 * On this app a sign-up is not a row in a table: the new account gets a
 * workspace, and the server then creates a Chatfuel bot for it under the
 * deployment's MASTER token. Left open with autoconfirm on — which is what the
 * wizard has always written, silently — anyone who finds the URL spends the
 * deployer's Chatfuel account, with an email address nobody checked.
 *
 * Only asked for a project this run created. On a project that was already
 * there the wizard writes none of these settings (see desiredAuthPatch), so a
 * question about them would be a question whose answer is thrown away.
 */
async function chooseSignupMode(ctx: WizardContext, created: boolean): Promise<SignupMode | undefined> {
  if (!created) return undefined;
  const flag = ctx.flags.signup as SignupMode | undefined;
  if (flag) return flag;
  if (ctx.flags.yes) {
    p.log.warn(
      'Sign-up is OPEN on the new project and email addresses are taken on trust: anyone who reaches the app can create an account, and each account gets a bot created under your master Chatfuel token. --signup closed|confirm-email chooses otherwise.',
    );
    return 'open';
  }
  p.note(
    [
      'An account here is not just a login. Signing up claims a workspace, and the server',
      'creates a Chatfuel bot for it using the master token in this deployment’s .env —',
      'so whoever may sign up may spend your Chatfuel account.',
      '',
      'You can change this later: Authentication → Providers → Email in the Supabase dashboard.',
    ].join('\n'),
    'Who may create an account',
  );
  const answer = await p.select<SignupMode>({
    message: 'Who may sign up on this app?',
    options: [
      {
        value: 'open',
        label: 'Anyone, no email confirmation (works out of the box)',
        hint: 'a fresh project has no SMTP, so a confirmation mail would never arrive',
      },
      {
        value: 'confirm-email',
        label: 'Anyone, but the address must be confirmed',
        hint: 'needs working mail — the built-in sender does about two an hour',
      },
      {
        value: 'closed',
        label: 'Nobody — you create the accounts in the Supabase dashboard',
        hint: 'invite links then only work for people who already have an account',
      },
    ],
    initialValue: 'open',
  });
  if (p.isCancel(answer)) throw cancelled();
  return answer;
}

/**
 * How a forgotten password gets reset, and the one delivery that has to be
 * chosen rather than inherited.
 *
 * A project with no SMTP of its own sends about two emails an hour through
 * Supabase's shared sender, which is not a password reset anybody can rely on.
 * The app's answer is the admin-issued recovery link: an owner or admin asks
 * for one from Team, and the proxy writes it to the SERVER LOG for them to hand
 * over. That is deliberate, and it is also a working credential for the account
 * it names, sitting in a log — so it is off unless somebody turns it on here,
 * knowing what the line in the log is.
 */
async function chooseRecoveryDelivery(ctx: WizardContext, hasSecretKey: boolean): Promise<void> {
  if (!hasSecretKey) return; // the route needs the service-role key; without it there is nothing to enable
  const lines = [
    'Password resets normally go out by email. A Supabase project without its own SMTP shares',
    'a sender that manages about two messages an hour, so on a fresh project that is not a',
    'reset people can count on.',
    '',
    'The fallback: an owner or admin opens Team → Reset password link, and the app writes a',
    'one-time recovery link for that account to the server log (Vercel → Logs, or your',
    'terminal). They copy it and hand it over themselves.',
    '',
    'The link IS the account until it is used: anyone who can read this deployment’s logs can',
    'take over any account a link was issued for. Every issue is recorded in the audit table.',
  ];
  if (ctx.flags.yes) {
    p.log.info(
      'Admin-issued recovery links are OFF (AUTH_RECOVERY_LINK_LOG). Set it to true in .env if you want them, knowing the link lands in the server log.',
    );
    return;
  }
  p.note(lines.join('\n'), 'If somebody forgets their password');
  const on = await p.confirm({
    message: 'Allow admins to issue recovery links through the server log?',
    initialValue: false,
  });
  if (p.isCancel(on)) throw cancelled();
  if (!on) {
    p.log.info(
      'Off. The route answers 501 and password resets go by email only — configure SMTP for the project (Authentication → Emails) to make them reliable.',
    );
    return;
  }
  ctx.answers.env[RECOVERY_LINK_LOG_ENV] = 'true';
  p.log.warn(
    'On. Treat this deployment’s logs as credentials: whoever can read them can take over an account a link was issued for.',
  );
}

async function selectMethod(ctx: WizardContext): Promise<'pat' | 'manual'> {
  const pat = ctx.secrets.supabaseToken;
  const manualFlags = Boolean(ctx.flags.supabaseUrl && ctx.flags.supabaseAnonKey);
  if (ctx.flags.yes) {
    // Explicit flags decide; a PAT alone cannot proceed — it does not say which
    // project to use, nor that a new one may be created.
    if (pat && (ctx.flags.supabaseProject || ctx.flags.supabaseCreate)) return 'pat';
    if (manualFlags) return 'manual';
    return assertNonInteractiveAuthCredentials(ctx); // throws with the hint
  }
  if (pat) {
    p.log.info(
      ctx.flags.supabaseToken
        ? 'Using the Supabase access token from --supabase-token.'
        : 'Using SUPABASE_ACCESS_TOKEN from the environment.',
    );
    return 'pat';
  }
  // Naming a project — one that exists or one to create — is the token path
  // asked for by name; the token itself is prompted for further down.
  if (ctx.flags.supabaseProject || ctx.flags.supabaseCreate) return 'pat';
  if (manualFlags) return 'manual';

  p.note(
    [
      'The Auth & Team module runs on YOUR Supabase project (free plan is fine).',
      `The easy way is a personal access token: ${pc.bold(PAT_HELP_URL)}`,
      '→ Generate new token → copy it. The wizard uses it to pick or create the project,',
      'apply the database migration and switch email + password sign-in on. It is used',
      'once, kept in memory only, and never written anywhere.',
      `Fine-grained tokens need: ${FINE_GRAINED_SCOPES}.`,
      '',
      'Or do it by hand: paste the project URL + anon key here and run two SQL files',
      'in the dashboard afterwards (the wizard prints exact instructions).',
    ].join('\n'),
    'Supabase',
  );
  const method = await p.select({
    message: 'How should the wizard reach Supabase?',
    options: [
      { value: 'pat' as const, label: 'Personal access token', hint: 'recommended — the wizard does everything' },
      { value: 'manual' as const, label: 'Manual', hint: 'paste URL + keys; you run the SQL in the dashboard' },
    ],
    initialValue: 'pat' as const,
  });
  if (p.isCancel(method)) throw cancelled();
  return method;
}

/**
 * Stop in front of a project that is already a deployment.
 *
 * Re-running against the project this deployment already uses is the ordinary
 * update path, and every migration is written for it. Pointing a SECOND
 * deployment at that project is the same keystrokes and a different act: the
 * schema is not namespaced, so the two share accounts, bots and the publish
 * queue, and the second install's `cron.schedule` takes the first's jobs over.
 *
 * The wizard cannot tell which of the two this is, so it says what it found and
 * asks. The probe itself is best-effort: a project that will not answer it is a
 * project whose migrations are about to be attempted anyway, and failing here
 * would only move the same error earlier with less to say about it.
 */
async function confirmPriorInstall(ctx: WizardContext, client: ManagementClient, ref: string): Promise<void> {
  let install: PriorInstall | undefined;
  try {
    install = readPriorInstall(await client.runQuery(ref, PRIOR_INSTALL_QUERY));
  } catch {
    return;
  }
  if (!install) return;

  p.log.warn(
    `This project already carries a Chatfuel install (${describePriorInstall(install)}).\n` +
      'Re-running for the SAME deployment is the update path and is safe. A SECOND deployment on this project is not side by side: it shares the accounts, the bots and the publish queue, and takes over the scheduled jobs.',
  );
  // --yes is the unattended update path, which is the safe reading of the two.
  if (ctx.flags.yes) return;
  const go = await p.confirm({ message: 'Continue on this project?', initialValue: true });
  if (p.isCancel(go) || !go) throw cancelled();
}

interface PatOutcome {
  project?: Project;
  /** The wizard created this project on this run — see desiredAuthPatch. */
  createdProject: boolean;
  keys?: PickedKeys;
  migrationApplied: boolean;
  authConfigured: boolean;
}

async function runPatPath(
  ctx: WizardContext,
  deps: AuthSetupDeps,
): Promise<{
  outcome: PatOutcome;
  appUrl?: string;
}> {
  const { client, orgs } = await verifiedClient(ctx, deps);

  const { project, created } = await pickOrCreateProject(ctx, client, orgs);
  const options = await askDeployUrl(ctx);
  const outcome: PatOutcome = { project, createdProject: created, migrationApplied: false, authConfigured: false };
  if (!project) return { outcome, ...options }; // dry-run create

  const ref = project.ref;
  const sqlEditorHint = `Run supabase/migrations/0001_chatfuel_auth.sql in the SQL editor: https://supabase.com/dashboard/project/${ref}/sql`;

  // ---- keys
  const keysSpinner = p.spinner();
  keysSpinner.start('Reading the project API keys…');
  try {
    outcome.keys = pickKeys(await client.getApiKeys(ref));
    keysSpinner.stop(
      `Keys: ${outcome.keys.anonKeyKind} anon key${outcome.keys.secretKey ? ` + ${outcome.keys.secretKeyKind} secret key (server-side only)` : ' (no secret key — admin reset links disabled)'}`,
    );
  } catch (err) {
    keysSpinner.stop('Could not read the API keys');
    throw asWizardError(err, 'Fine-grained tokens need "secrets: read" for the API keys.');
  }

  // ---- is somebody already living here?
  if (!created && !ctx.flags.dryRun) await confirmPriorInstall(ctx, client, ref);

  // ---- migrations, in order: a later one moves a project the earlier one made.
  const migrations = loadMigrations(ctx);
  if (ctx.flags.dryRun) {
    const lines = migrations.reduce((total, m) => total + m.sql.split('\n').length, 0);
    p.log.info(
      `--dry-run: would apply ${migrations.length} migrations (${lines} lines) via POST /v1/projects/${ref}/database/query.`,
    );
  } else {
    const spinner = p.spinner();
    outcome.migrationApplied = true;
    for (const migration of migrations) {
      spinner.start(`Applying ${migration.name.replace(/\.sql$/, '')}…`);
      try {
        await client.runQuery(ref, migration.sql);
        spinner.stop(`${migration.name} applied (idempotent — safe to re-run)`);
      } catch (err) {
        // The rest are not attempted: they assume the shape this one was to make.
        outcome.migrationApplied = false;
        spinner.stop(`${migration.name} failed`);
        const wrapped = asWizardError(err, sqlEditorHint);
        p.log.warn(`${wrapped.message}\n${wrapped.hint ?? sqlEditorHint}`);
        break;
      }
    }
  }

  // ---- who may sign up, on a project we made
  const signup = await chooseSignupMode(ctx, outcome.createdProject === true);

  // ---- auth config
  const configSpinner = p.spinner();
  configSpinner.start('Configuring email + password sign-in…');
  try {
    const current = await client.getAuthConfig(ref);
    const patch = desiredAuthPatch(current, {
      appUrl: options.appUrl,
      createdProject: outcome.createdProject,
      signup,
    });
    const changed = authPatchDiff(current, patch);
    // Said before the result, and said whether or not anything is written: a
    // setting the wizard chose NOT to touch is exactly the one somebody will
    // otherwise spend the evening blaming the wizard for.
    if (!outcome.createdProject) {
      const kept = keptAuthDefences(current);
      p.log.info(
        [
          `${ref} is a project you already had, so the wizard only adds to it.`,
          `${DEV_ORIGIN}/** is not put in its redirect allowlist — that is a localhost entry nobody would come back and remove.`,
          ...(kept.length > 0
            ? [
                `Left exactly as they were: ${kept.join('; ')}. Change them yourself in Authentication → Providers → Email if sign-up should work differently.`,
              ]
            : []),
        ].join('\n'),
      );
    }
    if (ctx.flags.dryRun) {
      configSpinner.stop(
        `--dry-run: would PATCH /v1/projects/${ref}/config/auth (${changed.length ? changed.join(', ') : 'no changes'})`,
      );
    } else if (changed.length === 0) {
      outcome.authConfigured = true;
      configSpinner.stop('Auth config already as needed');
    } else {
      await client.patchAuthConfig(ref, patch);
      outcome.authConfigured = true;
      configSpinner.stop(`Auth config updated (${changed.join(', ')})`);
    }
    /* Said after the result, because it describes what the project now is
       rather than what the wizard did. Invites are this module's own feature,
       so there is no deployment where this does not apply. */
    const caveat = inviteEmailCaveat(current, patch);
    if (caveat !== null) p.log.warn(caveat);
    if (!ctx.flags.dryRun) await applyRecoveryTemplate(client, ref);
  } catch (err) {
    configSpinner.stop('Auth config not updated');
    const wrapped = asWizardError(err);
    p.log.warn(
      `${wrapped.message}\nIn the dashboard: Authentication → Providers → Email → turn OFF "Confirm email"; Authentication → URL configuration → add http://localhost:5173/** (and your app origin) to the redirect allowlist.`,
    );
  }

  return { outcome, ...options };
}

/**
 * The recovery email template, best effort. Free-tier projects on Supabase's
 * default email provider answer 400 ("Email template modification is not
 * available for free tier projects…"), and that must not cost us
 * `mailer_autoconfirm` and the allowlist — so it is its own call, after them,
 * and a refusal is a note, not a failure. Without it, reset links come from
 * Supabase's default email and land on the PKCE `?code=` callback, which only
 * works in the browser that asked for the reset.
 */
async function applyRecoveryTemplate(client: ManagementClient, ref: string): Promise<void> {
  try {
    const current = await client.getAuthConfig(ref);
    const patch = desiredRecoveryPatch(current);
    if (!patch) return;
    await client.patchAuthConfig(ref, patch);
    p.log.info('Recovery email template points at the app’s reset-password page.');
  } catch {
    p.log.info(
      'Password-reset emails keep Supabase’s default template (custom templates need a paid plan or your own SMTP). Reset links then work only in the browser that asked for them; admins can also issue one from Team.',
    );
  }
}

async function runManualPath(ctx: WizardContext): Promise<{
  url: string;
  anonKey: string;
  secretKey?: string;
  projectRef?: string;
  appUrl?: string;
}> {
  let url = ctx.flags.supabaseUrl?.trim();
  let anonKey = ctx.flags.supabaseAnonKey?.trim();
  /* A service_role key opens the whole database, and this one arrives from the
     shell rather than from anybody's decision — nothing here can check that it
     belongs to the project being set up. A developer with a PRODUCTION key
     exported scaffolds a staging app and the production key goes into the new
     repository's .env. So it is named out loud below, next to the project it
     would be written for, and can be declined. */
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
  let secretKey: string | undefined = fromEnv;

  if (url !== undefined && validateProjectUrl(url))
    throw new WizardError(`--supabase-url "${url}" is not an https:// URL with no path`);
  if (anonKey !== undefined && anonKey === '') throw new WizardError('--supabase-anon-key is empty');

  if (!ctx.flags.yes && (url === undefined || anonKey === undefined)) {
    p.note(
      [
        '1. Open your project at https://supabase.com/dashboard → Project Settings → API Keys.',
        '2. Copy the Project URL (https://<ref>.supabase.co) and the anon / publishable key.',
        '3. Optional: the secret / service_role key — enables admin “Reset password link”;',
        '   it stays server-side in .env and is never sent to the browser.',
      ].join('\n'),
      'Supabase project (manual)',
    );
  }
  if (url === undefined) {
    if (ctx.flags.yes)
      throw new WizardError('The auth module needs Supabase credentials in non-interactive mode', NON_INTERACTIVE_HINT);
    const answer = await p.text({
      message: 'Supabase project URL:',
      placeholder: 'https://abcdefghijklmnopqrst.supabase.co',
      validate: validateProjectUrl,
    });
    if (p.isCancel(answer)) throw cancelled();
    url = answer.trim();
  }
  // Said once, wherever the URL came from. Not a refusal: a project behind a
  // custom domain is a supported setup, and the ref this cannot read out of it
  // is bookkeeping (see projectRefFromUrl).
  if (!isSupabaseHost(url)) {
    p.log.warn(
      `${url} is not a supabase.co address. Carrying on — a custom domain works — but if you meant the project URL from the dashboard, check it now.`,
    );
  }
  if (anonKey === undefined) {
    if (ctx.flags.yes)
      throw new WizardError('The auth module needs Supabase credentials in non-interactive mode', NON_INTERACTIVE_HINT);
    const answer = await p.password({
      message: 'anon / publishable key:',
      validate: validateKey,
    });
    if (p.isCancel(answer)) throw cancelled();
    anonKey = answer.trim();
  }
  const target = url.replace(/\/+$/, '');
  if (secretKey && secretKey === fromEnv) {
    if (ctx.flags.yes) {
      p.log.warn(
        `SUPABASE_SERVICE_ROLE_KEY is set in this environment, so it is what gets written to .env for ${target}. Nothing here can tell whether it belongs to that project — unset it if it does not.`,
      );
    } else {
      p.log.warn(
        `SUPABASE_SERVICE_ROLE_KEY is set in this shell. It opens the whole database, and it would be written to .env as the key for ${target}.`,
      );
      const keep = await p.confirm({
        message: `Use the SUPABASE_SERVICE_ROLE_KEY from the environment for ${target}?`,
        initialValue: true,
      });
      if (p.isCancel(keep)) throw cancelled();
      if (!keep) secretKey = undefined;
    }
  }
  if (!ctx.flags.yes && secretKey === undefined) {
    const answer = await p.password({ message: 'secret / service_role key (optional — Enter to skip):' });
    if (p.isCancel(answer)) throw cancelled();
    secretKey = answer.trim() || undefined;
  }
  const options = await askDeployUrl(ctx);
  return {
    url: target,
    anonKey,
    secretKey,
    projectRef: projectRefFromUrl(url),
    ...options,
  };
}

export async function authSetup(ctx: WizardContext, deps: AuthSetupDeps = {}): Promise<void> {
  if (!ctx.answers.workspace) throw new WizardError('internal: authSetup before workspacePick');
  assertAuthFlags(ctx);
  p.log.message(stepArt('auth'));

  const method = await selectMethod(ctx);
  let auth: AuthAnswers;

  if (method === 'pat') {
    const { outcome, appUrl } = await runPatPath(ctx, deps);
    auth = {
      method: 'pat',
      projectRef: outcome.project?.ref,
      url: outcome.project ? `https://${outcome.project.ref}.supabase.co` : '',
      anonKey: outcome.keys?.anonKey ?? '',
      anonKeyKind: outcome.keys?.anonKeyKind ?? 'unknown',
      secretKey: outcome.keys?.secretKey,
      appUrl,
      migrationApplied: outcome.migrationApplied,
      authConfigured: outcome.authConfigured,
    };
  } else {
    const manual = await runManualPath(ctx);
    auth = {
      method: 'manual',
      projectRef: manual.projectRef,
      url: manual.url,
      anonKey: manual.anonKey,
      anonKeyKind: classifyAnonKey(manual.anonKey),
      secretKey: manual.secretKey,
      appUrl: manual.appUrl,
      migrationApplied: false,
      authConfigured: false,
    };
    p.log.info(
      'Manual path: the migration lands in the app under supabase/ — run it in the dashboard (instructions at the end).',
    );
  }

  /* One place for both paths. The scrubber's own patterns catch the two shapes
     this key comes in today (`sb_secret_…` and a JWT), and a shape is a guess:
     a self-hosted project, or the next format Supabase mints, prints in full.
     The PAT and the Chatfuel token are registered where they are read; this one
     was the credential relying on its shape alone. */
  if (auth.secretKey) registerSecret(auth.secretKey);

  ctx.answers.auth = auth;
  /* Empty is not a value these two can hold: they are required, and the app
     refuses to start without them. A --dry-run that never created the project
     has nothing to put here, and writing '' would produce a .env that looks
     filled in and is not. Left unset instead, so whatever reads them sees an
     absence and can say so. */
  if (auth.url) ctx.answers.env.VITE_SUPABASE_URL = auth.url;
  if (auth.anonKey) ctx.answers.env.VITE_SUPABASE_ANON_KEY = auth.anonKey;
  if (auth.secretKey) ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY = auth.secretKey;
  else {
    /* Not optional any more: the server creates each account's bot with the
       master token and then names it to Supabase with THIS key. Without it,
       sign-up ends on "your workspace is not ready". */
    p.log.warn(
      'No Supabase secret / service_role key — the app will not be able to create a bot for anybody who signs up. Add SUPABASE_SERVICE_ROLE_KEY to .env before deploying.',
    );
  }
  if (auth.projectRef) ctx.answers.env.SUPABASE_PROJECT_REF = auth.projectRef;

  // Last, because it is about the deployment rather than the project, and it
  // only means anything once the secret key above is known either way.
  await chooseRecoveryDelivery(ctx, Boolean(auth.secretKey));
}
