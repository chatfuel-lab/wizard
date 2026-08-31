import type { WizardFlags } from './context';

/**
 * The flags whose values are credentials, and the environment variable each one
 * has instead.
 *
 * A command line is not private: every process on the machine can read it out
 * of `ps`, and the shell writes it to a history file that outlives the run. The
 * flags exist because a non-interactive run has to get these values from
 * somewhere — but the env is the same run without the leak, so the choice is
 * worth naming out loud rather than leaving it to whoever reads the --help.
 */
const SECRET_FLAGS = [
  { flag: '--supabase-token', key: 'supabaseToken', env: 'SUPABASE_ACCESS_TOKEN' },
  { flag: '--admin-password', key: 'adminPassword', env: 'ADMIN_PASSWORD' },
] as const satisfies ReadonlyArray<{ flag: string; key: keyof WizardFlags; env: string }>;

/** Which credential flags this run was given, with the env var each replaces. */
export function secretFlagsInUse(flags: WizardFlags): Array<{ flag: string; env: string }> {
  return SECRET_FLAGS.filter(({ key }) => typeof flags[key] === 'string' && flags[key] !== '').map(({ flag, env }) => ({
    flag,
    env,
  }));
}
