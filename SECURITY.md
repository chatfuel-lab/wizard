# Security

## Supported versions

Only the latest 0.x release of `@chatfuel/wizard` receives security fixes.

## Reporting a vulnerability

Report privately through GitHub's private vulnerability reporting on this repository:
Security tab → "Report a vulnerability". Never open a public issue for a vulnerability.

If that tab is not there, private reporting has not been turned on yet — email
**security@chatfuel.com** instead, with `chatfuel-wizard` in the subject. One of the two
always works; a vulnerability should never be held back for want of a channel, and it should
never be filed in public for want of one either.

Do not include a real Chatfuel token or Supabase key in a report. Anything shaped like a
credential will be treated as compromised — rotate it first.

## Scope

The proxy is the token boundary. The Chatfuel API token and the Supabase service-role key
live server-side only: they must never reach the browser bundle, a client-visible response,
or a log line. The auth gate must fail closed — a partial or broken configuration refuses
requests rather than letting them through.

In scope:

- exposure of the Chatfuel token or a Supabase key anywhere in scaffolded output
- a bypass of the auth gate, over HTTP or the WebSocket relay
- a request naming a bot that neither the auth gate (`gate.ts`) nor the deployment
  fence (`workspaceFence.ts`) vouches for
- path traversal in the production static server (`resolveStaticPath`, `server.ts`)
- an upstream error naming internal infrastructure surviving the proxy's response
  scrubber (`scrubUpstreamErrors`, `queryAnalysis.ts`), over HTTP (`passthrough.ts`) or
  the WebSocket relay (`wsRelay.ts`)
- a credential reaching the CLI's stdout past its log scrubber
  (`packages/wizard/src/log.ts`)

The proxy scrubs responses, not logs; the log scrubber is the CLI's. One route logs a
secret on purpose: with `AUTH_RECOVERY_LINK_LOG` set (`proxyConfig.ts`), the recovery
route (`recoveryLink.ts`) writes the link
it minted to the server log, because on a deployment with no mail channel that log is the
delivery channel. It is off by default, refuses the route when off, and says so where it
happens. Reports about that trade-off are welcome as design feedback, but it is not a
bug class.

Out of scope:

- a user's own modifications to their scaffolded app
- Chatfuel's hosted API itself
