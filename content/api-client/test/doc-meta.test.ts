import { describe, expect, it } from 'vitest';
import { BotsListDocument, CurrentUserDocument, TypedDocumentString } from '../src/generated/core/graphql';
import { MessageAddedDocument } from '../src/generated/livechat/graphql';
import { getDocMeta } from '../src/transport/http';

describe('getDocMeta on generated string documents', () => {
  it('reads kind, name and the text off a query', () => {
    const meta = getDocMeta(CurrentUserDocument);
    expect(meta.kind).toBe('query');
    expect(meta.name).toBe('CurrentUser');
    expect(meta.text).toContain('query CurrentUser');
    expect(meta.text).toBe(String(CurrentUserDocument));
  });

  it('reads a subscription as a subscription', () => {
    const meta = getDocMeta(MessageAddedDocument);
    expect(meta.kind).toBe('subscription');
    expect(meta.name).toBe('MessageAdded');
  });

  it('carries each fragment the operation spreads exactly once', () => {
    const { text } = getDocMeta(BotsListDocument);
    expect(text).toContain('...BotInfo');
    expect(text.match(/fragment BotInfo on Bot/g)).toHaveLength(1);
  });

  it('caches per document object', () => {
    expect(getDocMeta(CurrentUserDocument)).toBe(getDocMeta(CurrentUserDocument));
    expect(getDocMeta(CurrentUserDocument)).not.toBe(getDocMeta(BotsListDocument));
  });

  it('leaves the name undefined on an anonymous operation and defaults the kind to query', () => {
    const anonymous = new TypedDocumentString<unknown, unknown>('\n    mutation($id: ID!) { remove(id: $id) }');
    expect(getDocMeta(anonymous)).toMatchObject({ kind: 'mutation', name: undefined });
    const shorthand = new TypedDocumentString<unknown, unknown>('{ currentUser { id } }');
    expect(getDocMeta(shorthand)).toMatchObject({ kind: 'query', name: undefined });
  });
});
