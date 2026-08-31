import { IconClock, IconImage, IconTrash, MenuButton, Switch, Tag, Tooltip, formatDuration, type MenuItem } from '~ui';
import { itemChars } from '../../lib/budget';
import type { Finding } from '../../lib/lint';
import { formatPrice } from '../../lib/productInput';
import type { CatalogService } from '../../types';
import { ItemFindings } from '../products/ItemFindings';

export interface ServiceCardProps {
  service: CatalogService;
  findings: readonly Finding[];
  /** How many specialists offer it — the thing that makes a service bookable. */
  specialistCount: number;
  /** False on the mirror: the card renders the same, minus every control. */
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAvailability: (isAvailable: boolean) => Promise<void>;
}

/**
 * One service, in the visual language Bookings uses for the same record —
 * thumbnail, title, duration, price, who offers it — because a person who
 * knows the Bookings card should recognise this one instantly, and because
 * a mirror that looked different would imply it holds different data.
 *
 * Read-only is a rendering, not a disabled form: the switch becomes a tag and
 * the menu disappears, rather than a row of greyed controls that invite
 * clicking. What it keeps is everything informational — the lint findings and
 * the character cost — because those are the reasons this source is shown here
 * at all.
 */
export function ServiceCard({
  service,
  findings,
  specialistCount,
  canEdit,
  onEdit,
  onDelete,
  onAvailability,
}: ServiceCardProps) {
  const thumb = service.images[0]?.url || null;
  const minutes = Math.round(service.durationSeconds / 60);
  const items: MenuItem[] = [
    { id: 'edit', label: 'Edit', onSelect: onEdit },
    { kind: 'separator', id: 'sep' },
    { id: 'delete', label: 'Delete…', icon: <IconTrash size={14} />, tone: 'danger', onSelect: onDelete },
  ];

  const body = (
    <>
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
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 text-left">
        <div className="truncate text-sm font-semibold text-text">{service.title}</div>
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
        <ItemFindings findings={findings} />
      </div>
    </>
  );

  return (
    <article
      aria-label={service.title}
      className={`flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised transition-colors duration-fast ease-standard ${service.isAvailable ? '' : 'opacity-75'}`}
    >
      {canEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${service.title}`}
          className="group flex min-w-0 flex-1 flex-col text-left focus-visible:focus-ring"
        >
          {body}
        </button>
      ) : (
        /* Not a button when there is nothing to open: a card that looks
           clickable and does nothing is worse than a card that does not. */
        <div className="flex min-w-0 flex-1 flex-col">{body}</div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        {canEdit ? (
          <Switch
            checked={service.isAvailable}
            onChange={onAvailability}
            label={service.isAvailable ? 'Available' : 'Unavailable'}
          />
        ) : (
          <Tag tone={service.isAvailable ? 'success' : 'warning'}>
            {service.isAvailable ? 'Available' : 'Unavailable'}
          </Tag>
        )}
        <span className="flex items-center gap-1">
          <Tooltip label="Characters this service spends of the assistant's budget">
            <span className="text-micro tabular-nums text-text-faint">{itemChars(service)}</span>
          </Tooltip>
          {canEdit ? <MenuButton items={items} label={`Actions for ${service.title}`} /> : null}
        </span>
      </div>
    </article>
  );
}
