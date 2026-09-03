import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Which agent the run is written for decides where the skills are copied, and
 * that has to be settled before anything is written. The rules worth pinning
 * are the ones a wrong answer is expensive for: --agent must beat detection, a
 * single installed agent must never be asked about, and a --yes run must not
 * stop on a question nobody is there to answer.
 *
 * clack is replaced with prompts that THROW, so every case below fails loudly
 * if the step asks when it should not have. The one case that IS a question
 * swaps in an answering select of its own.
 */
let selectAnswer: unknown;
let selectCalls = 0;
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted when it should not have: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: () => {
      selectCalls += 1;
      if (selectAnswer === undefined) throw new Error('prompted when it should not have: select');
      return Promise.resolve(selectAnswer);
    },
    multiselect: prompted('multiselect'),
    confirm: prompted('confirm'),
    isCancel: (value: unknown) => value === CANCEL,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
    spinner: () => ({
      start: () => undefined,
      message: () => undefined,
      stop: () => undefined,
      error: () => undefined,
    }),
  };
});

const CANCEL = Symbol('cancel');

const { AGENTS } = await import('../src/agents');
const { createContext } = await import('../src/run');
const { agentPick, assertAgentFlags } = await import('../src/steps/agentPick');
type AgentSpec = import('../src/agents').AgentSpec;
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

function ctxWith(present: AgentSpec[], flags: Partial<WizardFlags> = {}): WizardContext {
  const ctx = createContext({ yes: false, dryRun: true, verbose: false, ...flags });
  ctx.answers.agentsPresent = present;
  return ctx;
}

beforeEach(() => {
  selectAnswer = undefined;
  selectCalls = 0;
});

describe('assertAgentFlags', () => {
  it('names the valid ids when --agent is not one of them', () => {
    let thrown: unknown;
    try {
      assertAgentFlags(ctxWith([], { agent: 'copilot' }));
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error).message).toContain('copilot');
    // The hint is where a person finds out what to type instead.
    expect((thrown as { hint?: string }).hint).toContain('claude, codex');
  });

  it('passes an id the wizard knows, and an absent flag', () => {
    expect(() => assertAgentFlags(ctxWith([], { agent: 'codex' }))).not.toThrow();
    expect(() => assertAgentFlags(ctxWith([]))).not.toThrow();
  });
});

describe('agentPick', () => {
  it('takes the only agent on PATH without asking', async () => {
    const ctx = ctxWith([AGENTS.codex]);
    await agentPick(ctx);
    expect(ctx.answers.agentTarget).toBe(AGENTS.codex);
    expect(ctx.answers.agent?.command).toBe('codex');
    expect(selectCalls).toBe(0);
  });

  it('asks once when both are installed', async () => {
    selectAnswer = AGENTS.codex;
    const ctx = ctxWith([AGENTS.claude, AGENTS.codex]);
    await agentPick(ctx);
    expect(selectCalls).toBe(1);
    expect(ctx.answers.agentTarget).toBe(AGENTS.codex);
  });

  it('never asks under --yes, even with both installed', async () => {
    const ctx = ctxWith([AGENTS.claude, AGENTS.codex], { yes: true });
    await agentPick(ctx);
    expect(ctx.answers.agentTarget).toBe(AGENTS.claude);
    expect(selectCalls).toBe(0);
  });

  it('lets --agent beat what is on PATH', async () => {
    const ctx = ctxWith([AGENTS.claude], { agent: 'codex' });
    await agentPick(ctx);
    expect(ctx.answers.agentTarget).toBe(AGENTS.codex);
    // Nothing to launch: the handoff installs the one that was asked for.
    expect(ctx.answers.agent).toBeUndefined();
    expect(selectCalls).toBe(0);
  });

  it('leaves the choice open when neither is installed', async () => {
    const ctx = ctxWith([]);
    await agentPick(ctx);
    expect(ctx.answers.agentTarget).toBeUndefined();
    expect(selectCalls).toBe(0);
  });

  it('stops the run when the question is cancelled', async () => {
    selectAnswer = CANCEL;
    await expect(agentPick(ctxWith([AGENTS.claude, AGENTS.codex]))).rejects.toThrow('Cancelled.');
  });
});
