import { useCallback, useMemo, useRef, useState, type ReactElement, type RefObject } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { InspectorHost, Kbd, ModuleRoot, ShortcutsDialog, ToastProvider, useBand, useHotkeys, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { usePublishScreenContext } from '../shellApi';
import { DealsContext } from './DealsContext';
import { DealsUndoContext, useDealsUndo, type DealsUndoValue } from './DealsUndoContext';
import { DealPanel } from './components/DealPanel';
import { DealsCommandPalette } from './components/DealsCommandPalette';
import { DealsHeader } from './components/DealsHeader';
import { SavedViewsMenu } from './components/SavedViewsMenu';
import { useDealFields } from './hooks/useDealFields';
import { useDealTeam } from './hooks/useDealTeam';
import { useDealsIndicator } from './hooks/useDealsIndicator';
import type { DealsCommandContext, DealsCommandHandlers } from './lib/commands';
import { EMPTY_FILTER, type AssigneeFilterKey, type DealsFilter } from './lib/dealsFilter';
import { parseDealsParams, viewSegment, writeDealsParams, type DealsParams, type DealsView } from './lib/dealsParams';
import { effectiveDensity, type Density } from './lib/layout';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type WorkspaceShortcutId } from './lib/shortcuts';
import { UNDO_TTL_MS, undoLabel, type StageUndoEntry } from './lib/undo';
import { useMyRole } from './hooks/useMyRole';
import { BoardView } from './views/BoardView';
import { ForecastView } from './views/ForecastView';
import { TableView } from './views/TableView';
import type { DealsViewProps } from './views/types';

const VIEW_COMPONENTS: Record<DealsView, (props: DealsViewProps) => ReactElement> = {
  board: BoardView,
  table: TableView,
  forecast: ForecastView,
};

/**
 * Embeddable root of the deals module.
 *
 * It owns the URL, the shared filter model, the layout band, the open deal, the
 * keyboard and the pending undo — and nothing else. Each view owns its own
 * queries, its own toolbar and its own live channel, so a view can be rewritten
 * without touching this file.
 *
 * **Only the active view is mounted.** Switching Board → Table → Board refetches
 * the board; the trade is that two views can never corrupt each other's state,
 * and it is the reason the three can be built independently.
 *
 * Deep links: the view is the path segment ('/deals/table'); the rest is the
 * query — `?deal=<contactID>`, `&assignee=`, `&q=`, `&stage=`,
 * `&density=`, `&collapsed=`, `&sort=`. An unknown value falls back silently —
 * a hand-edited URL must never white-screen.
 */
export function DealsApp({ botId, client, params, view, setView: setLocation }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);

  /* The undo entry lives here rather than in a view because ⌘Z is bound once,
   * above all three. The view that made the move supplies the runner — it is
   * what holds the mutation hook — and the workspace only needs to know that
   * something is undoable and what to call it. The offer's lifecycle — one
   * deep, cleared before it runs, expiring on its own — is the shared
   * `useUndoOffer`; the TTL stays this module's, so `isUndoExpired` and the
   * live offer can never disagree. */
  const offer = useUndoOffer<StageUndoEntry>({ ttlMs: UNDO_TTL_MS });

  const undo: DealsUndoValue = useMemo(
    () => ({
      entry: offer.entry,
      label: offer.entry ? undoLabel(offer.entry) : null,
      push: offer.push,
      run: offer.run,
      clear: offer.clear,
    }),
    [offer],
  );

  /* The providers are a component of their own, and everything that reads them
   * lives BELOW them. Putting a `useDeals()` hook in the same component that
   * renders `DealsContext.Provider` throws — the hook runs while the provider is
   * still only a return value. `tsc` cannot see it and vitest is node-only here,
   * so this split plus validate pass 10b is the whole defence.
   *
   * `ModuleRoot` is the same rule one more time: it publishes the band it
   * measures, so `useBand()` has to be called in a child. It also owns the
   * ResizeObserver that used to be `useContainerBand(rootRef)` here, and the
   * `@container/module` every `@wide:` / `@inline:` class below now resolves
   * against.
   *
   * The ref is created here rather than below because `ModuleRoot` is rendered
   * here, and it forwards to the element it already observes. Handing it down
   * as a prop is what lets `DealsWorkspace` stop wrapping itself in a div whose
   * only job was to be a node that already existed one level up. */
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <ToastProvider>
      <DealsContext.Provider value={context}>
        <DealsUndoContext.Provider value={undo}>
          {/* `relative` lands on the band scope inside `ModuleRoot`, which is
              what `ActionBar` (absolute, deliberately not portalled) positions
              against. */}
          <ModuleRoot ref={rootRef} className="relative">
            <DealsWorkspace rootRef={rootRef} params={params} view={view} setLocation={setLocation} />
          </ModuleRoot>
        </DealsUndoContext.Provider>
      </DealsContext.Provider>
    </ToastProvider>
  );
}

