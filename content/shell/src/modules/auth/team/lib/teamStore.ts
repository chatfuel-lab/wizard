/**
 * The Team page's store — a pure reducer over members, invites and bots,
 * plus the selectors the table and the header read.
 *
 * Loading is epoch-guarded (a reply for an older load is dropped); the role
 * change is optimistic (`roleChanged` now, `roleRollback` if the adapter
 * refuses); everything else applies the adapter's answer after it lands.
 * `busy` holds the ids of rows with an action in flight so a row disables
 * its own controls; `sessionLinks` remembers the raw invite URLs created in
 * THIS session — the token is never re-readable, so a link that was not
 * created here cannot be copied again.
 */
import type { AssignableRole, Role, TeamBot, TeamInvite, TeamMember } from '../../types';
import { isPendingInvite } from '../../lib/invites';
import { seesAllBots, sortMembers } from '../../lib/roles';

type TeamStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TeamState {
  status: TeamStatus;
  epoch: number;
  members: TeamMember[];
  invites: TeamInvite[];
  /** Every bot of the workspace, oldest first — the admin's view, not the caller's. */
  bots: TeamBot[];
  /** inviteId → absolute URL, for links created in this session only. */
  sessionLinks: Record<string, string>;
  /** Row ids (userId / inviteId) with an action in flight. */
  busy: string[];
  error: string | null;
}

type TeamEvent =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; members: TeamMember[]; invites: TeamInvite[]; bots: TeamBot[] }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'busy'; id: string }
  | { type: 'idle'; id: string }
  | { type: 'roleChanged'; userId: string; role: AssignableRole }
  | { type: 'roleRollback'; userId: string; role: Role }
  | { type: 'memberRemoved'; userId: string }
  | { type: 'inviteCreated'; invite: TeamInvite; url: string }
  | { type: 'inviteRevoked'; inviteId: string }
  | { type: 'ownershipTransferred'; fromUserId: string; toUserId: string }
  | { type: 'botAdded'; bot: TeamBot }
  | { type: 'botRenamed'; botId: string; name: string }
  | { type: 'botRemoved'; botId: string }
  | { type: 'botAccess'; botId: string; userId: string; granted: boolean };

export function initialTeamState(): TeamState {
  return { status: 'idle', epoch: 0, members: [], invites: [], bots: [], sessionLinks: {}, busy: [], error: null };
}

/** Same array back when nothing changes, so a no-op event is a no-op render. */
const setRole = (members: TeamMember[], userId: string, role: Role): TeamMember[] => {
  const index = members.findIndex((m) => m.userId === userId);
  if (index === -1 || members[index]!.role === role) return members;
  const next = [...members];
  next[index] = { ...members[index]!, role };
  return next;
};

