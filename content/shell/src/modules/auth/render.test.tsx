import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthAdapter, Membership } from './types';
import { TeamPage } from './team/TeamPage';

/**
 * The white-screen guard.
 *
 * The suite runs without a browser, so nothing else in the repo can see a
 * component that throws on its first render - it type-checks, it passes every
 * gate, and it renders nothing. Rendering the tree to a string needs no DOM:
 * effects do not run, so what this asserts is the frame around the data, which
 * is exactly the part a broken component takes down with it.
 *
 * Unlike the other modules', this test does not render the registered
 * Component: auth is a hidden module whose Component is a static signpost, and
 * the screen people actually use is the Team page the host mounts at '/team' -
 * so that is what has to survive a first render. With no effects the store
 * never fetches, so the first frame IS the loading frame; the anchors below
 * are the parts of the page that exist before any data.
 */

/* Nothing here is reached: with no effects the page asks the adapter for
   nothing. It throws rather than answering so a test that starts depending on
   a reply says so instead of quietly asserting against a lie. */
const never = (): Promise<never> => Promise.reject(new Error('the adapter is not called in a server render'));

const adapter: AuthAdapter = {
  getSession: never,
  getAccessToken: never,
  refreshSession: never,
  onAuthStateChange: () => () => undefined,
  signInWithPassword: never,
  signUp: never,
  resetPasswordForEmail: never,
  verifyRecoveryToken: never,
  updatePassword: never,
  signOut: never,
  invitePreview: never,
  myMembership: never,
  provisionWorkspace: never,
  acceptInvite: never,
  createBot: never,
  renameBot: never,
  deleteBot: never,
  listBots: never,
  grantBot: never,
  revokeBot: never,
  listMembers: never,
  listInvites: never,
  createInvite: never,
  revokeInvite: never,
  changeRole: never,
  removeMember: never,
  transferOwnership: never,
  leaveTenant: never,
};

const membership: Membership = {
  role: 'owner',
  joinedAt: '2026-01-14T09:00:00.000Z',
  tenant: {
    id: 'tenant-1',
    name: 'Acme',
    bots: [{ id: 'bot-row-1', botId: 'bot-1', name: 'Acme Support' }],
  },
};

describe('the module renders', () => {
  it('mounts the Team page, and draws its frame before any data arrives', () => {
    const html = renderToStaticMarkup(
      <TeamPage
        adapter={adapter}
        membership={membership}
        me={{ id: 'user-1', email: 'owner@example.com', name: 'Ada Owner', avatarUrl: null }}
        navigate={() => undefined}
        refetchMembership={() => undefined}
      />,
    );
    expect(html).toContain('Team');
    expect(html).toContain('People');
    expect(html).toContain('Bots');
    expect(html).toContain('Danger zone');
    /* The owner's controls are part of the frame, not of the data. */
    expect(html).toContain('Invite people');
    expect(html).toContain('aria-label="Refresh"');
  });
});
