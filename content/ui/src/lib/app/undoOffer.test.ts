import { describe, expect, it } from 'vitest';
import { UNDO_OFFER_TTL_MS, nextOffer } from './undoOffer';

describe('nextOffer', () => {
  const run = () => undefined;

  it('wraps a real entry with its runner', () => {
    expect(nextOffer({ label: 'Undo move' }, run)).toEqual({ entry: { label: 'Undo move' }, run });
  });

  it('clears on null — a failed batch must not offer an undo that would do nothing', () => {
    expect(nextOffer(null, run)).toBeNull();
  });

  it('keeps a falsy-but-real entry — only null clears', () => {
    expect(nextOffer('', run)).toEqual({ entry: '', run });
    expect(nextOffer(0, run)).toEqual({ entry: 0, run });
  });
});

describe('the TTL', () => {
  it('outlives a toast but not a coffee break', () => {
    expect(UNDO_OFFER_TTL_MS).toBe(60_000);
  });
});
