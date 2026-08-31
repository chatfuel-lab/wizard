import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAppSlugs, parseAppManifest } from '../src/apps/manifest';
import { WizardError } from '../src/errors';
import packageJson from '../package.json';

/**
 * The manifest arrives over the network, from a repo that will one day take
 * third-party PRs. Two promises: every malformed field is refused with the
 * field named, and the two capabilities an app must NOT have — hooking wizard
 * steps (`resolve`) and declaring secrets (`secret`) — are refused as shapes,
 * not filtered as values.
 */

const valid = () => ({
  id: 'instagram-comments',
  name: 'Comments for Instagram',
  tagline: 'Reply to every comment.',
  description: 'Auto-replies plus an inbox.',
  category: 'instagram',
  status: 'published',
  modules: ['livechat', 'automations'],
  brand: { appName: 'Comments for Instagram', logo: 'listing/icon.png' },
  env: [{ name: 'VITE_IG_DEFAULT_REPLY', optional: true }],
  npmDependencies: { nanoid: '^5.0.0' },
  playbook: 'playbook.md',
  listing: { icon: 'listing/icon.png', screenshots: [{ file: 'listing/screenshots/01.png', alt: 'Inbox' }] },
});

describe('parseAppManifest', () => {
  it('accepts a complete manifest', () => {
    const manifest = parseAppManifest(valid(), 'App "instagram-comments"');
    expect(manifest.id).toBe('instagram-comments');
    expect(manifest.modules).toEqual(['livechat', 'automations']);
    expect(manifest.brand.appName).toBe('Comments for Instagram');
  });

  it('ignores unknown top-level fields — a newer catalog must not break an older wizard', () => {
    expect(() => parseAppManifest({ ...valid(), futureField: { anything: true } }, 'x')).not.toThrow();
  });

  it('names the field that is wrong', () => {
    expect(() => parseAppManifest({ ...valid(), name: '' }, 'x')).toThrow(/"name"/);
    expect(() => parseAppManifest({ ...valid(), id: 'Bad_Slug' }, 'x')).toThrow(/"id"/);
    expect(() => parseAppManifest({ ...valid(), category: 'telegram' }, 'x')).toThrow(/"category"/);
    expect(() => parseAppManifest({ ...valid(), status: 'ready' }, 'x')).toThrow(/"status"/);
    expect(() => parseAppManifest({ ...valid(), modules: [] }, 'x')).toThrow(/"modules"/);
    expect(() => parseAppManifest({ ...valid(), brand: {} }, 'x')).toThrow(/appName/);
    expect(() => parseAppManifest('not an object', 'x')).toThrow(/not a JSON object/);
  });

  it('refuses env declarations that reach for module-only powers', () => {
    expect(() => parseAppManifest({ ...valid(), env: [{ name: 'CHATFUEL_TOKEN', secret: true }] }, 'x')).toThrow(
      /may only set name, default, optional/,
    );
    expect(() => parseAppManifest({ ...valid(), env: [{ name: 'SOME_VAR', resolve: 'authSetup' }] }, 'x')).toThrow(
      /may only set name, default, optional/,
    );
    expect(() => parseAppManifest({ ...valid(), env: [{ name: 'lower_case' }] }, 'x')).toThrow(/env name/);
  });

  it('refuses a dependency that names where the package comes from', () => {
    // Every one of these is a source, not a version, and the wizard runs
    // `npm install <name>@<range>` with install scripts in a directory that
    // holds a live token by the time it does.
    for (const range of [
      'https://attacker.example/pkg.tgz',
      'file:../../evil',
      'git+ssh://git@attacker.example/p.git',
      'npm:evil@1.0.0',
      'attacker/pkg',
      'link:../evil',
      '',
    ]) {
      expect(() => parseAppManifest({ ...valid(), npmDependencies: { 'ui-kit': range } }, 'x')).toThrow(
        /npmDependencies\["ui-kit"\]/,
      );
    }
    for (const name of ['../evil', 'ui kit', 'UI-Kit', '@scope/../evil']) {
      expect(() => parseAppManifest({ ...valid(), npmDependencies: { [name]: '^1.0.0' } }, 'x')).toThrow(
        /is not an npm package name/,
      );
    }
  });

  it('still takes the ranges an app legitimately writes', () => {
    for (const range of ['^5.0.0', '~1.2.3', '1.x', 'latest', '>=1.2.0 <2.0.0', '^1.0.0 || ^2.0.0']) {
      expect(() =>
        parseAppManifest({ ...valid(), npmDependencies: { nanoid: range, '@scope/pkg': range } }, 'x'),
      ).not.toThrow();
    }
  });

  it('refuses an app that needs a newer wizard, and says which', () => {
    expect(() => parseAppManifest({ ...valid(), minWizardVersion: '99.0.0' }, 'x')).toThrow(/99\.0\.0/);
    expect(() => parseAppManifest({ ...valid(), minWizardVersion: packageJson.version }, 'x')).not.toThrow();
    expect(() => parseAppManifest({ ...valid(), minWizardVersion: 'two' }, 'x')).toThrow(/three-part/);
  });

  it('is a WizardError all the way down — the reporter knows how to print it', () => {
    try {
      parseAppManifest({ ...valid(), status: 'nope' }, 'App "x"');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WizardError);
      expect((err as Error).message).toContain('App "x"');
    }
  });
});

describe('listAppSlugs', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wizard-apps-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists the app directories, sorted, and survives a repo with none', () => {
    expect(listAppSlugs(dir)).toEqual([]);
    mkdirSync(join(dir, 'apps', 'zeta'), { recursive: true });
    mkdirSync(join(dir, 'apps', 'alpha'), { recursive: true });
    expect(listAppSlugs(dir)).toEqual(['alpha', 'zeta']);
  });
});
