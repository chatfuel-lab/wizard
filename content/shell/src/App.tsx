import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { ModuleClient } from '~api';
import { AppShell, EmptyState, ErrorBoundary, IconWarning, SideNav, Spinner, ThemeToggle, Topbar } from '~ui';
import { createAppClient } from './client';
import { BrandMark } from './BrandMark';
import { APP_LOGO, DASHBOARD_URL } from './lib/brand';
import { Switcher } from './Switcher';
import { useWorkspaces } from './useWorkspaces';
import {
  readStoredSelection,
  resolveSelection,
  workspaceOptions,
  writeStoredSelection,
  type Selection,
} from './lib/botSelection';
import { MODULES } from './modules';
import type { HostBot, HostRuntime, Navigate } from './modules/types';
import { buildNavGroups, railModules } from './modules/navGroups';
import { BASE, interceptLinks, navigatePath, navigateTo, onRouteChange, parseLocation } from './lib/route';
import { ShellHost } from './ShellHost';

/* Where the app opens, not where it is confined: every workspace the token's
   account owns is in the topbar picker, and the bots inside them come from the
   account as it is right now — a bot created after the app went up included. */
const DEFAULT_WORKSPACE: string = import.meta.env.VITE_CHATFUEL_WORKSPACE_ID ?? '';
/* The auth module (if selected) reads these through its host integration —
   still the one place env is read. */
const AUTH_ENV = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_APP_LOGO: import.meta.env.VITE_APP_LOGO,
};

/** Menu + routing see only visible modules; the host integration comes from the hidden one. */
const VISIBLE = MODULES.filter((m) => !m.hidden);
/** The menu is a second, narrower list than the routes — see `railModules`. */
const RAIL = railModules(MODULES);
const HOST = MODULES.find((m) => m.host)?.host ?? null;

const DESTINATIONS = VISIBLE.map((m) => ({ id: m.id, title: m.title }));

/** What a module is told about its neighbours - see ModuleAppProps.installedModules. */
const MODULE_IDS: readonly string[] = VISIBLE.map((module) => module.id);

/**
 * The shell host — the only file that knows about env vars, bot switching and
 * routing. Modules mount below it with everything injected.
 */
/** No auth module → one session, forever; the store never notifies. */
const NO_SESSION_SUBSCRIBE = () => () => undefined;
const NO_HOST_VALUE = () => null;
/** One frozen array, or `useSyncExternalStore` re-renders forever without a host. */
const NO_BOTS: readonly HostBot[] = Object.freeze([]);
const NO_HOST_BOTS = () => NO_BOTS as HostBot[];

