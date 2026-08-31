# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and the mounting
pattern all live there. This file only adds what is specific to this module.

- Entry component: `<AuthGate />` from `src/chatfuel/modules/auth/`. Wrap the mounted Chatfuel
  modules with it; it renders the auth screens when signed out, a "setting up" state while the
  account's bot is being created, and its children once the workspace is there. It needs
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host env, `SUPABASE_SERVICE_ROLE_KEY`
  and `CHATFUEL_WORKSPACE_ID` on the server, and `@supabase/supabase-js` installed. Its props are `adapter`, `sessionLost`,
  `route`, `navigate`, `appName`, `appLogo` and `onWorkspace` — the last one is how the host learns
  which bot id to render the modules with. `appLogo` is a URL the HOST resolves: a name is a
  string, but a mark is a location, and only the host knows where it keeps its assets. Leave it
  out and the sign-in screen draws a shield glyph instead.
- The host's Chatfuel client must send the Supabase access token to the proxy
  (`token: () => adapter.getAccessToken()` on `createChatfuelClient`) and the vendored proxy
  (`src/chatfuel/vendor/chatfuel-proxy/`) must run with the same env vars — otherwise the gate
  answers 401 for everything.
- Routes are real paths (`/sign-in`, `/sign-up`, `/invite/<token>`, `/team` …); with your own
  router, mount the screens from `src/chatfuel/modules/auth/screens/` on equivalent paths and pass a
  `navigate` that writes your URLs. Keep the PKCE `?code=` callback reachable at the app root.
- **`/sign-up` must stay reachable, and it is a real front door.** Sign-up is open, and it ends
  with the server creating a Chatfuel bot for that account (`adapter.provisionWorkspace()`, called
  by the screen right after GoTrue accepts it). If the host already has its own sign-up, do not
  wire it to this one — call `adapter.provisionWorkspace()` once after the host's own session
  exists, and hide these screens instead.
- **The bot id comes from the session, not from your env.** Whatever the host renders the modules
  with must be the `botId` `onWorkspace` reports; a hard-coded one will be refused by the gate.
- The host's server must expose the vendored proxy's `/chatfuel/auth/provision` route — that is
  where the bot is created. It exists only when `SUPABASE_SERVICE_ROLE_KEY` is set, and it needs
  `CHATFUEL_WORKSPACE_ID` (the Chatfuel workspace the bots are billed to) to do anything.
- Apply the SQL before first sign-in (or let the wizard's access-token path do it): the wizard put
  `supabase/chatfuel/migrations/0001_chatfuel_auth.sql` in your project, with a README beside it.
  It is idempotent.
