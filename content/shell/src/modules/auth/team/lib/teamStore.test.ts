import { describe, expect, it } from 'vitest';
import type { TeamBot, TeamInvite, TeamMember } from '../../types';
import {
  botAccessOf,
  initialTeamState,
  isBusy,
  memberById,
  roleOf,
  teamReducer,
  transferCandidates,
  type TeamState,
} from './teamStore';

const member = (
  userId: string,
  role: TeamMember['role'],
  joinedAt = '2026-01-01T00:00:00Z',
  bots: string[] = [],
): TeamMember => ({
  userId,
  role,
  joinedAt,
  email: `${userId}@x.io`,
  name: userId.toUpperCase(),
  avatarUrl: null,
  bots,
});

const bot = (id: string, members: string[] = []): TeamBot => ({
  id,
  botId: `chatfuel-${id}`,
  name: id.toUpperCase(),
  createdAt: '2026-02-01T00:00:00Z',
  members,
});

const invite = (id: string, status: TeamInvite['status'] = 'pending'): TeamInvite => ({
  id,
  role: 'member',
  email: null,
  createdBy: 'own',
  createdByName: 'OWN',
  createdAt: '2026-08-01T00:00:00Z',
  expiresAt: '2026-09-01T00:00:00Z',
  status,
  bots: [],
});

const loaded = (): TeamState => {
  const s1 = teamReducer(initialTeamState(), { type: 'reset' });
  return teamReducer(s1, {
    type: 'loaded',
    epoch: s1.epoch,
    members: [member('m1', 'member', '2026-03-01T00:00:00Z', ['b1']), member('own', 'owner'), member('adm', 'admin')],
    invites: [invite('i1'), invite('i2', 'expired'), invite('i3', 'revoked'), invite('i4', 'accepted'), invite('i5')],
    bots: [bot('b1', ['m1']), bot('b2')],
  });
};

describe('teamReducer — loading', () => {
  it('reset bumps the epoch and marks loading; loaded with the same epoch → ready and sorted', () => {
    const s = loaded();
    expect(s.status).toBe('ready');
    expect(s.epoch).toBe(1);
    expect(s.members.map((m) => m.userId)).toEqual(['own', 'adm', 'm1']);
  });
  it('drops a stale reply', () => {
    const s0 = teamReducer(initialTeamState(), { type: 'reset' });
    const s1 = teamReducer(s0, { type: 'reset' });
    expect(s1.epoch).toBe(2);
    const stale = teamReducer(s1, {
      type: 'loaded',
      epoch: 1,
      members: [member('x', 'member')],
      invites: [],
      bots: [],
    });
    expect(stale).toBe(s1);
    const staleFail = teamReducer(s1, { type: 'failed', epoch: 1, message: 'nope' });
    expect(staleFail).toBe(s1);
    const failed = teamReducer(s1, { type: 'failed', epoch: 2, message: 'nope' });
    expect(failed.status).toBe('error');
    expect(failed.error).toBe('nope');
  });
  it('a refresh keeps the rows on screen while loading', () => {
    const s = teamReducer(loaded(), { type: 'reset' });
    expect(s.status).toBe('loading');
    expect(s.members).toHaveLength(3);
  });
});

describe('teamReducer — optimistic role change', () => {
  it('roleChanged applies immediately and re-sorts; roleRollback restores', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'roleChanged', userId: 'm1', role: 'admin' });
    expect(memberById(s1, 'm1')?.role).toBe('admin');
    // now two admins: adm joined first → stays ahead
    expect(s1.members.map((m) => m.userId)).toEqual(['own', 'adm', 'm1']);
    const s2 = teamReducer(s1, { type: 'roleRollback', userId: 'm1', role: 'member' });
    expect(memberById(s2, 'm1')?.role).toBe('member');
    expect(s2.members).toEqual(s0.members);
  });
  it('a no-op change returns the same state object', () => {
    const s0 = loaded();
    expect(teamReducer(s0, { type: 'roleChanged', userId: 'adm', role: 'admin' })).toBe(s0);
    expect(teamReducer(s0, { type: 'roleChanged', userId: 'ghost', role: 'admin' })).toBe(s0);
  });
});

