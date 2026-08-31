import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTestClient } from '../testClient';
import { ModuleRoot, ToastProvider } from '~ui';
import { AdminApp } from './AdminApp';
import { AdminContext, type AdminContextValue } from './AdminContext';
import { LockScreen } from './components/LockScreen';
import { HealthGrid } from './components/HealthGrid';
import { AccessTable, grantOptions, type AccessRow } from './components/AccessTable';
import { adminReducer, initialAdminState, type AdminState } from './lib/adminStore';
import { parseAddress } from './lib/adminParams';
import type { AdminStore } from './hooks/useAdminStore';
import type { AdminHealth, AdminOverview, AdminTenant } from './types';
import { BotsView } from './views/BotsView';
import { HealthView } from './views/HealthView';
import { AccessView } from './views/AccessView';

/**
 * The white-screen guard.
 *
 * This suite runs without a browser, so nothing else here can see a component
 * that throws on its first render — it type-checks, it passes every gate, and
 * it renders nothing. Effects do not run in a server-side render, which for
 * this module means the session probe never answers: mounting `AdminApp` proves
 * the providers hold together and reaches no screen at all. So the lock and the
 * three views are rendered directly, over a store that is already in the state
 * each of them is drawn from.
 */

const OVERVIEW: AdminOverview = {
  account: { id: 'acc', name: 'Acme Agency', email: 'ops@example.com' },
  homeWorkspaceId: 'ws-home',
  capabilities: { access: true },
  workspaces: [
    { id: 'ws-home', title: 'Acme', botsLimit: 3, bots: [{ id: 'bot-a', title: 'Acme Support' }] },
    { id: 'ws-other', title: 'Northwind', botsLimit: 1, bots: [{ id: 'bot-b', title: 'Concierge' }] },
  ],
};

const HEALTH: AdminHealth = {
  upstream: 'https://panel.chatfuel.com',
  tokenEnv: 'CHATFUEL_TOKEN',
  token: { present: true, accepted: true },
  account: OVERVIEW.account,
  fence: { kind: 'account', ok: true, bots: 2 },
  authMode: 'on',
  adminMode: 'on',
  homeWorkspaceId: 'ws-home',
  supabase: { configured: true, serviceRole: true, reachable: true },
  publishingQueue: true,
  scheduling: false,
  egress: 'direct',
  problems: ['ProxyWorkspaceMissing'],
};

const TENANTS: AdminTenant[] = [
  {
    id: 'tenant-1',
    name: 'Bakery',
    createdAt: '2026-01-01T00:00:00.000Z',
    members: [
      { userId: 'u1', role: 'owner', email: 'owner@example.com', name: 'Owner', joinedAt: '2026-01-01T00:00:00.000Z' },
      {
        userId: 'u2',
        role: 'member',
        email: 'member@example.com',
        name: 'Member',
        joinedAt: '2026-01-02T00:00:00.000Z',
      },
    ],
    bots: [
      {
        slotId: 'slot-1',
        botId: 'bot-a',
        name: 'Acme Support',
        createdAt: '2026-01-01T00:00:00.000Z',
        granted: ['u2'],
      },
    ],
  },
];

const state = (over: Partial<AdminState> = {}): AdminState => {
  const started = adminReducer({ ...initialAdminState(), session: 'unlocked' }, { type: 'load' });
  return { ...adminReducer(started, { type: 'loaded', overview: OVERVIEW, epoch: started.epoch }), ...over };
};

const never = async (): Promise<void> => undefined;

const storeOf = (over: Partial<AdminState> = {}): AdminStore => ({
  state: state(over),
  unlock: never,
  lock: never,
  refresh: () => undefined,
  openWorkspace: () => undefined,
  openBot: () => undefined,
  loadHealth: () => undefined,
  loadTenants: () => undefined,
  createBot: never,
  renameBot: never,
  deleteBot: never,
  registerScheduler: never,
  grantBot: never,
  revokeBot: never,
});

