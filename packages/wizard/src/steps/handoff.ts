import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as p from '@clack/prompts';
import { execa } from 'execa';
import { stepArt } from '../art';
import { moduleDeepLink, shellUrl } from '../constants';
import { collectNpmDependencies, EMBED_DIR } from './embed';
import { inlineText } from '../inlineText';
import { authNextSteps, productionLines, secretEnvNames, trialLines } from './authNotes';
import { ensureAgent } from './agent';
import { amendAppLock } from '../scaffold/appLock';
import { relayoutSkills, skillsRootLabel, skillsSpec, WIZARD_SKILLS } from '../scaffold/skills';
import type { AgentLauncher, AgentSpec } from '../agents';
import type { WizardContext } from '../context';

export function handoffArgs(launcher: AgentLauncher): string[] {
  const { spec } = launcher;
  return spec.id === 'claude'
    ? ['/chatfuel:finish-setup']
    : [`Read ${spec.instructionsFile}, then carry out the setup checklist in ${spec.finishSetupPath}.`];
}

/** How the reader of the instructions file resumes the setup with their agent. */
function resumeLine(ctx: WizardContext, what: string): string {
  const spec = skillsSpec(ctx);
  return spec.resumeInvocation
    ? `- Run ${spec.resumeInvocation} to continue the guided ${what} — the checklist is ${spec.finishSetupPath}.`
    : `- Run /chatfuel:finish-setup to continue the guided ${what}.`;
}

/** The installed skills, named the way this CLI's instructions file needs. */
function skillList(ctx: WizardContext, spec: AgentSpec): string {
  const dir = skillsRootLabel(ctx, spec);
  const named = (installAs: string): string => (spec.listSkillsByPath ? `${dir}/${installAs}/SKILL.md` : installAs);
  const fromModules = ctx.answers.modules
    .filter((id) => id !== 'core')
    .filter((id) => ctx.answers.skillsPresent.includes(ctx.registry.manifests.get(id)!.skill.installAs))
    .map((id) => {
      const m = ctx.registry.manifests.get(id)!;
      return `- ${named(m.skill.installAs)}: ${inlineText(m.description)}`;
    });
  const wizardOwned = WIZARD_SKILLS.filter((skill) => ctx.answers.skillsPresent.includes(skill.name)).map(
    (skill) => `- ${named(skill.name)}: ${skill.description}`,
  );
  return [...fromModules, ...wizardOwned].join('\n');
}

/**
 * A fence around text this file did not write, naming where it came from.
 *
 * Everything else in the instructions is the wizard talking. The playbook and
 * the module guides are whole documents pasted in, and once pasted they read
 * exactly like the paragraphs around them — a heading in a playbook is a
 * heading in CLAUDE.md, and a line in one that begins "Rules:" is a line in
 * CLAUDE.md that begins "Rules:". The markers are for the agent reading this
 * later: this much is a document from somewhere, and here is the somewhere.
 * That is also why the marker carries the source rather than only saying
 * "playbook" — a catalog is chosen by a flag or by CHATFUEL_APPS_REPO, and
 * which one it was is the part a reader cannot otherwise see.
 */
function fenced(what: string, source: string, body: string): string {
  const line = `${what} from ${inlineText(source, 200)}`;
  /* A document carrying a line shaped like the marker would close its own
     fence and go on talking as the wizard. No real playbook or guide needs a
     line of that shape, so the marker is broken where it appears rather than
     the document being refused over it. */
  const inside = body.replace(/^<<<(.*)>>>[ \t]*$/gm, '‹‹‹$1›››');
  return `<<< ${line} — begins >>>\n\n${inside}\n\n<<< ${line} — ends >>>`;
}

/**
 * The app preset's build plan, placed ABOVE the module guides: the playbook is
 * what this scaffold is FOR, the guides are reference. Empty without --app.
 *
 * The playbook is markdown on purpose — it is instructions, and the catalog it
 * comes from is trusted for exactly that (docs/apps.md). `name` and `tagline`
 * are not: they are labels the schema bounds only in length, so they go through
 * inlineText like every other manifest field written into this file.
 */
