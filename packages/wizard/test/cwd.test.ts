import { afterEach, describe, expect, it } from 'vitest';
import { resolveFromUserCwd, userCwd } from '../src/cwd';

/**
 * `pnpm --filter @chatfuel/wizard dev` runs with cwd inside packages/wizard, so
 * the default `./chatfuel-app` used to be created inside this repo, where the
 * workspace swallowed its install. INIT_CWD is where the user actually stood.
 */
const original = process.env.INIT_CWD;
afterEach(() => {
  if (original === undefined) delete process.env.INIT_CWD;
  else process.env.INIT_CWD = original;
});

describe('userCwd', () => {
  it('prefers INIT_CWD over the process directory', () => {
    process.env.INIT_CWD = '/somewhere/else';
    expect(userCwd()).toBe('/somewhere/else');
    expect(resolveFromUserCwd('./chatfuel-app')).toBe('/somewhere/else/chatfuel-app');
  });

  it('falls back to the process directory when nothing set it', () => {
    delete process.env.INIT_CWD;
    expect(userCwd()).toBe(process.cwd());
  });

  it('leaves absolute paths alone', () => {
    process.env.INIT_CWD = '/somewhere/else';
    expect(resolveFromUserCwd('/tmp/app')).toBe('/tmp/app');
  });
});
