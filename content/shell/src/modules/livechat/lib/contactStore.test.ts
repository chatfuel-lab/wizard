import { describe, expect, it } from 'vitest';
import type { ContactDetail } from './contactPanel';
import {
  contactReducer,
  initialContactState,
  type ContactAction,
  type ContactState,
  type ContactUpdate,
} from './contactStore';

const BASE = Date.UTC(2026, 7, 13, 12, 0);
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

const contact = (over: Record<string, unknown> = {}): ContactDetail =>
  ({
    __typename: 'WidgetContact',
    id: 'c1',
    name: 'Maria',
    note: 'Prefers email.',
    updatedAt: iso(10),
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    assignee: null,
    attributes: [],
    ...over,
  }) as unknown as ContactDetail;

const update = (over: Partial<ContactUpdate> = {}): ContactUpdate => ({
  id: 'c1',
  name: 'Maria',
  updatedAt: iso(0),
  unreadMessagesCount: 0,
  unhandledSwitchToHuman: false,
  assignee: null,
  ...over,
});

const run = (state: ContactState, ...actions: ContactAction[]): ContactState => actions.reduce(contactReducer, state);

const loaded = (over: Record<string, unknown> = {}): ContactState =>
  run(initialContactState('c1'), { type: 'loaded', epoch: 0, contact: contact(over) });

describe('opening', () => {
  it('starts loading only when there is a contact to load', () => {
    expect(initialContactState('c1').loading).toBe(true);
    expect(initialContactState(null).loading).toBe(false);
  });

  it('keeps its identity when the same contact is opened again', () => {
    const state = loaded();
    expect(contactReducer(state, { type: 'opened', contactId: 'c1' })).toBe(state);
  });

  /* The epoch bump is what makes the previous contact's in-flight response
     inert — the same rule the thread uses. */
  it('drops everything on a different contact and bumps the epoch', () => {
    const next = contactReducer(loaded(), { type: 'opened', contactId: 'c2' });
    expect(next.contact).toBeNull();
    expect(next.epoch).toBe(1);
    expect(contactReducer(next, { type: 'loaded', epoch: 0, contact: contact() }).contact).toBeNull();
  });
});

describe('the live event', () => {
  /* `OpenContactUpdated` selects ChatListContact, which has no note, no
     attributes and no scope. Applying it and stopping there is the version that
     shows a note somebody else deleted ten minutes ago. */
  it('applies what the event carries and flags the rest as stale', () => {
    const state = contactReducer(loaded(), { type: 'live', update: update({ name: 'Maria Weber' }) });
    expect(state.contact!.name).toBe('Maria Weber');
    expect(state.contact!.note).toBe('Prefers email.');
    expect(state.stale).toBe(true);
  });

  it('carries an assignee changed in another tab straight through', () => {
    const assignee = {
      __typename: 'PublicUserAccount' as const,
      id: 'u2',
      name: 'Sam',
      isUnknown: false,
      profilePicture: null,
    };
    const state = contactReducer(loaded(), { type: 'live', update: update({ assignee }) });
    expect(state.contact!.assignee).toEqual(assignee);
  });

  /* A refetch fired by one event can answer after the next event has already
     been applied; arrival order says nothing about age. */
  it('ignores an event older than what is held', () => {
    const state = loaded({ updatedAt: iso(0) });
    expect(contactReducer(state, { type: 'live', update: update({ updatedAt: iso(5) }) })).toBe(state);
  });

  it('ignores an event about a different contact', () => {
    const state = loaded();
    expect(contactReducer(state, { type: 'live', update: update({ id: 'other' }) })).toBe(state);
  });

  it('has nothing to apply to before the first load', () => {
    const state = initialContactState('c1');
    expect(contactReducer(state, { type: 'live', update: update() })).toBe(state);
  });

  it('clears the stale flag when the re-read lands', () => {
    const state = run(
      loaded(),
      { type: 'live', update: update() },
      { type: 'refetch' },
      { type: 'loaded', epoch: 1, contact: contact({ note: 'New note' }) },
    );
    expect(state.stale).toBe(false);
    expect(state.contact!.note).toBe('New note');
  });
});

describe('refetching', () => {
  /* A re-read, not a reset: the panel must not blank out and repaint every time
     somebody else renames the contact. */
  it('leaves the contact on screen and does not go back to loading', () => {
    const state = contactReducer(loaded(), { type: 'refetch' });
    expect(state.contact).not.toBeNull();
    expect(state.loading).toBe(false);
    expect(state.epoch).toBe(1);
  });

  it('does load when there is nothing on screen yet', () => {
    expect(contactReducer(initialContactState('c1'), { type: 'refetch' }).loading).toBe(true);
  });
});