function appFragment(ctx: WizardContext): string {
  const app = ctx.answers.app;
  if (!app) return '';
  const name = inlineText(app.manifest.name, 80);
  return `\n## The app you are building — ${name}\n
This scaffold is the "${name}" preset (${inlineText(app.manifest.tagline, 160)}).
The playbook below is the build plan — follow it before improvising; the
module guides further down are reference.\n
${fenced('Build plan', `${app.repo} @ ${app.sha.slice(0, 7)}`, app.playbook)}\n`;
}

/** The provenance bullet for the Facts list (empty without --app). */
function appFact(ctx: WizardContext): string {
  const app = ctx.answers.app;
  if (!app) return '';
  return `\n- App preset: ${inlineText(app.manifest.name, 80)} (${app.slug}) fetched from ${app.repo} @ ${app.sha.slice(0, 7)}.`;
}

/**
 * Static per-module markdown (modules/<id>/handoff.md), included verbatim.
 *
 * Fenced like the playbook even though these ship with the wizard: a reader
 * telling the wizard's own words from a pasted document should not first have
 * to work out which documents were trusted enough to paste unmarked.
 */
function moduleFragments(ctx: WizardContext): string {
  const fragments = ctx.answers.modules
    .map((id) => ctx.content.modulePath(id, 'handoff.md'))
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8').trim());
  if (fragments.length === 0) return '';
  return `\n## Module guides\n\n${fenced('Module guides', 'the content bundled with this wizard', fragments.join('\n\n'))}\n`;
}

/**
 * A hidden module (manifest `hidden: true`, mirrored by its shell descriptor
 * and checked by validate.ts) has no rail item and no `/<id>` route, so a
 * deep link to one would be dead — its own handoff fragment names the real
 * routes instead.
 */
const linkableModules = (ctx: WizardContext): string[] =>
  ctx.answers.modules.filter((id) => {
    const m = ctx.registry.manifests.get(id);
    return Boolean(m?.app) && !m?.hidden;
  });

function moduleLines(ctx: WizardContext): string {
  const lines = linkableModules(ctx).map((id) => {
    const m = ctx.registry.manifests.get(id)!;
    return `- ${inlineText(m.name, 80)} — ${moduleDeepLink(id)} — ${inlineText(m.description)}`;
  });
  // A hidden module still belongs in the tour, just without a module route.
  for (const id of ctx.answers.modules.filter((i) => ctx.registry.manifests.get(i)?.hidden)) {
    const m = ctx.registry.manifests.get(id);
    if (m)
      lines.push(
        `- ${inlineText(m.name, 80)} — no rail item; see its module guide below for its routes — ${inlineText(m.description)}`,
      );
  }
  return lines.join('\n');
}

function permissionLines(ctx: WizardContext): string {
  const lines = ctx.answers.modules.flatMap((id) => {
    const m = ctx.registry.manifests.get(id);
    return (m?.permissions ?? []).map(
      (perm) =>
        `- ${inlineText(m!.name, 80)} needs ${inlineText(perm.object, 60)}: ${inlineText(perm.action, 60)}${perm.requiredFor ? ` (${inlineText(perm.requiredFor, 120)})` : ''}`,
    );
  });
  return lines.length > 0 ? lines.join('\n') : '- (none declared)';
}

function envNames(ctx: WizardContext): string {
  const names = new Set<string>();
  for (const id of ctx.answers.modules) {
    for (const env of ctx.registry.manifests.get(id)?.app?.env ?? []) names.add(env.name);
  }
  for (const env of ctx.answers.app?.manifest.env ?? []) names.add(env.name);
  return [...names].join(', ');
}

