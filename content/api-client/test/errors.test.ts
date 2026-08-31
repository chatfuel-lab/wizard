import { describe, expect, it } from 'vitest';
import {
  ChatfuelAuthError,
  ChatfuelGraphQLError,
  errorMessageFor,
  hasErrorCode,
  nestedErrorCodes,
  toApiError,
  type ExecutionEnvelope,
} from '../src/errors';

describe('toApiError', () => {
  it('classifies HTTP-200-with-Unauthorized as ChatfuelAuthError (code scan, not HTTP status)', () => {
    const envelope: ExecutionEnvelope<unknown> = {
      data: null,
      errors: [
        {
          message: 'unauthorized',
          extensions: { code: 'Unauthorized', service: 'svc-alpha', traceId: 'trace-123' },
        },
      ],
    };
    const err = toApiError(envelope);
    expect(err).toBeInstanceOf(ChatfuelAuthError);
    expect(err.code).toBe('Unauthorized');
    expect(err.traceId).toBe('trace-123');
    expect(err.message).toContain('code=Unauthorized');
    expect(err.message).toContain('traceId=trace-123');
  });

  it('classifies a subgraph relay whose Unauthorized is nested under extensions.errors', () => {
    // The real shape a bad token produces: HTTP 200, top-level entry has no code.
    const envelope: ExecutionEnvelope<unknown> = {
      data: null,
      errors: [
        {
          message: "Failed to fetch from Subgraph 'upstream'.",
          extensions: {
            errors: [
              {
                message: 'auth error',
                path: ['currentUser'],
                extensions: { code: 'Unauthorized', service: 'upstream', traceId: 'nested-trace' },
              },
            ],
            serviceName: 'upstream',
            statusCode: 200,
          },
        },
      ],
    };
    const err = toApiError(envelope);
    expect(err).toBeInstanceOf(ChatfuelAuthError);
    expect(err.code).toBe('Unauthorized');
    expect(err.traceId).toBe('nested-trace');
  });

  it('sees a nested NotEnoughPermissions through hasErrorCode and isPermissionDenied', () => {
    const err = toApiError({
      data: null,
      errors: [
        {
          message: "Failed to fetch from Subgraph 'svc-alpha'.",
          extensions: { errors: [{ message: 'denied', extensions: { code: 'NotEnoughPermissions' } }] },
        },
      ],
    });
    expect(err.isPermissionDenied).toBe(true);
    expect(hasErrorCode(err, 'NotEnoughPermissions')).toBe(true);
  });

  it('returns ChatfuelGraphQLError for other codes and keeps partial data', () => {
    const envelope: ExecutionEnvelope<{ bot: string }> = {
      data: { bot: 'partial' },
      errors: [{ message: 'denied', path: ['bot', 'conversation'], extensions: { code: 'NotEnoughPermissions' } }],
    };
    const err = toApiError(envelope);
    expect(err).toBeInstanceOf(ChatfuelGraphQLError);
    expect(err).not.toBeInstanceOf(ChatfuelAuthError);
    expect(err.isPermissionDenied).toBe(true);
    expect(err.data).toEqual({ bot: 'partial' });
  });

  it('finds traceId beyond the first error entry', () => {
    const err = toApiError({
      errors: [{ message: 'a' }, { message: 'b', extensions: { traceId: 'deep-trace' } }],
    });
    expect(err.traceId).toBe('deep-trace');
  });
});

describe('nestedErrorCodes', () => {
  it('reads a subgraph relay nested-first — the nested code is the one worth acting on', () => {
    const err = toApiError({
      errors: [
        {
          message: "Failed to fetch from Subgraph 'svc-beta'.",
          extensions: {
            code: 'SubgraphFetchFailed',
            errors: [{ message: 'gone', extensions: { code: 'BookingDoesNotExist' } }],
          },
        },
      ],
    });
    expect(nestedErrorCodes(err)).toEqual(['BookingDoesNotExist', 'SubgraphFetchFailed']);
  });

  it('reads a plain envelope-shaped object', () => {
    expect(
      nestedErrorCodes({ errors: [{ message: 'boom', extensions: { code: 'GoodsItemTitleNotUnique' } }] }),
    ).toEqual(['GoodsItemTitleNotUnique']);
  });

  it('answers [] for anything without an errors array', () => {
    expect(nestedErrorCodes(new Error('network'))).toEqual([]);
    expect(nestedErrorCodes(null)).toEqual([]);
    expect(nestedErrorCodes(undefined)).toEqual([]);
    expect(nestedErrorCodes('oops')).toEqual([]);
  });
});

describe('errorMessageFor', () => {
  const MESSAGES: Record<string, string> = {
    FuelyKeywordTooLong: 'A keyword is over 50 characters.',
    BookingDoesNotExist: 'This booking no longer exists.',
  };

  it('maps a known code to its copy, nested codes included', () => {
    const err = toApiError({
      errors: [
        {
          message: "Failed to fetch from Subgraph 'svc-beta'.",
          extensions: { errors: [{ message: 'gone', extensions: { code: 'BookingDoesNotExist' } }] },
        },
      ],
    });
    expect(errorMessageFor(err, MESSAGES)).toBe('This booking no longer exists.');
  });

  it('scans past unknown codes to the first mapped one', () => {
    const err = toApiError({
      errors: [
        { message: 'first', extensions: { code: 'SomethingElse' } },
        { message: 'second', extensions: { code: 'FuelyKeywordTooLong' } },
      ],
    });
    expect(errorMessageFor(err, MESSAGES)).toBe('A keyword is over 50 characters.');
  });

  it('falls back to the error message for unmapped codes', () => {
    const err = toApiError({ errors: [{ message: 'raw server text', extensions: { code: 'TotallyUnknown' } }] });
    expect(errorMessageFor(err, MESSAGES)).toContain('raw server text');
  });

  it('handles plain errors and non-errors, and never returns an empty string', () => {
    expect(errorMessageFor(new Error('plain'), MESSAGES)).toBe('plain');
    expect(errorMessageFor('oops', MESSAGES)).toBe('oops');
    expect(errorMessageFor(null, MESSAGES)).not.toBe('');
    expect(errorMessageFor(undefined, MESSAGES, 'custom fallback')).toBe('custom fallback');
  });
});
