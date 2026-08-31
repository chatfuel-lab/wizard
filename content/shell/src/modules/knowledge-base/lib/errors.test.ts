import { describe, expect, it } from 'vitest';
import { errorCode, isLimitError, KNOWN_CODES, LIMIT_CODES, messageFor } from './errors';

const envelope = (code: string) => ({ errors: [{ message: 'boom', extensions: { code } }] });

describe('messageFor', () => {
  it('maps a known code to its copy', () => {
    expect(messageFor(envelope('GoodsItemTitleNotUnique'))).toBe('Another item already has this title.');
  });

  it('falls back to the error message on an unknown code', () => {
    const error = Object.assign(new Error('upstream exploded'), envelope('SomethingNew'));
    expect(messageFor(error)).toBe('upstream exploded');
  });

  it('never returns an empty string', () => {
    expect(messageFor(null)).not.toBe('');
    expect(messageFor({})).not.toBe('');
  });
});

describe('isLimitError', () => {
  it('recognises every limit code', () => {
    for (const code of LIMIT_CODES) expect(isLimitError(envelope(code))).toBe(true);
  });

  it('is false for an ordinary failure', () => {
    expect(isLimitError(envelope('GoodsItemTitleRequired'))).toBe(false);
    expect(isLimitError(new Error('network'))).toBe(false);
  });

  it('every limit code has copy', () => {
    for (const code of LIMIT_CODES) expect(KNOWN_CODES).toContain(code);
  });
});

describe('errorCode', () => {
  it('hands back the first code, for a dialog that maps codes to fields', () => {
    expect(errorCode(envelope('GoodsItemTitleNotUnique'))).toBe('GoodsItemTitleNotUnique');
  });

  it('is null when there is no envelope to read', () => {
    expect(errorCode(new Error('network'))).toBeNull();
    expect(errorCode(null)).toBeNull();
  });
});
