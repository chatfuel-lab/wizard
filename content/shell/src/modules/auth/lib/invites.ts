/**
 * The invite's four-state model, in one place. An invite is born pending and
 * leaves that state exactly one way — revoked beats accepted beats expired —
 * and only pending invites are actionable anywhere in the app. The Supabase
 * adapter parses the server's string and the Team page's store filters on it;
 * both read this file so the list and the derivation cannot drift apart.
 */
import type { InviteStatus } from '../types';

const INVITE_STATUSES: readonly InviteStatus[] = ['pending', 'expired', 'revoked', 'accepted'];

/**
 * A server-sent status → the union. An unknown string reads as 'pending':
 * the one state that stays visible, so a value this build does not know shows
 * up as a row rather than vanishing from the list.
 */
export const asInviteStatus = (value: unknown): InviteStatus => INVITE_STATUSES.find((s) => s === value) ?? 'pending';

/** The timestamps that decide an invite's state, in the order they win. */
export interface InviteStateTimes {
  revokedAt: string | null;
  acceptedAt: string | null;
  expiresAt: string;
}

export const deriveInviteStatus = (invite: InviteStateTimes, now: Date): InviteStatus =>
  invite.revokedAt
    ? 'revoked'
    : invite.acceptedAt
      ? 'accepted'
      : new Date(invite.expiresAt) <= now
        ? 'expired'
        : 'pending';

export const isPendingInvite = (invite: { status: InviteStatus }): boolean => invite.status === 'pending';