describe('teamReducer — busy, remove, invites, transfer, settings', () => {
  it('busy/idle are idempotent', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'busy', id: 'm1' });
    expect(isBusy(s1, 'm1')).toBe(true);
    expect(teamReducer(s1, { type: 'busy', id: 'm1' })).toBe(s1);
    const s2 = teamReducer(s1, { type: 'idle', id: 'm1' });
    expect(isBusy(s2, 'm1')).toBe(false);
    expect(teamReducer(s2, { type: 'idle', id: 'm1' })).toBe(s2);
  });
  it('memberRemoved drops the row and its busy flag', () => {
    const s0 = teamReducer(loaded(), { type: 'busy', id: 'm1' });
    const s1 = teamReducer(s0, { type: 'memberRemoved', userId: 'm1' });
    expect(memberById(s1, 'm1')).toBeNull();
    expect(isBusy(s1, 'm1')).toBe(false);
    expect(teamReducer(s1, { type: 'memberRemoved', userId: 'm1' })).toBe(s1);
  });
  it('inviteCreated prepends and remembers the session link; inviteRevoked flips status and clears busy', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'inviteCreated', invite: invite('new'), url: 'https://app/invite/tok' });
    expect(s1.invites[0]!.id).toBe('new');
    expect(s1.sessionLinks).toEqual({ new: 'https://app/invite/tok' });
    const s2 = teamReducer(teamReducer(s1, { type: 'busy', id: 'new' }), { type: 'inviteRevoked', inviteId: 'new' });
    expect(s2.invites[0]!.status).toBe('revoked');
    expect(isBusy(s2, 'new')).toBe(false);
    // the link stays recorded (harmless: the row is no longer shown)
    expect(s2.sessionLinks.new).toBeDefined();
    // revoking a non-pending or unknown invite is a no-op
    expect(teamReducer(s2, { type: 'inviteRevoked', inviteId: 'new' })).toBe(s2);
    expect(teamReducer(s2, { type: 'inviteRevoked', inviteId: 'i2' })).toBe(s2);
  });
  it('ownershipTransferred swaps owner → admin, target → owner, and re-sorts', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'ownershipTransferred', fromUserId: 'own', toUserId: 'm1' });
    expect(memberById(s1, 'own')?.role).toBe('admin');
    expect(memberById(s1, 'm1')?.role).toBe('owner');
    expect(s1.members[0]!.userId).toBe('m1');
    // refuses when the source is not the owner or a side is missing
    expect(teamReducer(s1, { type: 'ownershipTransferred', fromUserId: 'own', toUserId: 'adm' })).toBe(s1);
    expect(teamReducer(s0, { type: 'ownershipTransferred', fromUserId: 'own', toUserId: 'ghost' })).toBe(s0);
  });
});

describe('teamReducer — bots', () => {
  it('botAdded appends, botRenamed renames, and both are no-ops for a bot that is not there', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'botAdded', bot: bot('b3') });
    expect(s1.bots.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    expect(teamReducer(s1, { type: 'botAdded', bot: bot('b3') })).toBe(s1);
    const s2 = teamReducer(s1, { type: 'botRenamed', botId: 'b3', name: 'Renamed' });
    expect(s2.bots.find((b) => b.id === 'b3')?.name).toBe('Renamed');
    expect(teamReducer(s2, { type: 'botRenamed', botId: 'b3', name: 'Renamed' })).toBe(s2);
    expect(teamReducer(s2, { type: 'botRenamed', botId: 'ghost', name: 'x' })).toBe(s2);
  });

  it('botRemoved drops the bot AND the grants that pointed at it', () => {
    const s0 = loaded();
    expect(memberById(s0, 'm1')?.bots).toEqual(['b1']);
    const s1 = teamReducer(s0, { type: 'botRemoved', botId: 'b1' });
    expect(s1.bots.map((b) => b.id)).toEqual(['b2']);
    expect(memberById(s1, 'm1')?.bots).toEqual([]);
    expect(teamReducer(s1, { type: 'botRemoved', botId: 'b1' })).toBe(s1);
  });

  // The page reads access from two rows; they must not be able to disagree.
  it('botAccess writes the person and the bot together', () => {
    const s0 = loaded();
    const s1 = teamReducer(s0, { type: 'botAccess', botId: 'b2', userId: 'm1', granted: true });
    expect(memberById(s1, 'm1')?.bots).toEqual(['b1', 'b2']);
    expect(s1.bots.find((b) => b.id === 'b2')?.members).toEqual(['m1']);
    const s2 = teamReducer(s1, { type: 'botAccess', botId: 'b2', userId: 'm1', granted: false });
    expect(memberById(s2, 'm1')?.bots).toEqual(['b1']);
    expect(s2.bots.find((b) => b.id === 'b2')?.members).toEqual([]);
    // already so, unknown bot, unknown person: all no-ops
    expect(teamReducer(s2, { type: 'botAccess', botId: 'b2', userId: 'm1', granted: false })).toBe(s2);
    expect(teamReducer(s2, { type: 'botAccess', botId: 'ghost', userId: 'm1', granted: true })).toBe(s2);
    expect(teamReducer(s2, { type: 'botAccess', botId: 'b2', userId: 'ghost', granted: true })).toBe(s2);
  });
});

describe('selectors', () => {
  it('botAccessOf: a role, not a grant, is what an owner or admin holds', () => {
    const s = loaded();
    expect(botAccessOf(s, memberById(s, 'own')!)).toBe('all');
    expect(botAccessOf(s, memberById(s, 'adm')!)).toBe('all');
    expect((botAccessOf(s, memberById(s, 'm1')!) as { id: string }[]).map((b) => b.id)).toEqual(['b1']);
    expect(botAccessOf(s, { role: 'member', bots: [] })).toEqual([]);
  });
  it('transferCandidates: admins first, never self, never the owner', () => {
    const s = loaded();
    expect(transferCandidates(s.members, 'own').map((m) => m.userId)).toEqual(['adm', 'm1']);
    expect(transferCandidates(s.members, 'adm').map((m) => m.userId)).toEqual(['m1']);
    expect(transferCandidates([], 'own')).toEqual([]);
  });
  it('roleOf prefers the store over the fallback (post-transfer)', () => {
    const s = teamReducer(loaded(), { type: 'ownershipTransferred', fromUserId: 'own', toUserId: 'adm' });
    expect(roleOf(s, 'own', 'owner')).toBe('admin');
    expect(roleOf(s, 'ghost', 'member')).toBe('member');
  });
});
