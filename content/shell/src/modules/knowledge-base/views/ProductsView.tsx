import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  ActionBar,
  Alert,
  Button,
  ConfirmDialog,
  CSV_BOM,
  downloadTextFile,
  EmptyState,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconTag,
  IconTrash,
  PageBody,
  Skeleton,
  toggleSelection,
  useToast,
  type MenuItem,
} from '~ui';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { ProductDialog } from '../components/products/ProductDialog';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductTable } from '../components/products/ProductTable';
import { ProductsToolbar } from '../components/products/ProductsToolbar';
import { usePrefs } from '../hooks/usePrefs';
import { useProductMutations } from '../hooks/useProductMutations';
import { announceDeleted, announceSelection } from '../lib/announce';
import { itemsChars } from '../lib/budget';
import { exportFileName, productsToCsv, productsToJson } from '../lib/catalogCsv';
import { isInitialCatalogLoad, selectItems, selectProducts } from '../lib/catalogStore';
import { findingsByItem, sourceWideFindings } from '../lib/findings';
import { GRID_COMPACT_BELOW } from '../lib/layout';
import { editMode, modeNotice } from '../lib/mirror';
import { commonCurrency } from '../lib/productInput';
import {
  emptyReason,
  rememberAllRecent,
  rememberRecent,
  visibleProducts,
  type AvailabilityFilter,
} from '../lib/productFilter';
import { CREATE_ATTRIBUTE } from '../lib/searchTargets';
import type { CatalogProduct } from '../types';
import { ImportWizard } from '../components/import/ImportWizard';
import type { KnowledgeViewProps } from './types';

type DialogState = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; id: string };

/**
 * Products — the one source this module owns outright.
 *
 * Two layouts over the same rows, because a catalog is browsed (cards, where
 * the photo is the point) and audited (a table, where forty rows fit). The
 * choice is a per-user preference rather than a deep link: it is about the
 * reader, not about what they are looking at.
 *
 * Everything else is one of three kinds of state, and keeping them apart is
 * the whole layout of this file: the URL owns the search (`?q=`) and the row
 * to open (`?item=`); `usePrefs` owns the layout and the sort; the filter, the
 * selection and the dialogs are local, because they are not worth a round trip
 * and nobody sends a link to them.
 */
