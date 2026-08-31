import { describe, expect, it } from 'vitest';
import { scrubNpmExecEnv } from '../src/npmEnv';

/**
 * The bug this closes: a wizard started through `npx --package=<tgz> ...`
 * inherits npm_config_package, hands it to `npm run deploy`, and the deploy
 * script's own `npx --yes vercel@latest whoami` then skips npm's bin swap and
 * runs the spec as a command — `sh: vercel@latest: command not found`, from a
 * CLI that installs perfectly well. Every nested npx in the run has the same
 * problem, which is why this is done once, to the process.
 */
describe('scrubNpmExecEnv', () => {
  it('removes the two variables that steer npm exec', () => {
    const env = { npm_config_package: './wizard.tgz', npm_config_call: 'chatfuel-wizard', PATH: '/usr/bin' };
    expect(scrubNpmExecEnv(env)).toHaveLength(2);
    expect(env).toEqual({ PATH: '/usr/bin' });
  });

  it('catches them whatever case they arrived in', () => {
    // Environment names are case-insensitive on Windows.
    const env: NodeJS.ProcessEnv = { NPM_CONFIG_PACKAGE: 'x' };
    scrubNpmExecEnv(env);
    expect(env.NPM_CONFIG_PACKAGE).toBeUndefined();
  });

  it('leaves the rest of npm’s environment alone', () => {
    // A nested npx still has to be able to reach a registry.
    const env = {
      npm_config_registry: 'https://registry.example.com',
      npm_config_cache: '/tmp/npm',
      npm_config_yes: 'true',
    };
    expect(scrubNpmExecEnv(env)).toEqual([]);
    expect(env.npm_config_registry).toBe('https://registry.example.com');
    expect(env.npm_config_cache).toBe('/tmp/npm');
  });
});
