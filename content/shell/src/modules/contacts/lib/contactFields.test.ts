import { describe, expect, it } from 'vitest';
import { AttributeType, SalesStageV2 } from '~api/generated/contacts/graphql';
import {
  AI_OPTION,
  CONTACT_FIELDS,
  CONTACT_FIELD_NAMES,
  DEFAULT_CURRENCY,
  assigneeLabel,
  assigneeValue,
  bindContactFields,
  bindForContact,
  contactField,
  currencyOf,
  displayName,
  formatContactField,
  formatMoney,
  neighbours,
  parseInstant,
  readContactField,
  requestedFieldNames,
  stageLabel,
  stageMovedAgo,
  toContactFieldValue,
  toDateInputValue,
  unboundContactFields,
} from './contactFields';

const entry = (name: string, extra: { type?: string; aliases?: { locale: string; alias: string }[] } = {}) => ({
  name,
  type: extra.type ?? AttributeType.Custom,
  aliases: extra.aliases ?? [],
});

describe('the convention', () => {
  it('names every field exactly once', () => {
    const names = CONTACT_FIELDS.map((spec) => spec.attributeName);
    expect(new Set(names).size).toBe(names.length);
    expect(CONTACT_FIELD_NAMES).toEqual(names);
  });

  it('throws on an unknown key rather than returning undefined', () => {
    expect(() => contactField('nope' as never)).toThrow(/Unknown contact field/);
    expect(contactField('email').label).toBe('Email');
  });
});

describe('bindContactFields', () => {
  it('binds an exact name', () => {
    const bindings = bindContactFields([entry('email'), entry('city')]);
    expect(bindings.email).toMatchObject({ name: 'email', bound: true, via: 'exact' });
    expect(bindings.city).toMatchObject({ name: 'city', bound: true, via: 'exact' });
  });

  it('binds an exact alias before a case-insensitive name', () => {
    const bindings = bindContactFields([entry('organization')]);
    expect(bindings.company).toMatchObject({ name: 'organization', bound: true, via: 'alias' });
  });

  it('binds case-insensitively', () => {
    const bindings = bindContactFields([entry('Deal Amount')]);
    expect(bindings.dealAmount).toMatchObject({ name: 'Deal Amount', bound: true, via: 'case' });
  });

  it('binds through a localized alias last', () => {
    const bindings = bindContactFields([entry('kundenstadt', { aliases: [{ locale: 'de', alias: 'City' }] })]);
    expect(bindings.city).toMatchObject({ name: 'kundenstadt', bound: true, via: 'localized' });
  });

  it('leaves a field unbound rather than inventing one', () => {
    const bindings = bindContactFields([]);
    expect(bindings.email).toMatchObject({ name: 'email', bound: false, via: 'none' });
  });

  it('never lets two fields claim the same attribute', () => {
    // "deal company" is an alias of `company`; the exact `company` must win and
    // the other must not also bind to it.
    const bindings = bindContactFields([entry('company')]);
    const names = Object.values(bindings)
      .filter((binding) => binding.bound)
      .map((binding) => binding.name);
    expect(names).toEqual(['company']);
  });

  it('marks a system attribute so the row can be read-only', () => {
    const bindings = bindContactFields([entry('last seen', { type: AttributeType.System })]);
    expect(bindings.lastSeen).toMatchObject({ bound: true, system: true });
    expect(bindings.email.system).toBe(false);
  });

  it('asks for the configured names plus whatever bound', () => {
    const bindings = bindContactFields([entry('Deal Amount')]);
    const names = requestedFieldNames(bindings);
    expect(names).toContain('Deal Amount');
    expect(names).toContain('deal amount');
    expect(names).toEqual([...names].sort());
  });

  it('is usable before the catalog answers', () => {
    const bindings = unboundContactFields();
    expect(Object.values(bindings).every((binding) => !binding.bound)).toBe(true);
    expect(requestedFieldNames(bindings)).toEqual([...CONTACT_FIELD_NAMES].sort());
  });
});