/**
 * The .env line, in the two worlds there are: one where the file exists and one
 * where the person said no to it.
 *
 * `envWritten` is false when the gitignore guard was declined — the wizard
 * refuses to put the token in an un-ignored directory, so it writes no .env at
 * all. Every sentence downstream described the file anyway: the checklist told
 * the agent the variables "live in .env", and the agent's first move was to
 * read a file nobody had written. What is missing has to be said instead, by
 * name, because nothing runs until somebody creates it.
 */
function envFacts(ctx: WizardContext, verb: string): string {
  const names = envNames(ctx);
  if (ctx.answers.envWritten !== false) return `- Env vars ${verb} .env: ${names}. ${secretsSentence(ctx)}`;
  return (
    `- There is NO .env — the wizard was told not to gitignore it, so it wrote none and the token was never saved. ` +
    `Create .env in the app root yourself, with: ${names}. Nothing runs until it is there. ${secretsSentence(ctx)}`
  );
}

/** The same fact for the instructions file, which lists only the secrets. */
function envHolds(ctx: WizardContext): string {
  const names = secretEnvNames(ctx);
  const pronoun = names.length === 1 ? 'it' : 'them';
  if (ctx.answers.envWritten === false) {
    return names.length === 0
      ? '- There is no .env in this app — the wizard wrote none.'
      : `- There is no .env in this app — create one holding ${names.join(', ')}, and NEVER print or commit ${pronoun}.`;
  }
  return `- .env holds ${names.join(', ') || 'no secrets'} — NEVER print or commit ${pronoun}.`;
}

/** "X and Y are secrets — NEVER print them." over every declared secret env var. */
function secretsSentence(ctx: WizardContext): string {
  const names = secretEnvNames(ctx);
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`;
  const [verb, pronoun] = names.length === 1 ? ['is a secret', 'it'] : ['are secrets', 'them'];
  return `${list} ${verb} — NEVER print ${pronoun}.`;
}

/**
 * What this deployment is pointed at — a Chatfuel workspace either way, but it
 * plays a different part with and without auth: there, every account that signs
 * up gets a bot created inside it; here, its bots are simply the ones the app
 * opens on, with the account's other workspaces a click away in the topbar.
 */
function targetLine(ctx: WizardContext): string {
  const workspace = ctx.answers.workspace;
  if (!workspace) return 'No Chatfuel workspace recorded';
  if (ctx.answers.modules.includes('auth')) {
    return `Chatfuel workspace: “${inlineText(workspace.title, 80)}” — every account that signs up gets a bot created in it`;
  }
  return `Chatfuel workspace: “${inlineText(workspace.title, 80)}” (${workspace.botCount} bot${workspace.botCount === 1 ? '' : 's'}) — the app opens on it and can switch to the account's others`;
}

/**
 * The unstarted trial as a prompt bullet. An agent that does not know the AI is
 * switched off will go looking for the bug in the code, and there is none.
 */
function trialFacts(ctx: WizardContext): string {
  const lines = trialLines(ctx);
  if (lines.length === 0) return '';
  return `\n- The Chatfuel workspace has no subscription, so the bot answers nothing yet:\n${lines
    .map((line) => `  ${line}`)
    .join('\n')}`;
}

/** The auth module's first-run facts as prompt bullets (empty without auth). */
function authFacts(ctx: WizardContext): string {
  const lines = [...authNextSteps(ctx), ...productionLines(ctx)];
  if (lines.length === 0) return '';
  return `\n- Auth & Team is installed. Say this in your first message, before anything else:\n${lines
    .map((line) => `  ${line}`)
    .join('\n')}`;
}

/**
 * The two places the app now lives, and which is which.
 *
 * People conflate them: they change something locally, look at the live URL,
 * and see nothing — or the opposite, they are afraid to touch the code because
 * they think clients are already looking at it. The agent has to say it out
 * loud, once, in its first message, and it has to be right about whether a
 * deployment exists at all.
 */
