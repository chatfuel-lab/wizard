/**
 * Whether this Supabase project is already somebody's deployment.
 *
 * The schema is NOT namespaced: one project holds one `public.cf_bots`, one
 * `public.cf_pub_posts`, one set of auth users. Re-running the wizard against
 * the project a deployment already uses is the ordinary way to update it, and
 * every migration is written to be re-run. Pointing a SECOND deployment at that
 * same project is a different act with the same keystrokes — the two do not sit
 * side by side, they merge: shared accounts, shared bots, shared queue, and a
 * `cron.schedule` of the same name that the second install takes over.
 *
 * Nothing here can tell those two apart, because the difference is in the
 * operator's head. So it is asked rather than guessed, and only when there is
 * something to ask about: a project this run did not create, already carrying
 * the table every migration registers itself in.
 */

/**
 * Asked entirely through `to_regclass`, which answers null for a name that is
 * not there instead of raising — including a name in a SCHEMA that is not
 * there. Nothing here selects from the tables it is asking about: a relation in
 * a plain `from` is resolved when the statement is parsed, so one missing table
 * would fail the whole probe on exactly the project the probe exists for.
 */
export const PRIOR_INSTALL_QUERY = `select
  to_regclass('public.cf_migrations') is not null as installed,
  to_regclass('public.cf_bots') is not null as bots,
  to_regclass('public.cf_pub_posts') is not null as queue`;

export interface PriorInstall {
  /** The table every migration registers itself in. */
  installed: boolean;
  /** Accounts and the bots created for them. */
  bots: boolean;
  /** The publish queue, and the cron jobs that drain it. */
  queue: boolean;
}

const flag = (row: Record<string, unknown>, key: string): boolean => row[key] === true || row[key] === 't';

/**
 * The one row the query returns, or undefined for a project that has never seen
 * this schema — which is both "not installed" and "the shape was not what we
 * asked for". An unreadable answer is treated as no prior install: this is a
 * courtesy in front of migrations that are all safe to re-run, and refusing a
 * run over a response we did not recognise would be the worse trade.
 */
export function readPriorInstall(rows: unknown): PriorInstall | undefined {
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row || typeof row !== 'object') return undefined;
  const record = row as Record<string, unknown>;
  if (!flag(record, 'installed')) return undefined;
  return { installed: true, bots: flag(record, 'bots'), queue: flag(record, 'queue') };
}

/** What is already on the project, in the order somebody would go and look. */
export function describePriorInstall(install: PriorInstall): string {
  const parts: string[] = [];
  if (install.bots) parts.push('accounts and their bots');
  if (install.queue) parts.push('a publish queue and the jobs that drain it');
  return parts.length > 0 ? parts.join(', ') : 'the migration table';
}