describe('bindForContact', () => {
  const held = (name: string, type?: string) => ({ attr: entry(name, { type }) });

  it('binds a field the catalog never mentioned, from the contact’s own attributes', () => {
    const bindings = bindForContact([], [held('E-Mail')]);
    expect(bindings.email).toMatchObject({ name: 'E-Mail', bound: true, via: 'case' });
  });

  it('prefers the catalog, which is the half that carries the aliases', () => {
    const bindings = bindForContact(
      [entry('mail', { aliases: [{ locale: 'de', alias: 'E-Mail-Adresse' }] })],
      [held('mail')],
    );
    expect(bindings.email).toMatchObject({ name: 'mail', bound: true, via: 'alias' });
  });

  it('reads the system flag off whichever half supplied the name', () => {
    expect(bindForContact([], [held('city', AttributeType.System)]).city).toMatchObject({
      name: 'city',
      system: true,
    });
  });

  it('binds nothing for a contact with no attributes and no catalog', () => {
    expect(Object.values(bindForContact([], null)).every((binding) => !binding.bound)).toBe(true);
  });
});

describe('reading and writing values', () => {
  it('reads an empty value as empty and ok', () => {
    expect(readContactField('money', undefined)).toEqual({ raw: '', parsed: null, ok: true });
    expect(readContactField('money', '  ')).toEqual({ raw: '', parsed: null, ok: true });
  });

  it('parses the canonical money form', () => {
    expect(readContactField('money', '1500.50')).toMatchObject({ parsed: 1500.5, ok: true });
  });

  it('reads a thousands comma and a decimal comma differently', () => {
    expect(readContactField('money', '1,234')).toMatchObject({ parsed: 1234 });
    expect(readContactField('money', '1,50')).toMatchObject({ parsed: 1.5 });
    expect(readContactField('money', '1.234,56')).toMatchObject({ parsed: 1234.56 });
  });

  it('refuses prose rather than reading a number out of it', () => {
    expect(readContactField('money', 'about 5k')).toMatchObject({ parsed: null, ok: false });
  });

  it('accepts a currency code beside the number', () => {
    expect(readContactField('money', 'EUR 1200')).toMatchObject({ parsed: 1200, ok: true });
    expect(readContactField('money', '1200 EUR')).toMatchObject({ parsed: 1200, ok: true });
  });

  it('reads seconds and milliseconds and ISO alike', () => {
    expect(parseInstant('1720456863000')).toBe(1720456863000);
    expect(parseInstant('1720456863')).toBe(1720456863000);
    expect(parseInstant('2026-08-18T00:00:00.000Z')).toBe(Date.parse('2026-08-18T00:00:00.000Z'));
    expect(parseInstant('soon')).toBeNull();
  });

  it('writes a date as a millisecond timestamp read at UTC midnight', () => {
    expect(toContactFieldValue('date', '2026-08-18')).toBe(String(Date.UTC(2026, 7, 18)));
  });

  it('leaves an unreadable value alone so the server can be the one to complain', () => {
    expect(toContactFieldValue('date', 'next tuesday-ish')).toBe('next tuesday-ish');
    expect(toContactFieldValue('money', 'about 5k')).toBe('about 5k');
  });

  it('normalizes a currency code but not prose', () => {
    expect(toContactFieldValue('currency', 'usd')).toBe('USD');
    expect(toContactFieldValue('currency', 'dollars')).toBe('dollars');
  });

  it('treats an empty input as a clear', () => {
    for (const kind of ['text', 'money', 'date', 'currency', 'email', 'phone'] as const) {
      expect(toContactFieldValue(kind, '   ')).toBe('');
    }
  });

  it('gives a date input the day back', () => {
    const value = readContactField('date', String(Date.UTC(2026, 7, 18)));
    expect(toDateInputValue(value)).toBe('2026-08-18');
    expect(toDateInputValue(readContactField('date', 'soon'))).toBe('');
  });
});

