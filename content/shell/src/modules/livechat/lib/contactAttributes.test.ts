import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType, DashboardLocale } from '~api/generated/livechat/graphql';
import type { ContactDetail } from './contactPanel';
import {
  addableAttributes,
  attributeLabel,
  attributeRows,
  attributeWriteMessage,
  confirmAttributeWrite,
  displayAttributeValue,
  rawAttributeValue,
  toStoredValue,
  type BotAttribute,
  type ContactAttribute,
} from './contactAttributes';

const botAttribute = (name: string, over: Partial<BotAttribute> = {}): BotAttribute =>
  ({
    name,
    type: AttributeType.Custom,
    dataType: AttributeDataType.String,
    aliases: [],
    ...over,
  }) as BotAttribute;

const attribute = (name: string, value: string, over: Partial<BotAttribute> = {}): ContactAttribute =>
  ({
    id: `ca-${name}`,
    attr: botAttribute(name, over),
    value: { __typename: 'BotAttributeValueString', id: `av-${name}`, stringValue: value },
  }) as ContactAttribute;

const contact = (attributes: ContactAttribute[]): ContactDetail =>
  ({ __typename: 'WidgetContact', id: 'c1', attributes }) as unknown as ContactDetail;

describe('rawAttributeValue', () => {
  /* Custom attributes always come back as the String branch, but system ones do
     not, and reading only that branch would blank them. */
  it('reads every branch of the value union', () => {
    const value = (typename: string, extra: Record<string, unknown>) =>
      ({ __typename: typename, id: 'v', ...extra }) as never;
    expect(rawAttributeValue(value('BotAttributeValueString', { stringValue: 'a' }))).toBe('a');
    expect(rawAttributeValue(value('BotAttributeValueLong', { longValue: 7 }))).toBe('7');
    expect(rawAttributeValue(value('BotAttributeValueDouble', { doubleValue: 1.5 }))).toBe('1.5');
    expect(rawAttributeValue(value('BotAttributeValueBoolean', { booleanValue: true }))).toBe('true');
    expect(rawAttributeValue(value('BotAttributeValueDatetime', { datetimeValue: '1720456863000' }))).toBe(
      '1720456863000',
    );
  });
});

describe('displayAttributeValue', () => {
  it('says yes and no for a boolean', () => {
    expect(displayAttributeValue('true', AttributeDataType.Boolean)).toBe('Yes');
    expect(displayAttributeValue('false', AttributeDataType.Boolean)).toBe('No');
  });

  it('reads a datetime as the milliseconds it is', () => {
    const text = displayAttributeValue('1720456863000', AttributeDataType.Datetime, 'en-GB');
    expect(text).toContain('2024');
  });

  /* An attribute holding something its dataType does not describe still holds
     it, and "Invalid Date" hides the one fact an operator could act on. */
  it('shows the stored string when it cannot be made sense of', () => {
    expect(displayAttributeValue('soon', AttributeDataType.Datetime)).toBe('soon');
    expect(displayAttributeValue('maybe', AttributeDataType.Boolean)).toBe('maybe');
  });

  it('shows nothing for no value', () => {
    expect(displayAttributeValue(null, AttributeDataType.String)).toBe('');
  });
});

describe('toStoredValue', () => {
  it('normalises a boolean onto the two strings the API stores', () => {
    expect(toStoredValue('Yes', AttributeDataType.Boolean)).toBe('true');
    expect(toStoredValue(' no ', AttributeDataType.Boolean)).toBe('false');
  });

  it('turns a date into milliseconds and leaves milliseconds alone', () => {
    expect(toStoredValue('1720456863000', AttributeDataType.Datetime)).toBe('1720456863000');
    expect(toStoredValue('2024-07-08T16:41:03.000Z', AttributeDataType.Datetime)).toBe(
      String(Date.parse('2024-07-08T16:41:03.000Z')),
    );
  });

  /* `contactAttributeUpdate` takes any string and stores the wrong one without
     complaint, so a refusal is the only way not to store nonsense. */
  it('refuses a value it cannot convert rather than guessing', () => {
    expect(toStoredValue('soon', AttributeDataType.Datetime)).toBeNull();
    expect(toStoredValue('maybe', AttributeDataType.Boolean)).toBeNull();
    expect(toStoredValue('twelve', AttributeDataType.Long)).toBeNull();
  });

  it('passes a string through, trimmed', () => {
    expect(toStoredValue('  A-1  ', AttributeDataType.String)).toBe('A-1');
  });
});