function Harness({ children, store }: { children: React.ReactNode; store: AdminStore }) {
  /* Nothing here may consume the context it renders: a hook that needs a
     provider runs before the provider written above it exists. */
  const value: AdminContextValue = {
    client: createTestClient(),
    store,
    selectBot: () => undefined,
  };
  return (
    <ToastProvider>
      <AdminContext.Provider value={value}>
        <ModuleRoot>{children}</ModuleRoot>
      </AdminContext.Provider>
    </ToastProvider>
  );
}

describe('the module mounts', () => {
  const render = (view = '', query = '') =>
    renderToStaticMarkup(
      <AdminApp
        botId="bot-1"
        client={createTestClient()}
        view={view}
        setView={() => undefined}
        params={new URLSearchParams(query)}
        setParams={() => undefined}
        navigate={() => undefined}
      />,
    );

  it('mounts on every view, and on one nobody would type', () => {
    for (const view of ['', 'access', 'health', 'nonsense']) {
      expect(() => render(view)).not.toThrow();
    }
  });
});

describe('the lock screen renders', () => {
  const draw = (session: Parameters<typeof LockScreen>[0]['session']) =>
    renderToStaticMarkup(<LockScreen session={session} onUnlock={never} />);

  it('asks for the password', () => {
    const html = draw('locked');
    expect(html).toContain('Admin');
    expect(html).toContain('Password');
    expect(html).toContain('Unlock');
  });

  it('says so instead when there is no panel to unlock', () => {
    const html = draw('absent');
    expect(html).toContain('ADMIN_PASSWORD');
    expect(html).not.toContain('Unlock');
  });

  it('names the reason a set password is still refused', () => {
    expect(draw('misconfigured')).toContain('16 characters');
  });
});

describe('the bots view renders', () => {
  const draw = (query = '', over: Partial<AdminState> = {}) =>
    renderToStaticMarkup(
      <Harness store={storeOf(over)}>
        <BotsView band="wide" address={parseAddress('', new URLSearchParams(query))} patch={() => undefined} />
      </Harness>,
    );

  it('draws the rail, the workspace it opened on and its bots', () => {
    const html = draw();
    expect(html).toContain('aria-label="Workspaces"');
    expect(html).toContain('Acme');
    expect(html).toContain('Northwind');
    expect(html).toContain('Acme Support');
    expect(html).toContain('New bot');
  });

  it('marks the workspace this deployment is built on', () => {
    expect(draw()).toContain('This app');
  });

  it('opens on the workspace the address names', () => {
    expect(draw('w=ws-other')).toContain('Concierge');
  });

  it('falls back to the deployment’s own workspace, never to whatever is first', () => {
    /* On a real account the first workspace the API names is usually an empty
       leftover, so "the first row" is the wrong default. */
    expect(() => draw('w=ws-vanished')).not.toThrow();
    expect(draw('w=ws-vanished')).toContain('Acme Support');
  });

  it('puts the deployment’s own workspace at the top of the rail, whatever order it arrived in', () => {
    const shuffled = state();
    const workspaces = [...shuffled.overview!.workspaces].reverse();
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ overview: { ...shuffled.overview!, workspaces } })}>
        <BotsView band="wide" address={parseAddress('', new URLSearchParams())} patch={() => undefined} />
      </Harness>,
    );
    expect(html.indexOf('Acme')).toBeLessThan(html.indexOf('Northwind'));
  });

  it('stands in while the first answer is in flight, and says so when it fails', () => {
    expect(draw('', { overview: null, loading: true })).toContain('aria-label="Loading"');
    const failed = draw('', { overview: null, loading: false, error: 'Chatfuel said no' });
    expect(failed).toContain('Chatfuel said no');
    expect(failed).toContain('Try again');
  });
});

