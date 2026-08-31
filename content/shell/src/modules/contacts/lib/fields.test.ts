import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType } from '~api/generated/contacts/graphql';
import type { CatalogEntry } from '../hooks/useAttributeCatalog';
import {
  addColumnParam,
  canApplyDefault,
  contactsGainingDefault,
  dataTypeLabel,
  defaultAction,
  defaultConsequence,
  hasDefault,
  inScope,
  listRoute,
  matchesQuery,
  otherNames,
  sortEntries,
  visibleFields,
} from './fields';

const entry = (patch: Partial<CatalogEntry> & { name: string }): CatalogEntry => ({
  type: AttributeType.Custom,
  dataType: AttributeDataType.String,
  usersCount: 0,
  defaultValue: null,
  flowsCount: 0,
  aliases: [],
  ...patch,
});

const CATALOG: CatalogEntry[] = [
  entry({ name: 'company', usersCount: 12, flowsCount: 2 }),
  entry({ name: 'city', usersCount: 40 }),
  entry({ name: 'last seen', type: AttributeType.System, dataType: AttributeDataType.Datetime, usersCount: 67 }),
  entry({ name: 'churn risk', usersCount: null }),
  entry({ name: 'plan', usersCount: 3, defaultValue: 'free' }),
];

describe('reading an entry', () => {
  it('names the storage type in words a person can act on', () => {
    expect(dataTypeLabel(AttributeDataType.Datetime)).toBe('Timestamp');
    expect(dataTypeLabel(AttributeDataType.String)).toBe('Text');
  });

  it('treats an empty-string default as no default', () => {
    expect(hasDefault({ defaultValue: null })).toBe(false);
    expect(hasDefault({ defaultValue: '' })).toBe(false);
    expect(hasDefault({ defaultValue: 'free' })).toBe(true);
  });

  it('lists only the aliases that are not the name itself', () => {
    expect(
      otherNames({
        name: 'company',
        aliases: [
          { locale: 'En', alias: 'company' },
          { locale: 'Es', alias: 'empresa' },
          { locale: 'Pt', alias: 'empresa' },
          { locale: 'Ms', alias: '  ' },
        ],
      }),
    ).toEqual(['empresa']);
  });
});

describe('search and scope', () => {
  it('matches the name and the aliases, case-insensitively', () => {
    const row = entry({ name: 'company', aliases: [{ locale: 'Es', alias: 'Empresa' }] });
    expect(matchesQuery(row, 'COMP')).toBe(true);
    expect(matchesQuery(row, 'empre')).toBe(true);
    expect(matchesQuery(row, 'city')).toBe(false);
  });

  it('an empty query matches everything', () => {
    expect(matchesQuery(entry({ name: 'x' }), '   ')).toBe(true);
  });

  it('splits the catalog by attribute type', () => {
    expect(inScope({ type: AttributeType.System }, 'system')).toBe(true);
    expect(inScope({ type: AttributeType.System }, 'custom')).toBe(false);
    expect(inScope({ type: AttributeType.System }, 'all')).toBe(true);
  });
});

describe('sortEntries', () => {
  it('leaves the catalog order alone when nothing is sorted', () => {
    expect(sortEntries(CATALOG, null).map((row) => row.name)).toEqual(CATALOG.map((row) => row.name));
  });

  it('sorts by count, biggest first under desc', () => {
    expect(sortEntries(CATALOG, { key: 'usersCount', dir: 'desc' }).map((row) => row.name)).toEqual([
      'last seen',
      'city',
      'company',
      'plan',
      'churn risk',
    ]);
  });

  it('keeps an uncounted field last in BOTH directions — unknown is not zero', () => {
    const asc = sortEntries(CATALOG, { key: 'usersCount', dir: 'asc' }).map((row) => row.name);
    const desc = sortEntries(CATALOG, { key: 'usersCount', dir: 'desc' }).map((row) => row.name);
    expect(asc[asc.length - 1]).toBe('churn risk');
    expect(desc[desc.length - 1]).toBe('churn risk');
  });

  it('breaks a tie on the name, so a coarse sort never reshuffles', () => {
    const rows = [entry({ name: 'zulu' }), entry({ name: 'alpha' }), entry({ name: 'mike' })];
    expect(sortEntries(rows, { key: 'flowsCount', dir: 'desc' }).map((row) => row.name)).toEqual([
      'alpha',
      'mike',
      'zulu',
    ]);
  });

  it('does not mutate its input', () => {
    const before = CATALOG.map((row) => row.name);
    sortEntries(CATALOG, { key: 'name', dir: 'desc' });
    expect(CATALOG.map((row) => row.name)).toEqual(before);
  });
});

