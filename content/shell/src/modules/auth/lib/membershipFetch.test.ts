import { describe, expect, it, vi } from 'vitest';
import { fetchMembership, type BlockedProvision, type MembershipFetchContext } from './membershipFetch';
import type { AuthAction } from './authState';
import { AuthAdapterError, type Membership } from '../types';

/**
 * The epoch guard, from the side that used to be missing one: a reply for a
 * user who is no longer signed in reaches the reducer AND the host runtime,
 * and both have to drop it. The reducer's half is covered in authState.test.ts;
 * this covers the half that was called beside it and checked nothing.
 */

const WORKSPACE_FULL = 'This app cannot take another bot. Ask whoever installed it.';

/** A promise this test resolves by hand, to hold a reply open across a sign-in. */
function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

/** Let every already-queued microtask run, so an in-flight fetch reaches its next await. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const membershipOf = (name: string): Membership => ({
  role: 'owner',
  joinedAt: '2026-01-01T00:00:00.000Z',
  tenant: { id: `t-${name}`, name, bots: [{ id: `b-${name}`, botId: `bot-${name}`, name: `${name}'s bot` }] },
});

function contextOf(overrides: Partial<MembershipFetchContext> = {}) {
  const actions: AuthAction[] = [];
  const workspaces: (Membership | null)[] = [];
  let blocked: BlockedProvision | null = null;
  let epoch = 1;
  const ctx: MembershipFetchContext = {
    myMembership: () => Promise.resolve(null),
    provisionFor: () => Promise.reject(new Error('not expected')),
    accountId: () => Promise.resolve('u1'),
    currentEpoch: () => epoch,
    invitePending: () => false,
    dispatch: (action) => actions.push(action),
    onWorkspace: (membership) => workspaces.push(membership),
    blocked: {
      read: () => blocked,
      write: (next) => {
        blocked = next;
      },
    },
    ...overrides,
  };
  return {
    ctx,
    actions,
    workspaces,
    signInSomebodyElse: () => {
      epoch += 1;
    },
  };
}

describe('fetchMembership settles through the epoch guard', () => {
  it('drops a reply for the user who signed out, on both channels', async () => {
    const readA = deferred<Membership | null>();
    const { ctx, actions, workspaces, signInSomebodyElse } = contextOf({
      myMembership: () => readA.promise,
    });

    const inFlight = fetchMembership(ctx, 1);
    signInSomebodyElse();
    readA.settle(membershipOf('A'));
    await inFlight;

    expect(workspaces).toEqual([]);
    // Dispatched under the epoch it started with — the reducer drops it there.
    expect(actions).toEqual([{ type: 'membership', epoch: 1, membership: membershipOf('A') }]);
  });

  it('calls onWorkspace exactly once on an ordinary sign-in', async () => {
    const membership = membershipOf('B');
    const { ctx, actions, workspaces } = contextOf({ myMembership: () => Promise.resolve(membership) });

    await fetchMembership(ctx, 1);

    expect(workspaces).toEqual([membership]);
    expect(actions).toEqual([{ type: 'membership', epoch: 1, membership }]);
  });

  it('tells the host about an account with no workspace at all', async () => {
    const { ctx, workspaces } = contextOf();
    await fetchMembership(ctx, 1);
    expect(workspaces).toEqual([null]);
  });

  it('provisions when asked to, and settles the workspace it made', async () => {
    const provisioned = membershipOf('New');
    const provisionFor = vi.fn(() => Promise.resolve(provisioned));
    const { ctx, actions, workspaces } = contextOf({ provisionFor });

    await fetchMembership(ctx, 1, { provision: true });

    expect(provisionFor).toHaveBeenCalledWith('u1');
    expect(workspaces).toEqual([provisioned]);
    expect(actions).toEqual([
      { type: 'provisioning', epoch: 1 },
      { type: 'membership', epoch: 1, membership: provisioned },
    ]);
  });

  it('drops a provision that lands after somebody else signed in', async () => {
    const made = deferred<Membership>();
    const { ctx, workspaces, signInSomebodyElse } = contextOf({ provisionFor: () => made.promise });

    const inFlight = fetchMembership(ctx, 1, { provision: true });
    await flush();
    signInSomebodyElse();
    made.settle(membershipOf('A'));
    await inFlight;

    expect(workspaces).toEqual([]);
  });

  it('remembers a failed provision and refuses to spend another attempt', async () => {
    const provisionFor = vi.fn(() => Promise.reject(new AuthAdapterError('WorkspaceFull')));
    const { ctx, actions } = contextOf({ provisionFor });

    await fetchMembership(ctx, 1, { provision: true });
    await fetchMembership(ctx, 2, { provision: true });

    expect(provisionFor).toHaveBeenCalledTimes(1);
    expect(actions.filter((a) => a.type === 'membershipFailed')).toEqual([
      { type: 'membershipFailed', epoch: 1, message: WORKSPACE_FULL },
      { type: 'membershipFailed', epoch: 2, message: WORKSPACE_FULL },
    ]);
  });

  it('never provisions when it was not asked to', async () => {
    const provisionFor = vi.fn(() => Promise.reject(new Error('not expected')));
    const { ctx, workspaces } = contextOf({ provisionFor });

    await fetchMembership(ctx, 1, { provision: false });

    expect(provisionFor).not.toHaveBeenCalled();
    expect(workspaces).toEqual([null]);
  });

  /* The invited colleague's bug: signing up from `/invite/<token>` makes the
     SIGNED_IN handler ask to provision one round trip before `acceptInvite`
     runs, and a bot created there is billed whatever the epoch does next. */
  it('buys no bot for somebody who is about to accept an invite', async () => {
    const provisionFor = vi.fn(() => Promise.reject(new Error('not expected')));
    const { ctx, actions, workspaces } = contextOf({ provisionFor, invitePending: () => true });

    await fetchMembership(ctx, 1, { provision: true });

    expect(provisionFor).not.toHaveBeenCalled();
    expect(actions).toEqual([{ type: 'membership', epoch: 1, membership: null }]);
    expect(workspaces).toEqual([null]);
  });

  it('provisions again once the invite link has been spent', async () => {
    const provisioned = membershipOf('New');
    const provisionFor = vi.fn(() => Promise.resolve(provisioned));
    let onInvite = true;
    const { ctx } = contextOf({ provisionFor, invitePending: () => onInvite });

    await fetchMembership(ctx, 1, { provision: true });
    onInvite = false;
    await fetchMembership(ctx, 1, { provision: true });

    expect(provisionFor).toHaveBeenCalledTimes(1);
  });

  it('reports a read that threw, and leaves the wording to the screen when the server said nothing usable', async () => {
    const { ctx, actions, workspaces } = contextOf({
      myMembership: () => Promise.reject(new Error('network down')),
    });

    await fetchMembership(ctx, 1);

    expect(workspaces).toEqual([]);
    expect(actions).toEqual([{ type: 'membershipFailed', epoch: 1, message: undefined }]);
  });
});
