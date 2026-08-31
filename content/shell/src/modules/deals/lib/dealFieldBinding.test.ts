import { describe, expect, it } from 'vitest';
import { bindDealFields, requestedNames, unboundFields, type CatalogEntry } from './dealFieldBinding';
import { DEAL_FIELD_NAMES } from './dealFields';

const entry = (name: string, aliases: Array<[string, string]> = []): CatalogEntry => ({
  name,
  aliases: aliases.map(([locale, alias]) => ({ locale, alias })),
});

describe('bindDealFields', () => {
  it('binds the configured name exactly', () => {
    const bindings = bindDealFields([entry('deal amount'), entry('first name')]);
    expect(bindings.amount).toMatchObject({ name: 'deal amount', bound: true, via: 'exact' });
    expect(bindings.company.bound).toBe(false);
  });

  it('falls back to an alias, then to case, then to a localized alias', () => {
    const bindings = bindDealFields([
      entry('amount'),
      entry('Deal Close Date'),
      entry('firma', [['de', 'Deal Company']]),
    ]);
    expect(bindings.amount).toMatchObject({ name: 'amount', via: 'alias' });
    expect(bindings.closeDate).toMatchObject({ name: 'Deal Close Date', via: 'case' });
    expect(bindings.company).toMatchObject({ name: 'firma', via: 'localized' });
  });

  it('prefers the exact name over an alias that also exists', () => {
    const bindings = bindDealFields([entry('amount'), entry('deal amount')]);
    expect(bindings.amount).toMatchObject({ name: 'deal amount', via: 'exact' });
  });

  it('never lets two fields claim the same attribute', () => {
    // 'source' is both the configured suffix and an alias; only one field may take it.
    const bindings = bindDealFields([entry('source')]);
    const names = Object.values(bindings)
      .filter((binding) => binding.bound)
      .map((binding) => binding.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('an empty catalog leaves every field unbound on its configured name', () => {
    const bindings = bindDealFields([]);
    expect(bindings).toEqual(unboundFields());
    expect(Object.values(bindings).every((binding) => !binding.bound)).toBe(true);
  });
});

describe('requestedNames', () => {
  it('always asks for every configured name, even with no catalog', () => {
    expect(requestedNames(null)).toEqual([...DEAL_FIELD_NAMES].sort());
  });

  it('adds a resolved alias to the configured set', () => {
    const names = requestedNames(bindDealFields([entry('Deal Amount')]));
    expect(names).toContain('Deal Amount');
    expect(names).toContain('deal amount');
    expect(names).toEqual([...names].sort());
  });
});
