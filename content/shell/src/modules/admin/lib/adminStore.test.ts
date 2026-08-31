import { describe, expect, it } from 'vitest';
import { adminReducer, initialAdminState, workspaceOfBot, type AdminState } from './adminStore';
import type { AdminOverview } from '../types';

const overview = (): AdminOverview => ({
  account: { id: 'acc', name: 'Acme', email: null },
  homeWorkspaceId: 'ws-home',
  capabilities: { access: false },
  workspaces: [
    { id: 'ws-home', title: 'Home', botsLimit: 3, bots: [{ id: 'bot-a', title: 'A' }] },
    {
      id: 'ws-other',
      title: 'Other',
      botsLimit: 2,
      bots: [
        { id: 'bot-b', title: 'B' },
        { id: 'bot-c', title: 'C' },
      ],
    },
  ],
});

const loaded = (): AdminState => {
  const started = adminReducer({ ...initialAdminState(), session: 'unlocked' }, { type: 'load' });
  return adminReducer(started, { type: 'loaded', overview: overview(), epoch: started.epoch });
};

describe('loading the account', () => {
  it('drops an answer that a newer load has already outrun', () => {
    const first = adminReducer(initialAdminState(), { type: 'load' });
    const second = adminReducer(first, { type: 'load' });
    const stale = adminReducer(second, { type: 'loaded', overview: overview(), epoch: first.epoch });
    expect(stale.overview).toBeNull();
    expect(stale.loading).toBe(true);
  });

  it('takes the answer to the load that is actually in flight', () => {
    expect(loaded().overview?.workspaces).toHaveLength(2);
    expect(loaded().loading).toBe(false);
  });

  it('keeps a stale failure from clearing a fresher load', () => {
    const first = adminReducer(initialAdminState(), { type: 'load' });
    const second = adminReducer(first, { type: 'load' });
    expect(adminReducer(second, { type: 'failed', error: 'nope', epoch: first.epoch }).error).toBeNull();
  });
});

describe('the session', () => {
  it('throws everything away when the door closes', () => {
    const state = adminReducer(loaded(), { type: 'locked' });
    expect(state.overview).toBeNull();
    expect(state.session).toBe('locked');
  });

  it('keeps what it has when a re-probe says the cookie is still good', () => {
    expect(adminReducer(loaded(), { type: 'session', session: 'unlocked' }).overview).not.toBeNull();
  });

  it('clears the panel when the probe finds no panel at all', () => {
    expect(adminReducer(loaded(), { type: 'session', session: 'absent' }).overview).toBeNull();
  });
});

describe('changing bots writes through to the tree the rail is drawn from', () => {
  it('adds a bot to the workspace it was made in', () => {
    const state = adminReducer(loaded(), {
      type: 'botAdded',
      workspaceId: 'ws-other',
      bot: { id: 'bot-d', title: 'D' },
    });
    expect(state.overview?.workspaces[1]?.bots.map((bot) => bot.id)).toEqual(['bot-b', 'bot-c', 'bot-d']);
  });

  it('renames it everywhere it is written down', () => {
    const withDetail = adminReducer(loaded(), {
      type: 'bot',
      detail: {
        id: 'bot-b',
        title: 'B',
        createdAt: null,
        isReady: true,
        countryCode: null,
        timezone: null,
        industry: null,
        workspace: null,
        contactScopes: [],
        members: [],
        role: null,
      },
    });
    const renamed = adminReducer(withDetail, { type: 'botRenamed', botId: 'bot-b', title: 'B2' });
    expect(renamed.overview?.workspaces[1]?.bots[0]?.title).toBe('B2');
    expect(renamed.bots['bot-b']?.title).toBe('B2');
  });

  it('removes it, and the workspace with it when it was the last one', () => {
    /* Chatfuel deletes a workspace when its last bot goes, so a workspace left
       empty here is a workspace that no longer exists. */
    const one = adminReducer(loaded(), { type: 'botRemoved', botId: 'bot-b' });
    expect(one.overview?.workspaces.map((w) => w.id)).toEqual(['ws-home', 'ws-other']);
    const two = adminReducer(one, { type: 'botRemoved', botId: 'bot-c' });
    expect(two.overview?.workspaces.map((w) => w.id)).toEqual(['ws-home']);
  });

  it('keeps the deployment’s own workspace even with nothing in it', () => {
    /* The server refuses that delete, so this only matters if it ever stopped
       refusing — and a rail that dropped the home workspace would take the way
       back with it. */
    const state = adminReducer(loaded(), { type: 'botRemoved', botId: 'bot-a' });
    expect(state.overview?.workspaces.map((w) => w.id)).toContain('ws-home');
  });
});

describe('busy ids', () => {
  it('records one at a time and never twice', () => {
    let state = adminReducer(loaded(), { type: 'busy', id: 'bot-b', busy: true });
    state = adminReducer(state, { type: 'busy', id: 'bot-b', busy: true });
    expect(state.busy).toEqual(['bot-b']);
    expect(adminReducer(state, { type: 'busy', id: 'bot-b', busy: false }).busy).toEqual([]);
  });

  it('clears with the bot it was about', () => {
    const busy = adminReducer(loaded(), { type: 'busy', id: 'bot-b', busy: true });
    expect(adminReducer(busy, { type: 'botRemoved', botId: 'bot-b' }).busy).toEqual([]);
  });
});

describe('workspaceOfBot', () => {
  it('finds the workspace a bot sits in, and answers null for one that is gone', () => {
    expect(workspaceOfBot(overview(), 'bot-c')).toBe('ws-other');
    expect(workspaceOfBot(overview(), 'nope')).toBeNull();
    expect(workspaceOfBot(null, 'bot-c')).toBeNull();
  });
});
