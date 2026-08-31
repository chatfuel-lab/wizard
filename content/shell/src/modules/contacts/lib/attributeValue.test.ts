import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType } from '~api/generated/contacts/graphql';
import {
  addableAttributes,
  attributeLabel,
  attributeMap,
  attributeValueToInput,
  attributeWriteMessage,
  confirmAttributeWrite,
  dataTypeBadge,
  displayAttributeValue,
  editorFor,
  emptyRowCount,
  fieldRows,
  groupFieldRows,
  inputToAttrValue,
  invalidValueMessage,
  mergeLiveRecord,
  rawAttributeValue,
  shouldAdoptExternalValue,
  storedAsNote,
  toStoredValue,
  visibleRows,
  type AttributeEntryLike,
  type BotAttributeLike,
} from './attributeValue';

const attr = (
  name: string,
  dataType: AttributeDataType = AttributeDataType.String,
  type: AttributeType = AttributeType.Custom,
  aliases: { locale: string; alias: string }[] = [],
): BotAttributeLike => ({ name, dataType, type, aliases });

const entry = (
  name: string,
  value: string | null,
  dataType: AttributeDataType = AttributeDataType.String,
  type: AttributeType = AttributeType.Custom,
): AttributeEntryLike => ({
  attr: attr(name, dataType, type),
  value: value === null ? null : { __typename: 'BotAttributeValueString', stringValue: value },
});

describe('attributeValueToInput', () => {
  it('renders each union branch as a string', () => {
    expect(attributeValueToInput({ __typename: 'BotAttributeValueString', id: '1', stringValue: 'x' })).toBe('x');
    expect(attributeValueToInput({ __typename: 'BotAttributeValueLong', id: '1', longValue: 42 })).toBe('42');
    expect(attributeValueToInput({ __typename: 'BotAttributeValueDouble', id: '1', doubleValue: 1.5 })).toBe('1.5');
    expect(attributeValueToInput({ __typename: 'BotAttributeValueBoolean', id: '1', booleanValue: true })).toBe('true');
    expect(attributeValueToInput(null)).toBe('');
  });

  it('converts datetime ms-timestamp strings to ISO', () => {
    const iso = attributeValueToInput({
      __typename: 'BotAttributeValueDatetime',
      id: '1',
      datetimeValue: '1720456863000',
    });
    expect(iso).toBe(new Date(1720456863000).toISOString());
  });
});

describe('inputToAttrValue', () => {
  it('passes strings through trimmed', () => {
    expect(inputToAttrValue(AttributeDataType.String, '  hello ')).toBe('hello');
    expect(inputToAttrValue(undefined, 'raw')).toBe('raw');
  });

  it('converts ISO datetime input to a millisecond-timestamp string', () => {
    const iso = new Date(1720456863000).toISOString();
    expect(inputToAttrValue(AttributeDataType.Datetime, iso)).toBe('1720456863000');
  });

  it('keeps an already-ms datetime value as-is', () => {
    expect(inputToAttrValue(AttributeDataType.Datetime, '1720456863000')).toBe('1720456863000');
  });

  it('leaves unparseable datetime input untouched (server surfaces the error)', () => {
    expect(inputToAttrValue(AttributeDataType.Datetime, 'not a date')).toBe('not a date');
  });
});

describe('rawAttributeValue', () => {
  it('distinguishes no value at all from the empty string', () => {
    expect(rawAttributeValue(null)).toBeNull();
    expect(rawAttributeValue({ __typename: 'BotAttributeValueString', stringValue: '' })).toBe('');
  });

  it('reads every typed branch, because system attributes come back typed', () => {
    expect(rawAttributeValue({ longValue: 7 })).toBe('7');
    expect(rawAttributeValue({ doubleValue: 1.25 })).toBe('1.25');
    expect(rawAttributeValue({ booleanValue: false })).toBe('false');
    expect(rawAttributeValue({ datetimeValue: '1720456863000' })).toBe('1720456863000');
  });
});

describe('attributeMap', () => {
  it('keys the raw values by name and tolerates nothing at all', () => {
    expect(attributeMap([entry('city', 'Berlin')])).toEqual({ city: 'Berlin' });
    expect(attributeMap(null)).toEqual({});
  });
});

