import type { ChatfuelClient } from '@chatfuel/api-client';
import type { AppManifest } from '@chatfuel/module-manifest';
import type { AgentId, AgentLauncher, AgentSpec } from './agents';
import type { ContentSource } from './content';
import type { Registry } from './registry';

export interface WizardFlags {
  yes: boolean;
  /**
   * Stop before anything is created in the user's Chatfuel or Supabase
   * account. The app itself is still written: this is the flag for a run that
   * wants the scaffold and none of the account side of it.
   */
  dryRun: boolean;
  /**
   * Print what the run would do and write none of it — no directory, no file,
   * no skill. Implies `dryRun`, because a plan that opened an account would not
   * be a plan.
   */
  plan?: boolean;
  /** Print extra diagnostic output. */
  verbose: boolean;
  /** Which coding agent finishes the setup — skips detection and the picker. */
  agent?: string;
  /** Skip the mode prompt: embed into the current project. */
  embed?: boolean;
  /** Target directory for the scaffold (prompted when absent). */
  dir?: string;
  /** Comma-separated module ids to install without prompting. */
  modules?: string;
  /** Slug of a preset app from the apps catalog — decides modules and brand. */
  app?: string;
  /** Git URL of the apps catalog (else CHATFUEL_APPS_REPO env; else the default). */
  appsRepo?: string;
  /** Branch or tag of the apps catalog to clone. */
  appsRef?: string;
  /** The app's own name (prompted when absent). */
  appName?: string;
  /** Path to an image file to use as the app's logo (prompted when absent). */
  logo?: string;
  /** Chatfuel workspace id to use without prompting (non-interactive runs). */
  workspace?: string;
  /** Supabase Management API personal access token (else SUPABASE_ACCESS_TOKEN env). */
  supabaseToken?: string;
  /** Existing Supabase project ref — skips the project picker on the PAT path. */
  supabaseProject?: string;
  /**
   * Name of the Supabase project to create on the PAT path — the way a run
   * that never prompts gets a project of its own. A project already carrying
   * the name is reused, so re-running a script does not pile up projects.
   */
  supabaseCreate?: string;
  /** Organization slug for --supabase-create (only needed when the token sees several). */
  supabaseOrg?: string;
  /** Region code for --supabase-create (default: the recommended one). */
  supabaseRegion?: string;
  /** Manual path: the project URL (https://<ref>.supabase.co). */
  supabaseUrl?: string;
  /** Manual path: the anon / publishable key. */
  supabaseAnonKey?: string;
  /** Deployed app origin (https) — added to the Supabase redirect allowlist (optional). */
  appUrl?: string;
  /**
   * The admin panel's password (else ADMIN_PASSWORD env; else a generated one).
   * At least 16 characters — the proxy refuses to run the panel behind less.
   */
  adminPassword?: string;
  /**
   * Browser origins besides the app's own that may call the proxy, comma- or
   * space-separated, or '*' for every origin (else ALLOWED_ORIGINS env; else
   * the wizard asks, and same-origin is the default).
   */
  allowedOrigins?: string;
  /**
   * Who may open an account on a Supabase project THIS run creates: 'open'
   * (default), 'confirm-email' or 'closed'. Ignored for a project that already
   * existed — the wizard never changes those settings on somebody else's.
   */
  signup?: string;
}

export type PackageManager = 'pnpm' | 'npm';

/** What the auth step learned and did — feeds .env, the seed file, the outro and the handoff. */
export interface AuthAnswers {
  method: 'pat' | 'manual';
  /** Supabase project ref (PAT path; the manual path derives it from the URL when it can). */
  projectRef?: string;
  url: string;
  anonKey: string;
  anonKeyKind: 'publishable' | 'legacy' | 'unknown';
  secretKey?: string;
  /** The seed found an owner already there (a re-run on a workspace in use). */
  appUrl?: string;
  migrationApplied: boolean;
  authConfigured: boolean;
}

/**
 * The Chatfuel workspace this deployment starts in — its billing container,
 * not the auth module's per-account workspace. With auth it is where the
 * provisioning route creates bots; without it, the one the app opens on.
 */
export interface WorkspaceAnswer {
  id: string;
  title: string;
  botsLimit: number;
  /** Bots already in it when the wizard looked. */
  botCount: number;
}

/** What the brand step settled: the app's own name and, if one was given, its mark. */
export interface BrandAnswers {
  name: string;
  /**
   * Absolute path of the image the user chose. Absent = keep the mark the
   * template ships, which is a real logo and not a placeholder.
   */
  logoSource?: string;
  /** Base name the logo is written under in `public/` — the value of VITE_APP_LOGO. */
  logoFile?: string;
}

