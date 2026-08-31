import type { InboxContactDetailFragment } from '~api/generated/livechat/graphql';

/**
 * Who this contact is, per platform, and who is answering them.
 *
 * There is no common handle on the `Contact` interface. `phone` exists only on
 * `WhatsappContact`, `username` and `availableForDMs` only on Instagram and
 * TikTok, and `WidgetContact`, `FacebookContact` and `UnavailableContact` have
 * neither — so the card branches on `__typename` and cannot do otherwise. A
 * version that reads `'phone' in contact` is the same mistake in TypeScript
 * clothing: it works for the platform whose field somebody remembered and
 * silently shows nothing for the rest.
 */

export type ContactDetail = InboxContactDetailFragment;

export interface IdentityRow {
  label: string;
  value: string;
}

/**
 * `scope` names the INBOX side of the conversation — which WhatsApp number,
 * which Instagram account — and not the contact. It is on the card because an
 * operator working two numbers needs to know which one this arrived on, and it
 * is labelled so that nobody reads it as the contact's own.
 */
function scopeRow(contact: ContactDetail): IdentityRow | null {
  const { scope } = contact;
  switch (scope.__typename) {
    case 'WhatsAppPhoneContactScope':
      return scope.phone
        ? {
            label: 'Reached your number',
            value: scope.phone.verifiedName
              ? `${scope.phone.displayPhoneNumber} · ${scope.phone.verifiedName}`
              : scope.phone.displayPhoneNumber,
          }
        : null;
    case 'InstagramAccountContactScope':
      return scope.instagramAccount
        ? { label: 'Reached your account', value: `@${scope.instagramAccount.username}` }
        : null;
    case 'TikTokAccountContactScope':
      return scope.tiktokAccount ? { label: 'Reached your account', value: `@${scope.tiktokAccount.username}` } : null;
    case 'FacebookContactScope':
      return scope.facebookPage ? { label: 'Reached your page', value: scope.facebookPage.name } : null;
    case 'WebWidgetContactScope':
      return scope.webWidget ? { label: 'Reached your widget', value: scope.webWidget.name } : null;
    default:
      return null;
  }
}

/** The handle rows, in reading order. Empty for a platform that has none. */
export function contactIdentity(contact: ContactDetail): IdentityRow[] {
  const rows: IdentityRow[] = [];
  switch (contact.__typename) {
    case 'WhatsappContact':
      if (contact.phone) rows.push({ label: 'Phone', value: contact.phone });
      break;
    case 'InstagramContact':
    case 'TikTokContact':
      if (contact.username) rows.push({ label: 'Username', value: `@${contact.username}` });
      /* Explicit false only. `availableForDMs` is nullable and a null is the
         platform declining to say, which is not the same as "no" — and "no" is
         the answer that would stop an operator writing at all. */
      if (contact.availableForDMs === false) {
        rows.push({ label: 'Direct messages', value: 'Closed' });
      }
      break;
    default:
      break;
  }
  const scope = scopeRow(contact);
  if (scope) rows.push(scope);
  return rows;
}

export type AssigneeState =
  /** Nobody. The inbox's own word for it is "Unassigned". */
  | { kind: 'none' }
  /** Fuely AI is answering. */
  | { kind: 'ai' }
  | { kind: 'user'; id: string; name: string; unknown: boolean };

export const UNASSIGNED: AssigneeState = { kind: 'none' };

/**
 * Who owns this conversation.
 *
 * Three states, not two, and the third is the one that gets collapsed by
 * accident: `isUnknown` is the API's placeholder for a user it will not name —
 * someone removed from the bot, or on another workspace — and it is NOT
 * "unassigned". `useInboxTeam` filters those out of the roster, so an
 * assignment to one of them cannot be represented by any option in the picker,
 * and showing it as unassigned would invite an operator to "fix" it by taking a
 * conversation that already has an owner.
 */
export function assigneeState(contact: ContactDetail): AssigneeState {
  const { assignee } = contact;
  if (!assignee) return UNASSIGNED;
  if (assignee.__typename === 'FuelyAIAssignee') return { kind: 'ai' };
  return {
    kind: 'user',
    id: assignee.id,
    name: assignee.name,
    unknown: assignee.isUnknown,
  };
}

export function assigneeLabel(state: AssigneeState): string {
  switch (state.kind) {
    case 'none':
      return 'Unassigned';
    case 'ai':
      return 'Fuely AI';
    case 'user':
      return state.unknown ? 'Someone outside this bot' : state.name;
  }
}

/**
 * The picker's value for an assignee state, and back.
 *
 * One string, because a `Select` holds one string. `u:` prefixes the id so that
 * a user account whose id happens to be "ai" cannot collide with the AI option
 * — the same shape the inbox filter already uses for its assignee key.
 */
export function assigneeValue(state: AssigneeState): string {
  switch (state.kind) {
    case 'none':
      return 'none';
    case 'ai':
      return 'ai';
    case 'user':
      return `u:${state.id}`;
  }
}

export function assigneeFromValue(value: string): AssigneeState {
  if (value === 'ai') return { kind: 'ai' };
  if (value.startsWith('u:') && value.length > 2) {
    return { kind: 'user', id: value.slice(2), name: '', unknown: false };
  }
  return UNASSIGNED;
}