describe('displayAttributeValue', () => {
  it('says yes and no rather than true and false', () => {
    expect(displayAttributeValue('true', AttributeDataType.Boolean)).toBe('Yes');
    expect(displayAttributeValue('false', AttributeDataType.Boolean)).toBe('No');
  });

  it('prints what is stored when a boolean holds something else', () => {
    expect(displayAttributeValue('maybe', AttributeDataType.Boolean)).toBe('maybe');
  });

  it('never prints Invalid Date for a datetime holding prose', () => {
    expect(displayAttributeValue('soon', AttributeDataType.Datetime)).toBe('soon');
  });

  it('formats a millisecond timestamp', () => {
    const shown = displayAttributeValue('1720456863000', AttributeDataType.Datetime, 'en-GB');
    expect(shown).not.toBe('1720456863000');
    expect(shown).not.toContain('Invalid');
  });

  it('formats an ISO instant a CSV import may have written', () => {
    const shown = displayAttributeValue('2026-08-18T10:00:00.000Z', AttributeDataType.Datetime, 'en-GB');
    expect(shown).toContain('2026');
  });

  it('shows an unset value as an empty string', () => {
    expect(displayAttributeValue(null, AttributeDataType.String)).toBe('');
  });
});

describe('toStoredValue', () => {
  it('accepts the words a person types for a boolean', () => {
    expect(toStoredValue('yes', AttributeDataType.Boolean)).toBe('true');
    expect(toStoredValue('NO', AttributeDataType.Boolean)).toBe('false');
    expect(toStoredValue('1', AttributeDataType.Boolean)).toBe('true');
  });

  it('refuses a value it would otherwise store as prose', () => {
    expect(toStoredValue('maybe', AttributeDataType.Boolean)).toBeNull();
    expect(toStoredValue('soon', AttributeDataType.Datetime)).toBeNull();
    expect(toStoredValue('lots', AttributeDataType.Long)).toBeNull();
  });

  it('round-trips a millisecond datetime unchanged', () => {
    expect(toStoredValue('1720456863000', AttributeDataType.Datetime)).toBe('1720456863000');
  });

  it('treats an empty input as a clear rather than a refusal', () => {
    expect(toStoredValue('   ', AttributeDataType.Boolean)).toBe('');
    expect(toStoredValue('', AttributeDataType.Datetime)).toBe('');
  });

  it('has a sentence for every refusal', () => {
    for (const dataType of Object.values(AttributeDataType)) {
      expect(invalidValueMessage(dataType).length).toBeGreaterThan(0);
    }
  });
});

describe('the editors and the badges', () => {
  it('gives every dataType an editor and a badge', () => {
    for (const dataType of Object.values(AttributeDataType)) {
      expect(['text', 'date', 'boolean', 'number']).toContain(editorFor(dataType));
      expect(dataTypeBadge(dataType).length).toBeGreaterThan(0);
    }
  });
});

describe('storedAsNote', () => {
  it('is emitted only where it is true', () => {
    expect(storedAsNote(AttributeType.Custom, AttributeDataType.String)).toContain('stored as text');
    expect(storedAsNote(AttributeType.System, AttributeDataType.String)).toBeNull();
    expect(storedAsNote(AttributeType.Custom, AttributeDataType.Datetime)).toBeNull();
  });
});

describe('attributeLabel', () => {
  it('prefers the locale alias, then English, then the API name', () => {
    const withAliases = attr('deal_amount_v2', AttributeDataType.String, AttributeType.Custom, [
      { locale: 'en', alias: 'Deal amount' },
      { locale: 'de', alias: 'Auftragswert' },
    ]);
    expect(attributeLabel(withAliases, 'de')).toBe('Auftragswert');
    expect(attributeLabel(withAliases, 'fr')).toBe('Deal amount');
    expect(attributeLabel(attr('city'), 'de')).toBe('city');
  });

  it('falls back to the name when the alias is blank', () => {
    const blank = attr('city', AttributeDataType.String, AttributeType.Custom, [{ locale: 'en', alias: '  ' }]);
    expect(attributeLabel(blank, 'en')).toBe('city');
  });
});

describe('fieldRows', () => {
  const catalog = new Map<string, BotAttributeLike>([
    ['city', attr('city', AttributeDataType.String, AttributeType.Custom, [{ locale: 'en', alias: 'City' }])],
  ]);

  it('shows every attribute the contact carries, custom before system', () => {
    const rows = fieldRows(
      [
        entry('locale', 'de-DE', AttributeDataType.String, AttributeType.System),
        entry('city', 'Berlin'),
        entry('company', 'Acme'),
      ],
      catalog,
    );
    expect(rows.map((row) => row.name)).toEqual(['city', 'company', 'locale']);
    expect(rows[2]).toMatchObject({ name: 'locale', system: true });
  });

  it('takes the label from the catalog and keeps the API name as the key', () => {
    const rows = fieldRows([entry('city', 'Berlin')], catalog);
    expect(rows[0]).toMatchObject({ name: 'city', label: 'City' });
  });

  it('still shows an attribute the paginated catalog never returned', () => {
    const rows = fieldRows([entry('unlisted', 'x')], new Map());
    expect(rows[0]).toMatchObject({ name: 'unlisted', label: 'unlisted' });
  });

  it('marks an unset value and an empty string alike as empty', () => {
    const rows = fieldRows([entry('a', null), entry('b', ''), entry('c', 'x')], new Map());
    expect(rows.filter((row) => row.empty).map((row) => row.name)).toEqual(['a', 'b']);
    expect(emptyRowCount(rows)).toBe(2);
  });

  it('survives a contact with no attributes', () => {
    expect(fieldRows(null, new Map())).toEqual([]);
  });
});

