import { Avatar, IconTrash, MenuButton, Tag, Tooltip, type MenuItem } from '~ui';
import { specialistName } from '../../lib/catalogStore';
import type { CatalogService, SpecialistInfo } from '../../types';

export interface SpecialistCardProps {
  specialist: SpecialistInfo;
  /** Every service on the bot, so the ids this person carries can be named. */
  services: readonly CatalogService[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** Name plus about line — what a specialist costs the assistant's budget. */
const charsOf = (specialist: SpecialistInfo): number =>
  specialist.profile.firstName.length +
  (specialist.profile.lastName?.length ?? 0) +
  (specialist.profile.aboutInfo?.length ?? 0);

/**
 * One specialist: photo, name, the line the assistant can say about them, and
 * the services they can be booked for.
 *
 * The services are named rather than counted. "2 services" tells a reader
 * nothing they can act on; "Cupping session, Barista consultation" is the
 * thing they came to check — and an id that matches no service at all is
 * shown as a stub instead of silently dropped, because a stale link is
 * exactly the sort of thing this page exists to surface.
 */
export function SpecialistCard({ specialist, services, canEdit, onEdit, onDelete }: SpecialistCardProps) {
  const name = specialistName(specialist);
  const byId = new Map(services.map((service) => [service.id, service]));
  const items: MenuItem[] = [
    { id: 'edit', label: 'Edit', onSelect: onEdit },
    { kind: 'separator', id: 'sep' },
    { id: 'delete', label: 'Delete…', icon: <IconTrash size={14} />, tone: 'danger', onSelect: onDelete },
  ];

  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3 p-3 text-left">
      <Avatar src={specialist.profile.logo?.url ?? null} name={name} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="truncate text-sm font-semibold text-text">{name}</div>
        {specialist.profile.aboutInfo ? (
          <p className="line-clamp-2 text-xs text-text-muted">{specialist.profile.aboutInfo}</p>
        ) : (
          <p className="text-xs text-text-faint">No description</p>
        )}
        {specialist.services.length === 0 ? (
          <span className="text-xs text-warning">No services yet</span>
        ) : (
          <ul role="list" className="flex flex-wrap gap-1">
            {specialist.services.map((ref) => {
              const service = byId.get(ref.id);
              return (
                <li key={ref.id}>
                  <Tag tone={service ? 'neutral' : 'warning'}>
                    {service ? service.title : 'A service that no longer exists'}
                  </Tag>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <article
      aria-label={name}
      className="flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised"
    >
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${name}`}
          className="group flex min-w-0 flex-1 text-left focus-visible:focus-ring"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1">{body}</div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="text-micro text-text-faint">
          {specialist.services.length === 1 ? '1 service' : `${specialist.services.length} services`}
        </span>
        <span className="flex items-center gap-1">
          <Tooltip label="Characters this specialist spends of the assistant's budget">
            <span className="text-micro tabular-nums text-text-faint">{charsOf(specialist)}</span>
          </Tooltip>
          {canEdit ? <MenuButton items={items} label={`Actions for ${name}`} /> : null}
        </span>
      </div>
    </article>
  );
}
