import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType } from '~api/generated/flow-builder/graphql';
import { parseTemplateString, templateStrFromString, templateStrToString } from './templateStr';

const text = (value: string) => ({ __typename: 'TemplateStrText' as const, text: value, errCode: null });
const attr = (name: string) => ({
  __typename: 'TemplateStrAttribute' as const,
  errCode: null,
  attribute: {
    __typename: 'BotAttribute' as const,
    name,
    type: AttributeType.Custom,
    dataType: AttributeDataType.String,
  },
});

describe('templateStrToString', () => {
  it('concatenates text parts and renders attribute parts as {{name}}', () => {
    const value = { parts: [text('Hi '), attr('first name'), text('!')] };
    expect(templateStrToString(value)).toBe('Hi {{first name}}!');
  });

  it('returns empty string for null/undefined', () => {
    expect(templateStrToString(null)).toBe('');
    expect(templateStrToString(undefined)).toBe('');
  });
});

describe('parseTemplateString', () => {
  it('splits placeholders into attribute parts', () => {
    const parts = parseTemplateString('Hi {{first name}}, welcome to {{company}}!');
    expect(parts.map((p) => p.__typename)).toEqual([
      'TemplateStrText',
      'TemplateStrAttribute',
      'TemplateStrText',
      'TemplateStrAttribute',
      'TemplateStrText',
    ]);
  });

  it('round-trips: parse(render(x)) preserves the editable string', () => {
    for (const input of [
      '',
      'plain text',
      '{{lead source}}',
      'Hi {{first name}}! Your order {{order id}} shipped.',
      'adjacent {{a}}{{b}} placeholders',
    ]) {
      expect(templateStrToString(templateStrFromString(input))).toBe(input);
    }
  });

  it('leaves malformed or forbidden placeholders as literal text', () => {
    // '%', '{', '}' and newlines are not allowed inside braces (guide.md).
    for (const input of ['{{}}', '{{bad%name}}', '{{un{closed}}', 'multi\n{{li\nne}}', '{single}']) {
      const parts = parseTemplateString(input);
      expect(parts.every((p) => p.__typename === 'TemplateStrText')).toBe(true);
      expect(templateStrToString({ parts })).toBe(input);
    }
  });
});
