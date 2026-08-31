#!/usr/bin/env node
import packageJson from '../package.json';
import { installInterruptHandler } from './interrupt';
import { installScrubber } from './log';
import { scrubNpmExecEnv } from './npmEnv';

// Before ANY other output path can run — clack, execa, stack traces.
installScrubber();
// Before any command starts writing: clack's spinner takes SIGINT away from
// Node's default disposition, so without this Ctrl+C under a spinner does
// nothing at all and the press after it kills the run mid-write. See
// ./interrupt.
installInterruptHandler();
// Before ANY child is started: an npx that was launched with --package or -c
// leaves configuration behind that breaks every nested npx.
scrubNpmExecEnv();

const { Command } = await import('commander');
const { run, reportWizardError } = await import('./run');
const { auth } = await import('./auth');
const { createContext } = await import('./run');

const program = new Command('chatfuel-wizard')
  .description('Scaffold the Chatfuel shell app with skills, vendored sources and starter assets')
  .version(packageJson.version, '-v, --version')
  .option(
    '-y, --yes',
    'accept all defaults, skip confirmations (installs every ready module unless --modules narrows it; the auth module also needs --supabase-project or --supabase-create)',
    false,
  )
  .option('--dry-run', 'stop before creating any account assets; the app itself is still written', false)
  .option('--plan', 'print what the run would do and write none of it (implies --dry-run)', false)
  .option('--verbose', 'print extra diagnostic output', false)
  .option('--embed', 'embed the selected modules into the current project instead of scaffolding a new app', false)
  .option('--dir <path>', 'target directory for the scaffold')
  .option('--modules <ids>', 'comma-separated module ids to install without prompting')
  .option(
    '--app <slug>',
    'scaffold a preset app from the Chatfuel apps catalog — the app decides the modules and the brand',
  )
  .option('--apps-repo <url>', 'git URL of the apps catalog (else CHATFUEL_APPS_REPO env; default: the official repo)')
  .option('--apps-ref <ref>', 'branch or tag of the apps catalog to clone (default: its default branch)')
  .option('--agent <id>', 'coding agent to finish the setup: claude or codex (default: whichever is installed)')
  .option('--app-name <name>', "the app's own name — browser tab, top bar, sign-in screen")
  .option('--logo <path>', "path to an image file to use as the app's logo and tab icon")
  .option('--workspace <id>', 'Chatfuel workspace id to use without prompting')
  .option('--supabase-token <pat>', 'Supabase personal access token (else SUPABASE_ACCESS_TOKEN env) — auth module')
  .option('--supabase-project <ref>', 'existing Supabase project ref; skips the project picker — auth module')
  .option(
    '--supabase-create <name>',
    'create a Supabase project with this name, or reuse the one already called that — auth module',
  )
  .option('--supabase-org <slug>', 'Supabase organization slug for --supabase-create — auth module')
  .option(
    '--supabase-region <code>',
    'Supabase region code for --supabase-create (default: the recommended one) — auth module',
  )
  .option('--supabase-url <url>', 'manual path: Supabase project URL (https://<ref>.supabase.co) — auth module')
  .option('--supabase-anon-key <key>', 'manual path: Supabase anon / publishable key — auth module')
  .option('--app-url <url>', 'deployed app origin (https) for the Supabase redirect allowlist — auth module')
  .option(
    '--admin-password <value>',
    'password for the admin panel, 16 characters at least (else ADMIN_PASSWORD env; else generated) — admin module',
  )
  .option(
    '--signup <mode>',
    'who may open an account on a Supabase project the wizard creates: open, confirm-email or closed — auth module',
  )
  .option(
    '--allowed-origins <list>',
    "browser origins besides the app's own that may call the proxy, comma-separated ('*' allows every origin)",
  );

interface CliOpts {
  yes: boolean;
  dryRun: boolean;
  plan: boolean;
  verbose: boolean;
  embed: boolean;
  dir?: string;
  modules?: string;
  app?: string;
  appsRepo?: string;
  appsRef?: string;
  agent?: string;
  appName?: string;
  logo?: string;
  workspace?: string;
  supabaseToken?: string;
  supabaseProject?: string;
  supabaseCreate?: string;
  supabaseOrg?: string;
  supabaseRegion?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl?: string;
  adminPassword?: string;
  allowedOrigins?: string;
  signup?: string;
}

program.action(async () => {
  const opts = program.opts<CliOpts>();
  await run({
    yes: opts.yes,
    dryRun: opts.dryRun || opts.plan,
    plan: opts.plan,
    verbose: opts.verbose,
    embed: opts.embed,
    dir: opts.dir,
    modules: opts.modules,
    app: opts.app,
    appsRepo: opts.appsRepo,
    appsRef: opts.appsRef,
    agent: opts.agent,
    appName: opts.appName,
    logo: opts.logo,
    workspace: opts.workspace,
    supabaseToken: opts.supabaseToken,
    supabaseProject: opts.supabaseProject,
    supabaseCreate: opts.supabaseCreate,
    supabaseOrg: opts.supabaseOrg,
    supabaseRegion: opts.supabaseRegion,
    supabaseUrl: opts.supabaseUrl,
    supabaseAnonKey: opts.supabaseAnonKey,
    appUrl: opts.appUrl,
    adminPassword: opts.adminPassword,
    allowedOrigins: opts.allowedOrigins,
    signup: opts.signup,
  });
});

program
  .command('doctor')
  .description('Check Node, the package manager, the coding agent and the bundled content')
  .action(async () => {
    const { doctor } = await import('./doctor');
    process.exitCode = await doctor();
  });

program
  .command('update')
  .description('Update an app the wizard created to the content this wizard is pinned to')
  .argument('[dir]', 'the app directory (default: the current one)')
  .option('--dry-run', 'list what would be updated, skipped and left in conflict, and write nothing', false)
  .option(
    '--json',
    'print the plan as JSON, with the upstream copy of every conflict fetched to compare against — what the chatfuel-update skill reads',
    false,
  )
  .option(
    '--resolved <paths...>',
    'record these conflicting files as settled, so the next update stops asking about them',
  )
  .action(async (dir: string | undefined, command: { dryRun: boolean; json: boolean; resolved?: string[] }) => {
    const opts = program.opts<CliOpts>();
    const { update } = await import('./commands/update');
    try {
      process.exitCode = await update({
        dir: dir ?? opts.dir,
        dryRun: command.dryRun || opts.dryRun || opts.plan,
        json: command.json,
        ...(command.resolved ? { resolved: command.resolved } : {}),
      });
    } catch (err) {
      if (!reportWizardError(err, opts.verbose)) throw err;
    }
  });

program
  .command('auth')
  .description('Rotate the Chatfuel token in an existing scaffold')
  .action(async () => {
    const opts = program.opts<CliOpts>();
    try {
      await auth(
        createContext({
          yes: opts.yes,
          dryRun: opts.dryRun || opts.plan,
          plan: opts.plan,
          verbose: opts.verbose,
          dir: opts.dir,
        }),
      );
    } catch (err) {
      if (!reportWizardError(err, opts.verbose)) throw err;
    }
  });

await program.parseAsync();