export function ProductsView({ role, params, onParams, band, onBusy, findings, canEditHere }: KnowledgeViewProps) {
  const catalog = useCatalog();
  const mutations = useProductMutations();
  const { prefs, update: setPrefs } = usePrefs();
  const toast = useToast();

  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<CatalogProduct[]>([]);
  /* What this session wrote, newest first — the only recency signal the API
     gives us (see `lib/productFilter.ts`). */
  const [recent, setRecent] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const products = useMemo(() => selectProducts(catalog.state), [catalog.state]);
  const loading = isInitialCatalogLoad(catalog.state);
  useEffect(() => onBusy(catalog.state.loading), [onBusy, catalog.state.loading]);

  const view = useMemo(
    () => ({ query: params.q, availability, sort: prefs.productSort, recent }),
    [params.q, availability, prefs.productSort, recent],
  );
  const shown = useMemo(() => visibleProducts(products, view), [products, view]);
  const byItem = useMemo(() => findingsByItem(findings), [findings]);
  const wide = useMemo(() => sourceWideFindings(findings), [findings]);
  const defaultCurrency = useMemo(() => commonCurrency(selectItems(catalog.state)), [catalog.state]);
  const chars = useMemo(() => itemsChars(shown), [shown]);

  const mode = editMode(role.canEdit, canEditHere);
  const notice = modeNotice('products', mode);

  /* A selection that survives a filter change is a bulk action on rows nobody
     can see. Prune to what is on screen. */
  useEffect(() => {
    setSelected((current) => {
      const visible = new Set(shown.map((product) => product.id));
      const next = current.filter((id) => visible.has(id));
      return next.length === current.length ? current : next;
    });
  }, [shown]);

  /* `?item=` opens a row — how the Overview and the rail's findings link to
     the exact product that is wrong. */
  useEffect(() => {
    if (!params.item) return;
    if (!products.some((product) => product.id === params.item)) return;
    setDialog({ kind: 'edit', id: params.item });
  }, [params.item, products]);

  const closeDialog = useCallback(() => {
    setDialog({ kind: 'closed' });
    if (params.item) onParams({ item: null });
  }, [params.item, onParams]);

  const selectedRows = useMemo(() => shown.filter((product) => selected.includes(product.id)), [shown, selected]);
  const editing = dialog.kind === 'edit' ? (products.find((product) => product.id === dialog.id) ?? null) : null;

  const onSelect = useCallback(
    (id: string, event: MouseEvent<HTMLElement>) => {
      const result = toggleSelection({
        ids: shown.map((product) => product.id),
        selected,
        id,
        anchor,
        shift: event.shiftKey,
      });
      setSelected(result.selected);
      setAnchor(result.anchor);
      setAnnouncement(announceSelection(result.selected.length, shown.length));
    },
    [shown, selected, anchor],
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
    setAnchor(null);
  }, []);

  const remember = useCallback((id: string | null | undefined) => {
    if (id) setRecent((current) => rememberRecent(current, id));
  }, []);

  const exportRows = useCallback(
    (rows: readonly CatalogProduct[], format: 'csv' | 'json') => {
      if (rows.length === 0) return;
      if (format === 'csv')
        downloadTextFile(exportFileName('csv'), CSV_BOM + productsToCsv(rows), 'text/csv;charset=utf-8');
      else downloadTextFile(exportFileName('json'), productsToJson(rows), 'application/json');
      toast.show({
        title: `Exported ${rows.length} ${rows.length === 1 ? 'product' : 'products'}`,
        description: rows.length === products.length ? undefined : 'The rows currently shown, not the whole catalog.',
        tone: 'info',
        duration: 3000,
      });
    },
    [toast, products.length],
  );

  const bulkAvailability = useCallback(
    async (isAvailable: boolean) => {
      const rows = selectedRows;
      const result = await mutations.setAvailabilityMany(rows, isAvailable);
      setRecent((current) => rememberAllRecent(current, result.done));
      if (result.failed.length === 0) clearSelection();
    },
    [selectedRows, mutations, clearSelection],
  );

  const barActions = useMemo<MenuItem[]>(() => {
    const actions: MenuItem[] = [];
    if (canEditHere) {
      actions.push({
        id: 'available',
        label: 'Available',
        icon: <IconEye size={14} />,
        onSelect: () => void bulkAvailability(true),
      });
      actions.push({
        id: 'unavailable',
        label: 'Unavailable',
        icon: <IconEyeOff size={14} />,
        onSelect: () => void bulkAvailability(false),
      });
      actions.push({ kind: 'separator', id: 'sep-1' });
    }
    actions.push({
      id: 'export',
      label: 'Export',
      icon: <IconDownload size={14} />,
      onSelect: () => exportRows(selectedRows, 'csv'),
    });
    if (canEditHere)
      actions.push({
        id: 'delete',
        label: 'Delete…',
        icon: <IconTrash size={14} />,
        tone: 'danger',
        onSelect: () => setDeleting(selectedRows),
      });
    return actions;
  }, [canEditHere, bulkAvailability, exportRows, selectedRows]);

  const reason = emptyReason(products.length, shown.length, view);
  /* One band, one rule: at `GRID_COMPACT_BELOW` the grid is a single column
     (the container variants below do that) and the table drops the two
     columns that cannot survive the width. */
  const narrow = band === GRID_COMPACT_BELOW;

  const empty =
    reason === 'filtered' ? (
      <EmptyState
        icon={<IconTag />}
        title="Nothing matches"
        description="No product matches the search and filter you have on."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              onParams({ q: '' });
              setAvailability('all');
            }}
          >
            Clear the search and filter
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<IconTag />}
        title="No products yet"
        action={
          canEditHere ? <Button onClick={() => setDialog({ kind: 'new' })}>Add your first product</Button> : undefined
        }
      />
    );

  return (
    /* `relative` is load-bearing: ActionBar is absolute and deliberately not
       portalled, so an embed's bulk bar stays inside the module. */
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ProductsToolbar
        query={params.q}
        onQuery={(query) => onParams({ q: query })}
        availability={availability}
        onAvailability={setAvailability}
        sort={prefs.productSort}
        onSort={(productSort) => setPrefs({ productSort })}
        layout={prefs.productLayout}
        onLayout={(productLayout) => setPrefs({ productLayout })}
        shown={shown.length}
        total={products.length}
        chars={chars}
        onImport={() => onParams({ import: 'products' })}
        canImport={canEditHere}
        onExportCsv={() => exportRows(shown, 'csv')}
        onExportJson={() => exportRows(shown, 'json')}
        exportDisabled={shown.length === 0}
      />

      {/* The workspace's `n`, the header's primary button and the palette all
          press THIS control, so the dialog they open is the same one however
          it was asked for. Hidden because the visible affordances are the
          header's button and the empty state's. */}
      <button
        type="button"
        {...{ [CREATE_ATTRIBUTE]: true }}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onClick={() => setDialog({ kind: 'new' })}
      />

      <PageBody>
        {catalog.state.error ? (
          <Alert
            tone="danger"
            title="Could not load the catalog"
            className="mb-3"
            action={
              <Button size="sm" variant="secondary" onClick={catalog.refetch}>
                Try again
              </Button>
            }
          >
            {catalog.state.error}
          </Alert>
        ) : null}

        {notice ? (
          <Alert tone="info" title={notice.title} className="mb-3">
            {notice.body}
          </Alert>
        ) : null}

        {wide.length > 0 && !loading ? (
          <Alert tone="warning" className="mb-3">
            {wide.map((finding) => finding.detail).join(' ')}
          </Alert>
        ) : null}

        {loading ? (
          <div
            className="grid grid-cols-1 gap-3 @compact:grid-cols-2 @wide:grid-cols-3 @inline:grid-cols-4"
            aria-busy="true"
            aria-label="Loading products"
          >
            <Skeleton variant="block" height="13rem" />
            <Skeleton variant="block" height="13rem" />
            <Skeleton variant="block" height="13rem" />
            <Skeleton variant="block" height="13rem" />
          </div>
        ) : prefs.productLayout === 'table' ? (
          <ProductTable
            products={shown}
            findings={byItem}
            selected={selected}
            onSelectionChange={setSelected}
            canEdit={canEditHere}
            onEdit={(product) => setDialog({ kind: 'edit', id: product.id })}
            onDelete={(product) => setDeleting([product])}
            onAvailability={async (product, isAvailable) => {
              await mutations.setAvailability(product, isAvailable);
              remember(product.id);
            }}
            narrow={narrow}
            loading={false}
            empty={empty}
          />
        ) : shown.length === 0 ? (
          empty
        ) : (
          <ProductGrid
            products={shown}
            findings={byItem}
            selected={selected}
            onSelect={onSelect}
            canEdit={canEditHere}
            onEdit={(product) => setDialog({ kind: 'edit', id: product.id })}
            onDelete={(product) => setDeleting([product])}
            onAvailability={async (product, isAvailable) => {
              await mutations.setAvailability(product, isAvailable);
              remember(product.id);
            }}
          />
        )}
      </PageBody>

      <ActionBar
        count={selected.length}
        noun={{ one: 'product', many: 'products' }}
        actions={barActions}
        onClear={clearSelection}
      />

      <ProductDialog
        open={dialog.kind !== 'closed'}
        product={editing}
        defaultCurrency={defaultCurrency}
        onClose={closeDialog}
        onSubmit={async (input) => {
          if (dialog.kind === 'edit') {
            const saved = await mutations.update(dialog.id, input);
            remember(saved.id);
          } else {
            const created = await mutations.create(input);
            remember(created?.id);
          }
        }}
      />

      <ConfirmDialog
        open={deleting.length > 0}
        title={deleting.length === 1 ? `Delete ${deleting[0]!.title}?` : `Delete ${deleting.length} products?`}
        confirmLabel={deleting.length === 1 ? 'Delete' : `Delete ${deleting.length}`}
        onClose={() => setDeleting([])}
        onConfirm={async () => {
          const targets = deleting;
          if (targets.length === 1) await mutations.remove(targets[0]!);
          else await mutations.removeMany(targets);
          setAnnouncement(
            announceDeleted(targets.length === 1 ? targets[0]!.title : `${targets.length} products`, true),
          );
          clearSelection();
        }}
      >
        <p>
          The assistant stops offering {deleting.length === 1 ? 'it' : 'them'} straight away. You can undo this for a
          minute — but undo RE-CREATES the {deleting.length === 1 ? 'product' : 'products'}, so{' '}
          {deleting.length === 1 ? 'it comes' : 'they come'} back with a new id.
        </p>
      </ConfirmDialog>

      {/* Rendered unconditionally: it returns null unless `?import=products` is
          set, which is what makes a cold deep link into the wizard work. */}
      <ImportWizard target="products" params={params} onParams={onParams} band={band} canEdit={canEditHere} />

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
