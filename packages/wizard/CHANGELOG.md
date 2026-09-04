# Changelog

## 0.3.0 — 2026-09-04

### Changed

- **The package no longer carries the content trees.** The shell, the modules and
  the design system used to be copied into the tarball at pack time; now the
  package ships `content.lock` — the repository, a commit and a sha256 per file —
  plus the module manifests the picker needs to draw its list, and fetches the
  trees themselves at run time into a cache named after the commit it installs
  from. The install is a few hundred kilobytes instead of tens of megabytes, a
  second run reuses the cache, and every byte is checked against its digest
  before it is written.

- **The content follows `main`, and the commit in the package is a floor.** A run
  asks the repository what the branch points at now and installs from there, so a
  fix to a module reaches people on their next `npx` rather than on the next
  release; `update` moves an existing app the same way. A resolution the packaged
  commit does not lead to is refused rather than installed — a branch that was
  reset or force-pushed says so — and everything else that can go wrong (offline,
  rate-limited, a proxy in the way) falls back to the packaged commit, which is a
  working install. `CHATFUEL_CONTENT_REF` takes a full sha to pin a run to one
  commit, or a branch name to follow a different one. An app made by 0.2.0 or
  0.1.0 follows nothing — it holds the files it was handed. This is the first
  version whose apps get a fix as it lands, so it is the one to start from.

- **The wizard loads its own code lazily.** `bin.ts` resolves the argument parser,
  the run and the subcommands through dynamic `import()`, so `--help`, `--version`
  and a bad flag answer without paying for the whole program. `doctor` and
  `update` no longer pull the scaffold in at all.

- **Fewer moving parts around the scaffold.** The skill layout, the agent handoff
  and the env writing each had their own idea of where the app root was and when
  a write was allowed; they now share one context and one set of path rules, and
  every write goes through the same containment check (no symlink, nothing that
  resolves outside the app directory).

### Added

- **A `channels` module: connect WhatsApp, Instagram and TikTok from the app.**
  Connecting an account is a hand-off, not a link to copy around: the app mints a
  one-shot link, sends the person to Chatfuel's connect page with both redirects
  pointing back at `/channels`, and says how it went when they land. The same
  screen re-grants permissions on an account already connected, and disconnects a
  contact scope. The platform links and the operations behind them live in
  `core`, so every scaffold has them; `channels` is the screen over them, in a
  new `settings` navigation group.

- **`update` moves an app the wizard made onto newer content.** It overwrites
  what is still the wizard's, leaves what you edited alone, and names every file
  it could not decide for you rather than guessing at it. It adds no file the app
  has never had — the lock maps the app's files to their origins, not the trees
  they were copied from — and it does not run the code generator, because most
  apps do not have that toolchain installed and a build nobody asked for is not
  an update. `update --dry-run --json` is the plan an agent reads, and
  `--resolved <paths>` records a conflict as settled so the next run stops asking.

- **An admin panel for the account behind the token.** It lists every workspace
  and bot `CHATFUEL_TOKEN` can reach, creates, renames and deletes them, and
  reports whether the token still works. It opens at `/admin` behind
  `ADMIN_PASSWORD` and never appears in the app's own navigation: the person who
  runs the deployment is not the person the app is for.

- **The new app goes to GitHub, and a push becomes a deploy.** After the deploy
  the wizard offers to create the repository, commit and push — private by
  default. It reads the staged index back before it does and stops if a `.env`, a
  key file or a token is in it. `npm run connect-git` wires that repository to
  the Vercel project, so from then on `git push` is the deploy; the wizard offers
  to run it right after the push when a Vercel project already exists.

- **A typed GraphQL client, generated in the app.** The scaffold carries the schema
  and one operation document per module under `src/vendor/`, and `npm run codegen`
  turns them into typed hooks under `src/vendor/api/generated/`. The generator is
  265 packages the app does not otherwise need, so it is not a dependency: the
  first run prints the exact install line and stops. `update` reports when it has
  moved an input and names the command that closes the gap, and the update skill
  walks an agent through it.

