# Embedding Chatfuel modules into a host project

The wizard copied a self-contained footprint into `src/chatfuel/` of the host
project and installed the skills. Nothing in the host is wired yet — this
playbook walks you (the agent) through every step. Per-module specifics live
in each module's own `playbooks/embed.md` (sibling skill dirs).

## What the wizard copied

```
src/chatfuel/
├── modules/types.ts              # the module contract (ModuleAppProps)
├── modules/<id>/…                # each selected module's source
├── vendor/ui/…                   # design system (Tailwind v4 tokens + components)
├── vendor/api/…                  # typed GraphQL client + generated documents
├── vendor/chatfuel-proxy/…       # the proxy, one file per concern; core.ts assembles them
└── client.ts                     # createAppClient() — proxy-mode ModuleClient
```

Everything is vendored (shadcn philosophy): the host owns every line; edit
freely. Module code imports only `react`, `~ui`, `~api` and its own files.

## 1. Dependencies

The wizard printed the exact command. Base set: `graphql`, `graphql-ws`,
`@graphql-typed-document-node/core` (runtime); `ws`, `@types/ws`,
`tailwindcss`, `@tailwindcss/vite` (dev, Vite hosts). A module may add its own,
in which case its playbook says so — today none do. The host must already have
`react` + `react-dom`.

## 2. The `~ui` / `~api` aliases

TypeScript (host TypeScript config — the one that includes `src`; fresh Vite
templates split configs, so that is the app-side tsconfig):

```jsonc
{
  "compilerOptions": {
    "paths": {
      "~ui": ["./src/chatfuel/vendor/ui/index.ts"],
      "~ui/*": ["./src/chatfuel/vendor/ui/*"],
      "~api": ["./src/chatfuel/vendor/api/index.ts"],
      "~api/*": ["./src/chatfuel/vendor/api/*"]
    }
  }
}
```

(`paths` resolve relative to the config file — do NOT add `baseUrl`; recent
TypeScript deprecates it and fresh Vite templates error on it.)

Verified host-template frictions (fresh `npm create vite` react-ts, 2026):
- `erasableSyntaxOnly` is on and rejects the generated `enum`s in
  `vendor/api/generated/` — set it to `false` in both split configs.
- The node-side tsconfig type-checks `vite.config.ts`; the vendored proxy
  uses fetch types, so add `"DOM"` to that config's `lib`.
- `module: "nodenext"` there means the proxy import in `vite.config.ts`
  needs the explicit extension: `./src/chatfuel/vendor/chatfuel-proxy/vite.ts`
  (`allowImportingTsExtensions` is already on in these templates).

Vite (`vite.config.ts`):

```ts
import path from 'node:path';

resolve: {
  alias: [
    { find: /^~ui$/, replacement: path.resolve('src/chatfuel/vendor/ui/index.ts') },
    { find: /^~ui\//, replacement: `${path.resolve('src/chatfuel/vendor/ui')}/` },
    { find: /^~api$/, replacement: path.resolve('src/chatfuel/vendor/api/index.ts') },
    { find: /^~api\//, replacement: `${path.resolve('src/chatfuel/vendor/api')}/` },
  ],
},
```

Next.js: the TypeScript "paths" above are enough (webpack/turbopack honor
them). If the host already uses `~ui`/`~api` for something else, rename the
aliases — they are plain strings in the copied sources (`grep -rl '~ui\|~api'
src/chatfuel` and sed both the sources and the config to e.g. `~cfui`).

## 3. Styles (Tailwind v4)