describe('the health view renders', () => {
  it('reports every secret as a yes or no and never as a value', () => {
    const html = renderToStaticMarkup(<HealthGrid health={HEALTH} />);
    expect(html).toContain('Chatfuel token');
    expect(html).toContain('Accepted');
    expect(html).toContain('CHATFUEL_TOKEN');
    expect(html).toContain('ProxyWorkspaceMissing');
    /* The variable's NAME is on screen; nothing that could be its value is. */
    expect(html).not.toContain('Bearer');
  });

  it('waits rather than drawing an empty grid', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf()}>
        <HealthView />
      </Harness>,
    );
    expect(html).toContain('aria-label="Loading"');
  });

  it('draws the tiles once the answer is in', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ health: HEALTH })}>
        <HealthView />
      </Harness>,
    );
    expect(html).toContain('Publish queue');
  });

  it('offers to enable scheduling while the timer has nowhere to call', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ health: HEALTH })}>
        <HealthView />
      </Harness>,
    );
    expect(html).toContain('Enable scheduled posts');
  });

  it('offers to register again once it is on, for an address that changed', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ health: { ...HEALTH, scheduling: true } })}>
        <HealthView />
      </Harness>,
    );
    expect(html).toContain('Register again');
    expect(html).not.toContain('Enable scheduled posts');
  });

  it('says so rather than guessing when the database could not be asked', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ health: { ...HEALTH, scheduling: null } })}>
        <HealthView />
      </Harness>,
    );
    expect(html).toContain('Unknown');
  });

  it('offers nothing where there is no queue to schedule for', () => {
    const html = renderToStaticMarkup(
      <Harness store={storeOf({ health: { ...HEALTH, publishingQueue: false, scheduling: null } })}>
        <HealthView />
      </Harness>,
    );
    expect(html).not.toContain('Scheduled posts');
  });
});

describe('the access view renders', () => {
  it('says an owner reaches every bot rather than listing grants they do not hold', () => {
    const html = renderToStaticMarkup(
      <AccessTable tenants={TENANTS} unassigned={[]} onGrant={never} onRevoke={never} />,
    );
    expect(html).toContain('owner@example.com');
    expect(html).toContain('Every bot in this workspace');
    expect(html).toContain('Acme Support');
  });

  it('mounts under its providers, before and after the answer', () => {
    for (const tenants of [null, TENANTS]) {
      expect(() =>
        renderToStaticMarkup(
          <Harness store={storeOf({ tenants })}>
            <AccessView />
          </Harness>,
        ),
      ).not.toThrow();
    }
  });
});

/**
 * The dialog's list of bots, which no static render reaches: it is drawn only
 * once a row has been picked, and effects do not run here.
 */
describe('the grant dialog offers', () => {
  const row = (): AccessRow => {
    const tenant: AdminTenant = {
      ...TENANTS[0]!,
      bots: [
        ...TENANTS[0]!.bots,
        { slotId: 'slot-2', botId: 'bot-b', name: 'Concierge', createdAt: '2026-01-03T00:00:00.000Z', granted: [] },
      ],
    };
    const member = tenant.members.find((m) => m.role === 'member')!;
    return {
      key: `${tenant.id}:${member.userId}`,
      tenant,
      member,
      granted: tenant.bots.filter((bot) => bot.granted.includes(member.userId)),
    };
  };

  it('the workspace bots this person does not already reach', () => {
    expect(grantOptions(row(), [])).toEqual([{ value: 'bot-b', label: 'Concierge' }]);
  });

  /* A bot with no workspace is in no tenant's `bots`, and granting it is the
     only thing that ever gives it one — so a dialog without it made "assign it
     later" a door that opens one way. */
  it('a bot no workspace has claimed', () => {
    const options = grantOptions(row(), [
      { slotId: 'slot-x', botId: 'b-x', name: 'Unclaimed', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(options).toContainEqual({ value: 'b-x', label: 'Unclaimed · no workspace yet' });
  });
});