function environmentFacts(ctx: WizardContext): string {
  const pm = ctx.answers.packageManager;
  const deploy = pm === 'npm' ? 'npm run deploy' : 'pnpm run deploy';
  // Said in both branches: whether the work is version-controlled changes what
  // you are allowed to do to it without asking.
  /* `githubUrl` is a push that has finished, and the push comes after this file
     is written. `githubPlannedUrl` is the repository the run is committing to,
     settled before the handoff — the only one of the two that can be here. */
  const repoUrl = ctx.answers.githubUrl ?? ctx.answers.githubPlannedUrl;
  const repository = repoUrl
    ? [
        `- The code is in git, with ${repoUrl} as its remote. Commit your work there as you`,
        '  go, in small commits with plain-English messages, so anything can be undone.',
      ]
    : [];
  if (!ctx.answers.deployUrl) {
    return [
      '- This app is NOT online yet. It runs only on this machine, at ' + shellUrl() + '.',
      ctx.answers.deployFailed
        ? `  \`${deploy}\` was tried during setup and stopped before it finished. Offer to run it`
        : `  When they want a public address, \`${deploy}\` puts it on Vercel from this directory —`,
      ctx.answers.deployFailed
        ? '  again from this directory and read the reason it prints; it is re-runnable and safe.'
        : '  no Git repository and no dashboard needed, and it asks what to call the project.',
      '  Mention it once, as an option, not as homework.',
      ...repository,
    ].join('\n');
  }
  return [
    '- This app lives in TWO places, and the user must hear both in your first message:',
    `  LOCAL — \`${pm} run dev\` → ${shellUrl()}. Everything you and they change lands here`,
    '    first. Nobody else can see it. This is where you work.',
    `  LIVE — ${ctx.answers.deployUrl}. Already deployed, already working; they can send`,
    '    that link to clients right now.',
    `  The live one does NOT follow local edits. When a change is ready, \`${deploy}\` from`,
    '    the app root ships it: same project, same address, new version. Say that plainly —',
    '    "when we finish something, I run this and it goes live" — and re-run it yourself',
    '    whenever they ask to publish, after telling them you are about to.',
    ...repository,
  ].join('\n');
}

/**
 * The skills the agent will actually find, named for the prompt.
 *
 * Not the module list: a run where somebody answered "no" to every replacement
 * prompt installs none of them, and a prompt that names skills the agent then
 * cannot open sends it looking for files that are not there — or, worse, reads
 * whatever else is sitting in those directories as ours.
 */
function installedSkillNames(ctx: WizardContext): string {
  const names = ctx.answers.skillsPresent;
  return names.length > 0 ? names.join(', ') : '(none were installed — nothing to read)';
}

function finishSetupPrompt(ctx: WizardContext): string {
  const skills = installedSkillNames(ctx);
  const skillsDir = skillsRootLabel(ctx);
  const botLine = targetLine(ctx);
  return `# Finish the Chatfuel app setup

You are inside a freshly scaffolded Chatfuel app. The wizard just finished:
app scaffolded, skills installed, starter assets created. The app is a shell
hosting the modules listed below — sidebar navigation, hash routes.

YOUR FIRST MESSAGE — before touching any tool — must do exactly this, in the
user's language (match whatever language they use; default to the language
of their system/previous messages):
1. Open with a short celebration line — a couple of emoji are welcome
   (🚀 🎉), but do NOT draw ASCII art, banners or fenced-code scenes of any
   kind. One warm sentence naming their bot, nothing more.
2. Congratulate them warmly: everything is deployed and working — the app,
   the skills, the starter assets. They did it.
3. Give a 3-line tour: what each installed module does (one line each),
   where the seeded demo data lives (deep links in the notes below, if
   any) — and say you are starting the app for them RIGHT NOW; it will pop
   up in their browser in a few seconds.
3a. Say where the app lives — see the "TWO places" fact below. If it is
   already online, give them the live link and tell them it is theirs to
   share now, that the local one is where you two will be working, and that
   you will push updates live when they ask. Two or three sentences, not a
   lecture.
4. Then open the floor: "Say anything you want to change or add — we'll
   improve it together." Offer the first-task ideas from the module guides
   below as suggestions, not homework. Keep it friendly and short — no walls
   of text.

IMMEDIATELY AFTER that first message — do not wait for a reply — start the
dev server YOURSELF as a background process (never a blocking foreground
command): \`${ctx.answers.packageManager === 'npm' ? 'npm run dev -- --open' : 'pnpm run dev --open'}\`
from the app root. The --open flag opens their browser the moment the
server is ready — do not run any extra open/xdg-open. If it fails to start
(port taken, install broken), tell them what happened and give the manual
command instead. Never make the user start the server by hand.

Facts:
- ${botLine}.
- Installed skills: ${skills} (${skillsDir}). Read each module's SKILL.md before touching its API.
- Modules in the app:
${moduleLines(ctx)}
- Required Chatfuel role permissions:
${permissionLines(ctx)}
${envFacts(ctx, 'live in')}${appFact(ctx)}${trialFacts(ctx)}${authFacts(ctx)}
${environmentFacts(ctx)}
- Dev server: \`${ctx.answers.packageManager} run dev\` → ${shellUrl()}.
${appFragment(ctx)}${moduleFragments(ctx)}
Rules: validate any new GraphQL against the bundled schema with the validator
script in chatfuel-core; never print the token.
`;
}

