import { describe, expect, it } from 'vitest';
import {
  assigneeFromValue,
  assigneeLabel,
  assigneeState,
  assigneeValue,
  contactIdentity,
  type ContactDetail,
} from './contactPanel';

const contact = (over: Record<string, unknown>): ContactDetail =>
  ({
    __typename: 'WidgetContact',
    id: 'c1',
    name: 'Maria',
    assignee: null,
    scope: { __typename: 'WebWidgetContactScope', id: 's1', webWidget: { id: 'w1', name: 'Storefront' } },
    ...over,
  }) as unknown as ContactDetail;

describe('contactIdentity', () => {
  /* There is no common handle on the Contact interface — `phone` is WhatsApp's
     alone and `username` belongs to Instagram and TikTok. */
  it('reads the handle each platform actually has', () => {
    expect(
      contactIdentity(
        contact({ __typename: 'WhatsappContact', phone: '+49 30 1234', scope: { __typename: 'X', id: 's' } }),
      ),
    ).toEqual([{ label: 'Phone', value: '+49 30 1234' }]);

    expect(
      contactIdentity(
        contact({
          __typename: 'InstagramContact',
          username: 'maria',
          availableForDMs: true,
          scope: { __typename: 'X', id: 's' },
        }),
      ),
    ).toEqual([{ label: 'Username', value: '@maria' }]);
  });

  it('has nothing to say for a platform with no handle', () => {
    expect(contactIdentity(contact({ scope: { __typename: 'X', id: 's' } }))).toEqual([]);
  });

  /* `availableForDMs` is nullable, and a null is the platform declining to say
     — which is not "no", and "no" is the answer that stops an operator writing
     at all. */
  it('reports a closed inbox only when the platform actually said so', () => {
    const rows = (availableForDMs: boolean | null) =>
      contactIdentity(
        contact({
          __typename: 'TikTokContact',
          username: 'maria',
          availableForDMs,
          scope: { __typename: 'X', id: 's' },
        }),
      ).map((row) => row.label);
    expect(rows(false)).toContain('Direct messages');
    expect(rows(null)).not.toContain('Direct messages');
    expect(rows(true)).not.toContain('Direct messages');
  });

  /* `scope` names the inbox side of the conversation — which number, which
     account — and the label has to say so or it reads as the contact's own. */
  it('names which of your own inboxes this arrived on', () => {
    expect(contactIdentity(contact({}))).toEqual([{ label: 'Reached your widget', value: 'Storefront' }]);
    expect(
      contactIdentity(
        contact({
          scope: {
            __typename: 'WhatsAppPhoneContactScope',
            id: 's',
            phone: { id: 'p', displayPhoneNumber: '+49 30 9', verifiedName: 'Acme' },
          },
        }),
      ),
    ).toEqual([{ label: 'Reached your number', value: '+49 30 9 · Acme' }]);
  });
});

describe('assigneeState', () => {
  it('calls a missing assignee unassigned', () => {
    expect(assigneeState(contact({ assignee: null }))).toEqual({ kind: 'none' });
  });

  it('recognises the AI', () => {
    expect(assigneeState(contact({ assignee: { __typename: 'FuelyAIAssignee' } }))).toEqual({
      kind: 'ai',
    });
  });

  /* `isUnknown` is the API's placeholder for a user it will not name — someone
     removed from the bot. It is assigned, to a person no picker can offer, and
     showing it as unassigned invites an operator to take a conversation that
     already has an owner. */
  it('keeps an unnameable assignee assigned', () => {
    const state = assigneeState(
      contact({
        assignee: { __typename: 'PublicUserAccount', id: 'u9', name: '', isUnknown: true },
      }),
    );
    expect(state).toEqual({ kind: 'user', id: 'u9', name: '', unknown: true });
    expect(assigneeLabel(state)).toBe('Someone outside this bot');
  });

  it('labels the three states the way the inbox does', () => {
    expect(assigneeLabel({ kind: 'none' })).toBe('Unassigned');
    expect(assigneeLabel({ kind: 'ai' })).toBe('Fuely AI');
    expect(assigneeLabel({ kind: 'user', id: 'u1', name: 'Sam', unknown: false })).toBe('Sam');
  });
});

describe('the picker value', () => {
  it('round-trips every state', () => {
    for (const state of [
      { kind: 'none' } as const,
      { kind: 'ai' } as const,
      { kind: 'user', id: 'u1', name: 'Sam', unknown: false } as const,
    ]) {
      const back = assigneeFromValue(assigneeValue(state));
      expect(back.kind).toBe(state.kind);
      if (back.kind === 'user' && state.kind === 'user') expect(back.id).toBe(state.id);
    }
  });

  /* `u:` prefixes the id so a user account whose id happens to be "ai" cannot
     collide with the AI option. */
  it('cannot confuse a user id with the AI', () => {
    expect(assigneeValue({ kind: 'user', id: 'ai', name: '', unknown: false })).toBe('u:ai');
    expect(assigneeFromValue('u:ai')).toMatchObject({ kind: 'user', id: 'ai' });
  });

  it('treats anything it does not recognise as unassigned', () => {
    expect(assigneeFromValue('')).toEqual({ kind: 'none' });
    expect(assigneeFromValue('u:')).toEqual({ kind: 'none' });
  });
});
