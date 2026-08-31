# Embedding the admin panel

Mounting `AdminApp` inside a host app. Read `../chatfuel-core/playbooks/embed.md`
first — the proxy, the aliases and the container rules are shared. What follows
is what this module needs on top.

## The proxy prefix

Every call the panel makes goes through `client.proxyFetch` to `/chatfuel/admin/…`.
The host's client decides what that prefix resolves to, so a host mounting the
proxy elsewhere needs nothing changed here — but a host with **no** proxy leaves
`proxyFetch` undefined, and the panel says there is nothing to ask rather than
guessing a URL.

## The cookie

The session cookie is set with `Path=/` and `SameSite=Strict`. Two consequences
for an embed:

- the host must be same-origin with the proxy. A panel on one domain and a proxy
  on another never sees the cookie.
- an embed inside a cross-site iframe never sees it either. That is the intended
  behaviour: the panel administers the whole account.

## What an embed cannot offer

`selectBot` comes from the shell. Without it the panel drops the "Open" action
rather than pretending to move a host app it does not own — the same rule every
module in this project follows about the address bar.

## The rail

`railHidden` is this shell's concept, and this shell honours it by never listing
the panel. A host with its own navigation makes its own call — but the reason
holds wherever the panel is mounted: it administers the whole account, and the
list of places a product's users go is not where that belongs.