export default function App() {
  /* The host runtime (auth) is created once, before the client, because the
     client needs its token getter. Null = no auth configured → open shell. */
  const [host] = useState<HostRuntime | null>(
    () =>
      HOST?.create({
        env: AUTH_ENV,
        basePath: BASE,
        appLogo: APP_LOGO,
      }) ?? null,
  );

  /* Synchronous, and there from the first render: nothing about the client
     waits on a round trip. */
  const [client] = useState<ModuleClient>(() =>
    createAppClient({
      getAccessToken: host ? () => host.getAccessToken() : undefined,
      onSessionError: host ? (err) => host.onSessionLost(err) : undefined,
    }),
  );

  /* The account tree, asked for once. Not with auth on: the proxy refuses
     account-wide queries, and a session owns exactly one bot anyway. */
  const { workspaces, loaded: workspacesLoaded } = useWorkspaces(host ? null : client);
  const [stored, setStored] = useState<Partial<Selection>>(readStoredSelection);
  const selection = resolveSelection({ workspaces, stored, defaultWorkspaceId: DEFAULT_WORKSPACE });
  const [route, setRoute] = useState(() => parseLocation());
  /*
   * With the auth module on, the bots are the SESSION's: the ones this person
   * may open inside the one workspace their account belongs to. Without it,
   * the bot is whichever one of the token's account the topbar points at.
   */
  const subscribeSession = host?.subscribeSession ?? NO_SESSION_SUBSCRIBE;
  const sessionBotId = useSyncExternalStore(subscribeSession, host?.getBotId ?? NO_HOST_VALUE);
  const sessionBots = useSyncExternalStore(subscribeSession, host?.getBots ?? NO_HOST_BOTS);
  const workspaceName = useSyncExternalStore(subscribeSession, host?.getWorkspaceName ?? NO_HOST_VALUE);
  const botId = host ? (sessionBotId ?? '') : selection.botId;
  const currentWorkspace = workspaces.find((w) => w.id === selection.workspaceId);

  /* Remember the pair, including the one resolved on a first visit — a reload
     should land where the last click did. The address bar stays out of it: it
     names a module and its deep-link params, and a link handed to a colleague
     must open in THEIR bot, not in the sender's. */
  useEffect(() => {
    if (host || !selection.workspaceId) return;
    writeStoredSelection(selection);
  }, [host, selection]);

  /* Every write to the address bar comes back through here: `navigate` pushes
     and then dispatches the popstate this is listening for, so a module linking
     into another module, the assistant's undo and the Back button are one path. */
  useEffect(() => onRouteChange(() => setRoute(parseLocation())), []);
  /* Modules write plain links between each other; a plain link inside the app
     is a navigation and not a page load. */
  useEffect(() => interceptLinks(), []);

  const navigate = useCallback<Navigate>((path, options) => navigatePath(path, options), []);

  const isHostRoute = host !== null && route.moduleId !== null && (HOST?.routes ?? []).includes(route.moduleId);
  const active = VISIBLE.find((m) => m.id === route.moduleId) ?? VISIBLE[0];
  /* The module's own view, when the address is actually pointing at it: the
     second segment of '/contacts/fields'. A module we fell back to gets '' —
     it is not the page that was asked for, so it opens at its root. */
  const view = route.moduleId === active?.id ? route.segments.slice(1).join('/') : '';

  /* '/' is nobody's screen: it is reserved for a landing page. Until there is
     one, the app opens on its first module and the address bar says which — the
     first one in the MENU, so a hidden surface is never where the app lands. */
  useEffect(() => {
    const landing = RAIL[0] ?? VISIBLE[0];
    if (route.segments.length === 0 && landing) {
      navigateTo(landing.id, undefined, { replace: true });
    }
  }, [route.segments.length]);

  const selectModule = (id: string) => {
    if (id === active.id) return;
    // Module switch resets the view and the params — deep links are per-module.
    navigateTo(id);
  };

  /* Same move as selectModule, but carrying params: the assistant opens a deep
     link, not just a page. Pushes rather than replaces — landing somewhere you
     did not ask to be must be undoable with Back. */
  const openModule = (moduleId: string, params: URLSearchParams) => {
    navigateTo(moduleId, params);
  };

  const pathOf = (nextView: string) => (nextView === '' ? active.id : `${active.id}/${nextView}`);

  const setParams = (next: URLSearchParams) => {
    navigateTo(pathOf(view), next, { replace: true });
  };

  /* A view is a place: it pushes, so Back returns to the one before it. */
  const setView = (nextView: string, params?: URLSearchParams, options?: { replace?: boolean }) => {
    navigateTo(pathOf(nextView), params ?? route.params, options);
  };

  // Deep links are per-bot — clear the view and params before remounting on
  // either level.
  const switchBot = (next: string) => {
    navigateTo(active.id, undefined, { replace: true });
    setStored({ workspaceId: selection.workspaceId, botId: next });
  };
  const switchWorkspace = (next: string) => {
    navigateTo(active.id, undefined, { replace: true });
    setStored({ workspaceId: next, botId: workspaces.find((w) => w.id === next)?.bots[0]?.id });
  };
  /* Same rule with auth on, except the host owns the choice: deep links are
     per-bot, so the view and its params go before the module remounts. */
  const switchSessionBot = (next: string) => {
    navigateTo(active.id, undefined, { replace: true });
    host?.selectBot(next);
  };
  /* The same two moves, offered to a module (the admin panel opens a bot from
     its table). One entry point rather than two, because which regime is in
     force is the shell's business and not the caller's; the workspace is used
     only where there is a picker for it. */
  const selectBot = (next: string, workspaceId?: string) => {
    if (host) {
      switchSessionBot(next);
      return;
    }
    navigateTo(active.id, undefined, { replace: true });
    setStored({ workspaceId: workspaceId ?? selection.workspaceId, botId: next });
  };

  /* One round trip stands between a first-ever visit and knowing which bot to
     mount. A returning one skips it: the remembered id is there synchronously. */
  if (!host && !workspacesLoaded && !botId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface font-sans">
        <Spinner />
      </div>
    );
  }

  /* Nothing anywhere — no workspace on the account and no remembered bot to
     fall back on. With auth on, an empty bot id means "no workspace yet"
     instead, and the gate is already showing sign-in or the setting-up state. */
  if (!host && workspaces.length === 0 && !botId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface font-sans">
        <EmptyState
          icon={<IconWarning />}
          title="No Chatfuel workspaces"
          description={`This token's account has none. Create one at ${DASHBOARD_URL}.`}
        />
      </div>
    );
  }

  /* Two levels of menu, one level of routing. The groups are this app's
     information architecture and never reach the address bar — it still says
     '/<moduleId>', so every deep link, every embed and the module contract
     itself are untouched by the menu having grown a second level.

     `buildNavGroups` answers with nothing when there is one module to show, and
     AppShell then draws no nav at all — the case a single-module scaffold hits.
     It is given the VISIBLE modules: the auth module is hidden, its surfaces
     hang off the avatar menu, and it is not a destination. */
  const navGroups = buildNavGroups(RAIL);

  const shell = (
    <AppShell
      nav={
        navGroups.length > 0 ? <SideNav groups={navGroups} activeId={active.id} onSelect={selectModule} /> : undefined
      }
      // The same nav as one column. Two slots rather than cloning: a drawer is
      // opened deliberately and read once, so its groups are headings over their
      // modules rather than icons hiding them behind a hover.
      navDrawer={
        navGroups.length > 0 ? (
          <SideNav groups={navGroups} activeId={active.id} onSelect={selectModule} variant="expanded" />
        ) : undefined
      }
      // No module name here. The rail on the left marks the section it is in
      // and names it on hover, and the module prints its own name in its
      // PageHeader — which is the copy that has to stay, because a module also
      // ships as an embed with no rail and no topbar anywhere near it. So the
      // bar answers the other two questions: which product this is, and which
      // account all of it is pointed at.
      //
      // The mark is a different question from the module name and gets a
      // different answer: it is per-DEPLOYMENT, it never changes while the app
      // is open, and without it the same build under two customers looks like
      // the same product.
      //
      // Three deployments, three different honest answers, one slot:
      topbar={
        <Topbar
          brand={<BrandMark />}
          workspace={
            host ? (
              /* The same two levels as below, and for the same reason — except
                 the outer one is not a choice: an account belongs to exactly one
                 workspace, and it is the bots inside it that are switched
                 between. A bot still being created carries no id yet and is not
                 offered; the empty state below is what says so. */
              <>
                {workspaceName ? (
                  <span className="shrink-0 truncate text-meta text-text-muted">{workspaceName}</span>
                ) : null}
                <Switcher
                  label="Switch bot"
                  value={botId}
                  options={sessionBots.flatMap((bot) => (bot.botId ? [{ id: bot.botId, title: bot.name }] : []))}
                  onSwitch={switchSessionBot}
                />
              </>
            ) : (
              /* Where you are, at both levels of the account: the workspace, and
                 the bot inside it. Each collapses to a plain name when there is
                 nothing to choose between. This is the bar's primary content —
                 it used to sit on the right among the session controls, where it
                 read as a setting rather than as where you are. */
              <>
                <Switcher
                  label="Switch workspace"
                  value={selection.workspaceId}
                  options={workspaceOptions(workspaces)}
                  onSwitch={switchWorkspace}
                />
                <Switcher
                  label="Switch bot"
                  value={botId}
                  options={currentWorkspace?.bots ?? []}
                  onSwitch={switchBot}
                />
              </>
            )
          }
          right={
            <>
              <ThemeToggle />
              {host?.TopbarItem ? <host.TopbarItem route={route} navigate={navigate} /> : null}
            </>
          }
        />
      }
    >
      {isHostRoute && host?.Page ? (
        <host.Page route={route} navigate={navigate} />
      ) : host && !botId ? (
        /* Nobody granted them one — the case this is now for. A workspace that
           OWNS none is provisioned instead (see the auth module's
           `needsProvision`), and its own last bot may not be deleted, so an
           owner does not land here. The shell stays up around it: the team page
           behind the avatar menu is where access is handed out, and replacing
           the whole screen would take it away. */
        <EmptyState
          icon={<IconWarning />}
          title="No bots yet"
          description="Open Team from the account menu to add one, or ask an admin to give you access to one."
        />
      ) : !host && !botId ? (
        /* A workspace picked deliberately that holds nothing. The shell stays
           up around it — the picker is the way out, and replacing the whole
           screen would take it away. (With auth on, an empty bot id means "no
           workspace yet" and the gate is already covering the shell.) */
        <EmptyState
          icon={<IconWarning />}
          title="No bots in this workspace"
          description={`Create one at ${DASHBOARD_URL}, or switch workspace above.`}
        />
      ) : (
        /* key remounts the module on switch — fresh subscriptions and state per
           (module, bot). The Suspense is for the module's own chunk on its first
           visit; the fallback is the same spinner every module shows on its own
           first load, so a cold visit is one spinner and not two. */
        <ShellHost route={route} navigate={openModule} destinations={DESTINATIONS}>
          {/* A module that throws while rendering would otherwise unmount the
              whole app — Suspense catches promises, not exceptions. The boundary
              keeps the failure inside the content area, so the nav and the bot
              picker are still there to leave by. Same key as the module: moving
              to another module or another bot is a clean slate, not a screen
              still showing the last one's error. */}
          <ErrorBoundary key={`${active.id}:${botId}`} label={active.title}>
            <Suspense fallback={<Spinner />}>
              <active.Component
                key={`${active.id}:${botId}`}
                botId={botId}
                client={client}
                params={route.params}
                setParams={setParams}
                view={view}
                setView={setView}
                navigate={navigate}
                installedModules={MODULE_IDS}
                selectBot={selectBot}
              />
            </Suspense>
          </ErrorBoundary>
        </ShellHost>
      )}
    </AppShell>
  );

  return host ? (
    <host.Gate route={route} navigate={navigate}>
      {shell}
    </host.Gate>
  ) : (
    shell
  );
}
