import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AGENTS, directLauncher } from '../src/agents';
import { createContext } from '../src/run';
import { appLockPath, writeAppLock } from '../src/scaffold/appLock';
import { handoff, handoffArgs } from '../src/steps/handoff';
import type { AppLock } from '../src/scaffold/appLock';
import type { AgentId } from '../src/agents';
import type { WizardContext } from '../src/context';

/**
 * The handoff is the point of the run, so it has to address the agent the user
 * actually has. Each CLI reads a different project-instructions file, keeps its
 * skills in a different directory and takes the checklist in a different form;
 * writing CLAUDE.md for a Codex user means the instructions are never read.
 */
let appDir: string;

function agentContext(agent?: AgentId): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir: appDir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.appDir = appDir;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.workspace = { id: 'ws-1', title: 'Test workspace', botsLimit: 5, botCount: 2 };
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  ctx.answers.packageManager = 'npm';
  // What installSkills would have left behind — the prompts name the skills
  // that are actually on disk, not the modules that were picked.
  ctx.answers.skillsInstalled = ['chatfuel-core', 'chatfuel-livechat', 'chatfuel-update'];
  ctx.answers.skillsPresent = [...ctx.answers.skillsInstalled];
  if (agent) {
    ctx.answers.agentTarget = AGENTS[agent];
    ctx.answers.agent = directLauncher(AGENTS[agent]);
  }
  return ctx;
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'chatfuel-handoff-'));
});
afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe('handoff', () => {
  it('writes the setup checklist where Claude Code looks for a command', async () => {
    await handoff(agentContext('claude'));
    const checklist = join(appDir, '.claude/commands/chatfuel/finish-setup.md');
    expect(existsSync(checklist)).toBe(true);
    expect(existsSync(join(appDir, '.agents'))).toBe(false);
    // A command file is read as-is; frontmatter is the skill format's business.
    expect(readFileSync(checklist, 'utf8').startsWith('# Finish the Chatfuel app setup')).toBe(true);
  });

  it('puts an app preset’s playbook above the module guides, with its provenance', async () => {
    const ctx = agentContext('claude');
    ctx.answers.app = {
      slug: 'insta',
      manifest: {
        id: 'insta',
        name: 'Comments for Instagram',
        tagline: 'Reply to every comment.',
        description: 'd',
        category: 'instagram',
        status: 'draft',
        modules: ['livechat'],
        brand: { appName: 'Comments for Instagram' },
        listing: { icon: '', screenshots: [] },
      },
      dir: '/tmp/none',
      repo: 'https://example.com/apps.git',
      sha: 'abcdef1234'.repeat(4),
      playbook: '## 1. Build the auto-reply flow',
      cleanup: () => undefined,
    };
    await handoff(ctx);
    const checklist = readFileSync(join(appDir, '.claude/commands/chatfuel/finish-setup.md'), 'utf8');
    expect(checklist).toContain('## The app you are building — Comments for Instagram');
    expect(checklist).toContain('## 1. Build the auto-reply flow');
    expect(checklist.indexOf('The app you are building')).toBeLessThan(checklist.indexOf('## Module guides'));
    expect(checklist).toContain('fetched from https://example.com/apps.git @ abcdef1');
    const instructions = readFileSync(join(appDir, 'CLAUDE.md'), 'utf8');
    expect(instructions).toContain('"Comments for Instagram" app preset');
  });

  it('writes the setup checklist as a Codex skill, frontmatter and all', async () => {
    await handoff(agentContext('codex'));
    const checklist = join(appDir, '.agents/skills/chatfuel-finish-setup/SKILL.md');
    expect(existsSync(checklist)).toBe(true);
    expect(existsSync(join(appDir, '.claude'))).toBe(false);
    const skill = readFileSync(checklist, 'utf8');
    expect(skill).toMatch(/^---\nname: chatfuel-finish-setup\ndescription: .+\n---\n/);
    expect(skill).toContain('# Finish the Chatfuel app setup');
  });

  it('addresses Claude Code with CLAUDE.md and its slash command', async () => {
    await handoff(agentContext('claude'));
    expect(existsSync(join(appDir, 'AGENTS.md'))).toBe(false);
    const instructions = readFileSync(join(appDir, 'CLAUDE.md'), 'utf8');
    expect(instructions).toContain('/chatfuel:finish-setup');
    // Claude loads its skills directory itself — names are enough.
    expect(instructions).toContain('- chatfuel-livechat:');
  });

  it('addresses Codex with AGENTS.md, skill paths and its invocation', async () => {
    await handoff(agentContext('codex'));
    expect(existsSync(join(appDir, 'CLAUDE.md'))).toBe(false);
    const instructions = readFileSync(join(appDir, 'AGENTS.md'), 'utf8');
    // Skill discovery depends on the Codex version; AGENTS.md never does, so
    // the paths are spelled out rather than left to it.
    expect(instructions).toContain('.agents/skills/chatfuel-livechat/SKILL.md');
    expect(instructions).toContain('$chatfuel-finish-setup');
    expect(instructions).not.toContain('Run /chatfuel:finish-setup');
  });

  it('falls back to CLAUDE.md when no agent was resolved', async () => {
    await handoff(agentContext());
    expect(existsSync(join(appDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(appDir, '.claude/commands/chatfuel/finish-setup.md'))).toBe(true);
  });

  /**
   * The scaffold seals the lock and the handoff keeps writing. A file the
   * wizard wrote and the lock does not name is a file `update` cannot reason
   * about at all.
   */
  it('tells the lock about what it wrote after the lock was sealed', async () => {
    const sealed: AppLock = {
      mode: 'standalone',
      wizardVersion: '0.1.0',
      modules: ['core'],
      skills: {},
      files: { 'package.json': { generated: 'scaffold' } },
    };
    writeAppLock(appDir, sealed);

    await handoff(agentContext('claude'));

    const lock = JSON.parse(readFileSync(appLockPath(appDir), 'utf8')) as AppLock;
    expect(lock.files['CLAUDE.md']).toEqual({ generated: 'handoff' });
    expect(lock.files['.claude/commands/chatfuel/finish-setup.md']).toEqual({ generated: 'handoff' });
    expect(lock.files['package.json']).toEqual({ generated: 'scaffold' });
  });

  it('writes no lock for an app that has none', async () => {
    await handoff(agentContext('claude'));
    expect(existsSync(appLockPath(appDir))).toBe(false);
  });

  it('launches each agent in the form it takes', () => {
    expect(handoffArgs(directLauncher(AGENTS.claude))).toEqual(['/chatfuel:finish-setup']);
    const [codexPrompt] = handoffArgs(directLauncher(AGENTS.codex));
    expect(codexPrompt).toContain('AGENTS.md');
    expect(codexPrompt).toContain('.agents/skills/chatfuel-finish-setup/SKILL.md');
  });

  /**
   * Declining the .gitignore cancels the .env, and nothing else used to notice.
   *
   * The checklist told the agent the variables "live in .env" and the
   * instructions file told it what .env "holds", so the first thing the agent
   * did was open a file nobody had written — and the person was never told
   * which names they now had to put in it themselves.
   */
  describe('when no .env was written', () => {
    const withoutEnv = (): WizardContext => {
      const ctx = agentContext('claude');
      ctx.answers.envWritten = false;
      return ctx;
    };

    it('says the file is missing, and names what has to go in it', async () => {
      await handoff(withoutEnv());

      const checklist = readFileSync(join(appDir, '.claude/commands/chatfuel/finish-setup.md'), 'utf8');
      expect(checklist).toContain('NO .env');
      expect(checklist).toContain('CHATFUEL_TOKEN');
      // And does not describe a file that is not there.
      expect(checklist).not.toContain('Env vars live in .env');
    });

    it('says it in the instructions file too', async () => {
      await handoff(withoutEnv());

      const instructions = readFileSync(join(appDir, 'CLAUDE.md'), 'utf8');
      expect(instructions).toContain('no .env in this app');
      expect(instructions).not.toContain('.env holds');
    });

    it('still describes the file when one was written', async () => {
      const ctx = agentContext('claude');
      ctx.answers.envWritten = true;

      await handoff(ctx);

      expect(readFileSync(join(appDir, '.claude/commands/chatfuel/finish-setup.md'), 'utf8')).toContain(
        'Env vars live in .env',
      );
      expect(readFileSync(join(appDir, 'CLAUDE.md'), 'utf8')).toContain('.env holds');
    });
  });
});
