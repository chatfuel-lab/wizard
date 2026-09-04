/**
 * API errors → the sentence a person reads.
 *
 * The API sometimes wraps its codes one level down: the real code sits at
 * `errors[0].extensions.errors[0].extensions.code` under a generic outer
 * message. The shared `nestedErrorCodes` walks both places, nested first, so
 * a code check works either way.
 *
 * `ContactScopeDoesNotExist` is not a member of the bundled `DefinedErrorCode`
 * enum — the server still answers it, so it is matched as the raw string it
 * arrives as.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';

/** The first defined error code, top-level or nested, or null. */
export function errorCode(err: unknown): string | null {
  return nestedErrorCodes(err)[0] ?? null;
}

export function isErrorCode(err: unknown, code: string): boolean {
  return errorCode(err) === code;
}

const MESSAGES: Record<string, string> = {
  // platform links
  PlatformOperationLinkInvalidRedirectURL: 'A redirect must be an https:// address with a host.',
  PlatformOperationLinkNotFound: 'This link is no longer active — it was revoked, replaced, or has expired.',
  PlatformNotSupportedForOperationLink: 'This platform does not take a link.',
  NoConnectedContactScopeForPlatform:
    'Nothing on this platform is connected to the bot, so there is no access to refresh.',
  // channels
  CannotDisconnectWidgetScope: 'The web widget cannot be disconnected.',
  ContactScopeDoesNotExist: 'This channel is already disconnected.',
  ContactScopeAlreadyConnected: 'Something on this platform is already connected to the bot.',
  // generic
  NotEnoughPermissions: 'Your role cannot manage channels on this bot.',
  Unauthorized: 'Your session token was rejected — rotate it and reload.',
};

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const code = errorCode(err);
  if (code === 'InternalServerError') return 'Chatfuel could not complete that. Try again in a moment.';
  if (code && MESSAGES[code]) return MESSAGES[code];
  return errorMessageFor(err, MESSAGES, fallback);
}

/** The refusals that mean "already done": the thing is gone, and a re-read is the whole fix. */
export function isAlreadyGone(err: unknown): boolean {
  const code = errorCode(err);
  return code === 'PlatformOperationLinkNotFound' || code === 'ContactScopeDoesNotExist';
}
