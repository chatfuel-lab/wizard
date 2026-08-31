/**
 * The goods catalog and the specialists as a pure reducer.
 *
 * The API is lopsided and this file is where that stops mattering: create and
 * delete answer with the WHOLE catalog, update answers with ONE item, and the
 * list carries `DeletedGoodsService` stubs that hold nothing but a
 * `__typename`. `byId` + `order` is the single record cache; both response
 * shapes land through one of two actions and every view reads selectors.
 *
 * Products and services live in the same list on the server and in two
 * different sources in the UI, so the split is a selector, not a second store.
 *
 * `epoch` is in state for the same reason as in `knowledgeStore`: the stale
 * response guard has to be testable. The reducer never reads the clock.
 */
import {
  liveCatalogItems,
  type CatalogEntry,
  type CatalogItem,
  type CatalogProduct,
  type CatalogService,
  type SpecialistInfo,
} from '../types';

export interface CatalogState {
  loading: boolean;
  /** A LOAD failure. Write failures are toasts. */
  error: string | null;
  byId: Record<string, CatalogItem>;
  order: string[];
  specialists: SpecialistInfo[];
  /** True once the first catalog response has landed - tells an empty catalog from an unloaded one. */
  ready: boolean;
  epoch: number;
  tick: number;
}

export type CatalogAction =
  | { type: 'reset' }
  | { type: 'loaded'; epoch: number; entries: readonly CatalogEntry[] }
  | { type: 'specialistsLoaded'; epoch: number; specialists: readonly SpecialistInfo[] }
  | { type: 'failed'; epoch: number; error: string }
  | { type: 'catalogReplaced'; entries: readonly CatalogEntry[] }
  | { type: 'itemMerged'; item: CatalogItem }
  | { type: 'specialistsReplaced'; specialists: readonly SpecialistInfo[] };

export const initialCatalogState: CatalogState = {
  loading: true,
  error: null,
  byId: {},
  order: [],
  specialists: [],
  ready: false,
  epoch: 0,
  tick: 0,
};

function indexEntries(entries: readonly CatalogEntry[]): Pick<CatalogState, 'byId' | 'order'> {
  const items = liveCatalogItems(entries);
  const byId: Record<string, CatalogItem> = {};
  for (const item of items) byId[item.id] = item;
  return { byId, order: items.map((item) => item.id) };
}

export function catalogReducer(state: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    case 'reset':
      return { ...state, loading: true, error: null, epoch: state.epoch + 1 };

    case 'loaded':
      if (action.epoch !== state.epoch) return state;
      return {
        ...state,
        loading: false,
        error: null,
        ready: true,
        ...indexEntries(action.entries),
        tick: state.tick + 1,
      };

    case 'specialistsLoaded':
      if (action.epoch !== state.epoch) return state;
      return { ...state, specialists: [...action.specialists], tick: state.tick + 1 };

    case 'failed':
      if (action.epoch !== state.epoch) return state;
      return { ...state, loading: false, error: action.error };

    case 'catalogReplaced':
      return { ...state, ready: true, ...indexEntries(action.entries), tick: state.tick + 1 };

    case 'itemMerged': {
      const known = state.order.includes(action.item.id);
      return {
        ...state,
        byId: { ...state.byId, [action.item.id]: action.item },
        order: known ? state.order : [...state.order, action.item.id],
        tick: state.tick + 1,
      };
    }

    case 'specialistsReplaced':
      return { ...state, specialists: [...action.specialists], tick: state.tick + 1 };
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectItems = (state: CatalogState): CatalogItem[] =>
  state.order.map((id) => state.byId[id]!).filter(Boolean);

export const selectProducts = (state: CatalogState): CatalogProduct[] =>
  selectItems(state).filter((item): item is CatalogProduct => item.__typename === 'GoodsProduct');

export const selectServices = (state: CatalogState): CatalogService[] =>
  selectItems(state).filter((item): item is CatalogService => item.__typename === 'GoodsService');

export const selectItem = (state: CatalogState, id: string | null): CatalogItem | null =>
  id ? (state.byId[id] ?? null) : null;

export const isInitialCatalogLoad = (state: CatalogState): boolean => state.loading && !state.ready;

/**
 * Specialists reach the assistant as a name plus a description, so that is
 * what they cost. The server folds this into `usage.total` rather than into
 * `usage.catalog`, which is why the budget asks for it separately.
 */
export function specialistChars(specialists: readonly SpecialistInfo[]): number {
  return specialists.reduce((sum, specialist) => {
    const profile = specialist.profile;
    return sum + profile.firstName.length + (profile.lastName?.length ?? 0) + (profile.aboutInfo?.length ?? 0);
  }, 0);
}

/** The display name of a specialist, with a fallback so a row is never blank. */
export const specialistName = (specialist: SpecialistInfo): string =>
  [specialist.profile.firstName, specialist.profile.lastName].filter(Boolean).join(' ').trim() || 'Unnamed';