describe('attributeLabel', () => {
  const aliases = [
    { locale: DashboardLocale.En, alias: 'Order number' },
    { locale: DashboardLocale.Es, alias: 'Número de pedido' },
  ];

  it('prefers the alias for the locale', () => {
    const attr = botAttribute('order_id', { aliases });
    expect(attributeLabel(attr, DashboardLocale.Es)).toBe('Número de pedido');
  });

  it('falls back to English, then to the name the API takes', () => {
    const attr = botAttribute('order_id', { aliases });
    expect(attributeLabel(attr, DashboardLocale.Id)).toBe('Order number');
    expect(attributeLabel(botAttribute('order_id'), DashboardLocale.En)).toBe('order_id');
  });
});

describe('attributeRows', () => {
  const catalog = new Map<string, BotAttribute>([
    [
      'order_id',
      botAttribute('order_id', {
        aliases: [{ locale: DashboardLocale.En, alias: 'Order number' }],
      }),
    ],
  ]);

  it('labels from the catalog and keeps the API name as the write key', () => {
    const rows = attributeRows([attribute('order_id', 'A-1')], catalog, DashboardLocale.En);
    expect(rows[0]).toMatchObject({ name: 'order_id', label: 'Order number', raw: 'A-1' });
  });

  /* The catalog is paginated and a contact can hold an attribute that was not
     on the page that came back. Hiding it would hide data. */
  it('shows an attribute the catalog does not know, under its own name', () => {
    const rows = attributeRows([attribute('mystery', 'x')], catalog, DashboardLocale.En);
    expect(rows.map((row) => row.label)).toEqual(['mystery']);
  });

  it('puts custom attributes before system ones and sorts by label inside each', () => {
    const rows = attributeRows(
      [attribute('locale', 'de', { type: AttributeType.System }), attribute('zeta', 'z'), attribute('order_id', 'A-1')],
      catalog,
      DashboardLocale.En,
    );
    expect(rows.map((row) => row.name)).toEqual(['order_id', 'zeta', 'locale']);
    expect(rows.at(-1)!.system).toBe(true);
  });
});

describe('addableAttributes', () => {
  it('offers the custom names the contact does not already carry', () => {
    const catalog = [
      botAttribute('order_id'),
      botAttribute('vip'),
      botAttribute('locale', { type: AttributeType.System }),
    ];
    const offered = addableAttributes(catalog, [attribute('order_id', 'A-1')], DashboardLocale.En);
    expect(offered.map((entry) => entry.name)).toEqual(['vip']);
  });
});

describe('confirmAttributeWrite', () => {
  /* The mutation answers 200 with a contact that simply does not have the
     attribute. Nothing errors, so the response is the only evidence. */
  it('catches the write the server silently dropped', () => {
    expect(confirmAttributeWrite(contact([]), 'order_id', 'A-1')).toEqual({ status: 'dropped' });
  });

  it('confirms a write that came back carrying what was sent', () => {
    expect(confirmAttributeWrite(contact([attribute('order_id', 'A-1')]), 'order_id', 'A-1')).toEqual({
      status: 'stored',
    });
  });

  it('reports a value the server stored differently', () => {
    expect(confirmAttributeWrite(contact([attribute('order_id', 'A-2')]), 'order_id', 'A-1')).toEqual({
      status: 'changed',
      actual: 'A-2',
    });
  });
});

describe('attributeWriteMessage', () => {
  it('says nothing when the write landed', () => {
    expect(attributeWriteMessage({ status: 'stored' }, 'Order number')).toBeNull();
  });

  it('names the field in both failures', () => {
    expect(attributeWriteMessage({ status: 'dropped' }, 'Order number')).toContain('Order number');
    expect(attributeWriteMessage({ status: 'changed', actual: 'A-2' }, 'Order number')).toContain('A-2');
  });
});
