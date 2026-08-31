import { describe, expect, it } from 'vitest';
import type { MessageNode } from '../types';
import { entryKey, isNoiseMessage, messageKind, messageText } from './messages';

const msg = (over: Record<string, unknown>): MessageNode =>
  ({ content: null, toolCalls: [], attachments: [], ...over }) as unknown as MessageNode;

describe('messageKind', () => {
  it('noise for the fully empty failed-tool/rejection shape', () => {
    expect(messageKind(msg({ content: '' }))).toBe('noise');
    expect(messageKind(msg({ content: '   ', toolCalls: null }))).toBe('noise');
    expect(isNoiseMessage(msg({ content: '' }))).toBe(true);
  });

  it('step for the empty message that carries the tool call', () => {
    const call = { __typename: 'CoworkerToolOther', toolID: 'chatfuel_gql-list_deals' };
    expect(messageKind(msg({ content: '', toolCalls: [call] }))).toBe('step');
    expect(isNoiseMessage(msg({ content: '', toolCalls: [call] }))).toBe(false);
  });

  it('said for content, for attachments, and for a message that has both kinds', () => {
    expect(messageKind(msg({ content: 'hi' }))).toBe('said');
    expect(messageKind(msg({ attachments: [{ id: 'f-1' }] }))).toBe('said');
    expect(messageKind(msg({ content: 'hi', toolCalls: [{ __typename: 'CoworkerToolOther', toolID: 't' }] }))).toBe(
      'said',
    );
  });
});

describe('entryKey', () => {
  it('prefers clientID, falls back to id', () => {
    expect(entryKey({ id: 'm-1', clientID: 'c-1' })).toBe('c-1');
    expect(entryKey({ id: 'm-1', clientID: null })).toBe('m-1');
  });
});

describe('messageText', () => {
  it('drops the trailing whitespace a stream ends on, keeps the inner shape', () => {
    expect(messageText({ content: 'line\n\n- one\n- two\n\n' })).toBe('line\n\n- one\n- two');
    expect(messageText({ content: null })).toBe('');
  });
});
