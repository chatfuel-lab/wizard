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
  broadcast: 'broadcasts',
  campaigns: 'broadcasts',
  campaign: 'broadcasts',
  newsletter: 'broadcasts',
  fuelyaiprofile: 'automations',
  fuelyaitaskschats: 'automations',
  fuelyaitasksoperations: 'automations',
  fuelyaitasksreminders: 'automations',
  fuelyaicomments: 'automations',
  fuelyaiautomations: 'automations',
  automationid: 'automations',
  keywords: 'automations',
  fuelyaibroadcasts: 'broadcasts',
  knowledgebasegeneral: 'knowledge-base',
  knowledgebasefaq: 'knowledge-base',
  knowledgebasecatalog: 'knowledge-base',
  knowledgebasespecialists: 'knowledge-base',
  knowledgebasegooglecalendarsync: 'knowledge-base',
  calendarsettings: 'bookings',
  calendarreminders: 'bookings',
  calendarmessagessource: 'bookings',
  flowid: 'flow-builder',
  conversationid: 'livechat',
  settingswhatsapp: 'channels',
  settingswhatsappconnect: 'channels',
  settingsinstagram: 'channels',
  settingsinstagramconnect: 'channels',
  settingstiktok: 'channels',
  settingstiktokconnect: 'channels',
  settingsfacebook: 'channels',
  settingsfacebookconnect: 'channels',
  settingswebwidget: 'channels',
  settingswebwidgetconnect: 'channels',
};

/**
 * Where a page name lands inside its module, for the modules that deep-link:
 * the knowledge base opens on a source rather than on its overview.
 */
const PATH_KEY_PARAMS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  knowledgebasegeneral: { source: 'profile' },
  knowledgebasefaq: { source: 'faq' },
  knowledgebasecatalog: { source: 'products' },
  knowledgebasespecialists: { source: 'team' },
};

/**
 * `FlowID/<id>`, `ConversationID/<id>`, and the `chats/<id>` segment of a raw
 * Chatfuel path: the name picks the module, the id goes on as that module's
 * own deep-link param.
 */
const ID_PARAMS: Readonly<Record<string, string>> = {
  flowid: 'flow',
  conversationid: 'c',
  automationid: 'automation',
  chats: 'c',
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

export interface Resolved {
  destination: Destination;
  params: URLSearchParams;
}

const resolveSegment = (
  destinations: readonly Destination[],
  name: string,
  id: string | undefined,
): Resolved | null => {
  const destination = resolveDestination(destinations, name);
  if (!destination) return null;
  const key = normalize(name);
  const params = new URLSearchParams(PATH_KEY_PARAMS[key]);
  const idParam = ID_PARAMS[key];
  if (idParam && id) params.set(idParam, id.slice(0, MAX_ACTION_PARAM_LENGTH));
  return { destination, params };
};

/**
 * A `pathKey` as the assistant sends it: a page name, a parameterized
 * `Name/<id>`, or a raw Chatfuel path like `/automation/<botId>/chats/<id>`,
 * where the rightmost segment that names a page wins.
 */
export function resolvePathKey(destinations: readonly Destination[], pathKey: unknown): Resolved | null {
  if (typeof pathKey !== 'string') return null;
  const segments = pathKey.split('/').map((segment) => segment.trim());
  if (segments.length === 1) return resolveSegment(destinations, pathKey, undefined);
  if (!pathKey.startsWith('/')) return resolveSegment(destinations, segments[0]!, segments[1]);
  const parts = segments.filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const resolved = resolveSegment(destinations, parts[i]!, parts[i + 1]);
    if (resolved) return resolved;
  }
  return null;
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
  /** Read at call time, never captured: the route changes under whoever holds this. */
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
      const resolved = resolvePathKey(deps.destinations, action.parameters.pathKey);
      if (!resolved) {
        const named = typeof action.parameters.pathKey === 'string' ? action.parameters.pathKey : '';
        return {
          ok: false,
          label: named ? `There is no “${named}” page here` : 'That navigation had no destination',
        };
      }
      const target = resolved.destination;
      const params = resolved.params;
      for (const [key, value] of actionParams(action.parameters)) params.set(key, value);
      const from = deps.currentUrl();
      const to = buildUrl(target.id, params);
      if (from === to) return { ok: true, label: `Already on ${target.title}` };
      deps.navigate(target.id, params);
      return { ok: true, label: `Opened ${target.title}`, undo: () => deps.restore(from) };
    },
  };
}
