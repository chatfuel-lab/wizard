import type { Dispatch } from 'react';
import { Button, Card, Checkbox, Tag, formatDuration } from '~ui';
import type { StaffFormAction, StaffFormState } from '../../lib/staffFormStore';
import { formatPrice } from '../../lib/serviceInput';
import type { ServiceRecord } from '../../types';

export interface ServicesSectionProps {
  state: StaffFormState;
  dispatch: Dispatch<StaffFormAction>;
  services: readonly ServiceRecord[];
  readOnly: boolean;
  onGoToServices: () => void;
}

/**
 * Which services this specialist offers. `Specialist.services` is the truth
 * the wizard and availability read (not the reverse), so an unchecked
 * service is one customers cannot book with this person. Unavailable
 * services are listed too — the link survives a service being paused.
 */
export function ServicesSection({ state, dispatch, services, readOnly, onGoToServices }: ServicesSectionProps) {
  const chosen = new Set(state.draft.serviceIds);
  return (
    <Card
      title="Services"
      description="Customers can book this specialist for the services checked here."
      actions={
        <Button variant="ghost" size="xs" onClick={onGoToServices}>
          Manage services
        </Button>
      }
    >
      {services.length === 0 ? (
        <p className="text-sm text-text-muted">
          No services yet. Add one in the Services section, then come back and check it here.
        </p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {services.map((service) => (
            <li key={service.id} className="flex items-center justify-between gap-3">
              <Checkbox
                checked={chosen.has(service.id)}
                disabled={readOnly || state.saving}
                onChange={(on) => dispatch({ type: 'toggleService', id: service.id, on })}
                label={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{service.title}</span>
                    <span className="text-xs text-text-muted">
                      {formatDuration(Math.round(service.durationSeconds / 60))} · {formatPrice(service.price)}
                    </span>
                  </span>
                }
              />
              {!service.isAvailable ? <Tag tone="warning">Unavailable</Tag> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
