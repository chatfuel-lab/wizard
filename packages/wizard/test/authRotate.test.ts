import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confirm = vi.fn();
vi.mock('@clack/prompts', () => ({
  log: { success: () => undefined, warn: () => undefined, info: () => undefined },
  outro: () => undefined,
  confirm: (...args: unknown[]) => confirm(...args),
  isCancel: (value: unknown) => value === Symbol.for('clack:cancel'),
}));

const NEW_TOKEN = 'b'.repeat(64);
/* Runs where the real prompts run: between the early check on .env and the
   write. A test can therefore do what an attacker would do, at the one moment
   it would work. */
const duringToken = vi.hoisted(() => ({ current: undefined as (() => void) | undefined }));
vi.mock('../src/steps/token', () => ({
  token: (ctx: { answers: { token: string } }) => {
    ctx.answers.token = NEW_TOKEN;
    duringToken.current?.();
    return Promise.resolve();
  },
}));

const { auth } = await import('../src/auth');
const { createContext } = await import('../src/run');
const { digestOf } = await import('../src/lockFormat');

/**
 * `auth` writes a live token into a .env it did not create. Two things have to
 * hold: the directory really is a Chatfuel app, and the token is not about to
 * land in a tracked file. Both used to be assumed.
 */
let dir: string;

const run = (yes: boolean): Promise<void> => auth(createContext({ yes, dryRun: false, verbose: false, dir }));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-auth-'));
  confirm.mockReset();
  duringToken.current = undefined;
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the app marker', () => {
  it('accepts the empty placeholder the scaffold writes when the guard was declined', async () => {
    writeFileSync(join(dir, '.env'), '# CHATFUEL_TOKEN=\n');
    writeFileSync(join(dir, '.gitignore'), '.env\n');
    await run(true);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(`CHATFUEL_TOKEN=${NEW_TOKEN}\n`);
  });

  it('refuses a commented-out assignment that carries a value', async () => {
    writeFileSync(join(dir, '.env'), '# CHATFUEL_TOKEN=someone-elses-note\nOTHER=1\n');
    await expect(run(true)).rejects.toThrow(/does not look like a Chatfuel app/);
    expect(readFileSync(join(dir, '.env'), 'utf8')).not.toContain(NEW_TOKEN);
  });
});

describe('the gitignore guard', () => {
  it('adds the missing line under --yes and then writes the token', async () => {
    writeFileSync(join(dir, '.env'), `CHATFUEL_TOKEN=${'a'.repeat(64)}\n`);
    writeFileSync(join(dir, '.gitignore'), 'dist\n');
    await run(true);
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toMatch(/^\.env$/m);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toContain(NEW_TOKEN);
  });

  it('leaves the old token in place when the person declines', async () => {
    const old = `CHATFUEL_TOKEN=${'a'.repeat(64)}\n`;
    writeFileSync(join(dir, '.env'), old);
    writeFileSync(join(dir, '.gitignore'), 'dist\n');
    confirm.mockResolvedValue(false);
    await run(false);
    expect(readFileSync(join(dir, '.env'), 'utf8')).toBe(old);
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).not.toMatch(/^\.env$/m);
  });
});

describe('the app lock', () => {
  it('records the appended line, so the next update does not read it as an edit', async () => {
    writeFileSync(join(dir, '.env'), `CHATFUEL_TOKEN=${'a'.repeat(64)}\n`);
    const before = 'dist\n';
    writeFileSync(join(dir, '.gitignore'), before);
    mkdirSync(join(dir, '.chatfuel'));
    writeFileSync(
      join(dir, '.chatfuel', 'lock.json'),
      JSON.stringify({
        files: { '.gitignore': { from: 'content/shell/.gitignore', sha256: digestOf(Buffer.from(before)) } },
      }),
    );

    await run(true);

    const lock = JSON.parse(readFileSync(join(dir, '.chatfuel', 'lock.json'), 'utf8')) as {
      files: Record<string, { sha256?: string; rewritten?: string[] }>;
    };
    expect(lock.files['.gitignore']!.rewritten).toContain('envIgnore');
    expect(lock.files['.gitignore']!.sha256).toBe(digestOf(readFileSync(join(dir, '.gitignore'))));
  });
});

/**
 * The .env that turns into a symlink while the person is typing.
 *
 * Checking the path and then writing to it are two operations, and everything
 * between them is a window: the prompts, the remote token check, the gitignore
 * question. A link planted in that window is a link the early check already
 * passed — and the token, plus the 0600 meant to keep it off other accounts,
 * lands on whatever it points at.
 */
describe('a .env replaced while the questions were being answered', () => {
  it('refuses rather than writing the token through the link', async () => {
    const elsewhere = mkdtempSync(join(tmpdir(), 'wizard-elsewhere-'));
    const target = join(elsewhere, 'stolen');
    try {
      writeFileSync(join(dir, '.env'), `CHATFUEL_TOKEN=${'a'.repeat(64)}\n`);
      writeFileSync(join(dir, '.gitignore'), '.env\n');
      writeFileSync(target, 'somebody else’s file\n');
      duringToken.current = () => {
        unlinkSync(join(dir, '.env'));
        symlinkSync(target, join(dir, '.env'));
      };

      await expect(run(true)).rejects.toThrow(/symlink/);
      expect(readFileSync(target, 'utf8')).toBe('somebody else’s file\n');
      expect(readFileSync(target, 'utf8')).not.toContain(NEW_TOKEN);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it('still refuses a .env that was already a link before anything was asked', async () => {
    const elsewhere = mkdtempSync(join(tmpdir(), 'wizard-elsewhere-'));
    const target = join(elsewhere, 'stolen');
    try {
      writeFileSync(target, `CHATFUEL_TOKEN=${'a'.repeat(64)}\n`);
      symlinkSync(target, join(dir, '.env'));

      await expect(run(true)).rejects.toThrow(/symlink/);
      expect(readFileSync(target, 'utf8')).not.toContain(NEW_TOKEN);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });
});
