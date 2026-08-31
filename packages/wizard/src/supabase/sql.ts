import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { WizardContext } from '../context';
import { registerSecret } from '../log';

/**
 * The SQL side of the install: the migrations that go on the user's own
 * Supabase project.
 *
 * They live in `content/modules/<id>/supabase/migrations/` — the contract each module
 * shares with the shell's adapter, its routes and its skill — and this file
 * loads the ones the selected modules bring. There is nothing to seed:
 * workspaces are created at sign-up, one per account, and a publish queue starts
 * empty.
 *
 * ORDER MATTERS and the list is written by hand rather than globbed. Every file
 * lands in one `supabase/migrations/` directory and is applied in NAME order, so
 * the target names carry a single sequence across modules rather than each
 * module's own numbering. Each module gets a block of ten, which is what keeps a
 * file added to one from ever renumbering another's:
 *
 *   0001–0009  auth       the whole schema as a fresh project wants it.
 *   0010–0019  instagram  the publish queue.
 *   0020–0029  admin      the operator panel's service-role functions. They read
 *                         the auth module's tables, which is why a project
 *                         without them never gets this file: the whole supabase/
 *                         directory is only written when auth is selected.
 *
 * A module the user did not select contributes nothing, which is the whole
 * reason the module id is part of each entry.
 */
export interface AuthMigration {
  /** File name inside the scaffold (`supabase/migrations/…`). */
  name: string;
  sql: string;
  /** Where it was read from, as a path in the content repository. */
  from: string;
  /** True when a placeholder was filled in, so the bytes are not the upstream's. */
  rendered: boolean;
}

interface MigrationFile {
  /** Loaded only when this module was selected. */
  module: string;
  source: string;
  target: string;
}

const MIGRATION_FILES: readonly MigrationFile[] = [
  { module: 'auth', source: '0001_auth.sql', target: '0001_chatfuel_auth.sql' },
  { module: 'publishing', source: '0001_publishing.sql', target: '0010_chatfuel_publishing.sql' },
  { module: 'admin', source: '0001_admin.sql', target: '0020_chatfuel_admin.sql' },
];

export const README_SOURCE = ['supabase', 'README.md'] as const;
/** The first one by name, for the messages that point at a file to paste. */
export const MIGRATION_TARGET_NAME = MIGRATION_FILES[0]!.target;

/** What the app and its database use to prove a request came from the other. */
export const PUBLISH_SECRET_ENV = 'PUBLISHING_SECRET';

/** The literal the Instagram migration carries until an installer fills it in. */
const SECRET_PLACEHOLDER = '__CHATFUEL_PUBLISHING_SECRET_SHA256__';

/** Which bucket the composer's uploads live in, on both sides of the wire. */
export const MEDIA_BUCKET_ENV = 'PUBLISHING_MEDIA_BUCKET';

/** The default, written here, in the module manifest, and in the proxy. */
export const DEFAULT_MEDIA_BUCKET = 'cf-pub-media';

const BUCKET_PLACEHOLDER = '__CHATFUEL_MEDIA_BUCKET__';
const CRON_PREFIX_PLACEHOLDER = '__CHATFUEL_CRON_PREFIX__';

/** What the two cron jobs were called before the name was anyone's to choose. */
const DEFAULT_CRON_PREFIX = 'cf-pub';

/** A bucket id, and equally what may be pasted into a single-quoted SQL literal. */
const BUCKET_NAME = /^[A-Za-z0-9._-]+$/;

/**
 * The bucket the app and the database have to agree on, resolved ONCE.
 *
 * It is asked for the way the service-role key and the admin password are — off
 * the environment the wizard was run with — because there is no question to put
 * to somebody installing their first deployment: the default is right, and the
 * name only becomes a decision on the second install onto a project that
 * already has one. The resolved value is written back into `ctx.answers.env`,
 * which is what `.env` is built from, so the app and the migration are filled
 * from the same string rather than from two readings of one rule.
 *
 * The FALLBACK is the point: an absurd value is not a value, and the proxy
 * resolves the same variable through the same rule (`bucketOr` in
 * proxyConfig.ts). If one side fell back and the other refused, the app would
 * be writing into a bucket the database never made public and the network
 * would be handed URLs it gets a 400 for — a silent divergence, which is
 * exactly what filling both sides from one string is meant to prevent.
 */
export function mediaBucket(ctx: MigrationContext, env: NodeJS.ProcessEnv = process.env): string {
  const asked = ctx.answers.env[MEDIA_BUCKET_ENV]?.trim() || env[MEDIA_BUCKET_ENV]?.trim();
  const name = asked && BUCKET_NAME.test(asked) ? asked : DEFAULT_MEDIA_BUCKET;
  ctx.answers.env[MEDIA_BUCKET_ENV] = name;
  return name;
}

/**
 * Fill the names one Supabase project cannot lend to two deployments.
 *
 * The bucket, so neither deployment's composer can read the other's media; and
 * the cron job prefix, because `cron.schedule(name, …)` REPLACES a job of that
 * name — a second install would quietly take the first one's scheduler over.
 *
 * The prefix follows the bucket rather than being asked for separately: it is
 * the same question (which deployment is this, on a project holding more than
 * one), it has no app-side counterpart to drift from, and a default bucket
 * keeps the job names a project may already have, so an existing deployment
 * re-running this file is not left with two jobs where it had one.
 */
