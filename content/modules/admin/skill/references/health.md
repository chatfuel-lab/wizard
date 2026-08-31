# The health page

What this deployment can and cannot do right now, asked when the tab is opened
rather than on every load — the token check is a real round trip to Chatfuel and
the other tabs have no use for it.

| Reported | Where it comes from |
|---|---|
| Chatfuel token | present, and whether a live `currentUser` query was accepted |
| Account | the name and email the token answers with |
| Bot fence | which fence is in force, and how many bots it currently holds |
| Sign-in | the proxy's auth mode: on, off, or misconfigured |
| Database | configured, has a service-role key, and answered a ping |
| Publish queue | whether its routes are mounted |
| Chatfuel API, token variable, home workspace, outbound | the resolved configuration, names only |
| Problems | the proxy's own list of configuration problems, by code |

## The rule

**A secret is a yes or a no, and never a value.** The panel exists so an
operator does not have to open `.env` over SSH to find out whether the token
still works — not so they can read it out of a browser, which would make one
screen as sensitive as the file. `CHATFUEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`
and `ADMIN_PASSWORD` are reported as present or absent and nothing more.

The variable's NAME is on screen, because an operator fixing a deployment needs
to know which name to set.

## The database ping

`cf_admin_ping` reads no rows on purpose. A reachability probe that depends on
the shape of the schema reports a migration problem as an outage, and the two
need different fixes.