function embedFinishSetupPrompt(ctx: WizardContext): string {
  const skills = installedSkillNames(ctx);
  const skillsDir = skillsRootLabel(ctx);
  const { deps, devDeps } = collectNpmDependencies(ctx);
  const pm = ctx.answers.packageManager;
  const add = pm === 'npm' ? 'install' : 'add';
  const entryLines = ctx.answers.modules
    .filter((id) => ctx.registry.manifests.get(id)?.app?.embed)
    .map((id) => {
      const m = ctx.registry.manifests.get(id)!;
      return `- ${inlineText(m.name, 80)}: mount <${m.app!.embed!.entryComponent} /> from ${EMBED_DIR}/modules/${id}/ — ${inlineText(m.description)}`;
    })
    .join('\n');
  const stackHint =
    ctx.answers.hostStack === 'vite'
      ? 'Detected host stack: Vite — follow the Vite recipe in the core embed playbook (register chatfuelProxy from the vendored plugin).'
      : ctx.answers.hostStack === 'next'
        ? 'Detected host stack: Next.js — follow the Next.js recipe in the core embed playbook (HTTP route-handler proxy; subscriptions need the sidecar relay from cors-proxy.md).'
        : 'Host stack not detected — follow the generic cors-proxy spec referenced by the core embed playbook.';

  return `# Finish the Chatfuel embed

The wizard copied a self-contained Chatfuel footprint into ${EMBED_DIR}/ of
this project and installed the skills. NOTHING in the host is wired yet —
that is your job, guided by the playbooks.

Read FIRST: ${skillsDir}/chatfuel-core/playbooks/embed.md (the full
walkthrough), then each module's playbooks/embed.md for its specifics.

${stackHint}

Checklist (the core playbook details every step):
1. Install dependencies:
   \`${pm} ${add} ${deps.join(' ')}\`
   \`${pm} ${add} -D ${devDeps.join(' ')}\`
2. Add the ~ui / ~api aliases to the host tsconfig + bundler config,
   pointing at ${EMBED_DIR}/vendor/{ui,api}.
3. Wire the Tailwind v4 CSS entry (tokens.css import) — or the fallback the
   playbook describes if the host is on Tailwind v3 or no Tailwind.
4. Wire the dev proxy for /chatfuel/graphql + /chatfuel/api (never expose
   CHATFUEL_TOKEN to the browser).
5. Mount the entry component(s) where the user wants them:
${entryLines}

Facts:
- ${targetLine(ctx)}.
- Installed skills: ${skills} (${skillsDir}).
${envFacts(ctx, 'appended to')}${trialFacts(ctx)}${authFacts(ctx)}
- Required Chatfuel role permissions:
${permissionLines(ctx)}
${moduleFragments(ctx)}
Rules: validate any new GraphQL against the bundled schema with the validator
script in chatfuel-core; never print the token.
`;
}

