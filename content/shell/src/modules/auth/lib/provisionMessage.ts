import { codeOfError, messageFor } from './copy';
import type { AuthErrorCode } from '../types';

/**
 * The failure text worth putting on the "your workspace is not ready" screen.
 *
 * Most failures are transient and the screen already says the right thing
 * ("try again in a moment"). These are not: the deployment's Chatfuel
 * workspace is full, a bot cap in the database was reached, or the server
 * cannot provision at all — all the operator's to fix, and no amount of
 * retrying helps. The wording still comes from copy.ts; the server's own
 * sentence stays on the error object, for the console and the server log,
 * where the operator is.
 */
const OPERATOR_CODES: readonly AuthErrorCode[] = [
  'WorkspaceFull',
  'BotLimitReached',
  'ProvisionUnavailable',
  'NotAllowed',
];

export function provisionMessage(err: unknown): string | undefined {
  const code = codeOfError(err);
  return code && OPERATOR_CODES.includes(code) ? messageFor(code) : undefined;
}