type WorkspaceProps = Pick<ModuleAppProps, 'params' | 'view'> & { setLocation: ModuleAppProps['setView'] } & {
  /** The module root, forwarded from `ModuleRoot`: the node `useHotkeys` scopes
   *  focus against and the one `focusSearch` queries. */
  rootRef: RefObject<HTMLDivElement | null>;
};

function DealsWorkspace({ rootRef, params, view: viewSeg, setLocation }: WorkspaceProps) {
  const band = useBand();
  const role = useMyRole();
  const fields = useDealFields();
  const live = useDealsIndicator();
  const team = useDealTeam();
  const undo = useDealsUndo();

  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand every view a new filter.
  const query = params.toString();
  const parsed = useMemo(() => parseDealsParams(new URLSearchParams(query), viewSeg), [query, viewSeg]);

  /**
   * The filter's **identity** must not change unless the filter did.
   *
   * `parsed` is rebuilt whenever the query string changes for any reason at
   * all, and `?deal=` changes it on every card click. Views key their queries
   * on this object, so a fresh-but-identical filter reads as a new filter: the
   * table planned a new query, reset its store and refetched the whole page —
   * losing the selection and the scroll — every single time somebody opened a
   * deal. `?density=` and `?collapsed=` did the same.
   *
   * The board never showed it, but only by accident: `useDealsBoard` keys on
   * `toAssigneeFilter(filter.assignee)`, memoised on a *string*. Anything that
   * consumes the whole object was exposed, which is why the fix belongs here
   * rather than in the one view that noticed.
   */
  const filterKey = JSON.stringify(parsed.filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the serialized filter so an equal-but-fresh object keeps its identity
  const filter = useMemo(() => parsed.filter, [filterKey]);

  /* What the Coworker sees when it asks what is on screen. Write-only into a
     sink the shell owns; a no-op when this module runs as an embed. */
  usePublishScreenContext({
    module: 'Deals',
    view: parsed.view,
    loadedDeals: count,
    filter: filterKey,
    openDeal: parsed.deal,
  });

  const patch = useCallback(
    (next: Partial<DealsParams>) => {
      const merged = { ...parsed, ...next };
      /* A surface is a place and pushes; a filter or a density replaces, so
         Back is not a list of keystrokes. */
      setLocation(viewSegment(merged.view), writeDealsParams(params, merged), {
        replace: merged.view === parsed.view,
      });
    },
    [params, parsed, setLocation],
  );

  const setView = useCallback((view: DealsView) => patch({ view }), [patch]);
  const setFilter = useCallback((filter: DealsFilter) => patch({ filter }), [patch]);
  const setDensity = useCallback((density: Density) => patch({ density }), [patch]);
  const setCollapsed = useCallback((collapsed: SalesStageV2[]) => patch({ collapsed }), [patch]);
  const setOpenDeal = useCallback((deal: string | null) => patch({ deal }), [patch]);
  const applySavedView = useCallback((view: DealsView, filter: DealsFilter) => patch({ view, filter }), [patch]);
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  /**
   * The table's search box is a view's own control, and `DealsViewProps` is
   * frozen — so the command reaches it through the DOM rather than through a
   * fifteenth prop. `data-deals-search` is the contract; the palette only ever
   * offers this command on the table, where the box exists.
   */
  const focusSearch = useCallback(() => {
    const input = rootRef.current?.querySelector<HTMLInputElement>('[data-deals-search]');
    input?.focus();
    input?.select();
  }, [rootRef]);

  const setAssignee = useCallback(
    (assignee: AssigneeFilterKey) => setFilter({ ...filter, assignee }),
    [filter, setFilter],
  );

  const commandContext: DealsCommandContext = useMemo(
    () => ({
      view: parsed.view,
      filter,
      density: parsed.density,
      undoLabel: undo.label,
      teammates: team.members.map((member) => ({
        userAccountId: member.user.id,
        name: member.user.name,
      })),
      /* Saved views are the one command group this file cannot build: they live
       * behind `useSavedViews`, which `SavedViewsMenu` already owns. Left empty
       * here rather than duplicating that query. */
      savedViews: [],
    }),
    [parsed.view, filter, parsed.density, undo.label, team.members],
  );

  const commandHandlers: DealsCommandHandlers = useMemo(
    () => ({
      setView,
      setAssignee,
      setDensity,
      clearFilter: () => setFilter(EMPTY_FILTER),
      focusSearch,
      refresh,
      undo: undo.run,
      openShortcuts: () => setShortcutsOpen(true),
      applySavedView: () => {},
    }),
    [setView, setAssignee, setDensity, setFilter, focusSearch, refresh, undo.run],
  );

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'search':
          if (parsed.view !== 'table') setView('table');
          /* One frame, so the input exists if the view just switched. */
          return void requestAnimationFrame(focusSearch);
        case 'undo':
          return undo.run();
        case 'refresh':
          return refresh();
        case 'goBoard':
          return setView('board');
        case 'goTable':
          return setView('table');
        case 'goForecast':
          return setView('forecast');
      }
    },
    [parsed.view, setView, focusSearch, undo, refresh],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  const View = VIEW_COMPONENTS[parsed.view];

  /* A fragment, not a div: the element this used to render was `ModuleRoot`'s
     band scope one level up wearing a second coat — same flex column, same
     `relative`, same node the ResizeObserver was already watching. */
  return (
    <>
      <DealsHeader
        view={parsed.view}
        onView={setView}
        count={count}
        live={live}
        onRefresh={refresh}
        refreshing={busy}
        actions={
          <>
            <SavedViewsMenu view={parsed.view} filter={filter} onApply={applySavedView} />
            {/* Hidden in the smallest band. `@compact:` (>=600px of module) is
                the container-native reading of the 640px viewport breakpoint
                this replaces — nearest band threshold, same intent: ⌘K is not a
                phone control, and every other way in still works. */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open the command palette"
              className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
            >
              Commands
              <Kbd keys={['mod', 'k']} />
            </button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <View
            filter={filter}
            onFilterChange={setFilter}
            density={effectiveDensity(band, parsed.density)}
            onDensityChange={setDensity}
            band={band}
            collapsed={parsed.collapsed}
            onCollapsedChange={setCollapsed}
            fields={fields}
            canEdit={role.canEdit}
            onCount={setCount}
            onBusy={setBusy}
            refreshToken={refreshToken}
            openDealId={parsed.deal}
            onOpenDeal={setOpenDeal}
          />
        </div>
        {/* Was DealPanelHost, which InspectorHost is the generalisation of —
            including the Escape argument, carried over verbatim. Nothing was
            left for the wrapper to do but rename five props. */}
        <InspectorHost open={parsed.deal !== null} onClose={() => setOpenDeal(null)} title="Deal">
          {parsed.deal === null ? null : (
            <DealPanel
              contactId={parsed.deal}
              bindings={fields.bindings}
              fieldNames={fields.names}
              canEdit={role.canEdit}
              onFieldCreated={fields.refresh}
            />
          )}
        </InspectorHost>
      </div>

      <DealsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </>
  );
}
