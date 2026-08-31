/**
 * The panel's state, as a pure reducer.
 *
 * Everything the three views read lives here, and nothing in this file talks to
 * the network or reads a clock — the hook next door does that and dispatches
 * the answers. Two rules it exists to hold:
 *
 * **Loads are epoch-guarded.** Unlocking, a refresh and a bot being deleted all
 * start a load; an answer that arrives after a newer one was asked for is
 * dropped rather than overwriting it.
 *
 * **Changes are written into the overview, not just into the caches.** Creating
 * or deleting a bot changes the account tree the rail is drawn from, and a
 * panel that showed a bot it had just deleted until the next reload would be
 * lying about the one thing it is for.
 */
import type {
  AdminBotDetail,
  AdminHealth,
  AdminOverview,
  AdminTenant,
  AdminUnassignedBot,
  AdminWorkspaceDetail,
} from '../types';
import type { AdminSession } from './adminApi';

export interface AdminState {
  /** 'unknown' until the boot probe answers, so the lock screen does not flash. */
  session: AdminSession;
  overview: AdminOverview | null;
  loading: boolean;
  error: string | null;
  /** Per-id caches: moving between rows must not re-ask for what is known. */
  workspaces: Record<string, AdminWorkspaceDetail>;
  bots: Record<string, AdminBotDetail>;
  health: AdminHealth | null;
  tenants: AdminTenant[] | null;
  /** Bots created before anyone said whose they are; they are in no tenant. */
  unassigned: AdminUnassignedBot[];
  /** Ids with something in flight against them — a row says so without a second store. */
  busy: readonly string[];
  epoch: number;
}

export type AdminAction =
  | { type: 'session'; session: AdminSession }
  | { type: 'load' }
  | { type: 'loaded'; overview: AdminOverview; epoch: number }
  | { type: 'failed'; error: string; epoch: number }
  | { type: 'workspace'; detail: AdminWorkspaceDetail }
  | { type: 'bot'; detail: AdminBotDetail }
  | { type: 'health'; health: AdminHealth }
  | { type: 'tenants'; tenants: AdminTenant[]; unassigned: AdminUnassignedBot[] }
  | { type: 'busy'; id: string; busy: boolean }
  | { type: 'botAdded'; workspaceId: string; bot: { id: string; title: string } }
  | { type: 'botRenamed'; botId: string; title: string }
  | { type: 'botRemoved'; botId: string }
  | { type: 'locked' };

export function initialAdminState(): AdminState {
  return {
    session: 'unknown',
    overview: null,
    loading: false,
    error: null,
    workspaces: {},
    bots: {},
    health: null,
    tenants: null,
    unassigned: [],
    busy: [],
    epoch: 0,
  };
}

const withoutKey = <T>(map: Record<string, T>, key: string): Record<string, T> => {
  if (!(key in map)) return map;
  const next = { ...map };
  delete next[key];
  return next;
};

/** The workspace a bot sits in, from the tree the rail is drawn from. */
export const workspaceOfBot = (overview: AdminOverview | null, botId: string): string | null =>
  overview?.workspaces.find((workspace) => workspace.bots.some((bot) => bot.id === botId))?.id ?? null;

export function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'session':
      /* Locking clears everything; unlocking only opens the door — the load
         that follows is a separate action, so a re-probe on a reload does not
         blank a panel that already has its answer. */
      return action.session === 'locked' || action.session === 'absent'
        ? { ...initialAdminState(), session: action.session }
        : { ...state, session: action.session };

    case 'load':
      return { ...state, loading: true, error: null, epoch: state.epoch + 1 };

    case 'loaded':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: null, overview: action.overview };

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.error };

    case 'workspace':
      return { ...state, workspaces: { ...state.workspaces, [action.detail.id]: action.detail } };

    case 'bot':
      return { ...state, bots: { ...state.bots, [action.detail.id]: action.detail } };

    case 'health':
      return { ...state, health: action.health };

    case 'tenants':
      return { ...state, tenants: action.tenants, unassigned: action.unassigned };

    case 'busy': {
      const busy = state.busy.filter((id) => id !== action.id);
      return { ...state, busy: action.busy ? [...busy, action.id] : busy };
    }

    case 'botAdded': {
      if (!state.overview) return state;
      const workspaces = state.overview.workspaces.map((workspace) =>
        workspace.id === action.workspaceId ? { ...workspace, bots: [...workspace.bots, action.bot] } : workspace,
      );
      return {
        ...state,
        overview: { ...state.overview, workspaces },
        /* The workspace panel's own copy of the bots is now short one. */
        workspaces: withoutKey(state.workspaces, action.workspaceId),
      };
    }

    case 'botRenamed': {
      const rename = (bot: { id: string; title: string }) =>
        bot.id === action.botId ? { ...bot, title: action.title } : bot;
      const overview = state.overview
        ? {
            ...state.overview,
            workspaces: state.overview.workspaces.map((workspace) => ({
              ...workspace,
              bots: workspace.bots.map(rename),
            })),
          }
        : null;
      const cached = state.bots[action.botId];
      return {
        ...state,
        overview,
        bots: cached ? { ...state.bots, [action.botId]: { ...cached, title: action.title } } : state.bots,
      };
    }

    case 'botRemoved': {
      const owner = workspaceOfBot(state.overview, action.botId);
      const overview = state.overview
        ? {
            ...state.overview,
            workspaces: state.overview.workspaces
              .map((workspace) => ({
                ...workspace,
                bots: workspace.bots.filter((bot) => bot.id !== action.botId),
              }))
              /* Chatfuel deletes a workspace with its last bot, so an empty one
                 here is a workspace that is gone — except the deployment's own,
                 which the server refuses to empty. */
              .filter((workspace) => workspace.bots.length > 0 || workspace.id === state.overview?.homeWorkspaceId),
          }
        : null;
      return {
        ...state,
        overview,
        bots: withoutKey(state.bots, action.botId),
        workspaces: owner ? withoutKey(state.workspaces, owner) : state.workspaces,
        busy: state.busy.filter((id) => id !== action.botId),
      };
    }

    case 'locked':
      return { ...initialAdminState(), session: 'locked' };

    default:
      return state;
  }
}
