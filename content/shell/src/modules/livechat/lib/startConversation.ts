import { ChatfuelGraphQLError } from '~api';
import { messageOf } from './errors';

/**
 * Why starting a conversation was refused, in a sentence a person can act on.
 *
 * Said AFTER the mutation, never in front of it, and that is the whole point of
 * this file. Starting a conversation needs `Inbox: Edit`, but the role gate
 * that would have been read here answers CLOSED on a lookup that failed —
 * `fetchRoleGates` cannot tell a denial from a request that never reached the
 * server, and says so. A check in front of the mutation therefore tells an
 * operator whose write would have gone through that they may not write, on
 * nothing worse than a dropped request. The server decides, as it did before
 * any of this existed, and its answer is turned into a sentence here because
 * `NotEnoughPermissions` names an object and an action rather than what the
 * reader was trying to do.
 *
 * The request arrives from two entry points that cannot classify a refusal for
 * themselves — the `?contact=` deep link, which is also how the contacts and
 * bookings modules link a person here, and the new-conversation dialog — so
 * both read their sentence out of this one function.
 */
export function startFailureText(err: unknown): string {
  if (err instanceof ChatfuelGraphQLError) {
    const code = err.code;
    if (err.isPermissionDenied || code === 'Forbidden' || code === 'Unauthorized') {
      return 'You need the Inbox: Edit permission to start a conversation.';
    }
  }
  return messageOf(err);
}
