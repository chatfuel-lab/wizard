import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError } from '~api';
import { errorMessage, isEditLock } from './errors';

const gqlError = (code: string, message = 'boom') => new ChatfuelGraphQLError([{ message, extensions: { code } }]);

describe('errorMessage', () => {
  it('maps known automation codes to human messages', () => {
    expect(errorMessage(gqlError('FuelyAutomationBeingEdited'))).toBe(
      'Someone else is editing this automation — try again.',
    );
    expect(errorMessage(gqlError('FuelyAutomationScopeLimitReached'))).toBe(
      'This channel already has 30 custom automations — delete one first.',
    );
    expect(errorMessage(gqlError('FuelyInheritFromInvalid'))).toBe('This setting cannot inherit from that automation.');
    expect(errorMessage(gqlError('FuelyPostMediaWrongType'))).toBe(
      'That ID is a story — pick a post, reel or ad instead.',
    );
  });

  it('scans past unknown codes to the first mapped one', () => {
    const err = new ChatfuelGraphQLError([
      { message: 'first', extensions: { code: 'SomethingElse' } },
      { message: 'second', extensions: { code: 'FuelyKeywordTooLong' } },
    ]);
    expect(errorMessage(err)).toBe('A keyword is over 50 characters.');
  });

  it('reads a code the API nested one level down', () => {
    const err = new ChatfuelGraphQLError([
      {
        message: 'The upstream service rejected the request.',
        extensions: { errors: [{ message: 'inner', extensions: { code: 'FuelySettingNotAllowedInScope' } }] },
      },
    ]);
    expect(errorMessage(err)).toBe('This setting is not available in this channel.');
  });

  it('falls back to the GraphQL message for unmapped codes', () => {
    expect(errorMessage(gqlError('TotallyUnknown', 'raw server text'))).toContain('raw server text');
  });

  it('handles plain errors and non-errors', () => {
    expect(errorMessage(new Error('plain'))).toBe('plain');
    expect(errorMessage('oops')).toBe('oops');
  });
});

describe('isEditLock', () => {
  it('recognises the edit lock, top-level or nested', () => {
    expect(isEditLock(gqlError('FuelyAutomationBeingEdited'))).toBe(true);
    expect(isEditLock(gqlError('FuelyAutomationNotFound'))).toBe(false);
    expect(isEditLock(new Error('plain'))).toBe(false);
  });
});
