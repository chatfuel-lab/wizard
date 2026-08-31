import { randomBytes } from 'node:crypto';
import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

/**
 * The floor the proxy enforces, repeated here so a run cannot write a password
 * the deployment will then refuse to start the panel behind.
 */
export const ADMIN_PASSWORD_MIN_LENGTH = 16;

export const ADMIN_PASSWORD_ENV = 'ADMIN_PASSWORD';

/**
 * A generated password: 24 random bytes as base64url, so 32 characters.
 *
 * Deliberately not hex — the wizard's log scrubber masks any 64-hex string, and
 * a hex secret would be invisible in exactly the output somebody needs to read
 * it out of. The same reasoning as the publish queue's shared secret.
 */
export const newAdminPassword = (): string => randomBytes(24).toString('base64url');

function problemWith(value: string): string | undefined {
  if (value.length < ADMIN_PASSWORD_MIN_LENGTH) return `${ADMIN_PASSWORD_MIN_LENGTH} characters at least`;
  if (/\s/.test(value)) return 'No spaces — it is read from an environment file';
  return undefined;
}

/**
 * The shape of the admin flag, judged before anybody is asked anything — the
 * same rule the auth and brand flags follow, so a command line that cannot work
 * is answered by the command line.
 */
export function assertAdminFlags(ctx: WizardContext): void {
  const given = ctx.flags.adminPassword;
  if (given === undefined) return;
  const problem = problemWith(given.trim());
  if (problem) throw new WizardError('--admin-password cannot be used', problem);
}

/**
 * The environment's answer, held to the same rule as the flag's.
 *
 * It used to be taken as-is, so `ADMIN_PASSWORD=admin` walked past a minimum
 * the proxy then enforces at boot — the panel refuses to start behind it, and
 * the failure surfaces on a deployment rather than here. Judged separately from
 * assertAdminFlags because that one runs before the modules are chosen, and an
 * ADMIN_PASSWORD sitting in the shell of a run that never asks for the admin
 * panel is not this run's business.
 */
export function adminPasswordFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[ADMIN_PASSWORD_ENV]?.trim();
  if (!value) return undefined;
  const problem = problemWith(value);
  if (problem) throw new WizardError(`${ADMIN_PASSWORD_ENV} cannot be used`, problem);
  return value;
}

/**
 * The password that opens the admin panel.
 *
 * Three ways in, in order: the flag, the environment (so a script that already
 * holds one does not get a second), and a generated one. Generated is the
 * default rather than a prompt because the thing being chosen is a secret
 * nobody has to remember — it goes into `.env`, which is where the panel reads
 * it from, and typing one by hand mostly produces a weaker one.
 *
 * It is written to `.env` and printed once. It goes into no other file: not the
 * handoff, not the agent instructions, not a README — those are checked into
 * repositories.
 */
export async function adminSetup(ctx: WizardContext): Promise<void> {
  if (!ctx.answers.modules.includes('admin')) return;
  assertAdminFlags(ctx);

  const given = ctx.flags.adminPassword?.trim() || adminPasswordFromEnv();
  if (given) {
    ctx.answers.env[ADMIN_PASSWORD_ENV] = given;
    return;
  }

  if (ctx.flags.yes) {
    ctx.answers.env[ADMIN_PASSWORD_ENV] = newAdminPassword();
    return;
  }

  const own = await p.confirm({
    message: 'Set your own admin password? (No generates a strong one.)',
    initialValue: false,
  });
  if (p.isCancel(own)) throw new WizardError('Cancelled.');
  if (!own) {
    ctx.answers.env[ADMIN_PASSWORD_ENV] = newAdminPassword();
    return;
  }

  const typed = await p.password({
    message: `Admin password (${ADMIN_PASSWORD_MIN_LENGTH} characters at least)`,
    validate: (value) => problemWith((value ?? '').trim()),
  });
  if (p.isCancel(typed)) throw new WizardError('Cancelled.');
  ctx.answers.env[ADMIN_PASSWORD_ENV] = typed.trim();
}

/**
 * Said once, at the end of a run, where the person is still looking.
 *
 * Only for a password this run invented: one that came from a flag or the
 * environment is already somewhere its owner can read it, and printing it again
 * only puts it in one more scrollback.
 */
export function adminPasswordNote(ctx: WizardContext): string | undefined {
  if (!ctx.answers.modules.includes('admin')) return undefined;
  const value = ctx.answers.env[ADMIN_PASSWORD_ENV];
  if (!value) return undefined;
  const given = ctx.flags.adminPassword?.trim() || adminPasswordFromEnv();
  if (given) return undefined;
  /* The .env is written only if the gitignore guard was accepted. Told to
     look in a file that was never written, the one place this password exists
     is the scrollback of a terminal nobody keeps — so the note says which of
     the two happened. */
  const where = ctx.answers.envWritten
    ? `It is in .env as ${ADMIN_PASSWORD_ENV} and nowhere else.`
    : `Nothing was written to disk — .env was not created — so set ${ADMIN_PASSWORD_ENV} yourself before the app runs. Copy it now; it is nowhere else.`;
  return `Admin panel: open /admin and sign in with\n${value}\n${where}`;
}
