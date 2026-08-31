import { join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';

/**
 * The coding agent the wizard hands off to. The handoff prompt is the whole
 * point of the run, so the agent is a prerequisite the wizard installs — not
 * something the user is expected to have arranged beforehand.
 */
export type AgentId = 'claude' | 'codex';

/** The skill the setup checklist is written as for a CLI that reads skills. */
export const FINISH_SETUP_SKILL = 'chatfuel-finish-setup';

export interface AgentSpec {
  id: AgentId;
  name: string;
  /** Executable name on PATH. */
  bin: string;
  npmPackage: string;
  /** The project-instructions file this CLI reads when it starts in a directory. */
  instructionsFile: string;
  /**
   * Where this CLI looks for skills — relative to the project root, and to
   * $HOME for the global install. Neither CLI reads the other's directory, so
   * the layout has to follow whichever agent is going to open the app.
   */
  skillsSubdir: string;
  /** Where the tailored setup checklist is written, relative to the app root. */
  finishSetupPath: string;
  /** Frontmatter the checklist file needs, when the CLI reads it as a skill. */
  finishSetupFrontmatter?: string;
  /**
   * Whether the instructions file has to spell out where each skill lives.
   * Claude Code loads its skills directory by itself, so names are enough;
   * Codex's discovery depends on its version and the user's config, and the
   * instructions file is read either way.
   */
  listSkillsByPath?: boolean;
  /** The shell command that re-enters the guided setup in a later session. */
  resumeCommand: string;
  /** What to type inside that session, for a CLI whose command cannot carry it. */
  resumeInvocation?: string;
}

export const AGENTS: Record<AgentId, AgentSpec> = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    npmPackage: '@anthropic-ai/claude-code',
    instructionsFile: 'CLAUDE.md',
    skillsSubdir: '.claude/skills',
    finishSetupPath: '.claude/commands/chatfuel/finish-setup.md',
    resumeCommand: 'claude /chatfuel:finish-setup',
  },
  codex: {
    id: 'codex',
    name: 'Codex CLI',
    bin: 'codex',
    npmPackage: '@openai/codex',
    instructionsFile: 'AGENTS.md',
    skillsSubdir: '.agents/skills',
    listSkillsByPath: true,
    finishSetupPath: `.agents/skills/${FINISH_SETUP_SKILL}/SKILL.md`,
    finishSetupFrontmatter: [
      '---',
      `name: ${FINISH_SETUP_SKILL}`,
      'description: Finish setting up this Chatfuel app — the first message to the user, the tour of the installed modules, and starting the dev server.',
      '---',
      '',
      '',
    ].join('\n'),
    resumeCommand: 'codex',
    resumeInvocation: `$${FINISH_SETUP_SKILL}`,
  },
};

/** Where a spec's skills live under a project root, or under $HOME. */
export const skillsRootFor = (spec: AgentSpec, base: string): string => join(base, ...spec.skillsSubdir.split('/'));

/** The default preference when nothing narrows the choice down. */
const AGENT_ORDER: AgentId[] = ['claude', 'codex'];

/** Every id, in preference order — for flag validation and option lists. */
export const AGENT_IDS: readonly AgentId[] = AGENT_ORDER;

export const isAgentId = (value: string): value is AgentId => (AGENT_IDS as readonly string[]).includes(value);

/**
 * How to actually start it. `viaNpx` covers the machine where a global install
 * is not permitted (root-owned npm prefix) — npx runs the same bin per session.
 */
export interface AgentLauncher {
  spec: AgentSpec;
  command: string;
  argsPrefix: string[];
}

export const directLauncher = (spec: AgentSpec): AgentLauncher => ({
  spec,
  command: spec.bin,
  argsPrefix: [],
});

const npxLauncher = (spec: AgentSpec): AgentLauncher => ({
  spec,
  command: 'npx',
  argsPrefix: ['-y', spec.npmPackage],
});

async function isInstalled(spec: AgentSpec): Promise<boolean> {
  try {
    await execa(spec.bin, ['--version'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/** Every agent already on PATH, in preference order. */
export async function detectAgents(): Promise<AgentSpec[]> {
  const specs = AGENT_ORDER.map((id) => AGENTS[id]);
  const present = await Promise.all(specs.map(isInstalled));
  return specs.filter((_, i) => present[i]);
}

const isPermissionError = (message: string) => /EACCES|EPERM|permission denied|Missing write access/i.test(message);

/**
 * `npm i -g` writes to the npm prefix, which the nodejs.org installer leaves
 * root-owned. We never escalate to sudo on the user's behalf: on a permission
 * error the agent still runs, through npx, and the one-time fix is printed.
 */
export async function installAgent(spec: AgentSpec): Promise<AgentLauncher | null> {
  const spinner = p.spinner({ indicator: 'timer' });
  spinner.start(`Installing ${spec.name} (npm i -g ${spec.npmPackage})…`);
  try {
    await execa('npm', ['install', '-g', spec.npmPackage], { timeout: 10 * 60_000 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isPermissionError(message)) {
      spinner.stop(`${spec.name} could not be installed globally`, 1);
      p.log.warn(
        `npm has no write access to its global prefix, so ${spec.name} will run through npx this time.\n` +
          `One-time fix:  npm config set prefix ~/.npm-global  ` +
          `and add ~/.npm-global/bin to your PATH.`,
      );
      return npxLauncher(spec);
    }
    spinner.stop(`${spec.name} install failed`, 1);
    p.log.warn(`${pc.dim(message.split('\n').slice(-3).join(' ').slice(0, 300))}`);
    return null;
  }

  // Freshly linked bins are not always visible to this process — verify, and
  // fall back to npx rather than handing off to a command that does not resolve.
  if (await isInstalled(spec)) {
    spinner.stop(`${spec.name} installed`);
    return directLauncher(spec);
  }
  spinner.stop(`${spec.name} installed, but \`${spec.bin}\` is not on this shell's PATH`);
  return npxLauncher(spec);
}
