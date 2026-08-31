import { describe, expect, it } from 'vitest';
import { messageOf } from './errors';

describe('messageOf', () => {
  it('reads an Error through its message', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
  });

  it('stringifies everything else rather than guessing', () => {
    expect(messageOf('plain refusal')).toBe('plain refusal');
    expect(messageOf(404)).toBe('404');
    expect(messageOf(undefined)).toBe('undefined');
  });
});
