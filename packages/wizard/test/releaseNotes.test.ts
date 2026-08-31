import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { releaseNotes } from '../src/releaseNotes';

/**
 * Two callers read this file and they ask different questions. The release
 * workflow asks for one version and fails the release when there is no section
 * for it. `chatfuel-wizard update` asks for everything between the version an
 * app was built by and the version updating it, and must survive a changelog
 * that has no section for some version in between — a released patch nobody
 * wrote an entry for is an omission, not a reason to tell the person there is
 * nothing to read.
 */
const CHANGELOG = [
  '# Changelog',
  '',
  '## Unreleased',
  '',
  '- something not out yet',
  '',
  '## 0.4.0 — 2026-09-01',
  '',
  '### Fixed',
  '',
  '- the proxy stops leaking the token',
  '',
  '## 0.2.0 — 2026-08-21',
  '',
  '### Breaking',
  '',
  '- the wizard asks for a workspace, not a bot',
  '',
  '## 0.1.0 — 2026-08-01',
  '',
  '- first one',
  '',
].join('\n');

describe('one version', () => {
  it('gives that section body and no heading, because the tag already titles it', () => {
    expect(releaseNotes('0.2.0', CHANGELOG)).toBe('### Breaking\n\n- the wizard asks for a workspace, not a bot');
    expect(releaseNotes('v0.2.0', CHANGELOG)).toBe(releaseNotes('0.2.0', CHANGELOG));
  });

  it('says nothing rather than something empty when there is no section', () => {
    expect(releaseNotes('0.3.0', CHANGELOG)).toBeNull();
  });
});

describe('a range', () => {
  it('gives every section after the first version and up to the second, headings and all', () => {
    const notes = releaseNotes('0.1.0..0.4.0', CHANGELOG)!;
    expect(notes).toContain('## 0.4.0 — 2026-09-01');
    expect(notes).toContain('## 0.2.0 — 2026-08-21');
    expect(notes).toContain('- the proxy stops leaking the token');
    // Newest first, the order the file is written in.
    expect(notes.indexOf('0.4.0')).toBeLessThan(notes.indexOf('0.2.0'));
  });

  it('leaves out the version it starts from — that one is already installed', () => {
    const notes = releaseNotes('0.2.0..0.4.0', CHANGELOG)!;
    expect(notes).toContain('## 0.4.0');
    expect(notes).not.toContain('0.2.0');
  });

  it('carries on past a version with no section of its own', () => {
    // 0.3.0 was released and nobody wrote it up. The 0.4.0 entry is still the
    // thing the reader needs, and a positional read would have stopped here.
    const notes = releaseNotes('0.3.0..0.4.0', CHANGELOG)!;
    expect(notes).toContain('- the proxy stops leaking the token');
  });

  it('never drags Unreleased into a range — it is in no version', () => {
    expect(releaseNotes('0.1.0..0.4.0', CHANGELOG)).not.toContain('something not out yet');
  });

  it('says nothing when the range holds nothing', () => {
    expect(releaseNotes('0.4.0..0.4.0', CHANGELOG)).toBeNull();
    expect(releaseNotes('0.4.0..0.5.0', CHANGELOG)).toBeNull();
  });

  it('sorts a prerelease before the release it leads to', () => {
    const changelog = ['## 1.0.0', '', '- out', '', '## 1.0.0-rc.1', '', '- nearly', ''].join('\n');
    expect(releaseNotes('1.0.0-rc.1..1.0.0', changelog)).toContain('- out');
    expect(releaseNotes('1.0.0-rc.1..1.0.0', changelog)).not.toContain('- nearly');
  });
});

describe('the changelog this repository actually ships', () => {
  it('answers for the version in package.json', () => {
    const root = resolve(import.meta.dirname, '..');
    const version = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }).version;
    expect(releaseNotes(version, readFileSync(join(root, 'CHANGELOG.md'), 'utf8'))).not.toBeNull();
  });
});
