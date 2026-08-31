import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIN_NODE, nodeIsSupported, nodeUpgradeHint } from '../src/node';

/**
 * The floor is stated twice — once in the bundle, once in the launcher that
 * runs when the bundle cannot be parsed — and npm treats the `engines` field as
 * a warning. So all three have to agree, and the comparison has to look past
 * the major: the HTTP stack the wizard uses is not in every 20.x.
 */
describe('nodeIsSupported', () => {
  it('accepts the floor itself and anything above it', () => {
    expect(nodeIsSupported('20.18.1')).toBe(true);
    expect(nodeIsSupported('20.19.0')).toBe(true);
    expect(nodeIsSupported('22.14.0')).toBe(true);
    expect(nodeIsSupported('24.0.0')).toBe(true);
  });

  it('rejects an older patch of the same major, not just an older major', () => {
    expect(nodeIsSupported('20.5.0')).toBe(false);
    expect(nodeIsSupported('20.18.0')).toBe(false);
    expect(nodeIsSupported('18.20.4')).toBe(false);
  });
});

/**
 * The advice printed to somebody whose Node is too old, which is the first
 * thing this package ever says and the one message a person under the floor is
 * guaranteed to read. It used to end in `curl … | bash` on Linux.
 */
describe('the upgrade hint', () => {
  const wizardRoot = join(__dirname, '..');

  it('names the installer everywhere, and a command only where one is safe', () => {
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      expect(nodeUpgradeHint(platform)).toContain('https://nodejs.org/en/download');
    }
    expect(nodeUpgradeHint('darwin')).toContain('brew install node');
    expect(nodeUpgradeHint('win32')).toContain('winget install OpenJS.NodeJS.LTS');
    // Nothing at all on Linux: there is no one-liner there that is not a URL run unread.
    expect(nodeUpgradeHint('linux')).not.toContain('Or from a terminal');
  });

  it('tells nobody to pipe a URL into a shell — in either file that prints it', () => {
    const pipe = /\|\s*(?:ba|z|k)?sh\b/;
    for (const file of ['src/node.ts', 'bin/chatfuel-wizard.cjs']) {
      expect(readFileSync(join(wizardRoot, file), 'utf8')).not.toMatch(pipe);
    }
    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      expect(nodeUpgradeHint(platform)).not.toMatch(pipe);
    }
  });
});

describe('the floor is stated once', () => {
  const wizardRoot = join(__dirname, '..');

  it('the launcher repeats the same version', () => {
    const launcher = readFileSync(join(wizardRoot, 'bin/chatfuel-wizard.cjs'), 'utf8');
    expect(launcher).toContain(`var MIN_NODE = '${MIN_NODE}';`);
  });

  it('the published engines field allows exactly that floor', () => {
    const pkg = JSON.parse(readFileSync(join(wizardRoot, 'package.json'), 'utf8')) as {
      engines?: { node?: string };
    };
    expect(pkg.engines?.node).toBe(`>=${MIN_NODE}`);
  });
});
