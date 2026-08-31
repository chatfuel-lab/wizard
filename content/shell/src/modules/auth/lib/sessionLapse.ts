import { isSessionError } from '~api';

/**
 * Does this proxy rejection mean the session is gone?
 *
 * The shell's client reports every 401/403 from the gate. Only some of them are
 * a lapse, and both exceptions were found in practice:
 *
 * - **Nobody is signed in.** The topbar's bot-title query runs outside the gate,
 *   so a signed-out visitor always draws a 401. Reading that as a lapse sent
 *   people from `/sign-up` to `/sign-in?reason=expired` on page load.
 * - **A signed-in non-member** (`AuthTenantForbidden`). The gate already shows
 *   `/no-access`; signing them out would throw away the account they just made,
 *   and the invite they are about to accept with it.
 */
export function isSessionLapse(err: unknown, signedIn: boolean): boolean {
  if (!signedIn) return false;
  if (isSessionError(err) && err.reason === 'forbidden') return false;
  return true;
}
