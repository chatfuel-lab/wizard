import { clearDeviceCaches } from '../../shellApi';

/**
 * Sign out, and say whether the server heard it.
 *
 * Four screens sign out, and every one of them used to swallow the refusal
 * with `catch(() => undefined)`. The session in the tab is gone either way —
 * the adapter clears local state in `finally` — so the answer here is not
 * "did you sign out" but "is the session still alive somewhere else", which is
 * the one thing worth telling somebody on a shared machine.
 *
 * A boolean rather than a thrown error on purpose: no screen branches on WHY
 * it failed, they all show the same sentence (`SIGN_OUT_UNCONFIRMED`), and a
 * `try/catch` in four places is how one of them ends up swallowing it again.
 */
export async function signOutConfirmed(signOut: () => Promise<void>): Promise<boolean> {
  /* Before the call, not after: the session in this tab is over either way —
     the adapter clears it in `finally` — and a refusal from the server must not
     be what leaves somebody else's flows on a shared machine. */
  clearDeviceCaches();
  try {
    await signOut();
    return true;
  } catch {
    return false;
  }
}
