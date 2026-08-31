import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, ConfirmDialog, EmptyState, IconPlus, IconSparkles, PageBody, Skeleton, Toolbar } from '~ui';
import { GoodsItemPriceCurrency } from '~api/generated/bookings/graphql';
import { useCatalog } from '../BookingsCatalogContext';
import { ServiceCard } from '../components/services/ServiceCard';
import { ServiceDialog } from '../components/services/ServiceDialog';
import { useServicesMutations } from '../hooks/useServicesMutations';
import { errorMessage } from '../lib/errors';
import { DEFAULT_CURRENCY } from '../lib/serviceInput';
import type { ServiceRecord } from '../types';
import type { BookingsViewProps } from './types';

/** One column on a phone, two from 600px, three from 900px, four from 1280px — container widths, not the window's. */
const GRID = 'grid grid-cols-1 gap-3 @compact:grid-cols-2 @wide:grid-cols-3 @inline:grid-cols-4';

type DialogState = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; id: string };

/** The currency most services already use — a new one starts there rather than in USD on a EUR bot. */
function commonCurrency(services: readonly ServiceRecord[]): GoodsItemPriceCurrency {
  const counts = new Map<GoodsItemPriceCurrency, number>();
  for (const s of services) if (s.price) counts.set(s.price.currency, (counts.get(s.price.currency) ?? 0) + 1);
  let best: GoodsItemPriceCurrency = DEFAULT_CURRENCY;
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Services: a card grid over the catalog's `GoodsService`s (products stay in
 * Knowledge Base). Availability flips inline (a full-replace update from the
 * record with one flag changed); everything else edits in `ServiceDialog`.
 * Delete asks first — bookings keep the deleted service's name and price,
 * but there is no undo.
 */
export function ServicesView({ role, onCount, onBusy, refreshToken }: BookingsViewProps) {
  const catalog = useCatalog();
  const mutations = useServicesMutations();
  const { services, specialists, loading, error } = catalog.state;
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<ServiceRecord | null>(null);

  useEffect(
    () => onCount(loading && services.length === 0 ? null : services.length),
    [onCount, loading, services.length],
  );
  useEffect(() => onBusy(loading), [onBusy, loading]);
  const refresh = catalog.refresh;
  useEffect(() => {
    if (refreshToken > 0) refresh();
  }, [refreshToken, refresh]);

  const offeredBy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sp of specialists) for (const svc of sp.services) counts.set(svc.id, (counts.get(svc.id) ?? 0) + 1);
    return counts;
  }, [specialists]);

  const defaultCurrency = useMemo(() => commonCurrency(services), [services]);
  const editing = dialog.kind === 'edit' ? (services.find((s) => s.id === dialog.id) ?? null) : null;
  const close = useCallback(() => setDialog({ kind: 'closed' }), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="text-xs text-text-muted">
          {loading && services.length === 0
            ? 'Loading…'
            : `${services.length} ${services.length === 1 ? 'service' : 'services'}`}
        </span>
        <span className="flex-1" />
        {role.canManage ? (
          <Button size="sm" onClick={() => setDialog({ kind: 'new' })}>
            <IconPlus size={14} /> Add service
          </Button>
        ) : null}
      </Toolbar>

      <PageBody>
        {error ? (
          <Alert
            tone="danger"
            title="Could not load services"
            className="mb-3"
            action={
              <Button size="sm" variant="secondary" onClick={() => refresh()}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}
        {!role.canManage && !loading ? (
          <Alert tone="info" className="mb-3">
            Your role can see services but not change them — editing needs the Ai · Edit permission on this bot.
          </Alert>
        ) : null}

        {loading && services.length === 0 ? (
          <div className={GRID} aria-busy="true" aria-label="Loading services">
            <Skeleton variant="block" height="11rem" />
            <Skeleton variant="block" height="11rem" />
            <Skeleton variant="block" height="11rem" />
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={<IconSparkles />}
            title="Add your first service"
            description="A service is what customers book: a name, how long it takes, and what it costs. Specialists then pick which ones they offer."
            action={
              role.canManage ? <Button onClick={() => setDialog({ kind: 'new' })}>Add service</Button> : undefined
            }
          />
        ) : (
          <div className={GRID}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                specialistCount={offeredBy.get(service.id) ?? 0}
                canManage={role.canManage}
                onEdit={() => setDialog({ kind: 'edit', id: service.id })}
                onDelete={() => setDeleting(service)}
                onAvailability={(on) => mutations.setAvailability(service, on)}
              />
            ))}
          </div>
        )}
      </PageBody>

      <ServiceDialog
        open={dialog.kind !== 'closed'}
        service={editing}
        defaultCurrency={defaultCurrency}
        onClose={close}
        onSubmit={async (input) => {
          if (dialog.kind === 'edit') await mutations.updateService(dialog.id, input);
          else await mutations.createService(input);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.title}?` : 'Delete service?'}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await mutations.deleteService(deleting);
          } catch (err) {
            throw new Error(errorMessage(err), { cause: err });
          }
        }}
      >
        <p>
          Bookings keep the deleted service's name and price, and specialists who offered it simply stop. The wizard
          will no longer offer it. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