/**
 * What resolveApp fetched and verified — the manifest, where its files sit on
 * disk (a temp clone that outlives the scaffold step), and the provenance the
 * handoff prints. `cleanup` removes the clone; run.ts calls it in `finally`.
 */
export interface AppAnswers {
  slug: string;
  manifest: AppManifest;
  /** Absolute path of apps/<slug> inside the temp clone. */
  dir: string;
  /** The catalog repo URL the clone came from (for provenance lines). */
  repo: string;
  /** Full commit SHA of the clone. */
  sha: string;
  /** The playbook file's content, read at resolve time so a bad app fails early. */
  playbook: string;
  cleanup: () => void;
}

export interface WizardAnswers {
  /** standalone = scaffold a fresh app; embed = copy into the host project. */
  mode: 'standalone' | 'embed';
  /** Detected host stack in embed mode — steers the playbook pointers. */
  hostStack?: 'vite' | 'next' | 'unknown';
  modules: string[];
  skillsTarget: 'project' | 'global';
  token?: string;
  /** Absolute path of the scaffolded app. */
  appDir?: string;
  /** Production URL of the app on Vercel — set only when the deploy step ran and succeeded. */
  deployUrl?: string;
  /** The deploy step ran, failed, and the user chose to move on — the closing summary has to say so. */
  deployFailed?: true;
  /** No package manager could install the app's dependencies. The app is written; node_modules is not. */
  installFailed?: true;
  /**
   * Whether the .env was actually written. The gitignore guard can be declined,
   * and then nothing that was collected reaches the disk — which the closing
   * notes have to know, because they name that file as where things are.
   */
  envWritten?: boolean;
  /** HTTPS URL of the GitHub repository — set only when the GitHub step ran and succeeded. */
  githubUrl?: string;
  /**
   * Where the repository is going to be, settled by the GitHub step's questions
   * and known before the push. The handoff writes the agent's instructions in
   * between the two, so this is what that file can name; `githubUrl` is the
   * push that finished, and only the outro speaks for it.
   */
  githubPlannedUrl?: string;
  packageManager: PackageManager;
  /** Every agent CLI preflight found on PATH, in preference order. */
  agentsPresent: AgentSpec[];
  /**
   * The agent whose layout the run is written for — skills directory,
   * instructions file, checklist path. Resolved before anything is copied,
   * because the two CLIs read skills from different directories. Unresolved
   * while neither is installed; Claude's layout is the default in that window.
   */
  agentTarget?: AgentSpec;
  /** The agent that can actually be started — detected on PATH, or installed. */
  agent?: AgentLauncher;
  /** Whose skills layout the installed skills are actually sitting in. */
  skillsLayout?: AgentId;
  /** Skill directory names written by installSkills — what relayoutSkills moves. */
  skillsInstalled: string[];
  /**
   * The skill directories the agent will find, written this run or not.
   *
   * `skillsInstalled` is what this run put there, and only that may be moved or
   * recorded in the lock as ours. This one adds the ones that were already
   * there and kept, because the prompts describe what the agent can open — and
   * a run where every replacement was declined installs nothing while leaving a
   * full set of skills on disk.
   */
  skillsPresent: string[];
  /** The user launched the agent from the handoff step; it owns the terminal now. */
  handedOffToAgent?: boolean;
  /** Set by workspacePick — every deployment has one. */
  workspace?: WorkspaceAnswer;
  /**
   * Set by the trial step: whether the workspace ended the run with a
   * subscription. False means the closing summary has to say so, because
   * nothing else will.
   */
  trialStarted?: boolean;
  /**
   * Env values resolved by steps other than the token one (the workspace and
   * auth steps). collectEnv() reads a declared name from here first.
   */
  env: Record<string, string>;
  auth?: AuthAnswers;
  /** Set by the brand step — every run has one. */
  brand?: BrandAnswers;
  /** Set by resolveApp when --app was given. */
  app?: AppAnswers;
}

/**
 * Values that must not be read back out of `process.env` once the run has
 * started. The environment is global: anything the wizard spawns inherits it,
 * and a step that writes a token back into it hands that token to every child
 * process for the rest of the run. Resolved once, from the flag or the
 * environment, and carried here instead.
 */
export interface WizardSecrets {
  /** Supabase Management API personal access token. */
  supabaseToken?: string;
}

export interface WizardContext {
  flags: WizardFlags;
  secrets: WizardSecrets;
  content: ContentSource;
  registry: Registry;
  answers: WizardAnswers;
  client?: ChatfuelClient;
}
