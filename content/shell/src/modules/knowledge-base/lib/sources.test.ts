import { describe, expect, it } from 'vitest';
import { editsHere, isSourceId, SOURCE_GROUPS, SOURCE_IDS, SOURCES, sourceMeta, sourcesIn } from './sources';

describe('SOURCES', () => {
  it('has unique ids', () => {
    expect(new Set(SOURCE_IDS).size).toBe(SOURCE_IDS.length);
  });

  it('puts every source in a group the rail renders', () => {
    for (const meta of SOURCES) expect(SOURCE_GROUPS).toContain(meta.group);
  });

  it('covers every source across the groups exactly once', () => {
    const listed = SOURCE_GROUPS.flatMap((group) => sourcesIn(group).map((meta) => meta.id));
    expect(listed.sort()).toEqual([...SOURCE_IDS].sort());
  });

  it('gives every source a blurb — the rail tooltip and the page subtitle read it', () => {
    for (const meta of SOURCES) expect(meta.blurb.length).toBeGreaterThan(10);
  });

  it('gives every mirror a link to its owner', () => {
    for (const meta of SOURCES) {
      if (meta.ownedBy) expect(meta.ownerHref).toBeTruthy();
      else expect(meta.ownerHref).toBeUndefined();
    }
  });

  it('opens on a source that spends no budget', () => {
    expect(sourceMeta('overview').spendsBudget).toBe(false);
    expect(sourceMeta('gaps').spendsBudget).toBe(false);
  });
});

describe('isSourceId', () => {
  it('accepts a real id and rejects anything else', () => {
    expect(isSourceId('faq')).toBe(true);
    expect(isSourceId('nonsense')).toBe(false);
    expect(isSourceId(null)).toBe(false);
  });
});

describe('editsHere', () => {
  it('edits an unowned source anywhere', () => {
    expect(editsHere(sourceMeta('faq'), ['bookings'])).toBe(true);
  });

  it('hands a mirror to its owner when that module is installed', () => {
    expect(editsHere(sourceMeta('services'), ['bookings', 'contacts'])).toBe(false);
  });

  it('edits the mirror itself when nobody else can', () => {
    expect(editsHere(sourceMeta('services'), ['contacts'])).toBe(true);
    expect(editsHere(sourceMeta('team'), [])).toBe(true);
  });
});
