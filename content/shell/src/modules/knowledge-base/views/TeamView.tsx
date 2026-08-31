import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, IconSearch, IconUsers, Input, PageBody, Skeleton } from '~ui';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { MirrorNotice } from '../components/mirrors/MirrorNotice';
import { SpecialistCard } from '../components/mirrors/SpecialistCard';
import { SpecialistDialog } from '../components/mirrors/SpecialistDialog';
import { useSpecialistMutations } from '../hooks/useSpecialistMutations';
import { isInitialCatalogLoad, selectServices, specialistName } from '../lib/catalogStore';
import { editMode, modeNotice } from '../lib/mirror';
import { CREATE_ATTRIBUTE, SEARCH_ATTRIBUTE } from '../lib/searchTargets';
import type { SpecialistInfo } from '../types';
import type { KnowledgeViewProps } from './types';

type DialogState = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; id: string };

const GRID = 'grid grid-cols-1 gap-3 @compact:grid-cols-2 @inline:grid-cols-3';

const matches = (specialist: SpecialistInfo, query: string): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return true;
  return `${specialistName(specialist)} ${specialist.profile.aboutInfo ?? ''}`.toLocaleLowerCase().includes(needle);
};

/**
 * Team — a MIRROR, on the same terms as Services.
 *
 * Specialists belong to bookings, which schedules them; here they are part of
 * what the assistant knows (a name and a line about each) and they spend the
 * same character budget, so the page shows them either way and only the
 * buttons differ.
 *
 * Two things this page deliberately does NOT do, even in its editable mode:
 * working hours (a scheduling concern — the stored schedule is re-sent
 * untouched, see `lib/specialistInput.ts`) and Google Calendar. Both belong to
 * the module that owns the calendar, and half of either is worse than none.
 */
export function TeamView({ role, params, onParams, onBusy, canEditHere }: KnowledgeViewProps) {
  const catalog = useCatalog();
  const mutations = useSpecialistMutations();

  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<SpecialistInfo | null>(null);

  const specialists = catalog.state.specialists;
  const services = useMemo(() => selectServices(catalog.state), [catalog.state]);
  const loading = isInitialCatalogLoad(catalog.state);
  useEffect(() => onBusy(catalog.state.loading), [onBusy, catalog.state.loading]);

  const shown = useMemo(
    () => specialists.filter((specialist) => matches(specialist, params.q)),
    [specialists, params.q],
  );

  const mode = editMode(role.canEdit, canEditHere);
  const notice = modeNotice('team', mode);

  const editing =
    dialog.kind === 'edit' ? (specialists.find((specialist) => specialist.id === dialog.id) ?? null) : null;
  const closeDialog = useCallback(() => {
    setDialog({ kind: 'closed' });
    if (params.item) onParams({ item: null });
  }, [params.item, onParams]);

  useEffect(() => {
    if (!canEditHere || !params.item) return;
    if (!specialists.some((specialist) => specialist.id === params.item)) return;
    setDialog({ kind: 'edit', id: params.item });
  }, [canEditHere, params.item, specialists]);

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
            placeholder="Search the team"
            aria-label="Search the team"
            className="pl-7"
          />
        </span>
        <span className="text-xs text-text-muted">
          {shown.length === specialists.length
            ? `${specialists.length} ${specialists.length === 1 ? 'specialist' : 'specialists'}`
            : `${shown.length} of ${specialists.length}`}
        </span>
      </div>

      {canEditHere ? (
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

        {loading ? (
          <div className={GRID} aria-busy="true" aria-label="Loading the team">
            <Skeleton variant="block" height="8rem" />
            <Skeleton variant="block" height="8rem" />
            <Skeleton variant="block" height="8rem" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title={specialists.length === 0 ? 'No specialists yet' : 'Nobody matches'}
            description={
              specialists.length === 0
                ? 'Specialists are the people a customer can be booked with. The assistant can name them and say what each of them does.'
                : 'No specialist matches what you searched for.'
            }
            action={
              specialists.length === 0 && canEditHere ? (
                <Button onClick={() => setDialog({ kind: 'new' })}>Add a specialist</Button>
              ) : specialists.length > 0 ? (
                <Button variant="secondary" onClick={() => onParams({ q: '' })}>
                  Clear the search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={GRID}>
            {shown.map((specialist) => (
              <SpecialistCard
                key={specialist.id}
                specialist={specialist}
                services={services}
                canEdit={canEditHere}
                onEdit={() => setDialog({ kind: 'edit', id: specialist.id })}
                onDelete={() => setDeleting(specialist)}
              />
            ))}
          </div>
        )}
      </PageBody>

      {canEditHere ? (
        <>
          <SpecialistDialog
            open={dialog.kind !== 'closed'}
            specialist={editing}
            services={services}
            onClose={closeDialog}
            onSubmit={async (info) => {
              if (dialog.kind === 'edit') await mutations.update(dialog.id, info);
              else await mutations.create(info);
            }}
          />

          <ConfirmDialog
            open={deleting !== null}
            title={deleting ? `Delete ${specialistName(deleting)}?` : 'Delete specialist?'}
            confirmLabel="Delete"
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              if (deleting) await mutations.remove(deleting);
            }}
          >
            <p>The assistant stops naming them, and they stop being bookable. Bookings already made keep their name.</p>
            <p>
              There is no undo for this one: a re-created specialist gets a new id, and every booking that pointed at
              the old one would keep pointing at a deleted record.
            </p>
          </ConfirmDialog>
        </>
      ) : null}
    </div>
  );
}
