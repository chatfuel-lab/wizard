import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, IconClock, IconSearch, Input, PageBody, Skeleton } from '~ui';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { MirrorNotice } from '../components/mirrors/MirrorNotice';
import { ServiceCard } from '../components/mirrors/ServiceCard';
import { ServiceDialog } from '../components/mirrors/ServiceDialog';
import { useServiceMutations } from '../hooks/useServiceMutations';
import { isInitialCatalogLoad, selectItems, selectServices } from '../lib/catalogStore';
import { findingsByItem, sourceWideFindings } from '../lib/findings';
import { editMode, modeNotice } from '../lib/mirror';
import { commonCurrency } from '../lib/productInput';
import { CREATE_ATTRIBUTE, SEARCH_ATTRIBUTE } from '../lib/searchTargets';
import type { CatalogService } from '../types';
import type { KnowledgeViewProps } from './types';

type DialogState = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; id: string };

/** Two from 600px, three from 900px, four from 1280px — of the CONTAINER. */
const GRID = 'grid grid-cols-1 gap-3 @compact:grid-cols-2 @wide:grid-cols-3 @inline:grid-cols-4';

const matches = (service: CatalogService, query: string): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return true;
  return `${service.title} ${service.description}`.toLocaleLowerCase().includes(needle);
};

/**
 * Services — a MIRROR.
 *
 * The bookings module owns services: it schedules them, and two editors over
 * one entity drift. So when bookings is installed this page is a good
 * read-only view — the same cards, the same lint findings, the same character
 * cost — with a link to the editor that owns them. When bookings is NOT
 * installed (a scaffold that took Knowledge Base alone), the very same page
 * grows the full editor, because otherwise nothing on the bot could touch a
 * service at all.
 *
 * `canEditHere` arrives already decided by the workspace from `editsHere` and
 * the shell's installed-module list; `lib/mirror.ts` turns it into which of
 * the three sentences this page is saying.
 */
export function ServicesView({ role, params, onParams, onBusy, findings, canEditHere }: KnowledgeViewProps) {
  const catalog = useCatalog();
  const mutations = useServiceMutations();

  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<CatalogService | null>(null);

  const services = useMemo(() => selectServices(catalog.state), [catalog.state]);
  const loading = isInitialCatalogLoad(catalog.state);
  useEffect(() => onBusy(catalog.state.loading), [onBusy, catalog.state.loading]);

  const shown = useMemo(() => services.filter((service) => matches(service, params.q)), [services, params.q]);
  const byItem = useMemo(() => findingsByItem(findings), [findings]);
  const wide = useMemo(() => sourceWideFindings(findings), [findings]);
  const defaultCurrency = useMemo(() => commonCurrency(selectItems(catalog.state)), [catalog.state]);

  /* Who offers what. `Specialist.services` is the truth the booking flow
     reads, so a service nobody offers is unbookable however available it says
     it is — worth a line on the card. */
  const offeredBy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const specialist of catalog.state.specialists)
      for (const service of specialist.services) counts.set(service.id, (counts.get(service.id) ?? 0) + 1);
    return counts;
  }, [catalog.state.specialists]);

  const mode = editMode(role.canEdit, canEditHere);
  const notice = modeNotice('services', mode);

  const editing = dialog.kind === 'edit' ? (services.find((service) => service.id === dialog.id) ?? null) : null;
  const closeDialog = useCallback(() => {
    setDialog({ kind: 'closed' });
    if (params.item) onParams({ item: null });
  }, [params.item, onParams]);

  /* `?item=` opens a row — the Overview links straight at the service a
     finding is about. Only when this page can open one. */
  useEffect(() => {
    if (!canEditHere || !params.item) return;
    if (!services.some((service) => service.id === params.item)) return;
    setDialog({ kind: 'edit', id: params.item });
  }, [canEditHere, params.item, services]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-gutter py-2">
        <span className="relative min-w-40 flex-1">
          <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-faint">
            <IconSearch size={14} />
          </span>
          <Input
            {...{ [SEARCH_ATTRIBUTE]: true }}
            value={params.q}
            onChange={(event) => onParams({ q: event.target.value })}
            placeholder="Search services"
            aria-label="Search services"
            className="pl-7"
          />
        </span>
        <span className="text-xs text-text-muted">
          {shown.length === services.length
            ? `${services.length} ${services.length === 1 ? 'service' : 'services'}`
            : `${shown.length} of ${services.length}`}
        </span>
      </div>

      {canEditHere ? (
        /* The header's primary button, `n` and the palette all press this one. */
        <button
          type="button"
          {...{ [CREATE_ATTRIBUTE]: true }}
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onClick={() => setDialog({ kind: 'new' })}
        />
      ) : null}

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

        <MirrorNotice notice={notice} />

        {wide.length > 0 && !loading ? (
          <Alert tone="warning" className="mb-3">
            {wide.map((finding) => finding.detail).join(' ')}
          </Alert>
        ) : null}

        {loading ? (
          <div className={GRID} aria-busy="true" aria-label="Loading services">
            <Skeleton variant="block" height="12rem" />
            <Skeleton variant="block" height="12rem" />
            <Skeleton variant="block" height="12rem" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconClock />}
            title={services.length === 0 ? 'No services yet' : 'Nothing matches'}
            description={
              services.length === 0
                ? 'A service is something a customer books: a name, how long it takes and what it costs. The assistant offers exactly this list.'
                : 'No service matches what you searched for.'
            }
            action={
              services.length === 0 && canEditHere ? (
                <Button onClick={() => setDialog({ kind: 'new' })}>Add a service</Button>
              ) : services.length > 0 ? (
                <Button variant="secondary" onClick={() => onParams({ q: '' })}>
                  Clear the search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={GRID}>
            {shown.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                findings={byItem.get(service.id) ?? []}
                specialistCount={offeredBy.get(service.id) ?? 0}
                canEdit={canEditHere}
                onEdit={() => setDialog({ kind: 'edit', id: service.id })}
                onDelete={() => setDeleting(service)}
                onAvailability={(isAvailable) => mutations.setAvailability(service, isAvailable)}
              />
            ))}
          </div>
        )}
      </PageBody>

      {canEditHere ? (
        <>
          <ServiceDialog
            open={dialog.kind !== 'closed'}
            service={editing}
            defaultCurrency={defaultCurrency}
            onClose={closeDialog}
            onSubmit={async (input) => {
              if (dialog.kind === 'edit') await mutations.update(dialog.id, input);
              else await mutations.create(input);
            }}
          />

          <ConfirmDialog
            open={deleting !== null}
            title={deleting ? `Delete ${deleting.title}?` : 'Delete service?'}
            confirmLabel="Delete"
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              if (deleting) await mutations.remove(deleting);
            }}
          >
            <p>
              The assistant stops offering it straight away, and specialists who did it simply stop. You can undo this
              for a minute — but undo RE-CREATES the service, so it comes back with a new id.
            </p>
          </ConfirmDialog>
        </>
      ) : null}
    </div>
  );
}
