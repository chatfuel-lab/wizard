/**
 * `createAuthRuntime` — the shell calls this once per mount (HostIntegration.create).
 * Builds the Supabase adapter, the components that close over it, and exposes
 * the token getter + the session-lost channel.
 */
import { clearDeviceCaches } from '../shellApi';
import type { ReactNode } from 'react';
import type { AppRoute, HostRuntime, Navigate } from '../types';
import type { BotRef } from './types';
import { chooseBot, sameBots } from './lib/botChoice';
import { AuthGate } from './AuthGate';
import { UserMenuItem } from './UserMenuItem';
import { TeamRoutePage } from './team/TeamRoutePage';
import { AUTH_ROUTES, setBasePath } from './lib/authRoutes';
import type { AuthAdapter } from './types';

export interface SessionLostBus {
  emit(err: unknown): void;
  subscribe(cb: (err: unknown) => void): () => void;
}

function createSessionLostBus(): SessionLostBus {
  const listeners = new Set<(err: unknown) => void>();
  return {
    emit: (err) => {
      for (const cb of [...listeners]) cb(err);
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

export const authRoutes = AUTH_ROUTES;

export interface CreateAuthRuntimeInput {
  env: Record<string, string | undefined>;
  basePath: string;
  /** The deployment's mark, already resolved by the host (see HostIntegration). */
  appLogo?: string;
}

export function createAuthRuntime(input: CreateAuthRuntimeInput): HostRuntime | null {
  /* The invite and recovery links this module mails are absolute, and only the
     shell knows where the app is mounted. */
  setBasePath(input.basePath);
  const adapter = pickAdapter(input);
  if (!adapter) return null;
  return buildRuntime(adapter, input.env.VITE_APP_NAME || 'Chatfuel App', input.appLogo);
}

function pickAdapter(input: CreateAuthRuntimeInput): AuthAdapter | null {
  const url = input.env.VITE_SUPABASE_URL;
  const anonKey = input.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createSupabaseAdapterLazy({ url, anonKey });
}

/**
 * The Supabase adapter is a separate chunk (supabase-js is ~60 KB gzip) but the
 * runtime must be sync — so it is wrapped: every call awaits the module import.
 * Only a Supabase-configured deployment ever fetches it.
 */
function createSupabaseAdapterLazy(config: { url: string; anonKey: string }): AuthAdapter {
  const loading = import('./adapters/supabaseAdapter').then((m) => m.createSupabaseAdapter(config));
  const call = <K extends keyof AuthAdapter>(key: K) =>
    ((...args: unknown[]) => loading.then((a) => (a[key] as (...x: unknown[]) => unknown)(...args))) as AuthAdapter[K];
  return {
    getSession: call('getSession'),
    getAccessToken: call('getAccessToken'),
    refreshSession: call('refreshSession'),
    onAuthStateChange(cb) {
      let off: (() => void) | null = null;
      let disposed = false;
      void loading.then((a) => {
        if (disposed) return;
        off = a.onAuthStateChange(cb);
      });
      return () => {
        disposed = true;
        off?.();
      };
    },
    signInWithPassword: call('signInWithPassword'),
    signUp: call('signUp'),
    resetPasswordForEmail: call('resetPasswordForEmail'),
    verifyRecoveryToken: call('verifyRecoveryToken'),
    updatePassword: call('updatePassword'),
    signOut: call('signOut'),
    invitePreview: call('invitePreview'),
    myMembership: call('myMembership'),
    provisionWorkspace: call('provisionWorkspace'),
    acceptInvite: call('acceptInvite'),
    listMembers: call('listMembers'),
    listInvites: call('listInvites'),
    createInvite: call('createInvite'),
    revokeInvite: call('revokeInvite'),
    changeRole: call('changeRole'),
    removeMember: call('removeMember'),
    transferOwnership: call('transferOwnership'),
    leaveTenant: call('leaveTenant'),
    createBot: call('createBot'),
    renameBot: call('renameBot'),
    deleteBot: call('deleteBot'),
    listBots: call('listBots'),
    grantBot: call('grantBot'),
    revokeBot: call('revokeBot'),
    // Presence is decided by the real adapter (server route availability); the
    // lazy wrapper always offers it and lets the call fail with NotAllowed.
    generateRecoveryLink: (email: string) =>
      loading.then((a) => {
        if (!a.generateRecoveryLink) throw new Error('Recovery links are not enabled on this deployment');
        return a.generateRecoveryLink(email);
      }),
  };
}

/**
 * Which bot this person was last working in, remembered per account so two
 * people sharing a browser do not land in each other's. Deliberately not in the
 * URL: a link handed to a colleague must open in the bot THEY may open.
 */
const BOT_KEY_PREFIX = 'chatfuel.auth.bot:';

const readStoredBot = (userId: string): string | null => {
  try {
    return window.localStorage.getItem(BOT_KEY_PREFIX + userId);
  } catch {
    return null;
  }
};

const writeStoredBot = (userId: string, botId: string | null): void => {
  try {
    if (botId) window.localStorage.setItem(BOT_KEY_PREFIX + userId, botId);
    else window.localStorage.removeItem(BOT_KEY_PREFIX + userId);
  } catch {
    /* Private mode, a sandboxed frame: the choice just does not outlive the tab. */
  }
};

function buildRuntime(adapter: AuthAdapter, appName: string, appLogo?: string): HostRuntime {
  const sessionLost = createSessionLostBus();
  /*
   * Session and workspace as one external store, because the shell needs both
   * and needs them to change together: WHO is signed in decides when the chrome
   * may show a name, and WHICH bot they are in decides what the modules ask for.
   * Every getter must be referentially stable between real changes —
   * `useSyncExternalStore` re-renders forever otherwise — so all of them are
   * plain variables written on an event, never computed on read. That is also
   * why `bots` is replaced only when it actually differs.
   */
  let userId = 'anon';
  let bots: BotRef[] = [];
  let botId: string | null = null;
  let workspaceName: string | null = null;
  const sessionListeners = new Set<() => void>();
  const notify = () => {
    for (const cb of [...sessionListeners]) cb();
  };
  adapter.onAuthStateChange((_event, session) => {
    const nextUser = session?.user.id ?? 'anon';
    if (nextUser === userId) return;
    userId = nextUser;
    // A different person is a different workspace until the gate says otherwise.
    bots = [];
    botId = null;
    workspaceName = null;
    notify();
  });
  return {
    getAccessToken: () => adapter.getAccessToken(),
    onSessionLost: (err) => sessionLost.emit(err),
    subscribeSession: (cb) => {
      sessionListeners.add(cb);
      return () => {
        sessionListeners.delete(cb);
      };
    },
    getBotId: () => botId,
    getBots: () => bots,
    selectBot: (next) => {
      if (next === botId || !bots.some((bot) => bot.botId === next)) return;
      /* Another bot is another subject: what modules cached on the device
         belongs to the one being left. */
      clearDeviceCaches();
      botId = next;
      writeStoredBot(userId, next);
      notify();
    },
    getWorkspaceName: () => workspaceName,
    Gate: ({ route, navigate, children }: { route: AppRoute; navigate: Navigate; children: ReactNode }) => (
      <AuthGate
        adapter={adapter}
        sessionLost={sessionLost}
        route={route}
        navigate={navigate}
        appName={appName}
        appLogo={appLogo}
        onWorkspace={(membership) => {
          const nextBots = membership?.tenant.bots ?? [];
          const nextName = membership?.tenant.name ?? null;
          const botsChanged = !sameBots(bots, nextBots);
          if (botsChanged) bots = nextBots;
          const nextBotId = chooseBot({ bots: nextBots, stored: readStoredBot(userId), current: botId });
          const changed = botsChanged || nextName !== workspaceName || nextBotId !== botId;
          botId = nextBotId;
          workspaceName = nextName;
          if (changed) notify();
        }}
      >
        {children}
      </AuthGate>
    ),
    TopbarItem: ({ route, navigate }: { route: AppRoute; navigate: Navigate }) => (
      <UserMenuItem route={route} navigate={navigate} />
    ),
    Page: ({ route, navigate }: { route: AppRoute; navigate: Navigate }) => (
      <TeamRoutePage route={route} navigate={navigate} />
    ),
  };
}
