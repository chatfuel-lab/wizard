import { describe, expect, it } from 'vitest';
import { bindDealFields } from './dealFieldBinding';
import { rollupAmountLabel, rollupColumn, rollupCoverage, rollupExplanation, rollupGroup } from './dealRollup';

const bindings = bindDealFields([{ name: 'deal amount' }, { name: 'deal currency' }]);

const card = (values: Record<string, string>) => ({
  attributes: Object.entries(values).map(([name, stringValue]) => ({
    attr: { name },
    value: { __typename: 'BotAttributeValueString', stringValue },
  })),
});

const amounts = (...values: string[]) => values.map((value) => card({ 'deal amount': value }));

describe('rollupColumn', () => {
  it('sums the loaded amounts', () => {
    const rollup = rollupColumn(amounts('1000', '500.50'), bindings, 2);
    expect(rollup.amount).toBe(1500.5);
    expect(rollup.counted).toBe(2);
    expect(rollup.loaded).toBe(2);
  });

  it('skips a deal with no amount rather than counting it as zero', () => {
    const rollup = rollupColumn([...amounts('1000'), card({}), card({ 'deal amount': '  ' })], bindings, 3);
    expect(rollup.amount).toBe(1000);
    expect(rollup.counted).toBe(1);
    expect(rollup.loaded).toBe(3);
  });

  it('counts an unreadable amount separately and leaves it out of the sum', () => {
    const rollup = rollupColumn(amounts('1000', 'about 5k'), bindings, 2);
    expect(rollup.amount).toBe(1000);
    expect(rollup.counted).toBe(1);
    expect(rollup.unreadable).toBe(1);
  });

  it('refuses to sum across currencies', () => {
    const rollup = rollupColumn(
      [
        card({ 'deal amount': '1000', 'deal currency': 'EUR' }),
        card({ 'deal amount': '1000', 'deal currency': 'USD' }),
      ],
      bindings,
      2,
    );
    expect(rollup.mixedCurrencies).toBe(true);
    expect(rollup.amount).toBeNull();
    expect(rollupAmountLabel(rollup)).toBe('Mixed currencies');
  });

  it('an unset currency is the module default, not a second currency', () => {
    const rollup = rollupColumn(
      [card({ 'deal amount': '1000' }), card({ 'deal amount': '500', 'deal currency': 'EUR' })],
      bindings,
      2,
    );
    expect(rollup.mixedCurrencies).toBe(false);
    expect(rollup.amount).toBe(1500);
  });

  it('an empty column produces nothing to render', () => {
    const rollup = rollupColumn([], bindings, 0);
    expect(rollupAmountLabel(rollup)).toBeNull();
    expect(rollupCoverage(rollup)).toBeNull();
  });
});

describe('coverage', () => {
  it('is stated whenever the sum does not cover the whole column', () => {
    expect(rollupCoverage(rollupColumn(amounts('1000', '2000'), bindings, 21))).toBe('2 of 21');
  });

  it('is stated when a loaded deal simply has no amount', () => {
    const rollup = rollupColumn([...amounts('1000'), card({})], bindings, 2);
    expect(rollupCoverage(rollup)).toBe('1 of 2');
  });

  it('is omitted only when every deal in the column contributed', () => {
    expect(rollupCoverage(rollupColumn(amounts('1000', '2000'), bindings, 2))).toBeNull();
  });

  it('explains itself in full for the title attribute', () => {
    const rollup = rollupColumn(amounts('1000', 'about 5k'), bindings, 9);
    const text = rollupExplanation(rollup);
    expect(text).toContain('1 of 9');
    expect(text).toContain('no aggregation API');
    expect(text).toContain('could not be read');
  });
});

describe('restricted contacts', () => {
  const restricted = { ...card({ 'deal amount': '9999' }), __typename: 'UnavailableContact' };

  it('are excluded from the sum, from counted AND from loaded', () => {
    const rollup = rollupColumn([...amounts('100', '200'), restricted], bindings, 3);
    expect(rollup.amount).toBe(300);
    expect(rollup.counted).toBe(2);
    // Counting it as "loaded" would make the coverage string claim we looked
    // at money we are not allowed to see.
    expect(rollup.loaded).toBe(2);
  });

  it('still leave the column total alone — the server says the deal exists', () => {
    expect(rollupColumn([restricted], bindings, 1).total).toBe(1);
    expect(rollupAmountLabel(rollupColumn([restricted], bindings, 1))).toBeNull();
  });
});

describe('rollupGroup', () => {
  it('sums across columns and adds up their server totals', () => {
    const rollup = rollupGroup(
      [
        { cards: amounts('100', '200'), total: 5 },
        { cards: amounts('300'), total: 2 },
      ],
      bindings,
    );
    expect(rollup.amount).toBe(600);
    expect(rollup.counted).toBe(3);
    expect(rollup.total).toBe(7);
    expect(rollupCoverage(rollup)).toBe('3 of 7');
  });

  it('refuses to sum when the conflict is BETWEEN columns, not inside one', () => {
    const usd = card({ 'deal amount': '50', 'deal currency': 'USD' });
    const rollup = rollupGroup(
      [
        { cards: amounts('100'), total: 1 },
        { cards: [usd], total: 1 },
      ],
      bindings,
    );
    expect(rollup.mixedCurrencies).toBe(true);
    expect(rollupAmountLabel(rollup)).toBe('Mixed currencies');
  });

  it('is empty for no columns rather than throwing', () => {
    const rollup = rollupGroup([], bindings);
    expect(rollup.amount).toBeNull();
    expect(rollup.total).toBe(0);
  });
});
