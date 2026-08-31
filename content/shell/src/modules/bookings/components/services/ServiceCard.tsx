import { IconClock, IconImage, IconTrash, MenuButton, Switch, Tag, formatDuration, type MenuItem } from '~ui';
import { formatPrice } from '../../lib/serviceInput';
import type { ServiceRecord } from '../../types';

export interface ServiceCardProps {
  service: ServiceRecord;
  /** How many specialists offer it — "2 specialists", or a nudge when none do. */
  specialistCount: number;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Reject to show the error under the switch and revert it. */
  onAvailability: (isAvailable: boolean) => Promise<void>;
}

/**
 * One service: thumbnail (first image or a placeholder), title, duration,
 * price, who offers it, and the availability switch inline — the one edit
 * frequent enough to skip the dialog. Everything else is behind Edit.
 */
export function ServiceCard({
  service,
  specialistCount,
  canManage,
  onEdit,
  onDelete,
  onAvailability,
}: ServiceCardProps) {
  const thumb = service.images[0]?.url || null;
  const minutes = Math.round(service.durationSeconds / 60);
  const items: MenuItem[] = [
    { id: 'edit', label: 'Edit', onSelect: onEdit },
    { kind: 'separator', id: 'sep' },
    { id: 'delete', label: 'Delete', icon: <IconTrash size={14} />, tone: 'danger', onSelect: onDelete },
  ];

  return (
    <article
      aria-label={service.title}
      className={`flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised transition-colors duration-fast ease-standard ${service.isAvailable ? '' : 'opacity-75'}`}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${service.title}`}
        className="group flex min-w-0 flex-1 flex-col text-left focus-visible:focus-ring"
      >
        <div className="relative h-24 w-full overflow-hidden bg-surface-sunken">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-faint">
              <IconImage size={24} />
            </div>
          )}
          {!service.isAvailable ? (
            <span className="absolute left-2 top-2">
              <Tag tone="warning">Unavailable</Tag>
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <div className="truncate text-sm font-semibold text-text group-hover:text-accent">{service.title}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <IconClock size={12} /> {formatDuration(minutes)}
            </span>
            <span className="font-medium text-text">{formatPrice(service.price)}</span>
          </div>
          {service.description ? <p className="line-clamp-2 text-xs text-text-muted">{service.description}</p> : null}
          <div className={`text-xs ${specialistCount === 0 ? 'text-warning' : 'text-text-faint'}`}>
            {specialistCount === 0
              ? 'No specialist offers this yet'
              : `${specialistCount} ${specialistCount === 1 ? 'specialist' : 'specialists'}`}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <Switch
          checked={service.isAvailable}
          onChange={onAvailability}
          label={service.isAvailable ? 'Available' : 'Unavailable'}
          disabled={!canManage}
        />
        {canManage ? <MenuButton items={items} label={`Actions for ${service.title}`} /> : null}
      </div>
    </article>
  );
}