describe('groupFieldRows', () => {
  it('drops a group with nothing in it rather than heading an empty list', () => {
    const rows = fieldRows([entry('city', 'Berlin')], new Map());
    const groups = groupFieldRows(rows);
    expect(groups.map((group) => group.key)).toEqual(['custom']);
  });

  it('names both groups when both exist', () => {
    const rows = fieldRows(
      [entry('city', 'Berlin'), entry('locale', 'de', AttributeDataType.String, AttributeType.System)],
      new Map(),
    );
    expect(groupFieldRows(rows).map((group) => group.key)).toEqual(['custom', 'system']);
  });
});

describe('visibleRows', () => {
  it('hides only the empty ones, and only when asked', () => {
    const rows = fieldRows([entry('a', null), entry('b', 'x')], new Map());
    expect(visibleRows(rows, true).map((row) => row.name)).toEqual(['b']);
    expect(visibleRows(rows, false)).toHaveLength(2);
  });
});

describe('addableAttributes', () => {
  it('offers custom attributes the contact does not already carry', () => {
    const catalog = [attr('city'), attr('company'), attr('locale', AttributeDataType.String, AttributeType.System)];
    const addable = addableAttributes(catalog, [entry('city', 'Berlin')]);
    expect(addable.map((option) => option.name)).toEqual(['company']);
  });
});

describe('confirmAttributeWrite', () => {
  it('calls a name missing from the response what it is — dropped', () => {
    expect(confirmAttributeWrite([], 'city', 'Berlin')).toEqual({ status: 'dropped' });
  });

  it('accepts a value that came back exactly as written', () => {
    expect(confirmAttributeWrite([entry('city', 'Berlin')], 'city', 'Berlin')).toEqual({ status: 'stored' });
  });

  it('reports a value the server changed under it', () => {
    expect(confirmAttributeWrite([entry('flag', 'true')], 'flag', 'yes')).toEqual({
      status: 'changed',
      actual: 'true',
    });
  });

  it('has a sentence for each failure and silence for success', () => {
    expect(attributeWriteMessage({ status: 'stored' }, 'City')).toBeNull();
    expect(attributeWriteMessage({ status: 'dropped' }, 'City')).toContain('did not store City');
    expect(attributeWriteMessage({ status: 'changed', actual: 'true' }, 'Flag')).toContain('“true”');
  });
});

describe('mergeLiveRecord', () => {
  const record = (id: string, attributes: AttributeEntryLike[]) => ({ id, attributes });

  it('drops an echo for a record that is no longer open', () => {
    expect(mergeLiveRecord(null, record('ct-1', []))).toBeNull();
  });

  it('drops an echo for a different contact', () => {
    const current = record('ct-1', [entry('city', 'Berlin')]);
    expect(mergeLiveRecord(current, record('ct-2', []))).toBe(current);
  });

  it('adopts the echo when nothing is being edited', () => {
    const incoming = record('ct-1', [entry('city', 'Munich')]);
    expect(mergeLiveRecord(record('ct-1', [entry('city', 'Berlin')]), incoming)).toBe(incoming);
  });

  it('keeps the field under the cursor and takes everything else', () => {
    const current = record('ct-1', [entry('city', 'Berlin'), entry('company', 'Acme')]);
    const incoming = record('ct-1', [entry('city', 'Munich'), entry('company', 'Globex')]);
    const merged = mergeLiveRecord(current, incoming, ['city']);
    const values = attributeMap(merged?.attributes);
    expect(values).toEqual({ city: 'Berlin', company: 'Globex' });
  });

  it('keeps a held field that the echo dropped altogether', () => {
    const current = record('ct-1', [entry('city', 'Berlin')]);
    const merged = mergeLiveRecord(current, record('ct-1', []), ['city']);
    expect(attributeMap(merged?.attributes)).toEqual({ city: 'Berlin' });
  });
});

describe('shouldAdoptExternalValue', () => {
  it('never takes a value out from under a cursor', () => {
    expect(shouldAdoptExternalValue({ focused: true, incoming: 'Munich', committed: 'Berlin' })).toBe(false);
  });

  it('takes a value that changed elsewhere once the box is left', () => {
    expect(shouldAdoptExternalValue({ focused: false, incoming: 'Munich', committed: 'Berlin' })).toBe(true);
  });

  it('does nothing when the echo says what the box already saved', () => {
    expect(shouldAdoptExternalValue({ focused: false, incoming: 'Berlin', committed: 'Berlin' })).toBe(false);
  });
});
