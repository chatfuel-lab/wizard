import { describe, expect, it } from 'vitest';
import type { EventSetView } from '../types';
import { buildCoverage, rivalsOf } from './coverage';

const view = (id: string, isBase: boolean, ads: string[] | null): EventSetView => ({
  id,
  isBase,
  name: isBase ? null : id,
  enabled: true,
  updatedAt: '2026-08-21T00:00:00.000Z',
  ads: ads ? { value: ads, inheritsFrom: null, canInheritFrom: [] } : null,
  events: { value: [], inheritsFrom: null, canInheritFrom: [] },
});

describe('buildCoverage', () => {
  it('finds the ad two sets both claim', () => {
    // Nothing on the server reports this, and one of the two silently loses.
    const coverage = buildCoverage([
      view('base', true, null),
      view('spring', false, ['120210000000000010', '120210000000000020']),
      view('lookalike', false, ['120210000000000010']),
    ]);
    expect(coverage.contested).toHaveLength(1);
    expect(coverage.contested[0]?.adId).toBe('120210000000000010');
    expect(coverage.contested[0]?.setIds).toEqual(['spring', 'lookalike']);
  });

  it('leaves the default set out of the index', () => {
    // It answers every ad; that is a fallback, not a claim, and counting it
    // would make every single ad look contested.
    const coverage = buildCoverage([view('base', true, null), view('spring', false, ['1'])]);
    expect([...coverage.byAd.keys()]).toEqual(['1']);
  });

  it('collects the entries that are not shaped like ad ids', () => {
    const coverage = buildCoverage([view('spring', false, ['120210000000000010', '   ', 'oops'])]);
    expect(coverage.malformed.get('spring')).toEqual(['   ', 'oops']);
  });

  it('counts a repeat inside one set once', () => {
    const coverage = buildCoverage([view('spring', false, ['120210000000000010', '120210000000000010'])]);
    expect(coverage.contested).toEqual([]);
  });
});

describe('rivalsOf', () => {
  it('names the other sets and never the one asking', () => {
    const coverage = buildCoverage([
      view('spring', false, ['120210000000000010']),
      view('lookalike', false, ['120210000000000010']),
    ]);
    expect(rivalsOf(coverage, 'spring', '120210000000000010')).toEqual(['lookalike']);
    expect(rivalsOf(coverage, 'spring', 'unknown')).toEqual([]);
  });
});
