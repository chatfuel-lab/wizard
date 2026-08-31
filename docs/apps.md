# Apps

`npx @chatfuel/wizard --app <slug>` scaffolds a **preset app** from the apps catalog — a
micro-SaaS built on the standard shell instead of a blank one. The catalog is a separate git
repository (`chatfuel-apps`); the wizard shallow-clones it at run time, so a new app or a fixed
playbook reaches users without a wizard release.

That last property has a price, and it is worth stating rather than discovering. Module content
also comes from a branch — but it comes with digests. The run resolves one commit, reads that
commit's `content.index.json`, and stops on any byte that does not match; the commit is named in
the app's own lock, so the same run can be repeated later, file for file. **The catalog has none
of that.** A preset is whatever the catalog's branch points at when your run clones it, with
nothing to check it against and no commit written down afterwards, so two people on the same
wizard version, on the same day, can be handed different preset code. Pin the ref yourself with
`--apps-ref <tag>` when you need a run you can repeat.

## What an app is

Four things on top of a normal wizard run, all declared in the app's `app.json`:

1. **A module preset.** The app names its wizard modules; the picker is skipped and the run is
   prompt-free from the first command, which is what a catalog page's copy-paste command
   promises.
2. **A brand.** Name and logo, applied exactly the way `--app-name`/`--logo` are — and those
   two flags still win over the preset when the person passes them.
3. **An overlay.** A file tree copied over the scaffold after every template transform has run.
   The overlay wins over template files, and every replaced path is printed.
4. **A playbook.** The app's build plan, inserted ABOVE the module guides in the finish-setup
   checklist the coding agent receives. The agent builds the product by following it. It goes in
   verbatim — it is markdown on purpose — but inside a marked fence naming the repository and
   commit it came from, so a reader of the checklist can tell the wizard's own words from a
   document that was pasted into it. A line in the playbook shaped like that marker is broken so
   it cannot close the fence.

An app may also add `.env` declarations (`name`/`default`/`optional` only) and
`npmDependencies` merged into the scaffold's `package.json`.

## The trust model

The overlay writes into a directory a user will run `npm install` and a coding agent inside,
so the boundary is enforced at scaffold time (`packages/wizard/src/scaffold/appOverlay.ts`),
not just by the catalog's CI:

- No symlinks; nothing may resolve outside the scaffold directory.
- Wizard-owned files are refused outright (`OVERLAY_DENY`): `package.json`, `.env*`,
  `index.html`, `tsconfig.json`, `server/entry.ts`, `api/chatfuel.ts`, `src/index.css`,
  `src/modules/index.ts`, `src/modules/navGroups.tsx`, and the build's own configuration in
  every spelling vite resolves — `vite.config.ts`, `vite.config.js`, `vite.config.mjs`,
  `vite.server.config.ts`. Changes to those belong in the playbook, where the user's own agent
  applies them in the open.
- So are the package manager's own instructions — `.npmrc`, `.yarnrc`, `.yarnrc.yml`,
  `.pnpmfile.cjs`, `pnpm-workspace.yaml`, `.node-version`, `.nvmrc` and anything under
  `patches/`. The install runs in this directory moments later, and `.pnpmfile.cjs` is
  JavaScript pnpm calls while resolving dependencies, so it runs even with no install scripts.
- And so are the lockfiles (`package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`,
  `yarn.lock`, `bun.lockb`) and the scripts `package.json` runs (`scripts/deploy-vercel.mjs`,
  `scripts/connect-git.mjs`, `scripts/codegen.mjs`) together with everything under
  `scripts/deploy/`. A lockfile decides which bytes the install resolves to whatever the ranges
  say; an app preset may name a version of a package, not where the package comes from. The
  directory is denied with the two scripts because it is what they are: `deploy-vercel.mjs` and
  `connect-git.mjs` are entry points over one library, and an overlay that landed its own
  `scripts/deploy/runners.mjs` would choose what the deploy spawns with the token already in
  `.env`.
- Names are compared case-insensitively: macOS and Windows would otherwise let `.NPMRC` land
  on `.npmrc`.
- An app's env declarations come last in `collectEnv`, and first declaration wins — an app can
  add variables but can never redefine `CHATFUEL_TOKEN` or anything a module declared. The
  schema also refuses `secret` and `resolve` on app env entries, so an app cannot hook wizard
  steps.
- The run prints the app's provenance (`repo @ sha`) and the handoff records it.

## Fetching and auth

Full shallow clone (`git clone --depth 1`), 120-second timeout, `GIT_TERMINAL_PROMPT=0` so a
non-interactive run fails instead of hanging. A catalog that needs no credentials is cloned
with none. For one that does, ambient git credentials (gh's helper, an SSH agent) are the
normal path; for https URLs a `GITHUB_TOKEN`/`GH_TOKEN` env var is retried once, injected
through git config in the environment — never on the command line.

## Authoring an app

Lives in the catalog repo's own README: the directory contract, the validator
(`npm run validate` — the same deny list as the wizard, plus schema and size checks), and the
rule of thumb — preset data in the overlay, behavior in the playbook.
