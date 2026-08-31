import type { ComponentType, ReactNode } from 'react';
import type { ModuleClient } from '~api';

/**
 * The shell ↔ module contract. A module contributes src/modules/<id>/ with an
 * index.tsx exporting `moduleDescriptor` (fixed name — the wizard regenerates
 * src/modules/index.ts from it at scaffold time). Module code imports only
 * react, ~ui, ~api and its own files, receives everything below via props and
 * never touches window.location — routing is the shell's.
 */
export interface ModuleAppProps {
  botId: string;
  client: ModuleClient;
  /** This module's deep-link params — the part after '?' in '/<moduleId>?…'. */
  params: URLSearchParams;
  /** Replace this module's params (history.replaceState; no nav stack entry). */
  setParams(next: URLSearchParams): void;
  /**
   * The path segment after the module id — the module's own view, '' at its
   * root. A module with more than one screen puts the screen here and its
   * state in params: '/contacts/fields?density=compact'.
   */
  view: string;
  /** Move within this module. A view change is a place, so it pushes by default. */
  setView(view: string, params?: URLSearchParams, options?: { replace?: boolean }): void;
  /**
   * Somewhere else in the app, as an app-relative path ('/livechat?c=42').
   * A module may not touch `window.location`; where the app is mounted is the
   * shell's business, and this is how a module crosses to another one.
   */
  navigate: Navigate;
  /**
   * The ids in the registry of THIS deployment.
   *
   * A module may not import another module, and must not guess what a scaffold
   * took: knowledge-base shows services and staff read-only with a link into
   * bookings when bookings is installed, and edits them itself when it is not.
   * The shell is the only place that knows, so it says so.
   */
  installedModules?: readonly string[];
  /**
   * Point the WHOLE app at another bot — the topbar switcher's move, asked for
   * from inside a module.
   *
   * The shell owns the choice and stays the only place that knows how it is
   * stored, so a bot it does not know about is ignored rather than half-opened.
   * The workspace is passed when the caller knows it: without auth a bot lives
   * in one of several workspaces the account owns, and moving to it moves both
   * levels at once.
   *
   * Absent in an embed, where there is no app around the module to re-point.
   */
  selectBot?(botId: string, workspaceId?: string): void;
}

export interface ModuleDescriptor {
  /** module.json id == the first path segment that routes to it. */
  id: string;
  /** Sidebar tooltip + topbar label. */
  title: string;
  icon: ReactNode;
  /**
   * The module's root, and in every registered module a `React.lazy` one: the
   * descriptor is what the rail needs at startup — an id, a title, an icon —
   * and the module itself is a chunk fetched on the first visit. Ten modules
   * imported eagerly put ten modules' code, and ten modules' generated GraphQL
   * documents, into one seven-megabyte first load for a person who opened one
   * of them. `App` mounts it under a `Suspense`.
   */
  Component: ComponentType<ModuleAppProps>;
  /**
   * Not a nav-rail item and never routed as '/<id>'. The auth module is one:
   * it contributes a host integration (below) rather than a page in the rail.
   */
  hidden?: boolean;
  /**
   * Routed as '/<id>' like any module, and never a rail item.
   *
   * Different from `hidden`, which takes the route away too. This is for a
   * surface that is reached deliberately and by address only: the admin panel
   * is one, because a deployment serving customers has no business advertising
   * an operator's door to them — not even after the operator has opened it.
   */
  railHidden?: boolean;
  /** Shell integration for a module that wraps the host. Only auth uses it. */
  host?: HostIntegration;
}

// ---------------------------------------------------------------------------
// Host integration — for the one module that wraps the shell (auth)
// ---------------------------------------------------------------------------

/**
 * A parsed address: '/<seg>[/rest][?qs]', below the app's base path. `path` is
 * 'seg/rest' without the query; `segments` is the same, split.
 */
export interface AppRoute {
  moduleId: string | null;
  path: string;
  segments: readonly string[];
  params: URLSearchParams;
}

/** Go to a URL and re-render. `replace` swaps the history entry instead of pushing one. */
export type Navigate = (url: string, options?: { replace?: boolean }) => void;

/** One bot a host integration offers, as the shell chrome renders it. */
export interface HostBot {
  /** The host's own id for the row — what it is asked to rename or delete by. */
  id: string;
  /** The Chatfuel bot, null while it is still being created. */
  botId: string | null;
  name: string;
}

/**
 * A runtime the shell creates once per mount from `HostIntegration.create`.
 * Its components close over their adapter, so the shell never passes one around.
 */
export interface HostRuntime {
  /** The caller's session token for the proxy gate (undefined = none). */
  getAccessToken(): Promise<string | undefined>;
  /** The shell's client reports that the proxy rejected the session. */
  onSessionLost(err: unknown): void;
  /**
   * Who is signed in, as a change signal (`useSyncExternalStore` pair). The two
   * getters below are read through it, so the chrome follows a sign-in without
   * the shell polling anything.
   */
  subscribeSession(cb: () => void): () => void;
  /** The Chatfuel bot this session is working in; null until the workspace resolves. */
  getBotId(): string | null;
  /**
   * Every bot this session may open, oldest first — what the topbar switches
   * between. The array is replaced only when it really changes, so it is safe
   * to read through `useSyncExternalStore`.
   */
  getBots(): HostBot[];
  /** Move to another of them. A bot that is not in `getBots()` is ignored. */
  selectBot(botId: string): void;
  /** That workspace's name, for the topbar — the shell must not ask Chatfuel for it. */
  getWorkspaceName(): string | null;
  /** Wraps the whole shell: sign-in / no-access screens when needed, children otherwise. */
  Gate: ComponentType<{ route: AppRoute; navigate: Navigate; children: ReactNode }>;
  /** Topbar right slot (the user menu). Rendered inside Gate. */
  TopbarItem?: ComponentType<{ route: AppRoute; navigate: Navigate }>;
  /** Pages for `routes` that render INSIDE the shell chrome ('team'). */
  Page?: ComponentType<{ route: AppRoute; navigate: Navigate }>;
}

export interface HostIntegration {
  /** First path segments this integration owns ('sign-in', 'team', …); never treated as module ids. */
  routes: readonly string[];
  /**
   * Sync. Returns null when nothing is configured (no Supabase env) — the
   * shell then runs exactly as without the module.
   */
  create(input: {
    env: Record<string, string | undefined>;
    /** Where the app is mounted ('/' at a domain root) — for the absolute
        links this integration mails out. */
    basePath: string;
    /** The deployment's mark, as a URL the HOST has already resolved. A name is
        a string and arrives in `env`; a logo is a location, and only the host
        knows where it keeps its assets — an embed host's is not in our
        `public/`. Absent = the integration draws its own fallback. */
    appLogo?: string;
  }): HostRuntime | null;
}