function fillNames(sql: string, ctx: MigrationContext): string {
  if (!sql.includes(BUCKET_PLACEHOLDER) && !sql.includes(CRON_PREFIX_PLACEHOLDER)) return sql;
  const bucket = mediaBucket(ctx);
  const prefix = bucket === DEFAULT_MEDIA_BUCKET ? DEFAULT_CRON_PREFIX : bucket;
  return sql.replaceAll(BUCKET_PLACEHOLDER, bucket).replaceAll(CRON_PREFIX_PLACEHOLDER, prefix);
}

/** Everything these functions need from the run; a narrow type so tests can stand one up. */
export type MigrationContext = Pick<WizardContext, 'content' | 'answers'>;

/**
 * The shared secret behind scheduled publishing, made once per run.
 *
 * The queue's scheduler lives on the database and the thing it wakes up lives in
 * the app, so each has to be able to tell that a request came from the other.
 * This is the value they are both derived from: the APP keeps it (in its
 * environment, which is the only place it is ever written down) and the DATABASE
 * is given nothing but its sha256.
 *
 * 24 random bytes as base64url — 32 characters, and deliberately not hex: a log
 * scrubber that masks 64-hex strings would make a hex secret invisible in
 * exactly the logs somebody would need to read.
 *
 * It is handed to the scrubber by value all the same. No shape rule will ever
 * match 32 characters of base64url without masking half the ordinary output
 * beside it, so this exact string is the only thing that can be masked - and it
 * has to be, because everything downstream of here treats `answers.env` as
 * printable.
 */
export function publishSecret(ctx: MigrationContext): string {
  const existing = ctx.answers.env[PUBLISH_SECRET_ENV];
  if (existing) {
    registerSecret(existing);
    return existing;
  }
  const value = randomBytes(24).toString('base64url');
  registerSecret(value);
  ctx.answers.env[PUBLISH_SECRET_ENV] = value;
  return value;
}

/**
 * Put the hash of that secret into the migration that wants it.
 *
 * The HASH and not the secret, because the file is written to disk in the user's
 * project next to the code and is meant to be re-runnable from the SQL editor —
 * so what it carries has to be a value that opens nothing on its own. The secret
 * itself goes only into `.env`, which is gitignored.
 */
function fillSecret(sql: string, ctx: MigrationContext): string {
  if (!sql.includes(SECRET_PLACEHOLDER)) return sql;
  const hash = createHash('sha256').update(publishSecret(ctx), 'utf8').digest('base64');
  // It sits inside a single-quoted SQL literal. base64 cannot contain a quote,
  // so this is already true — checked rather than assumed, because the day it
  // stopped being true would be a very quiet day.
  if (!/^[A-Za-z0-9+/=]+$/.test(hash)) {
    throw new Error('The publish secret hash is not base64 — refusing to write it into SQL');
  }
  return sql.replaceAll(SECRET_PLACEHOLDER, hash);
}

/**
 * The two ceilings on bot creation, as numbers rather than as a code edit.
 *
 * They bound the OPERATOR'S BILL — sign-up is open, every reserved bot is one
 * the deployment's own master token creates on the deployment's own plan — so
 * the right number is a fact about a plan the wizard cannot see. Read off the
 * environment for the same reason the bucket is: there is no question to put to
 * a first install, the defaults hold, and the operator who needs another number
 * knows it before the run.
 *
 * Database-only, so unlike the bucket these are NOT written into `.env`: an app
 * that carried them would be carrying a value it has no way to enforce and no
 * reason to read, and a second copy of a number is a second number.
 */
const CAP_PLACEHOLDERS: readonly { placeholder: string; env: string }[] = [
  { placeholder: '__CHATFUEL_BOT_TOTAL_CAP__', env: 'CHATFUEL_BOT_TOTAL_CAP' },
  { placeholder: '__CHATFUEL_BOT_CAP__', env: 'CHATFUEL_BOT_CAP' },
];

/** A whole number the migration can hold, and Postgres can still cast. */
const CAP_VALUE = /^[0-9]{1,9}$/;

/**
 * Fill a cap that was asked for, and leave one that was not.
 *
 * An unfilled placeholder is not a hole: the SQL tests the literal and falls
 * back to the number written beside it, which is what keeps the file valid to
 * paste by hand. So anything that is not a plain number is left alone rather
 * than refused — the file still runs, with the default it shipped with.
 */
function fillCaps(sql: string, env: NodeJS.ProcessEnv): string {
  let filled = sql;
  for (const { placeholder, env: name } of CAP_PLACEHOLDERS) {
    const value = env[name]?.trim();
    if (value && CAP_VALUE.test(value)) filled = filled.replaceAll(placeholder, value);
  }
  return filled;
}

export const loadMigrations = (ctx: MigrationContext): AuthMigration[] =>
  MIGRATION_FILES.filter((file) => ctx.answers.modules.includes(file.module)).map((file) => {
    const source = readFileSync(ctx.content.modulePath(file.module, 'supabase', 'migrations', file.source), 'utf8');
    const sql = fillCaps(fillNames(fillSecret(source, ctx), ctx), process.env);
    return {
      name: file.target,
      sql,
      from: `content/modules/${file.module}/supabase/migrations/${file.source}`,
      // Asked of the bytes rather than of the placeholder list: a cap nobody
      // set is left as it was written, and that file is still the upstream's.
      rendered: sql !== source,
    };
  });

/**
 * `chatfuel-<slug>` — the default Supabase project name. Slug from the title of
 * the thing the deployment is about (the Chatfuel workspace with the auth
 * module, a bot without it), falling back to its id.
 */
export function projectNameFor(title: string | undefined, id: string): string {
  const source = (title?.trim() || id)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `chatfuel-${source || id}`;
}