describe('writes', () => {
  /* Both attribute mutations return the WHOLE contact, so the panel re-renders
     from the response rather than from anything this browser assumed. */
  it('re-renders from the contact a mutation answered with', () => {
    const written = contact({ note: 'Rewritten', updatedAt: iso(0) });
    expect(contactReducer(loaded(), { type: 'written', contact: written }).contact).toBe(written);
  });

  it('applies the note and the assignee from their own narrow responses', () => {
    const state = run(
      loaded(),
      { type: 'noteChanged', contactId: 'c1', note: 'Called back', updatedAt: iso(1) },
      {
        type: 'assigneeChanged',
        contactId: 'c1',
        assignee: { __typename: 'FuelyAIAssignee' } as never,
        updatedAt: iso(0),
      },
    );
    expect(state.contact!.note).toBe('Called back');
    expect(state.contact!.assignee).toEqual({ __typename: 'FuelyAIAssignee' });
  });

  it('clearing the note is a null, there being no separate delete', () => {
    const state = contactReducer(loaded(), { type: 'noteChanged', contactId: 'c1', note: null, updatedAt: iso(0) });
    expect(state.contact!.note).toBeNull();
  });

  it('keeps a per-attribute problem, and clears exactly one', () => {
    const state = run(
      loaded(),
      { type: 'attributeProblem', contactId: 'c1', name: 'order_id', message: 'not stored' },
      { type: 'attributeProblem', contactId: 'c1', name: 'vip', message: 'not stored either' },
      { type: 'attributeProblem', contactId: 'c1', name: 'order_id', message: null },
    );
    expect(state.writeProblems).toEqual({ vip: 'not stored either' });
  });

  it('does not churn state clearing a problem that is not there', () => {
    const state = loaded();
    expect(contactReducer(state, { type: 'attributeProblem', contactId: 'c1', name: 'x', message: null })).toBe(state);
  });
});

/**
 * The panel moves while a write is in flight: the mutation was issued for
 * Maria, the person clicked Tom, and every one of these replies used to be
 * applied to whatever was on screen. `written` is the worst of them — it
 * carries a whole contact, so Tom's panel showed Maria.
 */
describe('a write that answers after the panel moved on', () => {
  const moved = () => contactReducer(loaded(), { type: 'opened', contactId: 'c2' });

  it('does not write the old contact over the new one', () => {
    const state = moved();
    expect(contactReducer(state, { type: 'written', contact: contact({ name: 'Maria' }) })).toBe(state);
  });

  it('does not put the old contact’s note or assignee on the new one', () => {
    const state = run(moved(), { type: 'loaded', epoch: 1, contact: contact({ id: 'c2', name: 'Tom', note: null }) });
    const after = run(
      state,
      { type: 'noteChanged', contactId: 'c1', note: 'Called back', updatedAt: iso(0) },
      {
        type: 'assigneeChanged',
        contactId: 'c1',
        assignee: { __typename: 'FuelyAIAssignee' } as never,
        updatedAt: iso(0),
      },
    );
    expect(after).toBe(state);
  });

  it('does not flag an attribute of the new contact for the old one’s failure', () => {
    const state = moved();
    expect(
      contactReducer(state, { type: 'attributeProblem', contactId: 'c1', name: 'order_id', message: 'not stored' })
        .writeProblems,
    ).toEqual({});
  });

  /* A refetch is not a supersession for a write: the reply is the server's
     answer about a field this person just changed, and the read it raced may
     be older than the write. */
  it('still applies a write across a refetch of the same contact', () => {
    const state = run(loaded(), { type: 'refetch' });
    expect(
      contactReducer(state, { type: 'noteChanged', contactId: 'c1', note: 'Called back', updatedAt: iso(0) }).contact!
        .note,
    ).toBe('Called back');
  });
});

describe('failure', () => {
  it('reports a load failure for the epoch it was issued under, and no other', () => {
    const state = initialContactState('c1');
    expect(contactReducer(state, { type: 'failed', epoch: 0, message: 'boom' })).toMatchObject({
      loading: false,
      error: 'boom',
    });
    expect(contactReducer(state, { type: 'failed', epoch: 9, message: 'stale' })).toBe(state);
  });
});