describe('formatting', () => {
  it('prints nothing for an unset field, so the row can show its placeholder', () => {
    expect(formatContactField('text', undefined)).toBeNull();
    expect(formatContactField('text', '')).toBeNull();
  });

  it('prints a stored value it cannot read raw, never NaN', () => {
    const printed = formatContactField('money', 'about 5k');
    expect(printed).toBe('about 5k');
    expect(printed).not.toContain('NaN');
  });

  it('never prints Invalid Date', () => {
    expect(formatContactField('date', 'soon')).toBe('soon');
  });

  it('falls back to a bare number for a currency code that is not one', () => {
    expect(formatMoney(1500.5, 'XYZ', 'en-GB')).toContain('1,500.5');
    expect(formatMoney(1500, 'not a code', 'en-GB')).toBe('1,500 not a code');
  });

  it('uses the contact’s own currency, else the module default', () => {
    expect(currencyOf({ 'deal currency': 'usd' }, 'deal currency')).toBe('USD');
    expect(currencyOf({}, 'deal currency')).toBe(DEFAULT_CURRENCY);
  });
});

describe('the stage', () => {
  it('names every stage and survives one it does not know', () => {
    expect(stageLabel(SalesStageV2.WorkingOn)).toBe('Working on');
    expect(stageLabel(null)).toBe('No stage');
    expect(stageLabel('Archived' as SalesStageV2)).toBe('Archived');
  });

  it('says nothing when the API has no timestamp to say it with', () => {
    expect(stageMovedAgo(null)).toBeNull();
    expect(stageMovedAgo('not a date')).toBeNull();
  });

  it('counts whole days', () => {
    const now = Date.parse('2026-08-18T12:00:00.000Z');
    expect(stageMovedAgo('2026-08-18T09:00:00.000Z', now)).toBe('Moved today');
    expect(stageMovedAgo('2026-08-17T09:00:00.000Z', now)).toBe('Moved yesterday');
    expect(stageMovedAgo('2026-08-11T12:00:00.000Z', now)).toBe('Moved 7 days ago');
    expect(stageMovedAgo('2026-06-18T12:00:00.000Z', now)).toBe('Moved 2 months ago');
    expect(stageMovedAgo('2024-08-18T12:00:00.000Z', now)).toBe('Moved 2 years ago');
  });
});

describe('identity', () => {
  it('falls back to the phone, then to a deliberate word', () => {
    expect(displayName('Anna Koch', '+49151')).toBe('Anna Koch');
    expect(displayName('   ', '+49151')).toBe('+49151');
    expect(displayName(null, null)).toBe('Unnamed contact');
  });

  it('names a deleted owner rather than calling them unassigned', () => {
    expect(assigneeLabel(null)).toBe('Unassigned');
    expect(assigneeLabel({ __typename: 'FuelyAIAssignee' })).toBe('Fuely AI');
    expect(assigneeLabel({ __typename: 'PublicUserAccount', id: 'u1', name: 'Mira', isUnknown: false })).toBe('Mira');
    expect(assigneeLabel({ __typename: 'PublicUserAccount', id: 'u1', name: 'Gone', isUnknown: true })).toBe(
      'Deleted user',
    );
  });

  it('maps an assignee onto the combobox value', () => {
    expect(assigneeValue(null)).toBeNull();
    expect(assigneeValue({ __typename: 'FuelyAIAssignee' })).toBe(AI_OPTION);
    expect(assigneeValue({ __typename: 'PublicUserAccount', id: 'u1', name: 'Mira', isUnknown: false })).toBe('u1');
  });
});

describe('neighbours', () => {
  const order = ['a', 'b', 'c'];

  it('finds the contact before and after', () => {
    expect(neighbours(order, 'b')).toEqual({ prev: 'a', next: 'c', position: 2, total: 3 });
  });

  it('has no next at the end of what the list loaded', () => {
    expect(neighbours(order, 'c')).toEqual({ prev: 'b', next: null, position: 3, total: 3 });
    expect(neighbours(order, 'a')).toEqual({ prev: null, next: 'b', position: 1, total: 3 });
  });

  it('gives a contact that was never in the list no neighbours at all', () => {
    expect(neighbours(order, 'z')).toEqual({ prev: null, next: null, position: null, total: 3 });
    expect(neighbours(undefined, 'a')).toEqual({ prev: null, next: null, position: null, total: 0 });
  });
});
