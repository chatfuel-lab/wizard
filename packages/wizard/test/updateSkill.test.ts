import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AGENTS, directLauncher, skillsRootFor } from '../src/agents';
import { createContext } from '../src/run';
import { installSkills, WIZARD_SKILLS } from '../src/scaffold/skills';
import { handoff } from '../src/steps/handoff';
import type { AgentId } from '../src/agents';
import type { WizardContext } from '../src/context';

/**
 * `chatfuel-update` belongs to no module, and that is the point: an app updates
 * itself whatever it was built out of. So it has to arrive by the same route as
 * every other skill — the directory the chosen agent actually reads, and a line
 * in the instructions file that agent opens — rather than by a path written out
 * once for Claude and forgotten for Codex.
 */
const SKILL = 'chatfuel-update';
let appDir: string;

function context(agent?: AgentId): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir: appDir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.appDir = appDir;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.workspace = { id: 'ws-1', title: 'Test workspace', botsLimit: 5, botCount: 2 };
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  ctx.answers.packageManager = 'npm';
  if (agent) {
    ctx.answers.agentTarget = AGENTS[agent];
    ctx.answers.agent = directLauncher(AGENTS[agent]);
  }
  return ctx;
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'chatfuel-update-skill-'));
});
afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe('where it lands', () => {
  it.each(['claude', 'codex'] as const)('installs into the directory %s reads', async (agent) => {
    const ctx = context(agent);
    const { installed } = await installSkills(ctx);

    expect(installed).toContain(SKILL);
    expect(existsSync(join(skillsRootFor(AGENTS[agent], appDir), SKILL, 'SKILL.md'))).toBe(true);
    // The other agent's layout is not written to at all — a skill in the wrong
    // directory is not loaded, it is only taking up space.
    const other = agent === 'claude' ? AGENTS.codex : AGENTS.claude;
    expect(existsSync(join(appDir, other.skillsSubdir.split('/')[0]!))).toBe(false);
  });

  it('comes with every module set, because it is about none of them', async () => {
    const ctx = context('claude');
    ctx.answers.modules = ['core'];
    expect((await installSkills(ctx)).installed).toContain(SKILL);
  });
});

describe('how the agent hears about it', () => {
  it('is in the instructions file Claude Code opens', async () => {
    const ctx = context('claude');
    await installSkills(ctx);
    await handoff(ctx);
    expect(readFileSync(join(appDir, 'CLAUDE.md'), 'utf8')).toContain(`- ${SKILL}:`);
  });

  it('is in AGENTS.md by path, the way Codex needs it', async () => {
    const ctx = context('codex');
    await installSkills(ctx);
    await handoff(ctx);
    expect(readFileSync(join(appDir, 'AGENTS.md'), 'utf8')).toContain(`.agents/skills/${SKILL}/SKILL.md`);
  });

  it('is left out of the list when the user declined to install it', async () => {
    const ctx = context('claude');
    ctx.answers.skillsInstalled = ['chatfuel-livechat'];
    await handoff(ctx);
    expect(readFileSync(join(appDir, 'CLAUDE.md'), 'utf8')).not.toContain(`- ${SKILL}:`);
  });
});

describe('what it tells the agent to do', () => {
  const text = readFileSync(
    resolve(import.meta.dirname, '..', '..', '..', 'content', 'skills', SKILL, 'SKILL.md'),
    'utf8',
  );

  it('is a skill file the agent can load', () => {
    expect(text).toMatch(/^---\nname: chatfuel-update\ndescription: .+\n---\n/);
  });

  it('draws the boundary at the conflict list and nowhere else', () => {
    expect(text).toContain('**Change only the files the CLI lists under `conflicts`.**');
    expect(text).toContain('.chatfuel/lock.json');
    // The two ways of quietly going outside it.
    expect(text).toMatch(/stop and tell the user/i);
    expect(text).toMatch(/do not edit `\.chatfuel\/lock\.json` by hand/i);
  });

  it('names every step of the sequence the CLI actually offers', () => {
    for (const command of ['update --dry-run --json', 'update --resolved']) {
      expect(text).toContain(command);
    }
  });

  it('says what each conflict reason means, so none is resolved by guesswork', () => {
    for (const why of ['edited here', 'wizard rewrote it', 'deleted here']) {
      expect(text).toContain(why);
    }
    expect(text).toContain('notes');
  });

  it('is the description the handoff line is written from', () => {
    const listed = WIZARD_SKILLS.find((skill) => skill.name === SKILL);
    expect(listed?.description).toBeTruthy();
  });
});
