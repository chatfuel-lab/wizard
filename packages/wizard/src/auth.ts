import { closeSync, constants, existsSync, fchmodSync, lstatSync, openSync, readFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { resolveFromUserCwd } from './cwd';
import { WizardError } from './errors';
import { digestOf } from './lockFormat';
import { amendAppLock } from './scaffold/appLock';
import { gitignoreGuard } from './scaffold/env';
import { token } from './steps/token';
import type { WizardContext } from './context';

/**
 * The line that says this directory is a Chatfuel app.
 *
 * Either a real assignment, or the empty `# CHATFUEL_TOKEN=` placeholder the
 * scaffold writes when the gitignore guard was declined - that placeholder is
 * exactly the case `auth` exists to resolve. A commented-out assignment that
 * carries a value is somebody's disabled variable in an unrelated .env, and
 * this command would answer it by writing a live token into that file.
 */
const MARKER = /^\s*(?:#\s*)?CHATFUEL_TOKEN=\s*$|^\s*CHATFUEL_TOKEN=/m;

const symlinkRefusal = (envPath: string): WizardError =>
  new WizardError(
    `${envPath} is a symlink`,
    'The token is written in place, and a link would put it somewhere else. Replace it with a real file.',
  );

/* O_NOFOLLOW is the whole point: the check and the write are one operation, so
   there is no window between deciding the path is a real file and writing a
   live token through it. The mode on openSync only applies when the file is
   created, hence fchmod - and it is fchmod rather than chmod because a mode set
   by path is a mode set on whatever the path means by then, which is the thing
   being defended against. Windows has no O_NOFOLLOW; there is nothing to fall
   back to, so the early lstat above is what that platform gets. */
const NOFOLLOW = constants.O_NOFOLLOW ?? 0;

function writeTokenLine(envPath: string, contents: string): void {
  let fd: number;
  try {
    fd = openSync(envPath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW, 0o600);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // ELOOP on Linux, EMLINK on the BSDs - both mean "that is a symlink".
    if (code === 'ELOOP' || code === 'EMLINK') throw symlinkRefusal(envPath);
    throw err;
  }
  try {
    fchmodSync(fd, 0o600);
    writeSync(fd, contents);
  } finally {
    closeSync(fd);
  }
}

/**
 * `chatfuel-wizard auth` — rotate the token in an existing scaffold.
 *
 * The scaffold is identified by the very line this command rewrites: a .env
 * that declares CHATFUEL_TOKEN. Anything else would be a marker file kept
 * around only to be looked for.
 */
export async function auth(ctx: WizardContext): Promise<void> {
  const dir = resolveFromUserCwd(ctx.flags.dir ?? '.');
  const envPath = join(dir, '.env');
  /* Both the read below and the write at the end follow a symlink, so a .env
     replaced by a link puts a live token in whatever it points at - and the
     0600 that is supposed to keep the token off other accounts lands on the
     target, not on the link. Refused rather than followed: nothing here can
     tell an intentional link from a planted one.

     This check answers it early, before the prompts, because "your .env is a
     link" is worth saying before somebody types a token. It is NOT what makes
     the write safe: minutes of prompting sit between here and there, and a link
     planted in that window would be a link this test already passed. The write
     itself is what refuses to follow one - see writeTokenLine. */
  if (existsSync(envPath) && lstatSync(envPath).isSymbolicLink()) throw symlinkRefusal(envPath);
  const current = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  if (!MARKER.test(current)) {
    throw new WizardError(
      `${dir} does not look like a Chatfuel app (no CHATFUEL_TOKEN in .env)`,
      'Run from the app directory or pass --dir <path>.',
    );
  }
  await token(ctx); // prompts + remote check; leaves the token in ctx.answers

  /* Same guard the scaffold puts in front of the same write. `auth` reaches an
     app the scaffold may never have touched - cloned, or scaffolded before the
     guard existed - and 0600 keeps a token off other accounts, not out of a
     commit. Asked after the token so the prompt has something to protect. */
  const gitignore = await gitignoreGuard(ctx, dir);
  if (!gitignore.ok) return;
  /* The lock records what the scaffold wrote, and the guard has just written
     something else. Left unsaid, the next `update` reads the added line as an
     edit the person made and skips .gitignore as a conflict for good - which
     is the one file whose loss commits the token. */
  if (gitignore.appended) {
    amendAppLock(dir, (lock) => {
      const at = '.gitignore';
      const entry = lock.files[at];
      if (!entry) return;
      const names = entry.rewritten ?? [];
      lock.files[at] = {
        ...entry,
        sha256: digestOf(readFileSync(join(dir, at))),
        rewritten: names.includes('envIgnore') ? names : [...names, 'envIgnore'],
      };
    });
  }

  /* Re-read rather than reuse the snapshot taken before the prompts. This
     write replaces the whole file, and the token step in between can sit on the
     network for minutes: anything the person added to .env in that window would
     be dropped by a write built from bytes that old. */
  const latest = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const withoutToken = latest
    .split('\n')
    .filter((line) => !/^\s*(?:#\s*)?CHATFUEL_TOKEN=/.test(line))
    .join('\n')
    .replace(/^\n+/, '');
  writeTokenLine(envPath, `CHATFUEL_TOKEN=${ctx.answers.token}\n${withoutToken}`);
  p.log.success('Token rotated in .env');
  p.outro('Done.');
}