describe('visibleFields', () => {
  it('applies scope, then search, then sort', () => {
    expect(
      visibleFields(CATALOG, { query: 'c', scope: 'custom', sort: { key: 'name', dir: 'asc' } }).map((r) => r.name),
    ).toEqual(['churn risk', 'city', 'company']);
  });
});

describe('the default value', () => {
  const plan = entry({ name: 'plan', usersCount: 3, defaultValue: 'free' });
  const fresh = entry({ name: 'plan', usersCount: 3 });

  it('reads the action off the current value and the next one', () => {
    expect(defaultAction(fresh, 'free')).toBe('set');
    expect(defaultAction(plan, 'pro')).toBe('update');
    expect(defaultAction(plan, '  ')).toBe('remove');
  });

  it('counts who the default would newly cover', () => {
    expect(contactsGainingDefault({ usersCount: 3 }, 67)).toBe(64);
    expect(contactsGainingDefault({ usersCount: 70 }, 67)).toBe(0);
  });

  it('refuses to guess when the catalog declined to count', () => {
    expect(contactsGainingDefault({ usersCount: null }, 67)).toBeNull();
    expect(contactsGainingDefault({ usersCount: 3 }, null)).toBeNull();
  });

  it('spells out what a default does to every is-empty filter', () => {
    const text = defaultConsequence(fresh, 67, 'free');
    expect(text).toContain('64 contacts');
    expect(text).toContain('is empty” matches nobody');
    expect(text).toContain('is not empty” matches everybody');
  });

  it('says "every contact" rather than a wrong number when the count is unknown', () => {
    expect(defaultConsequence(entry({ name: 'plan', usersCount: null }), 67, 'free')).toContain(
      'Every contact on this bot',
    );
  });

  it('warns about tomorrow when every contact already carries a value', () => {
    expect(defaultConsequence(entry({ name: 'plan', usersCount: 67 }), 67, 'free')).toContain(
      'every contact added from now on',
    );
  });

  it('describes removal as removal, not as a write', () => {
    expect(defaultConsequence(plan, 67, '')).toContain('Removing the default');
  });

  it('will not fire on an unchanged value, in either direction', () => {
    expect(canApplyDefault(plan, 'free')).toBe(false);
    expect(canApplyDefault(plan, ' free ')).toBe(false);
    expect(canApplyDefault(fresh, '')).toBe(false);
    expect(canApplyDefault(plan, 'pro')).toBe(true);
    expect(canApplyDefault(fresh, 'free')).toBe(true);
    expect(canApplyDefault(plan, '')).toBe(true);
  });
});

describe('the two navigation actions', () => {
  it('de-duplicates a requested column and keeps the order asked for', () => {
    expect(addColumnParam(null, 'attr:company')).toBe('attr:company');
    expect(addColumnParam('attr:city', 'attr:company')).toBe('attr:city,attr:company');
    expect(addColumnParam('attr:city,attr:company', 'attr:city')).toBe('attr:city,attr:company');
    expect(addColumnParam(' attr:city , ', 'attr:city')).toBe('attr:city');
  });

  it('drops a stale view key rather than carrying it back to the list', () => {
    expect(listRoute('?view=fields')).toBe('/contacts');
  });

  it('closes an open record on the way to the list', () => {
    expect(listRoute('?view=fields&contact=ct-1&tab=fields&peek=ct-2')).toBe('/contacts');
  });

  it('keeps every param it does not own', () => {
    const next = listRoute('?view=fields&q=anna&density=compact');
    expect(next).toContain('q=anna');
    expect(next).toContain('density=compact');
    expect(next).not.toContain('view=');
  });

  it('appends the requested column without losing the ones already asked for', () => {
    expect(listRoute('?cols=attr:city', { addColumn: 'attr:company' })).toBe(
      '/contacts?cols=attr%3Acity%2Cattr%3Acompany',
    );
  });

  it('takes the query with or without its leading question mark', () => {
    expect(listRoute('cols=attr:city')).toBe('/contacts?cols=attr%3Acity');
    expect(listRoute('', { addColumn: 'attr:company' })).toBe('/contacts?cols=attr%3Acompany');
  });
});
