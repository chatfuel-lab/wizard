/**
 * Role rules the Team page applies BEFORE it calls the adapter — so a menu
 * never offers what the RPC would refuse (cf_change_member_role, cf_remove_member,
 * cf_transfer_ownership all enforce the same rules server-side; these are the
 * client's copy). Pure, tested.
 */
import type { AssignableRole, Role, TeamMember } from '../types';

export const ROLE_RANK: Record<Role, number> = { owner: 3, admin: 2, member: 1 };

export const canManageTeam = (role: Role | null | undefined): boolean => role === 'owner' || role === 'admin';

/**
 * Who reaches every bot of the workspace without a per-bot grant. The same
 * pair as `canManageTeam` today, but a different question — team
 * administration and bot visibility are separate rules in the SQL too, so
 * they stay separate names here rather than one check that would silently
 * couple them.
 */
export const seesAllBots = (role: Role | null | undefined): boolean => role === 'owner' || role === 'admin';

/**
 * Roles the actor may set on a target that currently holds `target`. Only
 * people BELOW the actor: the owner row never changes here (ownership moves
 * only by transfer), and an admin does not touch a fellow admin — a demotion
 * is the first half of taking that account, since a recovery link may be
 * issued for anyone below the caller. A member acts on nobody. The current
 * role is excluded — the list is what CHANGES.
 */
export function assignableRoles(actor: Role, target: Role): AssignableRole[] {
  if (!canManageTeam(actor)) return [];
  if (ROLE_RANK[target] >= ROLE_RANK[actor]) return [];
  return (['admin', 'member'] as AssignableRole[]).filter((r) => r !== target);
}

/** Below the actor only, on the same rule. Self is handled by "Leave". */
export const canRemove = (actor: Role, target: Role): boolean =>
  canManageTeam(actor) && ROLE_RANK[target] < ROLE_RANK[actor];

/**
 * Who may have a password-recovery link minted for them. The same rank rule
 * again, and a separate name because it is a separate question: this one hands
 * out a working credential for somebody's account, and cf_recovery_authorize
 * refuses it for anyone not strictly below the caller.
 */
export const canResetPassword = (actor: Role, target: Role): boolean =>
  canManageTeam(actor) && ROLE_RANK[target] < ROLE_RANK[actor];

export const canTransfer = (actor: Role): boolean => actor === 'owner';

export const roleLabel = (role: Role): string => (role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member');

type RoleTone = 'accent' | 'success' | 'neutral';
export const roleTone = (role: Role): RoleTone =>
  role === 'owner' ? 'accent' : role === 'admin' ? 'success' : 'neutral';

/** Owner first, then admins, then members; ties by join date (earliest first), then by name/email so the order is total. */
export function sortMembers<T extends Pick<TeamMember, 'role' | 'joinedAt' | 'name' | 'email'>>(
  members: readonly T[],
): T[] {
  return [...members].sort(
    (a, b) =>
      ROLE_RANK[b.role] - ROLE_RANK[a.role] ||
      a.joinedAt.localeCompare(b.joinedAt) ||
      (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? ''),
  );
}
