/**
 * Telling a network failure apart from a failed build, and naming the host
 * that caused it — off the output when it says, by probing when it does not.
 */
import { describeProxy, outboundFetch } from './egress.mjs';
import { stripAnsi } from './output.mjs';
import { fail } from './report.mjs';

/**
 * The hosts a deploy from this machine actually talks to.
 *
 * Everything the build itself downloads is fetched by Vercel's builders, not
 * from here, so the list is short: the API the CLI drives, and the npm registry
 * when the CLI is not installed and has to be fetched to run at all.
 *
 * The telemetry host is deliberately NOT here. Telemetry is switched off for
 * every call this script makes (see childEnv), so a machine that blocks it
 * deploys perfectly well - and naming it would send somebody to open a hole
 * they do not need.
 *
 * @param {boolean} [viaNpx]
 * @returns {string[]}
 */
export function deployHosts(viaNpx = false) {
  return viaNpx ? ['api.vercel.com', 'registry.npmjs.org'] : ['api.vercel.com'];
}

/**
 * What a request that never arrived looks like in someone else's output.
 *
 * Enumerated on purpose. "network" and "proxy" as bare words appear in ordinary
 * build logs, and matching them would turn every type error into a firewall
 * diagnosis. Every entry here is a transport failure and nothing else.
 */
const NETWORK_MARKERS =
  /\b(?:fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EPROTO|CERT_HAS_EXPIRED|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_CERT_ALTNAME_INVALID)\b|socket hang up|network timeout|when HTTP Tunneling|Client network socket disconnected|unable to (?:verify the first certificate|get local issuer certificate)|self[- ]signed certificate/i;

/**
 * Whether this output is a machine that could not send a request, rather than a build that failed.
 *
 * @param {string} [text]
 * @returns {boolean}
 */
export function looksLikeNetworkFailure(text = '') {
  return NETWORK_MARKERS.test(stripAnsi(text));
}

/**
 * The hosts the output names as unreachable, best answer first.
 *
 * The per-line gate is the whole trick: a deploy log is full of URLs - the
 * Inspect link, the deployment itself - and harvesting them would name a
 * perfectly healthy host every time. Only lines that are themselves a transport
 * failure are read, so what comes back is what the failure was about.
 *
 * @param {string} [text]
 * @returns {string[]}
 */
export function hostsInOutput(text = '') {
  /** @type {string[]} */
  const found = [];
  const add = (/** @type {string} */ raw) => {
    const host = raw.replace(/[.,;:)\]]+$/, '').replace(/:\d+$/, '');
    if (!host || (!host.includes('.') && host !== 'localhost')) return;
    if (!found.includes(host)) found.push(host);
  };
  for (const line of stripAnsi(text).split('\n')) {
    if (!NETWORK_MARKERS.test(line)) continue;
    // `getaddrinfo ENOTFOUND host`, `connect ECONNREFUSED 127.0.0.1:3128`.
    for (const match of line.matchAll(
      /\b(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH)\s+([A-Za-z0-9._-]+(?::\d+)?)/g,
    )) {
      add(match[1]);
    }
    for (const match of line.matchAll(/https?:\/\/([A-Za-z0-9._-]+)/g)) add(match[1]);
  }
  return found;
}

/**
 * The stop message for a failure that was the network: the reason first, the
 * evidence after it.
 *
 * Three branches, in the order the evidence can be trusted. A host the output
 * itself named is the answer whenever there is one. Failing that, a host this
 * machine could not reach either. Failing both, the honest line: these answered,
 * so it was something else - which must never be dressed up as an accusation
 * against a host that replied.
 *
 * @param {{ what?: string, named?: string[], unreachable?: string[], checked?: string[], proxy?: string }} [failure]
 * @returns {string[]}
 */
export function networkFailureLines({
  what = 'The deployment',
  named = [],
  unreachable = [],
  checked = [],
  proxy,
} = {}) {
  const list = (/** @type {string[]} */ hosts) => hosts.join(', ');
  const lines = [];
  if (named.length > 0) {
    lines.push(`${what} could not reach ${list(named)}.`);
    lines.push(`Allow ${list(named)} from this machine, then run this again.`);
    if (proxy) lines.push(`Requests went through ${proxy} — check that it allows ${list(named)}.`);
    return lines;
  }
  lines.push(`${what} failed on the network, not on the build.`);
  if (unreachable.length > 0) {
    lines.push(
      `${list(unreachable)} did not answer from this machine, and a deploy needs ${unreachable.length === 1 ? 'it' : 'them'}.`,
    );
    if (proxy) lines.push(`Requests went through ${proxy} — check that it allows ${list(unreachable)}.`);
    return lines;
  }
  if (checked.length > 0) {
    lines.push(
      `${list(checked)} answered from this machine, so the host it could not reach is ${checked.length === 1 ? 'not that one' : 'none of those'}.`,
    );
  }
  if (proxy) lines.push(`Requests went through ${proxy} — its own log names the host it refused.`);
  return lines;
}

/**
 * Five seconds, every host at once.
 *
 * This only ever runs after something has already failed, and a report on a
 * failure that itself takes a minute is just a second wait.
 */
const PROBE_TIMEOUT_MS = 5_000;

/**
 * Which of these hosts did not answer from this machine.
 *
 * ANY answer counts, status included: api.vercel.com turns down an
 * unauthenticated request, and a 403 is proof the packets arrived. Only a
 * request that throws is a host that could not be reached, so `res.status` is
 * never read - reading it would report a working network as a blocked one.
 *
 * @param {string[]} hosts
 * @returns {Promise<string[]>}
 */
export async function unreachableHosts(hosts) {
  const verdicts = await Promise.all(
    hosts.map(async (host) => {
      try {
        await outboundFetch(`https://${host}/`, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        return undefined;
      } catch {
        return host;
      }
    }),
  );
  // filter(Boolean) does not narrow `string | undefined` on its own.
  return /** @type {string[]} */ (verdicts.filter(Boolean));
}

/**
 * Stop, naming the host.
 *
 * `fetch failed` on its own names nothing: Node keeps the host in the error's
 * cause and the CLI prints only the message, so by the time it reaches this
 * script the one fact worth having is gone. It is recovered in two ways - what
 * the output already said, and, only when it said nothing, by asking the hosts
 * a deploy needs whether they answer at all.
 *
 * The verdict is not up for revision here: whatever failed has already failed.
 * This writes the message and nothing else.
 *
 * @param {string} output
 * @param {string[]} hosts
 * @param {string} [what]
 * @returns {Promise<never>}
 */
export async function failNetwork(output, hosts, what) {
  const named = hostsInOutput(output);
  const unreachable = named.length > 0 ? [] : await unreachableHosts(hosts);
  const lines = networkFailureLines({ what, named, unreachable, checked: hosts, proxy: describeProxy() });
  fail(lines[0], lines.slice(1).join('\n  '));
}
