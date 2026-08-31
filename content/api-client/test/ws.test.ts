import { describe, expect, it } from 'vitest';
import { ChatfuelAuthError, ChatfuelGraphQLError, ChatfuelNetworkError } from '../src/errors';
import { resolveWsUrl, shouldRetryWsError, wsErrorToApiError } from '../src/transport/ws';

describe('resolveWsUrl', () => {
  it('passes ws/wss urls through', () => {
    expect(resolveWsUrl('wss://panel.chatfuel.com/graphql')).toBe('wss://panel.chatfuel.com/graphql');
    expect(resolveWsUrl('ws://localhost:5173/chatfuel/graphql')).toBe('ws://localhost:5173/chatfuel/graphql');
  });

  it('swaps http(s) schemes', () => {
    expect(resolveWsUrl('https://panel.chatfuel.com/graphql')).toBe('wss://panel.chatfuel.com/graphql');
    expect(resolveWsUrl('http://127.0.0.1:8080/graphql')).toBe('ws://127.0.0.1:8080/graphql');
  });

  it('resolves path-only urls against a location', () => {
    expect(resolveWsUrl('/chatfuel/graphql', { protocol: 'https:', host: 'localhost:5173' })).toBe(
      'wss://localhost:5173/chatfuel/graphql',
    );
    expect(resolveWsUrl('/chatfuel/graphql', { protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/chatfuel/graphql',
    );
  });

  it('throws for path-only urls without a location (Node)', () => {
    expect(() => resolveWsUrl('/chatfuel/graphql', undefined)).toThrow(/window\.location/);
  });
});

describe('shouldRetryWsError (spec no-retry list: 4400/4401/4403/4406/4409/4429)', () => {
  it('adds 4403 to graphql-ws own fatal list', () => {
    expect(shouldRetryWsError({ code: 4403, reason: 'Forbidden' })).toBe(false);
  });

  it('keeps other close events retryable (graphql-ws hard-fails its fatal codes itself)', () => {
    expect(shouldRetryWsError({ code: 1006 })).toBe(true);
    expect(shouldRetryWsError({ code: 1012 })).toBe(true);
    expect(shouldRetryWsError({ code: 4408 })).toBe(true);
  });

  it('keeps non-CloseEvent network errors retryable', () => {
    expect(shouldRetryWsError(new Error('ECONNREFUSED'))).toBe(true);
  });
});

describe('wsErrorToApiError', () => {
  it('maps GraphQLError[] (terminal error frame) onto the envelope hierarchy', () => {
    const err = wsErrorToApiError([{ message: 'denied', extensions: { code: 'NotEnoughPermissions', traceId: 't' } }]);
    expect(err).toBeInstanceOf(ChatfuelGraphQLError);
    expect((err as ChatfuelGraphQLError).code).toBe('NotEnoughPermissions');
  });

  it('maps auth closes (4401/4403) to ChatfuelAuthError', () => {
    expect(wsErrorToApiError({ code: 4401, reason: 'Unauthorized' })).toBeInstanceOf(ChatfuelAuthError);
    expect(wsErrorToApiError({ code: 4403 })).toBeInstanceOf(ChatfuelAuthError);
  });

  it('maps other closes and plain errors to ChatfuelNetworkError', () => {
    expect(wsErrorToApiError({ code: 1006 })).toBeInstanceOf(ChatfuelNetworkError);
    expect(wsErrorToApiError(new Error('boom'))).toBeInstanceOf(ChatfuelNetworkError);
  });
});
