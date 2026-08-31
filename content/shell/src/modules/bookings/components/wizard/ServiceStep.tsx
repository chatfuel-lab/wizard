import { Button, EmptyState, IconCheck, formatDuration } from '~ui';
import { priceLabel } from '../../lib/panelForm';
import type { ServiceChoice } from '../../lib/wizardStore';
import type { ServiceRecord } from '../../types';

export interface ServiceStepProps {
  /** `bookableServices(catalog)` — available ones only. */
  services: readonly ServiceRecord[];
  /** How many the catalog holds that are not offered (hidden with a hint). */
  hiddenCount: number;
  choice: ServiceChoice;
  onChoose: (choice: Exclude<ServiceChoice, { kind: 'unset' }>) => void;
  loading: boolean;
}

/**
 * Step 1: which service. Cards, one per bookable service (title, duration,
 * price); a click chooses AND advances — the stepper is the way back. A
 * secondary "No service" lets an operator book time that is not in the
 * catalog (the API allows it; the time step then takes a typed time, since
 * availability needs a service to slice for).
 */
export function ServiceStep({ services, hiddenCount, choice, onChoose, loading }: ServiceStepProps) {
  if (!loading && services.length === 0) {
    return (
      <EmptyState
        title="No bookable services yet"
        description={
          hiddenCount > 0
            ? `${hiddenCount} ${hiddenCount === 1 ? 'service is' : 'services are'} marked unavailable. Make one available in Services, or book time without a service.`
            : 'Add a service in Services, or book time without one.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onChoose({ kind: 'none' })}>
              Book without a service
            </Button>
            <a
              href="/bookings/services"
              className="inline-flex h-8 items-center rounded-control px-3 text-sm text-accent hover:underline focus-visible:focus-ring"
            >
              Open Services
            </a>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Service" className="grid gap-2 @compact:grid-cols-2">
        {services.map((service) => {
          const selected = choice.kind === 'service' && choice.id === service.id;
          const image = service.images[0]?.url ?? null;
          return (
            <button
              key={service.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() =>
                onChoose({
                  kind: 'service',
                  id: service.id,
                  durationMinutes: Math.max(5, Math.round(service.durationSeconds / 60)),
                })
              }
              className={`flex items-start gap-3 rounded-card border p-3 text-left transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring ${
                selected ? 'border-accent bg-accent-soft' : 'border-border bg-surface-raised'
              }`}
            >
              {image ? (
                <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-control object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-sm font-semibold text-text-muted"
                >
                  {service.title.trim().charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text">{service.title}</span>
                  {selected ? <IconCheck size={14} className="shrink-0 text-accent" /> : null}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {formatDuration(Math.round(service.durationSeconds / 60))}
                  {service.price ? ` · ${priceLabel(service.price)}` : ''}
                </span>
                {service.description ? (
                  <span className="mt-1 line-clamp-2 block text-xs text-text-faint">{service.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {hiddenCount > 0 ? (
          <p className="text-xs text-text-faint">
            {hiddenCount} unavailable {hiddenCount === 1 ? 'service is' : 'services are'} hidden.
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={choice.kind === 'none'}
          onClick={() => onChoose({ kind: 'none' })}
        >
          {choice.kind === 'none' ? 'Booking without a service' : 'Book without a service'}
        </Button>
      </div>
    </div>
  );
}
