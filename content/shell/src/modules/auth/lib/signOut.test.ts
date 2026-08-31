import { afterEach, describe, expect, it } from 'vitest';
import { registerDeviceCache } from '../../shellApi';
import { signOutConfirmed } from './signOut';

/**
 * What the browser keeps for a session has to go when the session does. The
 * modules hold that data — a flow builder snapshot is a whole flow — and the
 * shell holds the moment; `registerDeviceCache` is the seam between them, and
 * these tests are about the sign-out end of it.
 */
const swept: string[] = [];
const undo = registerDeviceCache(() => swept.push('sweep'));

afterEach(() => {
  swept.length = 0;
});

describe('signOutConfirmed', () => {
  it('confirms a sign-out the server accepted', async () => {
    await expect(signOutConfirmed(async () => undefined)).resolves.toBe(true);
    expect(swept).toEqual(['sweep']);
  });

  it('drops the device caches even when the server refuses', async () => {
    // The session in this tab is over either way — the adapter clears it in
    // `finally` — so an unreachable server must not be what leaves somebody
    // else's flows on a shared machine.
    await expect(signOutConfirmed(() => Promise.reject(new Error('offline')))).resolves.toBe(false);
    expect(swept).toEqual(['sweep']);
  });

  it('stops sweeping once the registration is undone', async () => {
    undo();
    await expect(signOutConfirmed(async () => undefined)).resolves.toBe(true);
    expect(swept).toEqual([]);
  });
});
