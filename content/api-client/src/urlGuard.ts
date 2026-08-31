/**
 * Where a credential is allowed to go.
 *
 * `url` and `wsUrl` are configuration, and a mistake in them is not a failed
 * request — it is the Chatfuel dashboard token, or a user's session token,
 * leaving over a channel everyone on the path can read. Nothing else in this
 * client would notice: an `http://` upstream answers exactly like an `https://`
 * one.
 *
 * Two exemptions, both because the alternative would be a false alarm. A
 * relative url inherits the page's own origin, and how that page is served is
 * the host's decision, not this client's. A loopback host is the dev proxy,
 * where every byte stays on the machine that wrote it.
 *
 * A scheme-relative url is neither. `//evil.example/graphql` looks relative and
 * has no scheme to check, but it names a host of its own: what it inherits from
 * the page is the scheme, not the origin. It is refused rather than exempted,
 * and so is every spelling `new URL` folds into it — a leading `\\`, `/\` or
 * `\/` resolves to the same foreign host, because the URL parser treats a
 * backslash as a slash for schemes like http.
 *
 * Both of those checks read the string from its first character, so they are
 * only worth anything if the first character is the one the URL parser will
 * read too. It is not, by default: WHATWG strips C0 controls and spaces off
 * both ends and deletes tab, LF and CR wherever they appear, so
 * `" http://evil.example"`, `"/\n/evil.example"` and even
 * `"ht\rtp://evil.example"` each name a foreign host by the time `fetch` sees
 * them while matching neither pattern as written. This guard normalises the
 * same way first and then refuses any url that needed it: a token url with a
 * newline in the middle is a broken `.env` line, not a host anyone meant to
 * name, and normalising it quietly would hide the typo until it mattered.
 *
 * Scheme and loopback are the whole of what that decides, and they decide it
 * about the address in isolation: `https://panel.chatfuel.com.evil.example` is
 * https to a host that is not loopback, so on those two questions it passes.
 * What answers it is the address this client was already configured with —
 * `url` names where the deployment's proxy lives, and a second knob pointing
 * anywhere else is either a mistake or somebody else's host. So a caller that
 * has a base passes its origin in, and every other url is held to it. The base
 * itself has nothing above it to be held to; it is the configuration.
 */

const LOOPBACK_V4 = /^127(?:\.\d{1,3}){3}$/;

/** `localhost`, anything under `.localhost`, 127.0.0.0/8 and `::1`. */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || LOOPBACK_V4.test(host);
}

/** What WHATWG deletes anywhere in a url: ASCII tab, LF and CR. */
const URL_DELETED = /[\t\n\r]/g;

/** What WHATWG trims off both ends: C0 controls and space. */
// eslint-disable-next-line no-control-regex
const URL_TRIMMED = /^[\u0000-\u0020]+|[\u0000-\u0020]+$/g;

/** Two leading slashes in any mix of `/` and `\\` — every spelling of "another host, the page's scheme". */
const SCHEME_RELATIVE = /^[/\\]{2}/;

/**
 * An origin, as a string two urls can be compared on.
 *
 * `ws` and `wss` fold onto `http` and `https`: `wss://host/graphql` and
 * `https://host/graphql` are one address reached two ways, and a client whose
 * `url` and `wsUrl` name the same host would otherwise read as cross-origin to
 * itself. Port and host come from the parser, so a default port that is written
 * out and one that is not compare equal.
 */
function originKey(parsed: URL): string {
  const scheme = parsed.protocol === 'ws:' ? 'http:' : parsed.protocol === 'wss:' ? 'https:' : parsed.protocol;
  return `${scheme}//${parsed.host}`;
}

/**
 * The origin a credential may be sent to, derived from the base url a client
 * was configured with — no new setting, because the deployment already named
 * this address once.
 *
 * A relative base names the page's own origin, and that is a fact of the
 * runtime rather than a value configuration can write. Outside a browser a
 * relative base names nothing yet, so there is no origin to pin to and none is
 * returned: an unpinned check is the behaviour that was there before.
 */
export function credentialOrigin(base: string): string | undefined {
  const url = base.replace(URL_DELETED, '').replace(URL_TRIMMED, '');
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    try {
      return originKey(new URL(url));
    } catch {
      return undefined;
    }
  }
  const here = (globalThis as { location?: { origin?: string } }).location?.origin;
  if (here === undefined || here === 'null') return undefined;
  try {
    return originKey(new URL(here));
  } catch {
    return undefined;
  }
}

/** Header names that mean the request carries a credential, so the url it goes to is this guard's business. */
const CREDENTIAL_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'x-api-key']);

/**
 * True when these headers would send a credential. Keys are compared case
 * insensitively: on the wire they are, and `Authorization` from a caller is the
 * same header as `authorization` from this client.
 */
export function carriesCredential(headers: Record<string, string> | undefined): boolean {
  if (!headers) return false;
  return Object.entries(headers).some(([name, value]) => CREDENTIAL_HEADERS.has(name.toLowerCase()) && value !== '');
}

/**
 * Throws when `raw` is an address a credential must not go to — in the clear,
 * or at an origin this client was not configured for. A relative url, or one
 * that does not parse, passes through — resolving and reporting a bad url is
 * the transport's job, and this guard has nothing to say about it.
 *
 * The client applies it to its own urls whether or not the request in hand
 * carries anything: what is judged here is the address, and an address is
 * either one this deployment may talk to or it is not.
 *
 * `pinnedOrigin` is what `credentialOrigin` derived from the base url. Left
 * out, only the scheme is judged, which is what a base url gets: there is
 * nothing above it to hold it to.
 */
export function assertCredentialSafeUrl(raw: string, option: string, pinnedOrigin?: string): void {
  const url = raw.replace(URL_DELETED, '').replace(URL_TRIMMED, '');
  if (url !== raw) {
    throw new Error(
      `${option} ${JSON.stringify(raw)} has whitespace the URL parser removes before it resolves the address, ` +
        `so what this guard would check and what a credential is actually sent to are two different strings. ` +
        `It resolves to ${JSON.stringify(url)}. Write the address without the surrounding or embedded whitespace.`,
    );
  }
  if (SCHEME_RELATIVE.test(url)) {
    throw new Error(
      `${option} "${url}" is scheme-relative: it names a host of its own and takes whatever scheme the page ` +
        `was served over, so a credential sent with it can leave this origin in the clear. ` +
        `Write the scheme out, or use a path.`,
    );
  }
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (pinnedOrigin !== undefined && originKey(parsed) !== pinnedOrigin) {
    throw new Error(
      `${option} "${url}" is at ${originKey(parsed)}, and this client talks to ${pinnedOrigin} — ` +
        `the origin it was already configured with. A host one label off is a request, and any token that ` +
        `travels with it, delivered to whoever owns it. Use that origin, or a path.`,
    );
  }
  if (parsed.protocol === 'https:' || parsed.protocol === 'wss:') return;
  if (isLoopbackHost(parsed.hostname)) return;
  throw new Error(
    `${option} "${url}" is plaintext ${parsed.protocol.replace(':', '')} to a host that is not loopback, ` +
      `so everything this client sends there — and anything it is later given to send — is readable on the ` +
      `path, and the answers it acts on are anyone's to write. Use https/wss, or a loopback host.`,
  );
}
