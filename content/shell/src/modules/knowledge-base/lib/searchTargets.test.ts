import { describe, expect, it } from 'vitest';
import { CREATE_ATTRIBUTE, EXPORT_ATTRIBUTE, RAIL_SEARCH_ATTRIBUTE, SEARCH_ATTRIBUTE } from './searchTargets';

const ATTRIBUTES = [SEARCH_ATTRIBUTE, RAIL_SEARCH_ATTRIBUTE, CREATE_ATTRIBUTE, EXPORT_ATTRIBUTE];

describe('search target attributes', () => {
  it('are valid data attribute names', () => {
    for (const attribute of ATTRIBUTES) expect(attribute).toMatch(/^data-[a-z][a-z-]*[a-z]$/);
  });

  it('are distinct, so a querySelector for one never finds another', () => {
    expect(new Set(ATTRIBUTES).size).toBe(ATTRIBUTES.length);
  });
});
