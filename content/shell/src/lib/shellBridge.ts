import type { ScreenDetail, ScreenSnapshot, ShellAction, ShellActionResult, ShellBridge } from '../modules/shellApi';
import { buildUrl } from './route';

/**
 * What the assistant is allowed to do to the operator's screen, and how it is
 * told what that screen is.
 *
 * The vocabulary is the server's: a `CoworkerFrontendAction` arrives as a free
 * string `actionType` and a free `Map` of parameters. Two exist, both seen
 * in practice:
 *
 *   - `navigate { pathKey: 'Deals' }` — a *named destination*, not a URL, which
 *     is the important part: the model never hands us an address, so we never
 *     navigate to one. We resolve the name against the module registry and build
 *     the URL ourselves.
 *   - `suggest_quick_reply { text }` — a reply chip, one action per option. That
 *     one never reaches this file: it changes nothing outside the thread, so the
 *     coworker module renders it itself.
 *
 * An `actionType` we do not know is reported back as unknown and does nothing.
 *
 * Everything the assistant can do here is a route change, and a route change is
 * reversible — which is why executing it needs no approval gate and why `undo`
 * is always available. Anything that changes account data is a `chatfuel_gql-*`
 * tool and goes through the server's own manual-approval batch instead.
 */

export interface Destination {
  id: string;
  title: string;
}

/** 'Live Chat', 'live-chat', 'livechat' all have to land on the same module. */
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The page names the assistant actually uses, asked of it directly on the live
 * account: "Live Chat, Contacts, Leads, Calendar, Flows, Billing, channel
 * settings, automations, catalog, FAQ, API, and teammates" — plus `Deals`,
 * which it sent unprompted. Several of those are Chatfuel's page names for
 * things this shell calls something else, and several are pages this shell does
 * not have at all.
 *
 * So: names → module ids, for the ones that exist here. Anything absent from
 * both this table and the registry (Billing, API, teammates) resolves to
 * nothing and is reported as "not in this dashboard", which is the truth.
 */
const PATH_KEY_ALIASES: Readonly<Record<string, string>> = {
  livechat: 'livechat',
  inbox: 'livechat',
  chats: 'livechat',
  conversations: 'livechat',
  leads: 'deals',
  pipeline: 'deals',
  calendar: 'bookings',
  appointments: 'bookings',
  flows: 'flow-builder',
  flowbuilder: 'flow-builder',
  catalog: 'knowledge-base',
  faq: 'knowledge-base',
  businessinfo: 'knowledge-base',
  channelsettings: 'automations',
  aisetup: 'automations',
  assistant: 'coworker',
};

/**
 * Resolve a `pathKey` to a module. Title first, then id: the model has only ever
 * seen the product's page names, so 'Deals' and 'Inbox' are what it sends, while
 * an id like 'flow-builder' is what a caller writing the parameters by hand
 * would reach for. Ambiguity is impossible — both sides are normalized and the
 * first match in registry order wins, which is the order the rail shows.
 */
export function resolveDestination(destinations: readonly Destination[], pathKey: unknown): Destination | null {
  if (typeof pathKey !== 'string' || pathKey.trim() === '') return null;
  const want = normalize(pathKey);
  if (!want) return null;
  const aliased = PATH_KEY_ALIASES[want];
  return (
    destinations.find((d) => normalize(d.title) === want) ??
    destinations.find((d) => normalize(d.id) === want) ??
    (aliased ? (destinations.find((d) => d.id === aliased) ?? null) : null)
  );
}

/**
 * Params the assistant may put on the URL. Capped hard on both axes: this is
 * model output landing in the address bar, and a module reads it as its own
 * deep link. Twelve keys is more than any module's param set; 200 characters is
 * longer than any id it could legitimately carry.
 */
export const MAX_ACTION_PARAMS = 12;
export const MAX_ACTION_PARAM_LENGTH = 200;

export function actionParams(parameters: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  const raw = parameters.params;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return params;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (params.size >= MAX_ACTION_PARAMS) break;
    if (value === null || value === undefined || typeof value === 'object') continue;
    params.set(key, String(value).slice(0, MAX_ACTION_PARAM_LENGTH));
  }
  return params;
}

export interface BridgeDeps {
  destinations: readonly Destination[];
  /** Read at call time, never captured: the route changes under the dock. */
  currentRoute: () => { moduleId: string | null; params: URLSearchParams };
  /** The shell's own navigation — the bridge never touches window itself. */
  navigate: (moduleId: string, params: URLSearchParams) => void;
  /** Restores an address the bridge captured before it moved. */
  restore: (url: string) => void;
  /** The current address bar, for the snapshot and for undo. */
  currentUrl: () => string;
  readDetail: () => ScreenDetail;
}

export function createShellBridge(deps: BridgeDeps): ShellBridge {
  const titleOf = (id: string | null) =>
    id === null ? null : (deps.destinations.find((d) => d.id === id)?.title ?? null);

  return {
    snapshot(): ScreenSnapshot {
      const route = deps.currentRoute();
      return {
        moduleId: route.moduleId,
        moduleTitle: titleOf(route.moduleId),
        url: deps.currentUrl(),
        params: Object.fromEntries(route.params),
        detail: deps.readDetail(),
        destinations: deps.destinations.map((d) => ({ id: d.id, title: d.title })),
      };
    },

    run(action: ShellAction): ShellActionResult {
      if (action.actionType !== 'navigate') {
        return { ok: false, label: `I don’t know how to “${action.actionType}” in this dashboard` };
      }
      const target = resolveDestination(deps.destinations, action.parameters.pathKey);
      if (!target) {
        const named = typeof action.parameters.pathKey === 'string' ? action.parameters.pathKey : '';
        return {
          ok: false,
          label: named ? `There is no “${named}” page here` : 'That navigation had no destination',
        };
      }
      const params = actionParams(action.parameters);
      const from = deps.currentUrl();
      const to = buildUrl(target.id, params);
      if (from === to) return { ok: true, label: `Already on ${target.title}` };
      deps.navigate(target.id, params);
      return { ok: true, label: `Opened ${target.title}`, undo: () => deps.restore(from) };
    },
  };
}
