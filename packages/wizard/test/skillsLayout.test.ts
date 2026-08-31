import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AGENTS } from '../src/agents';
import { createContext } from '../src/run';
import { appLockPath, writeAppLock } from '../src/scaffold/appLock';
import { installSkills, relayoutSkills, skillsRoot } from '../src/scaffold/skills';
import type { AppLock } from '../src/scaffold/appLock';
import type { AgentId } from '../src/agents';
import type { WizardContext } from '../src/context';

/**
 * Claude Code reads .claude/skills and Codex reads .agents/skills, and neither
 * looks in the other's directory. Skills in the wrong one are not a cosmetic
 * problem: they are simply never loaded.
 */
let appDir: string;

function ctxFor(agent?: AgentId): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir: appDir });
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.appDir = appDir;
  ctx.answers.skillsTarget = 'project';
  if (agent) ctx.answers.agentTarget = AGENTS[agent];
  return ctx;
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'chatfuel-skills-'));
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(appDir, { recursive: true, force: true });
});

describe('skills layout', () => {
  it('installs into the directory the resolved agent reads', async () => {
    await installSkills(ctxFor('codex'));
    expect(existsSync(join(appDir, '.agents/skills/chatfuel-core/SKILL.md'))).toBe(true);
    expect(existsSync(join(appDir, '.claude'))).toBe(false);
  });

  it('defaults to Claude while no agent is resolved', async () => {
    const ctx = ctxFor();
    await installSkills(ctx);
    expect(existsSync(join(appDir, '.claude/skills/chatfuel-core/SKILL.md'))).toBe(true);
    expect(ctx.answers.skillsLayout).toBe('claude');
  });

  it('puts a global install under the agent directory in $HOME', () => {
    const ctx = ctxFor('codex');
    ctx.answers.skillsTarget = 'global';
    expect(skillsRoot(ctx)).toBe(join(homedir(), '.agents', 'skills'));
  });

  /* The rename loop moves what is on disk. A skill that is not there did not
     move, so carrying its entries across would point them at a second path
     nothing is at — and the next update would call it deleted. */
  it('leaves the entries of a skill that is no longer on disk where they are', async () => {
    const ctx = ctxFor();
    await installSkills(ctx);
    rmSync(join(appDir, '.claude/skills/chatfuel-livechat'), { recursive: true, force: true });
    writeAppLock(appDir, {
      mode: 'standalone',
      wizardVersion: '0.2.0',
      modules: ['core', 'livechat'],
      skills: {},
      files: {
        '.claude/skills/chatfuel-core/SKILL.md': { from: 'content/modules/core/skill/SKILL.md', sha256: 'a' },
        '.claude/skills/chatfuel-livechat/SKILL.md': { from: 'content/modules/livechat/skill/SKILL.md', sha256: 'b' },
      },
    });

    relayoutSkills(ctx, AGENTS.codex);

    const files = (JSON.parse(readFileSync(appLockPath(appDir), 'utf8')) as AppLock).files;
    expect(files['.agents/skills/chatfuel-core/SKILL.md']).toEqual({
      from: 'content/modules/core/skill/SKILL.md',
      sha256: 'a',
    });
    expect(files['.claude/skills/chatfuel-livechat/SKILL.md']).toEqual({
      from: 'content/modules/livechat/skill/SKILL.md',
      sha256: 'b',
    });
    expect(files['.agents/skills/chatfuel-livechat/SKILL.md']).toBeUndefined();
  });

  it('moves the skills when the handoff settles on the other agent', async () => {
    // The run that starts with no agent on PATH: written for Claude, then the
    // user accepts the Codex install at the handoff.
    const ctx = ctxFor();
    await installSkills(ctx);
    const skill = readFileSync(join(appDir, '.claude/skills/chatfuel-core/SKILL.md'), 'utf8');

    relayoutSkills(ctx, AGENTS.codex);

    expect(existsSync(join(appDir, '.agents/skills/chatfuel-core/SKILL.md'))).toBe(true);
    expect(existsSync(join(appDir, '.agents/skills/chatfuel-livechat/SKILL.md'))).toBe(true);
    // The move carries the contents, it does not re-copy them from the content.
    expect(readFileSync(join(appDir, '.agents/skills/chatfuel-core/SKILL.md'), 'utf8')).toBe(skill);
    // The vacated directories go with them — an empty .claude/ in a Codex
    // project is a wrong signpost.
    expect(existsSync(join(appDir, '.claude'))).toBe(false);
    expect(ctx.answers.skillsLayout).toBe('codex');
  });

  /**
   * The lock is written before the handoff, so it names the directory the
   * skills are about to leave. An entry pointing at nothing reads to `update`
   * as a file the person deleted — and the file that did move never sees an
   * update again.
   */
  it('takes the lock entries along with the skills', async () => {
    const ctx = ctxFor();
    await installSkills(ctx);
    writeAppLock(appDir, {
      mode: 'standalone',
      wizardVersion: '0.1.0',
      modules: ['core', 'livechat'],
      skills: { 'chatfuel-core': { module: 'core', from: 'content/modules/core/skill', scope: 'app' } },
      files: {
        '.claude/skills/chatfuel-core/SKILL.md': { from: 'content/modules/core/skill/SKILL.md', sha256: 'digest' },
        'package.json': { generated: 'scaffold' },
      },
    });

    relayoutSkills(ctx, AGENTS.codex);

    const lock = JSON.parse(readFileSync(appLockPath(appDir), 'utf8')) as AppLock;
    expect(lock.files['.agents/skills/chatfuel-core/SKILL.md']).toEqual({
      from: 'content/modules/core/skill/SKILL.md',
      sha256: 'digest',
    });
    expect(lock.files['.claude/skills/chatfuel-core/SKILL.md']).toBeUndefined();
    expect(lock.files['package.json']).toEqual({ generated: 'scaffold' });
  });

  it('leaves the skills alone when the agent already matches', async () => {
    const ctx = ctxFor('codex');
    await installSkills(ctx);
    relayoutSkills(ctx, AGENTS.codex);
    expect(existsSync(join(appDir, '.agents/skills/chatfuel-core/SKILL.md'))).toBe(true);
  });

  it('keeps a shared skills directory that still holds someone else’s work', async () => {
    const ctx = ctxFor();
    await installSkills(ctx);
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(appDir, '.claude/skills/somebody-elses'), { recursive: true });
    writeFileSync(join(appDir, '.claude/skills/somebody-elses/SKILL.md'), '# not ours\n', 'utf8');

    relayoutSkills(ctx, AGENTS.codex);

    expect(existsSync(join(appDir, '.claude/skills/somebody-elses/SKILL.md'))).toBe(true);
    expect(existsSync(join(appDir, '.claude/skills/chatfuel-core'))).toBe(false);
  });
});
