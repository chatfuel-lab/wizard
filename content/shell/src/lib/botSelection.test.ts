import { afterEach, describe, expect, it } from 'vitest';
import { registerDeviceCache } from '../modules/shellApi';
import { resolveSelection, workspaceOptions, writeStoredSelection, type WorkspaceOption } from './botSelection';

/**
 * The rules that decide which bot the app mounts. The account is the referee:
 * a remembered id whose bot has since been deleted must not strand anybody on
 * an empty screen, and the wizard's starting point must not override a choice
 * somebody made afterwards.
 */

const ACCOUNT: WorkspaceOption[] = [
  {
    id: 'ws-1',
    title: 'Acme',
    bots: [
      { id: 'b1', title: 'Support' },
      { id: 'b2', title: 'Sales' },
    ],
  },
  { id: 'ws-2', title: 'Northwind', bots: [{ id: 'b3', title: 'Main' }] },
  { id: 'ws-3', title: 'Sandbox', bots: [] },
];

describe('resolveSelection', () => {
  it('hands the stored ids back untouched before the account has arrived', () => {
    expect(
      resolveSelection({ workspaces: [], stored: { workspaceId: 'ws-2', botId: 'b3' }, defaultWorkspaceId: 'ws-1' }),
    ).toEqual({ workspaceId: 'ws-2', botId: 'b3' });
  });

  it('falls back to the env default when nothing was ever chosen', () => {
    expect(resolveSelection({ workspaces: [], stored: {}, defaultWorkspaceId: 'ws-1' })).toEqual({
      workspaceId: 'ws-1',
      botId: '',
    });
  });

  it('prefers what was last chosen over the wizard’s starting point', () => {
    expect(
      resolveSelection({
        workspaces: ACCOUNT,
        stored: { workspaceId: 'ws-2', botId: 'b3' },
        defaultWorkspaceId: 'ws-1',
      }),
    ).toEqual({ workspaceId: 'ws-2', botId: 'b3' });
  });

  it('opens the wizard’s workspace on a first visit, on its first bot', () => {
    expect(resolveSelection({ workspaces: ACCOUNT, stored: {}, defaultWorkspaceId: 'ws-2' })).toEqual({
      workspaceId: 'ws-2',
      botId: 'b3',
    });
  });

  it('follows the bot when the stored workspace is gone but the bot is not', () => {
    // A bot can be moved between workspaces; the remembered bot says where.
    expect(
      resolveSelection({
        workspaces: ACCOUNT,
        stored: { workspaceId: 'gone', botId: 'b1' },
        defaultWorkspaceId: 'ws-2',
      }),
    ).toEqual({ workspaceId: 'ws-1', botId: 'b1' });
  });

  it('falls back to the default when both stored ids are gone', () => {
    expect(
      resolveSelection({
        workspaces: ACCOUNT,
        stored: { workspaceId: 'gone', botId: 'gone' },
        defaultWorkspaceId: 'ws-2',
      }),
    ).toEqual({ workspaceId: 'ws-2', botId: 'b3' });
  });

  it('keeps the workspace but moves on when only the bot is gone', () => {
    expect(
      resolveSelection({ workspaces: ACCOUNT, stored: { workspaceId: 'ws-1', botId: 'gone' }, defaultWorkspaceId: '' }),
    ).toEqual({ workspaceId: 'ws-1', botId: 'b1' });
  });

  it('lets a stored bot name its own workspace when only the bot was remembered', () => {
    expect(resolveSelection({ workspaces: ACCOUNT, stored: { botId: 'b3' }, defaultWorkspaceId: 'ws-1' })).toEqual({
      workspaceId: 'ws-2',
      botId: 'b3',
    });
  });

  it('skips an empty workspace when picking on its own, but honours one chosen deliberately', () => {
    // Nothing stored and no usable default: the first workspace with something in it.
    expect(
      resolveSelection({
        workspaces: [ACCOUNT[2]!, ACCOUNT[1]!],
        stored: {},
        defaultWorkspaceId: '',
      }),
    ).toEqual({ workspaceId: 'ws-2', botId: 'b3' });

    // Chosen: stay there and report the empty bot, so the app can say so.
    expect(
      resolveSelection({ workspaces: ACCOUNT, stored: { workspaceId: 'ws-3' }, defaultWorkspaceId: 'ws-1' }),
    ).toEqual({ workspaceId: 'ws-3', botId: '' });
  });

  it('settles on the first workspace when the account holds nothing but empty ones', () => {
    expect(resolveSelection({ workspaces: [ACCOUNT[2]!], stored: {}, defaultWorkspaceId: '' })).toEqual({
      workspaceId: 'ws-3',
      botId: '',
    });
  });
});

