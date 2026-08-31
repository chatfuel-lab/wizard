import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError, ChatfuelNetworkError } from '~api';
import { MessageErrorCode } from '~api/generated/livechat/graphql';
import { messageErrorText, sendFailureText } from './messageErrors';

const error = (code: MessageErrorCode, originalErrMessage: string | null = null) => ({
  code,
  originalErrMessage,
});

describe('messageErrorText', () => {
  it('has a sentence for every code the schema defines', () => {
    for (const code of Object.values(MessageErrorCode)) {
      const text = messageErrorText([error(code)]);
      expect(text, code).toBeTruthy();
      /* The failure mode being ruled out is the identifier itself reaching the
         thread: the previous bubble printed `originalErrMessage || code`, so a
         message Meta rejected without a description read
         "WhatsAppOutMoreThan24hPassed". */
      expect(text, code).not.toBe(String(code));
      expect(text, code).toMatch(/^[A-Z]/);
    }
  });

  it('says what to do about the 24-hour window rather than naming it', () => {
    const text = messageErrorText([error(MessageErrorCode.WhatsAppOutMoreThan24hPassed)]);
    expect(text).toContain('24-hour');
    expect(text).toContain('template');
  });

  it('prefers our sentence to the platform’s own wording', () => {
    const text = messageErrorText([error(MessageErrorCode.WhatsAppOutMoreThan24hPassed, 'Message failed to send')]);
    expect(text).not.toContain('Message failed to send');
  });

  /* A server ahead of the build. The code is not in the table, so the
     platform's own words are the best thing left. */
  it('falls back to the platform wording for an unknown code', () => {
    const text = messageErrorText([
      { code: 'WhatsAppOutBrandNewCode' as MessageErrorCode, originalErrMessage: 'Number blocked' },
    ]);
    expect(text).toBe('Number blocked');
  });

  it('falls back to the code only when there is nothing else at all', () => {
    const text = messageErrorText([{ code: 'WhatsAppOutBrandNewCode' as MessageErrorCode }]);
    expect(text).toBe('WhatsAppOutBrandNewCode');
  });

  /* messageUpdated re-delivers the whole errors array on every transition, so
     the same failure arrives repeatedly inside one payload. */
  it('does not repeat one reason twice', () => {
    const text = messageErrorText([
      error(MessageErrorCode.WhatsAppOutRateLimitHit),
      error(MessageErrorCode.WhatsAppOutRateLimitHit),
    ]);
    expect(text).toBe(messageErrorText([error(MessageErrorCode.WhatsAppOutRateLimitHit)]));
  });

  it('joins two different reasons', () => {
    const text = messageErrorText([
      error(MessageErrorCode.WhatsAppOutRateLimitHit),
      error(MessageErrorCode.WhatsAppOutTemplateIsPaused),
    ])!;
    expect(text.split(' · ')).toHaveLength(2);
  });

  it('is nothing at all when the message is fine', () => {
    expect(messageErrorText([])).toBeUndefined();
    expect(messageErrorText(null)).toBeUndefined();
    expect(messageErrorText(undefined)).toBeUndefined();
  });
});

describe('sendFailureText', () => {
  const graphql = (code: string | undefined, traceId?: string) =>
    new ChatfuelGraphQLError([
      { message: 'boom', extensions: { ...(code ? { code } : {}), ...(traceId ? { traceId } : {}) } },
    ]);

  /* The failure in practice: a server fault with a trace id, which the old
     sentence answered with advice about permissions. */
  it('names the server code and the trace id for a server fault', () => {
    expect(sendFailureText(graphql('InternalServerError', 'abc123'))).toBe(
      'Not sent — the server answered InternalServerError (trace abc123). Try again.',
    );
    expect(sendFailureText(graphql('InternalServerError'))).toBe(
      'Not sent — the server answered InternalServerError. Try again.',
    );
    expect(sendFailureText(graphql(undefined, 't1'))).toBe(
      'Not sent — the server refused the message (trace t1). Try again.',
    );
  });

  it('gives the permission advice only for a permission-shaped code', () => {
    for (const code of ['NotEnoughPermissions', 'Forbidden', 'Unauthorized']) {
      expect(sendFailureText(graphql(code)), code).toContain('Inbox: Edit permission');
      expect(sendFailureText(graphql(code)), code).not.toContain(code);
    }
    expect(sendFailureText(graphql('InternalServerError'))).not.toContain('permission');
  });

  it('blames the network for a transport failure and keeps the generic line for anything else', () => {
    expect(sendFailureText(new ChatfuelNetworkError('fetch failed'))).toContain('no connection');
    expect(sendFailureText(new Error('?'))).toBe(
      'Not sent. Check your connection, and that you still have the Inbox: Edit permission.',
    );
    expect(sendFailureText(undefined)).toContain('Not sent');
  });
});