The components use Tailwind v4 utility classes plus the design tokens in
`src/chatfuel/vendor/ui/styles/tokens.css`. In the host's global CSS:

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/geist-mono";
@import "@fontsource-variable/manrope";
@import "./chatfuel/vendor/ui/styles/tokens.css";
@source "./chatfuel";
```

(`@source` makes Tailwind scan the copied sources for class names — adjust
the relative paths to where the host's CSS entry lives.)

The three font imports are the faces `tokens.css` names in `--font-sans` and
`--font-display`; drop them and the embedded UI silently falls back to the
host's system stack. They are npm packages, self-hosted, no third-party origin.

There is a fourth file, `vendor/ui/styles/base.css`, and it is deliberately NOT
in the block above. It paints `<body>`, restyles every `h1`–`h6` on the page to
the display face, and claims `::selection` and every scrollbar — right for a
standalone app, and a takeover of somebody else's. Import it only if the host
wants the Chatfuel look for the whole document.

- Host on Tailwind v4 already: just add the token import + `@source`.
- Host on Tailwind v3: v3 cannot read v4 `@theme` tokens. Either upgrade the
  host to v4, or isolate: build a small standalone CSS for the Chatfuel tree
  with the v4 CLI and scope it. Say so honestly to the user before picking.
- No Tailwind: add `@tailwindcss/vite` (or the PostCSS plugin for non-Vite)
  and create a CSS entry with the three lines above.

### Theming inside someone else's app

Three things to decide with the user rather than assume:

1. **Who owns the theme attribute.** By default the dark palette applies on
   `[data-theme='dark']` anywhere — deliberately not `:root`-prefixed — so the
   host can stamp the attribute on the wrapper element that holds the Chatfuel
   tree instead of on `<html>`. `useTheme({ target })` takes that element.
   Pass `persist: false` if the host already owns the user's theme preference
   and localStorage would fight it.
2. **`color-scheme` is not optional.** The `[data-theme='light']` /
   `[data-theme='dark']` blocks set it, and without them native `<select>`
   popups, scrollbars and autofill stay light inside a dark UI. If the host
   scopes the attribute to a wrapper, `color-scheme` scopes with it — which is
   usually what you want.
3. **Do not mount `ThemeToggle` unless the host asked for it.** Two theme
   switchers on one page is a bug. Reading the host's preference and calling
   `useTheme().setPreference` is normally the right integration.

The tokens file must stay a single self-contained import — everything the
components need is in it, and the wizard rewrites that one line. Restyling is
editing token values in place, not layering overrides on top.

## 4. The proxy (token never reaches the browser)

All module traffic goes to same-origin `/chatfuel/graphql` (GraphQL HTTP +
WS) and `/chatfuel/api/*` (REST uploads). `CHATFUEL_TOKEN` lives in `.env`
and must be injected server-side.

- **Vite:** register the vendored plugin —
  ```ts
  import { chatfuelProxy } from './src/chatfuel/vendor/chatfuel-proxy/vite';
  // in plugins: [...]
  chatfuelProxy(),
  ```
  It reads CHATFUEL_TOKEN / CHATFUEL_API_BASE from the env and relays
  WebSockets with its own connection_init. `vite.ts` is the only file in that
  directory importing `vite`; everything else is plain node — `core.ts`
  assembles the proxy from the per-concern files beside it and is what the
  production server (`server.ts`, `createChatfuelServer({ distDir })`) and the
  Vercel function mount too.
- **The REST route is an allowlist:** the five `/filestorage/upload/*`
  endpoints (`references/files-tasks.md`) and nothing else under `/api` —
  anything else answers `403 RestPathNotAllowed`. Uploads are the only REST
  surface this app has; everything else is a GraphQL operation. If a module
  genuinely needs another endpoint, add it to `REST_ALLOWED_PATHS` in the
  vendored `passthrough.ts` and decide there what fences it. On the four
  bot-scoped paths `?botID=` is required — it is the only thing the fence can
  read, so an upload without it answers `400 InvalidRequest` — the method must
  be `POST`, and `useraccount` is refused `403 AccountOperationBlocked` with the
  gate on, because it writes to the Chatfuel account rather than to a bot.
- **The bot fence:** by default the proxy asks Chatfuel which bots the token's
  account owns (every workspace, cached for a minute) and refuses a request
  naming anything else. Pass `allowedBotIds: [...]` to freeze the list instead,
  or `'any'` to turn the check off — for a host that does its own fencing.
- **The auth gate:** if the host sets `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (the `auth` module's env — two names, not three;
  there is no tenant-id setting), the proxy requires the caller's Supabase
  session on every request. Tenant membership is not a config value — the gate
  calls `cf_my_bot_ids` with the caller's own JWT and fences each request
  against the bot ids that session owns, one per Supabase project. Neither var
  set = open mode; one without the other = every request fails closed with
  `ProxyAuthMisconfigured`. Whatever host stack you wire, the browser's
  `Authorization` must never be forwarded upstream.
- **Next.js:** add an HTTP route handler that forwards
  `/chatfuel/graphql` and `/chatfuel/api/*` to `${CHATFUEL_API_BASE}` with
  `Authorization: Bearer ${process.env.CHATFUEL_TOKEN}`. Route handlers
  cannot relay WebSockets — modules that subscribe (livechat, coworker,
  deals, bookings) need the sidecar relay described in
  `references/cors-proxy.md` (shape A). Be honest about this limitation.
- **Anything else:** implement shape A from this skill's `references/cors-proxy.md`.

## 5. Mounting a module

Every module exports one entry component taking `ModuleAppProps`
(`src/chatfuel/modules/types.ts`): `botId`, `client`, `params`, `setParams`,
`view`, `setView` and `navigate`. `view` is the module's own surface (`''` is
its default one) and `navigate` is how it asks to go somewhere else — in an
embed, that is your router's job.

Minimal mount (no deep-link routing):

```tsx
import { useMemo, useState } from 'react';
import { createAppClient } from './chatfuel/client';
import { LivechatApp } from './chatfuel/modules/livechat/LivechatApp';

export function ChatfuelPanel() {
  const client = useMemo(() => createAppClient(), []);
  const [params, setParams] = useState(new URLSearchParams());
  const [view, setView] = useState('');
  return (
    <LivechatApp
      botId={botId /* whichever bot the host app is showing */}
      client={client}
      params={params}
      setParams={setParams}
      view={view}
      setView={(next, nextParams) => {
        setView(next);
        if (nextParams) setParams(nextParams);
      }}
      /* One module and no router of your own: a link into another module has
         nowhere to go. Point this at your router in the variant below. */
      navigate={() => undefined}
    />
  );
}
```

Router-integrated variant: back `params`/`setParams` with the host router's
search params, `view`/`setView` with a segment of your own route, and `navigate`
with your router's own push, so module deep links (e.g. livechat's
`?c=<conversation>`) become shareable URLs. The
exact entry component name and its deep-link params are in each module's
`playbooks/embed.md`.

Next.js note: the modules are client components — mount behind
`'use client'`, and replace `import.meta.env.*` reads with the host's public
env convention (`NEXT_PUBLIC_…`) where you wire `botId`.

## 6. Verify

1. Dev server starts with no missing-module errors (aliases OK).
2. The mounted module renders styled (tokens OK), not unstyled HTML.
3. Network tab: requests go to `/chatfuel/graphql` and get 200s (proxy OK);
   the token appears in NO request the browser makes.
4. For subscription modules: live updates arrive (WS relay OK).