- **`--plan` prints the run and writes none of it.** This is what `--dry-run` had
  quietly grown into: a flag that walks every prompt and every read-only call and
  then leaves the disk untouched — no scaffold directory, no file copied into an
  embed host, no `.gitignore` or `.env` line, no lock file, no skills. It implies
  `--dry-run`, so nothing is created in your Chatfuel or Supabase account either.

- **`--app <slug>` scaffolds a preset app from the catalog.** An app is an overlay
  over the standard shell — a module set, a brand, extra source files, and an agent
  playbook — declared in a separate catalog repository
  ([chatfuel-lab/chatfuel-apps](https://github.com/chatfuel-lab/chatfuel-apps))
  the wizard shallow-clones at run time. The run is prompt-free from the first
  command; the playbook lands above the module guides in the finish-setup
  checklist, with `repo @ sha` provenance. `--apps-repo` / `--apps-ref` (and
  `CHATFUEL_APPS_REPO`) override the catalog source. Overlays cannot touch
  wizard-owned files, contain symlinks, or escape the scaffold directory, and an
  app's env declarations can add variables but never redefine a module's.

- **Codex CLI is a first-class agent.** The wizard already installed and launched
  either CLI; now it writes the app for the one that is going to open it. Codex
  gets its skills in `.agents/skills/`, an `AGENTS.md` that names each `SKILL.md`
  by path, and the setup checklist as a skill of its own — `$chatfuel-finish-setup`
  re-runs the guided finish in any later session. Claude Code keeps
  `.claude/skills/`, `CLAUDE.md` and `/chatfuel:finish-setup`. Neither CLI reads
  the other's directory, so this is the difference between skills that load and
  skills that sit there.

- **`--agent <claude|codex>`** picks the agent without prompting, and a run that
  finds both CLIs on PATH now asks which one to write for instead of assuming.

- **A ceiling on how many bots may be created.** Every bot a caller reserves is a
  bot the deployment's master token creates in Chatfuel, on the deployment's plan,
  so `cf_new_bot` refuses past two limits: one for the whole deployment and one
  per workspace. `supabase/migrations/0001_chatfuel_auth.sql` carries them as
  `cf_bot_total_cap()` and `cf_bot_cap()`, one line each to re-run with a different
  number, and `CHATFUEL_BOT_TOTAL_CAP` / `CHATFUEL_BOT_CAP` set them at install
  time. The admin panel's own creation is deliberately uncapped.

- **One migration per module.** `supabase/migrations/` now holds a single file
  for each of `auth`, `publishing` and `admin` — the schema as a fresh project
  wants it, still idempotent and still safe to re-run on a project that already
  has it. Your own changes go in a `0002_….sql` of your own, as before.

### Fixed

- **The admin routes cap the request body at 64 KiB** (`413 AdminBodyTooLarge`).
  `POST <adminPath>/session` is read before any credential is checked, so the
  cap has to sit in front of the credential rather than behind it.

- **`--dry-run` writes the app again.** It is documented as "stop before creating
  any account assets" and had come to mean "write nothing at all", which left no
  way to ask for a scaffold without a bot. The two meanings are now two flags:
  `--dry-run` keeps the account side, `--plan` keeps the disk.

- **`npm install` failed in every app the wizard writes.** vitest 4's optional
  peer `@vitest/browser-playwright` began resolving to 5.0.0, whose own peer
  points back at vitest 5, and npm's resolver died on the cycle — `Cannot read
  properties of null (reading 'edgesOut')`. The scaffold runs vitest 5 now.

- **An install could take four minutes instead of five seconds.** `npm audit`
  and `npm fund` are POSTs, and a network that lets only GETs through hangs them
  rather than failing them. Every install the wizard runs passes `--no-audit
  --no-fund`, and so does the command it prints when an install fails.

- **A deploy that stops can be tried again.** It repeats the reason it stopped
  for and offers Try again or Skip for now, and a skipped one is remembered —
  the closing summary and the agent handoff both say it was tried and stopped,
  rather than leaving it looking like it was never reached.

- **A deploy died with `command not found` and blamed the sign-in.**
  `npx --package=` exports its own configuration to every child process, so the
  Vercel CLI the wizard had just installed was resolved against the wrong
  package. Those two variables are dropped before any nested command is called.

- **An account with no bot it could open held an empty state for ever.** Signing
  in now provisions the bot that was never created, two concurrent sign-ups make
  one bot rather than two, and a refusal says which limit it hit.

- **An outside security pass over the request proxy, the auth gate and what a
  deployed app exposes to the network.** What it found is fixed and what it
  confirmed is written down beside the code it is about; the body ceiling on the
  admin routes above is one of its results.

## 0.2.0 — 2026-08-21

### Breaking

- **The wizard asks for a workspace, not a bot.** The app lists the workspace's
  bots itself and lets you switch between them, so a bot you create next month is
  in the picker without another run. An app scaffolded by 0.1.0 was pinned to the
  one bot id you chose at setup; re-run the wizard to move it onto a workspace.

- **The scaffolded app has real URLs.** `/livechat`, not `#/livechat`. The dev
  server, `npm start`, the `Dockerfile` and Vercel all serve the app on a deep
  path, and a link somebody saved from the old address is moved to the new one
  the first time it is opened.

- **`auth`: an account is no longer one bot.** Signing up still gets you a bot,
  and now you can create more of them — as many as the workspace's plan allows —
  with access granted per bot: owners and admins reach every bot in the account,
  a member reaches the ones they were granted. Deleting the last bot in the
  workspace is refused, because Chatfuel deletes a workspace along with it.

  A project created by 0.1.0 holds its bot on `cf_tenants.bot_id`, which this
  release moved into `cf_bots`. The shipped migration is the new shape only, so
  such a project needs the row moved by hand before it is re-run — see
  `supabase/README.md`.

### Added

- The wizard puts the workspace on a plan before it writes anything. A workspace
  with no subscription has no AI, so the app that comes out of a run without one
  looks broken for a reason that has nothing to do with the code. It offers the
  trial where there is one to offer, plain checkout where there is not, and the
  promo code either way.
- `--supabase-create <name>` creates the Supabase project the `auth` module
  needs, or reuses the one already called that — so a second run of the same
  command leaves you with one project, not two. With `--supabase-org` and
  `--supabase-region` beside it, `--yes` now covers a whole install of the `auth`
  module with no terminal to answer it.
- `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` are honoured by the wizard and by
  the app it writes, the WebSocket relay included.
- Modules are picked with **enter**; **Continue** ends the step.

### Fixed

- A successful Vercel deploy was reported as a failure. The Vercel CLI prints the
  deployment URL to stderr, and prints JSON to stdout when it decides it is
  talking to an agent — `npm run deploy` now reads both.
- Installing a subset of the modules wrote a navigation table naming modules that
  were not installed, and the app it produced failed its own test suite.
- A workspace whose trial the server refuses ended the whole run. A trial
  belongs to the account, not to the workspace, so this is what every workspace
  after the first answers — the wizard now falls back to the plain checkout,
  promo code included, instead of stopping.
- `--dry-run` opened a Stripe checkout session on the workspace — the one thing
  it promises not to do. It reports what it would have started instead.
- The AI handover summary is rendered as Markdown in both places that show it.
- The auto-close delay is said in words — "2 hours", not "2:00:00".
- A run that answers no questions no longer stops on one. With `--yes`, or with
  nothing attached to the terminal, a missing or rejected `CHATFUEL_TOKEN` used
  to reach for a prompt nobody could answer: the process ended on end-of-input,
  reported success, and left no app behind. It now says which of the two went
  wrong and stops.
- Three places sent you to the wrong address for your bots and your plan — the
  dashboard lives at `panel.chatfuel.com`.

## 0.1.0 — 2026-08-19

First public release. `npx @chatfuel/wizard` scaffolds a Vite + React +
TypeScript app wired to your Chatfuel bot, installs its dependencies, vendors the
design system and the API client as sources you own, writes the agent skills for
every module you picked, and offers to deploy the result to Vercel.