export function teamReducer(state: TeamState, event: TeamEvent): TeamState {
  switch (event.type) {
    case 'reset':
      return { ...state, epoch: state.epoch + 1, status: 'loading', error: null };
    case 'loaded':
      if (event.epoch !== state.epoch) return state;
      return {
        ...state,
        status: 'ready',
        error: null,
        members: sortMembers(event.members),
        invites: event.invites,
        bots: event.bots,
      };
    case 'failed':
      if (event.epoch !== state.epoch) return state;
      return { ...state, status: 'error', error: event.message };
    case 'busy':
      return state.busy.includes(event.id) ? state : { ...state, busy: [...state.busy, event.id] };
    case 'idle':
      return state.busy.includes(event.id) ? { ...state, busy: state.busy.filter((id) => id !== event.id) } : state;
    case 'roleChanged':
    case 'roleRollback': {
      const members = setRole(state.members, event.userId, event.role);
      return members === state.members ? state : { ...state, members: sortMembers(members) };
    }
    case 'memberRemoved': {
      if (!state.members.some((m) => m.userId === event.userId)) return state;
      return {
        ...state,
        members: state.members.filter((m) => m.userId !== event.userId),
        busy: state.busy.filter((id) => id !== event.userId),
      };
    }
    case 'inviteCreated':
      return {
        ...state,
        invites: [event.invite, ...state.invites.filter((i) => i.id !== event.invite.id)],
        sessionLinks: { ...state.sessionLinks, [event.invite.id]: event.url },
      };
    case 'inviteRevoked': {
      const invite = state.invites.find((i) => i.id === event.inviteId);
      if (!invite || !isPendingInvite(invite)) return state;
      return {
        ...state,
        invites: state.invites.map((i) => (i.id === event.inviteId ? { ...i, status: 'revoked' } : i)),
        busy: state.busy.filter((id) => id !== event.inviteId),
      };
    }
    /* Access lives in two places on this page — the person's row and the bot's
       row — so it is written to both here rather than by two dispatches that
       could disagree. An owner or admin never carries a grant: their access
       comes from the role, and listing them would read as revocable. */
    case 'botAccess': {
      const bot = state.bots.find((b) => b.id === event.botId);
      const member = state.members.find((m) => m.userId === event.userId);
      if (!bot || !member) return state;
      if (bot.members.includes(event.userId) === event.granted) return state;
      return {
        ...state,
        bots: state.bots.map((b) =>
          b.id === event.botId
            ? {
                ...b,
                members: event.granted ? [...b.members, event.userId] : b.members.filter((id) => id !== event.userId),
              }
            : b,
        ),
        members: state.members.map((m) =>
          m.userId === event.userId
            ? { ...m, bots: event.granted ? [...m.bots, event.botId] : m.bots.filter((id) => id !== event.botId) }
            : m,
        ),
      };
    }
    case 'botAdded':
      return state.bots.some((b) => b.id === event.bot.id) ? state : { ...state, bots: [...state.bots, event.bot] };
    case 'botRenamed': {
      const bot = state.bots.find((b) => b.id === event.botId);
      if (!bot || bot.name === event.name) return state;
      return { ...state, bots: state.bots.map((b) => (b.id === event.botId ? { ...b, name: event.name } : b)) };
    }
    case 'botRemoved': {
      if (!state.bots.some((b) => b.id === event.botId)) return state;
      return {
        ...state,
        bots: state.bots.filter((b) => b.id !== event.botId),
        // A grant on a bot that no longer exists is not access to anything.
        members: state.members.map((m) =>
          m.bots.includes(event.botId) ? { ...m, bots: m.bots.filter((id) => id !== event.botId) } : m,
        ),
        busy: state.busy.filter((id) => id !== event.botId),
      };
    }
    case 'ownershipTransferred': {
      const from = state.members.find((m) => m.userId === event.fromUserId);
      const to = state.members.find((m) => m.userId === event.toUserId);
      if (!from || !to || from.role !== 'owner') return state;
      const members = state.members.map((m) =>
        m.userId === event.fromUserId
          ? { ...m, role: 'admin' as const }
          : m.userId === event.toUserId
            ? { ...m, role: 'owner' as const }
            : m,
      );
      return { ...state, members: sortMembers(members) };
    }
    default:
      return state;
  }
}

/* ---------------------------------------------------------------- selectors */

export type TeamRow = { kind: 'member'; member: TeamMember } | { kind: 'invite'; invite: TeamInvite };

export const rowId = (row: TeamRow): string => (row.kind === 'member' ? row.member.userId : row.invite.id);
export const rowKey = (row: TeamRow): string =>
  row.kind === 'member' ? `m:${row.member.userId}` : `i:${row.invite.id}`;

/** Only PENDING invites are ever shown; expired / revoked / accepted ones count for nothing. */
export const pendingInvites = (state: Pick<TeamState, 'invites'>): TeamInvite[] =>
  state.invites.filter(isPendingInvite);

/** One list: the people, then the invitations still outstanding. */
export function teamRows(state: Pick<TeamState, 'members' | 'invites'>): TeamRow[] {
  return [
    ...state.members.map((member): TeamRow => ({ kind: 'member', member })),
    ...pendingInvites(state).map((invite): TeamRow => ({ kind: 'invite', invite })),
  ];
}

export const isBusy = (state: Pick<TeamState, 'busy'>, id: string): boolean => state.busy.includes(id);

export const memberById = (state: Pick<TeamState, 'members'>, userId: string): TeamMember | null =>
  state.members.find((m) => m.userId === userId) ?? null;

/**
 * What a person's Bots cell says. Owners and admins reach every bot in the
 * workspace by role, so they are 'all' and not a list that could be edited.
 */
export const botAccessOf = (
  state: Pick<TeamState, 'bots'>,
  member: Pick<TeamMember, 'role' | 'bots'>,
): 'all' | TeamBot[] => (seesAllBots(member.role) ? 'all' : state.bots.filter((bot) => member.bots.includes(bot.id)));

/** The actor's role as the STORE knows it — after a transfer the auth provider's membership is stale. */
export const roleOf = (state: Pick<TeamState, 'members'>, userId: string, fallback: Role): Role =>
  memberById(state, userId)?.role ?? fallback;

/** Members the current owner may hand the workspace to: admins first, never self. */
export function transferCandidates(members: readonly TeamMember[], meId: string): TeamMember[] {
  return members
    .filter((m) => m.userId !== meId && m.role !== 'owner')
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1));
}
