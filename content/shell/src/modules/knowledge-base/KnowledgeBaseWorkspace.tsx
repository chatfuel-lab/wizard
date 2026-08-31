import { useCallback, useMemo, useState, type RefObject } from 'react';
import { ShortcutsDialog, useBand, useHotkeys } from '~ui';
import type { ModuleAppProps } from '../types';
import { useCatalog } from './KnowledgeBaseCatalogContext';
import { useKnowledgeBase } from './KnowledgeBaseContext';
import { useDrafts } from './KnowledgeBaseDraftContext';
import { useKnowledge } from './KnowledgeBaseStoreContext';
import { useKnowledgeUndo } from './KnowledgeBaseUndoContext';
import { DirtyGuardDialog } from './components/DirtyGuardDialog';
import { KnowledgeBaseHeader } from './components/KnowledgeBaseHeader';
import { KnowledgeCommandPalette } from './components/KnowledgeCommandPalette';
import { SourcesView } from './components/SourcesView';
import { useDraftCount } from './hooks/useDraftCount';
import { useLint } from './hooks/useLint';
import { useMyRole } from './hooks/useMyRole';
import { selectProducts, selectServices, specialistChars } from './lib/catalogStore';
import {
  createLabelFor,
  transferLabelFor,
  type KnowledgeCommandContext,
  type KnowledgeCommandHandlers,
  type KnowledgeSourceSummary,
} from './lib/commands';
import { budgetBreakdown, type BudgetBreakdown, type BudgetSlice } from './lib/budget';
import { parseKnowledgeParams, writeKnowledgeParams, type KnowledgeParams } from './lib/knowledgeParams';
import { findingsFor } from './lib/lint';
import { CREATE_ATTRIBUTE, EXPORT_ATTRIBUTE, RAIL_SEARCH_ATTRIBUTE, SEARCH_ATTRIBUTE } from './lib/searchTargets';
import { editsHere, SOURCES, sourceMeta, SOURCE_IDS, type SourceId } from './lib/sources';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS, WORKSPACE_BINDINGS, type WorkspaceShortcutId } from './lib/shortcuts';

type WorkspaceProps = Pick<ModuleAppProps, 'params' | 'setParams'> & {
  /** The module root, forwarded from `ModuleRoot`: what `useHotkeys` scopes focus against. */
  rootRef: RefObject<HTMLDivElement | null>;
};

/**
 * Below the providers: the URL, the band, the keyboard, the command palette,
 * the unsaved-changes guard, and the one surface - `SourcesView` (the rail of
 * knowledge sources beside the selected source's page).
 */