/**
 * The auth block for the agent instructions: where accounts sign up, which
 * Chatfuel workspace their bots land in, and what still has to be set — none
 * of it re-derivable from the scaffold by a later session.
 */
function agentAuthBlock(ctx: WizardContext): string {
  const lines = authNextSteps(ctx);
  if (lines.length === 0) return '';
  return `\n- Auth & Team (Supabase) is installed:\n${lines.map((line) => `  ${line}`).join('\n')}`;
}

const EMBED_BEGIN = '<!-- chatfuel:begin -->';
const EMBED_END = '<!-- chatfuel:end -->';

const EMBED_SECTION = (ctx: WizardContext, spec: AgentSpec) => `${EMBED_BEGIN}
# Chatfuel modules (embedded)

Chatfuel module sources live under ${EMBED_DIR}/ (vendored — edit freely).
Skills — read them before touching the API:
${skillList(ctx, spec)}

- Wiring guide: the playbooks/embed.md files inside the installed skills.
${envHolds(ctx)}${trialFacts(ctx)}${agentAuthBlock(ctx)}
${resumeLine(ctx, 'embed')}
${EMBED_END}
`;

/** Append (or refresh) the marked Chatfuel section without clobbering host instructions. */
function upsertEmbedInstructions(ctx: WizardContext, appDir: string, spec: AgentSpec): void {
  const path = join(appDir, spec.instructionsFile);
  const section = EMBED_SECTION(ctx, spec);
  if (!existsSync(path)) {
    writeFileSync(path, section, 'utf8');
    return;
  }
  const content = readFileSync(path, 'utf8');
  const begin = content.indexOf(EMBED_BEGIN);
  const end = content.indexOf(EMBED_END);
  if (begin !== -1 && end !== -1 && end > begin) {
    writeFileSync(path, content.slice(0, begin) + section.trimEnd() + content.slice(end + EMBED_END.length), 'utf8');
  } else {
    appendFileSync(path, `\n${section}`);
  }
}

const INSTRUCTIONS_MD = (ctx: WizardContext, spec: AgentSpec) => `# Chatfuel app

Shell app hosting Chatfuel modules (routes: ${linkableModules(ctx)
  .map((id) => `/${id}`)
  .join(', ')}).
${ctx.answers.app ? `\nThis scaffold is the "${inlineText(ctx.answers.app.manifest.name, 80)}" app preset — ${inlineText(ctx.answers.app.manifest.tagline, 160)} The build plan lives in the finish-setup checklist.\n` : ''}

Skills — read them before touching the API:
${skillList(ctx, spec)}

${envHolds(ctx)}${trialFacts(ctx)}${agentAuthBlock(ctx)}
- GraphQL operations live in the skills' examples; validate changes with chatfuel-core's validator script.
${resumeLine(ctx, 'setup')}
`;

