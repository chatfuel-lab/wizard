import { describe, expect, it, vi } from 'vitest';

/**
 * The Chatfuel workspace is the BILLING container: whatever this step picks is
 * where every account's bot is created, and therefore whose plan pays for it.
 * So the rules worth pinning are the ones an operator would be hurt by getting
 * wrong — a wrong id must not be silently ignored, a --yes run must not guess
 * between two workspaces, and a full workspace must be said out loud rather
 * than discovered at the first sign-up.
 *
 * clack is replaced with prompts that THROW: every case here is a
 * non-interactive path, so a prompt means the step asked when it should not
 * have.
 */
const warnings: string[] = [];
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted when it should not have: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: prompted('confirm'),
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: (m: string) => warnings.push(m),
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
    spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined }),
  };
});

const { ChatfuelGraphQLError } = await import('@chatfuel/api-client');
const { createContext } = await import('../src/run');
const { workspacePick } = await import('../src/steps/workspacePick');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

interface FakeWorkspace {
  id: string;
  title: string;
  botsLimit: number;
  bots: Array<{ id: string }>;
}

const ws = (id: string, title: string, botsLimit: number, bots: number): FakeWorkspace => ({
  id,
  title,
  botsLimit,
  bots: Array.from({ length: bots }, (_, i) => ({ id: `${id}-bot-${i}` })),
});

const created: Array<Omit<FakeWorkspace, 'bots'>> = [];

function ctxWith(
  workspaces: FakeWorkspace[],
  flags: Partial<WizardFlags> = {},
  onCreate: () => Omit<FakeWorkspace, 'bots'> = () => ({ id: 'new', title: 'My Workspace', botsLimit: 1 }),
): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false, ...flags });
  ctx.answers.modules = ['core', 'auth'];
  ctx.client = {
    query: async () => ({ currentUser: { id: 'u1', workspaces } }),
    mutate: async () => {
      const workspace = onCreate();
      created.push(workspace);
      return { workspaceCreate: workspace };
    },
  } as unknown as WizardContext['client'];
  return ctx;
}

describe('workspacePick', () => {
  it('takes the only workspace without asking', async () => {
    const ctx = ctxWith([ws('w1', 'Agency', 20, 3)]);
    await workspacePick(ctx);
    expect(ctx.answers.workspace).toEqual({ id: 'w1', title: 'Agency', botsLimit: 20, botCount: 3 });
    expect(ctx.answers.env.CHATFUEL_WORKSPACE_ID).toBe('w1');
  });

  it('uses --workspace over the picker', async () => {
    const ctx = ctxWith([ws('w1', 'Agency', 20, 3), ws('w2', 'Side', 5, 0)], { workspace: 'w2' });
    await workspacePick(ctx);
    expect(ctx.answers.workspace?.id).toBe('w2');
  });

  it('refuses a --workspace id this account does not have', async () => {
    const ctx = ctxWith([ws('w1', 'Agency', 20, 3)], { workspace: 'nope' });
    await expect(workspacePick(ctx)).rejects.toThrow(/not a workspace of this account/);
  });

  it('refuses to guess between two workspaces in a --yes run', async () => {
    const ctx = ctxWith([ws('w1', 'Agency', 20, 3), ws('w2', 'Side', 5, 0)], { yes: true });
    await expect(workspacePick(ctx)).rejects.toThrow(/needs a Chatfuel workspace/);
  });

  // The bot list is not selected on the created workspace: asking for it makes
  // the bot service refuse, and the workspace is made anyway — so the run would
  // fail while leaving a real workspace behind.
  it('creates one when the account has none', async () => {
    created.length = 0;
    const ctx = ctxWith([]);
    await workspacePick(ctx);
    expect(created).toHaveLength(1);
    expect(ctx.answers.workspace).toEqual({ id: 'new', title: 'My Workspace', botsLimit: 1, botCount: 0 });
    expect(ctx.answers.env.CHATFUEL_WORKSPACE_ID).toBe('new');
  });

  it('says so when the account may not create another workspace', async () => {
    const ctx = ctxWith([]);
    ctx.client = {
      query: async () => ({ currentUser: { id: 'u1', workspaces: [] } }),
      mutate: async () => {
        throw new ChatfuelGraphQLError([{ message: 'too many', extensions: { code: 'TooManyWorkspaces' } }]);
      },
    } as unknown as WizardContext['client'];
    await expect(workspacePick(ctx)).rejects.toThrow(/workspace limit/);
  });

  it('warns that a full workspace cannot take a sign-up', async () => {
    warnings.length = 0;
    await workspacePick(ctxWith([ws('w1', 'Agency', 3, 3)]));
    expect(warnings.join('\n')).toMatch(/is full \(3\/3 bots\)/);
  });

  it('warns when only one bot fits', async () => {
    warnings.length = 0;
    await workspacePick(ctxWith([ws('w1', 'Agency', 1, 0)]));
    expect(warnings.join('\n')).toMatch(/only the first account/);
  });
});
