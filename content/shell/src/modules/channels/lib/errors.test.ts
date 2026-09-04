import { describe, expect, it } from 'vitest';
import { errorCode, errorMessage, isAlreadyGone } from './errors';

const withCode = (code: string, nested = false) =>
  nested
    ? {
        errors: [{ message: 'service error', extensions: { errors: [{ extensions: { code } }] } }],
        response: {},
      }
    : { errors: [{ message: 'service error', extensions: { code } }], response: {} };

describe('errors', () => {
  it('reads the code from either level of the envelope', () => {
    expect(errorCode(withCode('PlatformOperationLinkNotFound'))).toBe('PlatformOperationLinkNotFound');
    expect(errorCode(withCode('ContactScopeDoesNotExist', true))).toBe('ContactScopeDoesNotExist');
    expect(errorCode(new Error('plain'))).toBeNull();
  });

  it('maps the channel and link codes to sentences and falls back otherwise', () => {
    expect(errorMessage(withCode('PlatformOperationLinkInvalidRedirectURL'))).toMatch(/https:\/\//);
    expect(errorMessage(withCode('CannotDisconnectWidgetScope'))).toMatch(/widget/);
    expect(errorMessage(withCode('ContactScopeDoesNotExist', true))).toMatch(/already disconnected/);
    expect(errorMessage(new Error('nope'), 'fallback')).toBe('nope');
  });

  it('knows which refusals mean the thing is already gone', () => {
    expect(isAlreadyGone(withCode('PlatformOperationLinkNotFound'))).toBe(true);
    expect(isAlreadyGone(withCode('ContactScopeDoesNotExist', true))).toBe(true);
    expect(isAlreadyGone(withCode('NotEnoughPermissions'))).toBe(false);
  });
});
