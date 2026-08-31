import { describe, expect, it } from 'vitest';
import { UUID_RE, isUuid, stableUuid } from '../src/stableUuid';

describe('stableUuid', () => {
  it('produces an RFC-4122 v4-shaped uuid', () => {
    expect(stableUuid('anything')).toMatch(UUID_RE);
    expect(stableUuid('')).toMatch(UUID_RE);
    expect(stableUuid('p1')).toMatch(UUID_RE);
  });

  it('is deterministic — the same key is the same uuid', () => {
    expect(stableUuid('group:1/predicate:2')).toBe(stableUuid('group:1/predicate:2'));
  });

  it('separates keys that differ by one character', () => {
    const ids = new Set(['p1', 'p2', 'p3', 'g1', 'g2', ''].map(stableUuid));
    expect(ids.size).toBe(6);
  });

  it('separates a long run of generated keys', () => {
    const ids = new Set(Array.from({ length: 500 }, (_, i) => stableUuid(`contacts/filter/${i}`)));
    expect(ids.size).toBe(500);
  });

  it('rejects the ids the API rejects', () => {
    expect(isUuid('contacts-inline')).toBe(false);
    expect(isUuid('deal-p1')).toBe(false);
    expect(isUuid('12345678-1234-1234-1234-123456789012')).toBe(false); // version nibble is not 4
  });
});
