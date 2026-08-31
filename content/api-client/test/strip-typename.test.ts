import { describe, expect, it } from 'vitest';
import { stripTypename } from '../src/strip-typename';

describe('stripTypename', () => {
  it('removes __typename at every nesting level', () => {
    const input = {
      __typename: 'Contact',
      id: '1',
      conversation: {
        __typename: 'Conversation',
        platform: 'widget',
        messages: [{ __typename: 'WebWidgetTextMessage', text: 'hi', sender: { __typename: 'S', kind: 'x' } }],
      },
    };
    expect(stripTypename(input)).toEqual({
      id: '1',
      conversation: {
        platform: 'widget',
        messages: [{ text: 'hi', sender: { kind: 'x' } }],
      },
    });
  });

  it('does not mutate the input', () => {
    const input = { __typename: 'A', nested: { __typename: 'B', keep: 1 } };
    const copy = structuredClone(input);
    stripTypename(input);
    expect(input).toEqual(copy);
  });

  it('passes through primitives, null and non-plain objects', () => {
    expect(stripTypename('x')).toBe('x');
    expect(stripTypename(5)).toBe(5);
    expect(stripTypename(null)).toBe(null);
    expect(stripTypename(undefined)).toBe(undefined);
    const date = new Date(0);
    expect(stripTypename(date)).toBe(date);
  });

  it('handles arrays at the top level', () => {
    expect(stripTypename([{ __typename: 'T', a: 1 }])).toEqual([{ a: 1 }]);
  });

  it('keeps an own __proto__ key as a field instead of losing it to the prototype', () => {
    // JSON.parse is how a fetched object gets here, and it is the one producer
    // that makes "__proto__" an ordinary own key. A plain `out[key] =` would
    // hit Object.prototype's accessor: the field would leave the request and
    // the object on the wire would be `{}`.
    const input = JSON.parse('{"__proto__":{"injected":true},"keep":1}') as Record<string, unknown>;
    const out = stripTypename(input) as Record<string, unknown>;

    expect(Object.keys(out).sort()).toEqual(['__proto__', 'keep']);
    // Asserted as text, because an object literal spelling `__proto__` in the
    // expectation would fall into the very trap this is about.
    expect(JSON.stringify(out)).toBe('{"__proto__":{"injected":true},"keep":1}');
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).injected).toBeUndefined();
  });
});