export async function handoff(ctx: WizardContext): Promise<void> {
  const appDir = ctx.answers.appDir!;
  await ensureAgent(ctx);
  // The offer above can settle a run that started with no agent on PATH at
  // all. From here everything — the skills directory, the instructions file,
  // the checklist — is addressed to that one.
  if (ctx.answers.agent) ctx.answers.agentTarget = ctx.answers.agent.spec;
  const spec = skillsSpec(ctx);
  const dry = ctx.flags.plan;
  if (!dry) relayoutSkills(ctx, spec);

  const embed = ctx.answers.mode === 'embed';
  // Claude reads the checklist as a slash command, Codex as a skill; the
  // frontmatter is what makes the same text valid in the second place.
  const checklist = join(appDir, ...spec.finishSetupPath.split('/'));
  /* A --plan says these two and writes neither. In standalone mode the app
     directory does not exist at all under that flag, so the mkdir below would
     put one back; in embed mode it is the host's own project. */
  if (dry) {
    p.log.info(`--plan: would write ${checklist}`);
    p.log.info(`--plan: would write ${join(appDir, spec.instructionsFile)}`);
  } else {
    mkdirSync(dirname(checklist), { recursive: true });
    writeFileSync(
      checklist,
      `${spec.finishSetupFrontmatter ?? ''}${embed ? embedFinishSetupPrompt(ctx) : finishSetupPrompt(ctx)}`,
      'utf8',
    );
    // Embed mode must not clobber host instructions — marked section instead.
    if (embed) upsertEmbedInstructions(ctx, appDir, spec);
    else writeFileSync(join(appDir, spec.instructionsFile), INSTRUCTIONS_MD(ctx, spec), 'utf8');
    /* The scaffold sealed the lock before either of these existed. They are the
       wizard's own writing and have no upstream to compare against, so `update`
       wants them recorded the way every other produced file is — knowing about
       them and leaving them alone, rather than not knowing them at all. In embed
       mode the instructions file is the host's, and a marked section inside it
       is not ours to claim. */
    try {
      amendAppLock(appDir, (lock) => {
        lock.files[spec.finishSetupPath] = { generated: 'handoff' };
        if (!embed) lock.files[spec.instructionsFile] = { generated: 'handoff' };
      });
    } catch (err) {
      /* The two files are already on disk. An unwritable lock is worth saying
         and not worth ending a finished run over: `update` treats a file it
         does not know as the person's own and leaves it alone, which is the
         same outcome the entry buys, minus the record. */
      p.log.warn(
        `Could not record ${spec.finishSetupPath} in the app lock: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    p.log.success(`Wrote ${spec.instructionsFile} and ${spec.finishSetupPath}`);
  }
}

/**
 * Hand the terminal to the agent — the last thing the run does.
 *
 * Separate from the writing above, and after the push and the outro, because
 * this is the point of no return: the agent owns stdin from here, and a Ctrl+C
 * aimed at it lands on this process group. While the spawn sat inside the
 * handoff, that keystroke killed the wizard before the commit and the push it
 * had already been told to make, and the closing notes — which is where a
 * generated admin password is shown — were never printed either.
 */
export async function launchAgent(ctx: WizardContext): Promise<void> {
  const appDir = ctx.answers.appDir!;
  const agent = ctx.answers.agent;
  if (!agent || ctx.flags.yes || ctx.flags.dryRun) return;
  p.log.message(stepArt('handoff'));
  const launch = await p.confirm({ message: `Launch ${agent.spec.name} in the new app now?` });
  if (p.isCancel(launch) || !launch) return;
  p.log.info(`Handing off to ${agent.spec.name}…`);
  const session = execa(agent.command, [...agent.argsPrefix, ...handoffArgs(agent)], {
    cwd: appDir,
    stdio: 'inherit',
  });
  /* Set here and not before the spawn: the flag means "an agent has the
     terminal", and `launch` reads it to decide whether to start the dev server
     itself. Setting it in advance made a `claude` that is on PATH but cannot
     execute — the wrong architecture, a broken shim, a permission bit — end the
     run with a warning, no agent and no dev server, having reported a handoff
     that never happened. */
  // execa 10 no longer forwards the child's events, so the flag is set from the
  // underlying ChildProcess, which is the escape hatch the package documents.
  session.nodeChildProcess.once('spawn', () => {
    ctx.answers.handedOffToAgent = true;
  });
  await session.catch((error: unknown) => {
    // The agent's own exit code, because "an error" is not something a person
    // can act on and the agent already printed its reason to this terminal.
    const code = (error as { exitCode?: number }).exitCode;
    p.log.warn(
      `${agent.spec.bin} exited ${code === undefined ? 'with an error' : `with code ${code}`} — you can rerun it inside the app directory.`,
    );
  });
}
