import { describe, expect, it } from 'vitest';
import type { ModuleClient } from '~api';
import { registerScheduler } from './adminApi';
import { AdminError } from './adminErrors';

/**
 * The one call in this file that is not addressed to `/admin`.
 *
 * Registering the publish callback is an admin action mounted with the queue it
 * configures, so it rides the admin cookie and the admin header over somebody
 * else's path. That combination is what these tests pin: a change that folds it
 * back under `/admin` would reach a route that is not there, and the panel would
 * report the host's own 404 as a broken deployment.
 */

interface Call {
  path: string;
  init: RequestInit | undefined;
}

const clientRecording = (calls: Call[], response: Response): ModuleClient =>
  ({
    proxyFetch: (path: string, init?: RequestInit) => {
      calls.push({ path, init });
      return Promise.resolve(response);
    },
  }) as unknown as ModuleClient;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('registering the publish scheduler', () => {
  it('posts to the queue route, not to an admin one', async () => {
    const calls: Call[] = [];
    const client = clientRecording(calls, jsonResponse({ scheduling: true, publishUrl: 'https://app.test/x' }));

    const answer = await registerScheduler(client);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe('/publishing/register');
    expect(calls[0]!.init?.method).toBe('POST');
    expect(answer.scheduling).toBe(true);
  });

  it('carries the admin header and the cookie', async () => {
    const calls: Call[] = [];
    await registerScheduler(
      clientRecording(calls, jsonResponse({ scheduling: true, publishUrl: 'https://app.test/x' })),
    );

    const headers = new Headers(calls[0]!.init?.headers);
    expect(headers.get('x-cf-admin')).toBe('1');
    expect(calls[0]!.init?.credentials).toBe('same-origin');
  });

  it('sends no address: what a request says is not where the credential goes', async () => {
    const calls: Call[] = [];
    await registerScheduler(
      clientRecording(calls, jsonResponse({ scheduling: true, publishUrl: 'https://app.test/x' })),
    );

    expect(calls[0]!.init?.body).toBeUndefined();
  });

  it("surfaces the server's own refusal rather than a status code", async () => {
    /* A fresh Response each time: one body is read once, and a shared refusal
       would fail the second assertion for a reason that is not the point. */
    const refusal = (): Response =>
      jsonResponse(
        { errors: [{ message: 'This deployment has no PUBLIC_URL', extensions: { code: 'ProxyPublicUrlMissing' } }] },
        409,
      );

    await expect(registerScheduler(clientRecording([], refusal()))).rejects.toThrow(
      /This deployment has no PUBLIC_URL/,
    );
    await expect(registerScheduler(clientRecording([], refusal()))).rejects.toBeInstanceOf(AdminError);
  });
});
