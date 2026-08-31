import { describe, expect, it } from 'vitest';
import { parseCoworkerParams, writeCoworkerParams } from './params';

describe('coworker params', () => {
  it('reads the conversation deep link', () => {
    expect(parseCoworkerParams(new URLSearchParams('c=abc'))).toEqual({ conversationId: 'abc' });
  });

  it('treats absent and blank alike', () => {
    expect(parseCoworkerParams(new URLSearchParams()).conversationId).toBeNull();
    expect(parseCoworkerParams(new URLSearchParams('c=')).conversationId).toBeNull();
    expect(parseCoworkerParams(new URLSearchParams('c=%20%20')).conversationId).toBeNull();
  });

  it('round-trips, and keeps params it does not own', () => {
    const written = writeCoworkerParams(new URLSearchParams('other=1'), { conversationId: 'abc' });
    expect(written.toString()).toBe('other=1&c=abc');
    expect(parseCoworkerParams(written).conversationId).toBe('abc');
  });

  it('clears the link on null', () => {
    expect(writeCoworkerParams(new URLSearchParams('c=abc'), { conversationId: null }).toString()).toBe('');
  });
});