describe('workspaceOptions', () => {
  it('leaves a title that stands alone untouched', () => {
    expect(workspaceOptions(ACCOUNT).map((o) => o.title)).toEqual(['Acme', 'Northwind', 'Sandbox']);
  });

  it('tells same-named workspaces apart by what is inside them', () => {
    // Chatfuel leaves a throwaway "My Workspace" behind for every bot created
    // without naming one, so an account collects several.
    const options = workspaceOptions([
      { id: 'w1', title: 'My Workspace', bots: [{ id: 'b1', title: 'Test2' }] },
      { id: 'w2', title: 'My Workspace', bots: [{ id: 'b2', title: 'Test3' }] },
    ]);
    expect(options.map((o) => o.title)).toEqual(['My Workspace — Test2', 'My Workspace — Test3']);
  });

  it('falls back to the id when they are alike all the way down', () => {
    const options = workspaceOptions([
      { id: 'aaaaaa111111', title: 'My Workspace', bots: [] },
      { id: 'bbbbbb222222', title: 'My Workspace', bots: [] },
    ]);
    expect(options.map((o) => o.title)).toEqual(['My Workspace — no bots · 111111', 'My Workspace — no bots · 222222']);
    expect(new Set(options.map((o) => o.title)).size).toBe(2);
  });
});

describe('remembering the choice', () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
  let swept = 0;
  const undo = registerDeviceCache(() => {
    swept += 1;
  });

  const withStorage = (run: () => void) => {
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    run();
  };

  afterEach(() => {
    map.clear();
    swept = 0;
    if (real) Object.defineProperty(globalThis, 'localStorage', real);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('drops what the modules cached when the bot changes', () => {
    /* Another bot is another subject, and what a module kept on the device is
       the last one's — a flow builder snapshot is a whole flow. */
    withStorage(() => {
      map.set('chatfuel.bot', 'b1');
      writeStoredSelection({ workspaceId: 'ws-1', botId: 'b2' });
    });
    expect(swept).toBe(1);
    expect(map.get('chatfuel.bot')).toBe('b2');
  });

  it('keeps them when the same bot is written again', () => {
    // Re-choosing the bot already open is not a change of subject, and dropping
    // the cache there would cost the next paint for nothing.
    withStorage(() => {
      map.set('chatfuel.bot', 'b1');
      writeStoredSelection({ workspaceId: 'ws-1', botId: 'b1' });
    });
    expect(swept).toBe(0);
  });

  it('keeps them on the first choice of the session', () => {
    // Nothing was remembered, so nothing was cached under another bot.
    withStorage(() => writeStoredSelection({ workspaceId: 'ws-1', botId: 'b1' }));
    expect(swept).toBe(0);
    expect(map.get('chatfuel.workspace')).toBe('ws-1');
  });

  it('stops sweeping once the registration is undone', () => {
    undo();
    withStorage(() => {
      map.set('chatfuel.bot', 'b1');
      writeStoredSelection({ workspaceId: 'ws-1', botId: 'b2' });
    });
    expect(swept).toBe(0);
  });
});
