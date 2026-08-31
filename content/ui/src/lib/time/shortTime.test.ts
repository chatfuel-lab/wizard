import { describe, expect, it } from 'vitest';
import { shortTime } from './shortTime';

/* The happy paths read the current date and the ambient locale, so only the
   branches with a stable answer are asserted; "now" is the same instant in
   every zone, which is enough to pin the today branch's shape. */
describe('shortTime', () => {
  it('says nothing for nothing', () => {
    expect(shortTime(null)).toBe('');
    expect(shortTime(undefined)).toBe('');
    expect(shortTime('not a date')).toBe('');
  });

  it('renders the current instant as a clock time, not a date', () => {
    expect(shortTime(new Date().toISOString())).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});