export function KnowledgeBaseWorkspace({ rootRef, params, setParams }: WorkspaceProps) {
  const band = useBand();
  const role = useMyRole();
  const undo = useKnowledgeUndo();
  const store = useKnowledge();
  const catalog = useCatalog();
  const drafts = useDrafts();
  const dirtyCount = useDraftCount();
  const { installedModules } = useKnowledgeBase();

  const [busy, setBusy] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** A navigation the guard is holding back until the person decides. */
  const [guarded, setGuarded] = useState<Partial<KnowledgeParams> | null>(null);

  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand the view a new object.
  const query = params.toString();
  const parsed = useMemo(() => parseKnowledgeParams(new URLSearchParams(query)), [query]);

  const patchNow = useCallback(
    (next: Partial<KnowledgeParams>) => setParams(writeKnowledgeParams(params, { ...parsed, ...next })),
    [params, parsed, setParams],
  );

  /* The guard: leaving a source with unsaved edits asks first (Save / Discard /
   * Stay). Staying on the source - opening a row, typing in the search box,
   * opening the import wizard - never asks. */
  const patch = useCallback(
    (next: Partial<KnowledgeParams>) => {
      const leaves = next.source !== undefined && next.source !== parsed.source;
      if (leaves && drafts.dirtyOn(parsed.source).length > 0) {
        setGuarded(next);
        return;
      }
      patchNow(next);
    },
    [parsed.source, drafts, patchNow],
  );

  const goSource = useCallback(
    (source: SourceId) => patch({ source, item: null, q: '', import: null, draft: null }),
    [patch],
  );

  const refresh = useCallback(() => {
    store.refetch();
    catalog.refetch();
  }, [store, catalog]);

  /* The page's controls are its own; `/`, `n` and the palette reach them
   * through the DOM. The data attributes in `lib/searchTargets.ts` are the contract. */
  const focusSearch = useCallback(() => {
    const root = rootRef.current;
    const input =
      root?.querySelector<HTMLInputElement>(`[${SEARCH_ATTRIBUTE}]`) ??
      root?.querySelector<HTMLInputElement>(`[${RAIL_SEARCH_ATTRIBUTE}]`);
    input?.focus();
    input?.select();
  }, [rootRef]);
  const create = useCallback(
    () => rootRef.current?.querySelector<HTMLButtonElement>(`[${CREATE_ATTRIBUTE}]`)?.click(),
    [rootRef],
  );

  const openImport = useCallback(() => {
    const target = parsed.source === 'products' ? 'products' : 'faq';
    patchNow({ source: parsed.source === 'products' ? 'products' : 'faq', import: target });
  }, [parsed.source, patchNow]);
  const exportSource = useCallback(
    () => rootRef.current?.querySelector<HTMLButtonElement>(`[${EXPORT_ATTRIBUTE}]`)?.click(),
    [rootRef],
  );
  const scanGaps = useCallback(() => patch({ source: 'gaps' }), [patch]);

  // -------------------------------------------------------------------------
  // Derived: the findings, the budget, the rail summaries
  // -------------------------------------------------------------------------

  const products = useMemo(() => selectProducts(catalog.state), [catalog.state]);
  const services = useMemo(() => selectServices(catalog.state), [catalog.state]);

  /* The whole list, derived once in `hooks/useLint` — the Overview needs the
     unfiltered version and this hands every other page its own slice below. */
  const findings = useLint();

  const budget: BudgetBreakdown | null = useMemo(() => {
    if (!store.state.kb || !store.state.usage) return null;
    return budgetBreakdown({
      total: store.state.usage.total,
      catalog: store.state.usage.catalog,
      kb: store.state.kb,
      products,
      services,
      teamChars: specialistChars(catalog.state.specialists),
      full: store.state.full,
    });
  }, [store.state.kb, store.state.usage, store.state.full, products, services, catalog.state.specialists]);

  const summaries: KnowledgeSourceSummary[] = useMemo(
    () =>
      SOURCES.map((meta) => {
        const count =
          meta.id === 'faq'
            ? store.state.faqs.length
            : meta.id === 'products'
              ? products.length
              : meta.id === 'services'
                ? services.length
                : meta.id === 'team'
                  ? catalog.state.specialists.length
                  : null;
        const chars = meta.spendsBudget && budget ? (budget.bySource[meta.id as BudgetSlice] ?? null) : null;
        return { id: meta.id, count, chars, issues: findingsFor(findings, meta.id).length };
      }),
    [store.state.faqs.length, products.length, services.length, catalog.state.specialists.length, budget, findings],
  );

  const meta = sourceMeta(parsed.source);
  const canEditHere = role.canEdit && editsHere(meta, installedModules);

  const commandContext: KnowledgeCommandContext = useMemo(
    () => ({
      source: parsed.source,
      createLabel: createLabelFor(parsed.source, canEditHere),
      transferLabel: transferLabelFor(parsed.source),
      undoLabel: undo.label,
      dirtyCount,
      canEdit: role.canEdit,
      canReadInbox: role.canReadInbox,
      sources: summaries,
    }),
    [parsed.source, canEditHere, undo.label, dirtyCount, role.canEdit, role.canReadInbox, summaries],
  );

  const commandHandlers: KnowledgeCommandHandlers = useMemo(
    () => ({
      goSource,
      create,
      openImport,
      exportSource,
      undo: undo.run,
      saveAll: () => void drafts.saveAll(),
      focusSearch,
      refresh,
      openShortcuts: () => setShortcutsOpen(true),
      scanGaps,
    }),
    [goSource, create, openImport, exportSource, undo.run, drafts, focusSearch, refresh, scanGaps],
  );

  const stepSource = useCallback(
    (delta: -1 | 1) => {
      const visible = SOURCE_IDS.filter((id) => !sourceMeta(id).needsInbox || role.canReadInbox);
      const at = visible.indexOf(parsed.source);
      const next = visible[(at + delta + visible.length) % visible.length]!;
      goSource(next);
    },
    [parsed.source, goSource, role.canReadInbox],
  );

  const onShortcut = useCallback(
    (id: WorkspaceShortcutId) => {
      switch (id) {
        case 'palette':
          return setPaletteOpen((open) => !open);
        case 'help':
          return setShortcutsOpen(true);
        case 'search':
          return focusSearch();
        case 'undo':
          return undo.run();
        case 'save':
          return void drafts.saveAll();
        case 'refresh':
          return refresh();
        case 'new':
          return canEditHere ? create() : undefined;
        case 'import':
          return canEditHere && transferLabelFor(parsed.source) !== null ? openImport() : undefined;
        case 'export':
          return transferLabelFor(parsed.source) !== null ? exportSource() : undefined;
        case 'prevSource':
          return stepSource(-1);
        case 'nextSource':
          return stepSource(1);
      }
    },
    [focusSearch, undo, drafts, refresh, canEditHere, create, openImport, exportSource, parsed.source, stepSource],
  );

  useHotkeys(WORKSPACE_BINDINGS, onShortcut, { rootRef });

  return (
    <>
      <KnowledgeBaseHeader
        source={parsed.source}
        budget={budget}
        dirtyCount={dirtyCount}
        onRefresh={refresh}
        refreshing={busy || store.state.loading}
        canEditHere={canEditHere}
        createLabel={createLabelFor(parsed.source, canEditHere)}
        onCreate={create}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <SourcesView
        params={parsed}
        onParams={patch}
        band={band}
        role={role}
        findings={findings}
        summaries={summaries}
        budget={budget}
        canEditHere={canEditHere}
        onBusy={setBusy}
      />

      <DirtyGuardDialog
        open={guarded !== null}
        count={drafts.dirtyOn(parsed.source).length}
        onSave={async () => {
          const result = await drafts.saveAll();
          if (result.failed.length === 0 && guarded) patchNow(guarded);
          setGuarded(null);
        }}
        onDiscard={() => {
          drafts.discardAll();
          if (guarded) patchNow(guarded);
          setGuarded(null);
        }}
        onStay={() => setGuarded(null)}
      />
      <KnowledgeCommandPalette
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
