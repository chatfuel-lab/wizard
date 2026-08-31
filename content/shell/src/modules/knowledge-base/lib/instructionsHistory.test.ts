import { describe, expect, it } from 'vitest';
import { MAX_VERSIONS, createVersionLog, versionAge, versionLogFor, versionPreview } from './instructionsHistory';

describe('the version log', () => {
  it('is newest first', () => {
    const log = createVersionLog();
    log.record('one', 1);
    log.record('two', 2);
    expect(log.list().map((version) => version.value)).toEqual(['two', 'one']);
  });

  it('caps at MAX_VERSIONS and drops the oldest', () => {
    const log = createVersionLog();
    for (let index = 0; index <= MAX_VERSIONS; index += 1) log.record(`v${index}`, index);
    expect(log.list()).toHaveLength(MAX_VERSIONS);
    expect(log.list().at(-1)?.value).toBe('v1');
  });

  it('ignores a repeat of the newest entry — saving twice with no edit is not a version', () => {
    const log = createVersionLog();
    log.record('same', 1);
    log.record('same', 2);
    expect(log.list()).toHaveLength(1);
  });

  it('keeps a value that comes back after something else', () => {
    const log = createVersionLog();
    log.record('a', 1);
    log.record('b', 2);
    log.record('a', 3);
    expect(log.list().map((version) => version.value)).toEqual(['a', 'b', 'a']);
  });

  it('never offers "restore to empty"', () => {
    const log = createVersionLog();
    log.record('   \n ', 1);
    expect(log.list()).toEqual([]);
  });

  it('clears', () => {
    const log = createVersionLog();
    log.record('a', 1);
    log.clear();
    expect(log.list()).toEqual([]);
  });
});

describe('versionLogFor', () => {
  it('hands back the same log for one bot and a separate one per bot', () => {
    const first = versionLogFor('bot-a');
    first.record('a', 1);
    expect(versionLogFor('bot-a').list()).toHaveLength(1);
    expect(versionLogFor('bot-b').list()).toEqual([]);
  });
});

describe('versionAge', () => {
  const now = 1_700_000_000_000;

  it('reads in the unit a person would use', () => {
    expect(versionAge(now - 5_000, now)).toBe('just now');
    expect(versionAge(now - 4 * 60_000, now)).toBe('4 minutes ago');
    expect(versionAge(now - 60_000, now)).toBe('1 minute ago');
    expect(versionAge(now - 3 * 3_600_000, now)).toBe('3 hours ago');
    expect(versionAge(now - 2 * 86_400_000, now)).toBe('2 days ago');
  });

  it('does not go backwards when the clock does', () => {
    expect(versionAge(now + 10_000, now)).toBe('just now');
  });
});

describe('versionPreview', () => {
  it('flattens the prompt onto one line', () => {
    expect(versionPreview('Role\n\nYou are   the host.')).toBe('Role You are the host.');
  });

  it('truncates with an ellipsis and stays within the limit', () => {
    const preview = versionPreview('x'.repeat(300), 20);
    expect(preview).toHaveLength(20);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('leaves a short prompt alone', () => {
    expect(versionPreview('Be brief.', 20)).toBe('Be brief.');
  });
});
