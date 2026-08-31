import { describe, expect, it } from 'vitest';
import { describePriorInstall, PRIOR_INSTALL_QUERY, readPriorInstall } from '../src/supabase/priorInstall';

/**
 * The probe runs against a project that may have none of this schema on it —
 * which is the whole point of running it — so what it must never do is fail on
 * exactly that project.
 */
describe('the probe for a project that is already a deployment', () => {
  it('asks only through to_regclass, never from a table it is asking about', () => {
    expect(PRIOR_INSTALL_QUERY).not.toMatch(/\bfrom\b/i);
    expect(PRIOR_INSTALL_QUERY).toContain("to_regclass('public.cf_migrations')");
  });

  it('reads the row a project with an install answers with', () => {
    expect(readPriorInstall([{ installed: true, bots: true, queue: false }])).toEqual({
      installed: true,
      bots: true,
      queue: false,
    });
  });

  /* Postgres over the management API has answered booleans as 't'/'f' before. */
  it('takes the answer in either spelling', () => {
    expect(readPriorInstall([{ installed: 't', bots: 'f', queue: 't' }])).toEqual({
      installed: true,
      bots: false,
      queue: true,
    });
  });

  /* Not installed, no rows, and a shape nobody recognises are one answer: go
     ahead. The migrations behind this are all safe to re-run. */
  it('treats anything it cannot read as an empty project', () => {
    for (const rows of [[{ installed: false, bots: false, queue: false }], [], [null], {}, undefined, 'nope']) {
      expect(readPriorInstall(rows)).toBeUndefined();
    }
  });

  it('names what is there, and says something when only the ledger is', () => {
    expect(describePriorInstall({ installed: true, bots: true, queue: true })).toBe(
      'accounts and their bots, a publish queue and the jobs that drain it',
    );
    expect(describePriorInstall({ installed: true, bots: false, queue: false })).toBe('the migration table');
  });
});
