import { outboundFetch as egressFetch, proxyEnv } from '@chatfuel/vite-plugin-proxy/egress';
import { registerSecret } from './log';

/**
 * Outbound HTTP for the wizard itself.
 *
 * Node's built-in fetch ignores HTTP_PROXY and HTTPS_PROXY unless the process
 * was started with NODE_USE_ENV_PROXY=1 — which nobody types before their first
 * run. Behind a company proxy every call therefore goes direct and times out,
 * and the token check ends in "could not reach the API", which reads as "your
 * token is bad". So nothing here calls the global fetch directly.
 *
 * The implementation is the proxy package's `egress.ts` — the app the wizard
 * writes needs the same thing on its own side, and the two used to be copies
 * that drifted. The one wizard-specific concern kept here: the proxy URL can
 * carry a credential, it reaches the socket layer, so it can reach a stack
 * trace too — and this process is the one holding the log masker.
 */

export { describeProxy, maskProxyUrl, proxyEnv, proxyHint } from '@chatfuel/vite-plugin-proxy/egress';
export type { ProxyReadableEnv, ProxySetting } from '@chatfuel/vite-plugin-proxy/egress';

/**
 * A fetch, as everything here actually uses one: a URL and at most headers.
 *
 * Narrower than `typeof fetch` on purpose. It lives here rather than beside
 * either of its consumers because both of them have one — the module that
 * resolves a ref and the module that pulls the bytes down — and a second
 * declaration is the shape they would drift on.
 */
export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

/** Keyed by the value, so a changed variable re-registers instead of being missed. */
let registeredProxyUrl: string | undefined;

function registerProxySecret(): void {
  const setting = proxyEnv(process.env);
  if (!setting || setting.url === registeredProxyUrl) return;
  registeredProxyUrl = setting.url;
  try {
    /* Both halves of the userinfo. Squid and Zscaler take the credential as the
       USERNAME - `http://<token>@proxy:8080`, no password at all - so masking
       only the password protects the setup nobody in a corporate network
       actually has. Registered as written and as decoded, because a URL object
       percent-encodes what the environment variable holds literally. */
    const parsed = new URL(setting.url);
    for (const part of [parsed.username, parsed.password]) {
      if (!part) continue;
      registerSecret(part);
      try {
        const decoded = decodeURIComponent(part);
        if (decoded !== part) registerSecret(decoded);
      } catch {
        /* Not valid percent-encoding — the literal above is what it is. */
      }
    }
  } catch {
    /* An unparseable proxy URL has no credentials to protect. */
  }
}

/** `fetch`, through the proxy when the environment names one. */
export const outboundFetch: typeof globalThis.fetch = (input, init) => {
  registerProxySecret();
  return egressFetch(input, init);
};
