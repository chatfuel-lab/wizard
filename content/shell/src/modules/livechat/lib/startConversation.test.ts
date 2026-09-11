import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError, ChatfuelNetworkError } from '~api';
import { startFailureText } from './startConversation';

const graphql = (code: string) =>
  new ChatfuelGraphQLError([{ message: 'Refused', extensions: { code, traceId: 'tr-1' } }]);

describe('a refused start', () => {
  /* The permission is the server's to enforce, and this is the only place the
     inbox says which one it was — the raw answer names an object and an action
     rather than what the reader was trying to do. */
  it('names the permission on a permission-shaped code', () => {
    for (const code of ['NotEnoughPermissions', 'Forbidden', 'Unauthorized']) {
      expect(startFailureText(graphql(code)), code).toBe(
        'You need the Inbox: Edit permission to start a conversation.',
      );
    }
  });

  /* The failure this rules out: a gate that answers closed on a dropped
     request used to refuse the mutation in front of the server, so a network
     blip told an operator who could write that they could not. Nothing but the
     server's own code says the word "permission" now. */
  it('says nothing about permissions on any other failure', () => {
    expect(startFailureText(graphql('InternalServerError'))).not.toContain('permission');
    expect(startFailureText(new ChatfuelNetworkError('fetch failed'))).not.toContain('permission');
    expect(startFailureText(new Error('The server answered with no conversation.'))).not.toContain('permission');
  });

  it('passes everything else through as it was said', () => {
    expect(startFailureText(new Error('The server answered with no conversation.'))).toBe(
      'The server answered with no conversation.',
    );
    expect(startFailureText(new ChatfuelNetworkError('fetch failed'))).toBe('fetch failed');
    expect(startFailureText('plain refusal')).toBe('plain refusal');
  });
});
