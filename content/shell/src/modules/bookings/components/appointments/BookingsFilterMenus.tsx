import { useMemo, type ReactNode } from 'react';
import { Badge, Button, Checkbox, IconFilter, Popover } from '~ui';
import { useCatalog } from '../../BookingsCatalogContext';
import { filterGroupLabel, toggleFilterEntry } from '../../lib/appointmentsFilters';
import { activeFilterCount, isFilterEmpty, UNASSIGNED, type BookingsFilter } from '../../lib/bookingsFilter';
import { specialistName } from '../../lib/catalogStore';
import { STATUS_META } from '../../lib/status';

export interface BookingsFilterMenusProps {
  filter: BookingsFilter;
  onFilterChange: (next: BookingsFilter) => void;
  /** One combined popover instead of three — the compact band's toolbar has one row to give. */
  combined?: boolean;
  /** Names for the "everything" state of each menu; the appointments and insights views share the defaults. */
  className?: string;
}

interface Option {
  id: string;
  label: string;
}

/**
 * The shared filter — specialists (with "Unassigned"), services, statuses —
 * as three popovers of checkboxes, or one popover of three groups.
 *
 * It is CLIENT-SIDE (`lib/bookingsFilter.ts`): `bookingsV2` takes no filter,
 * so ticking a box narrows the rows the view has loaded and the header count
 * says "of N". An empty selection means "all", so unticking one entry from
 * the all-ticked state has to mean "everything but this" — the same rule the
 * deals stage menu applies, for the same reason (toggling an empty list would
 * narrow to the one thing the user just rejected).
 *
 * The catalog comes from context; a specialist or service that only exists on
 * old bookings (deleted refs) is not offered — the filter keys on ids, and a
 * deleted ref's id would match, but there is no name to show for it here.
 * The click arithmetic is `lib/appointmentsFilters.ts` (tested).
 */
export function BookingsFilterMenus({
  filter,
  onFilterChange,
  combined = false,
  className = '',
}: BookingsFilterMenusProps) {
  const catalog = useCatalog();

  const specialistOptions = useMemo<Option[]>(
    () => [
      ...catalog.state.specialists.map((sp) => ({ id: sp.id, label: specialistName(sp.profile) })),
      { id: UNASSIGNED, label: 'Unassigned' },
    ],
    [catalog.state.specialists],
  );
  const serviceOptions = useMemo<Option[]>(
    () => catalog.state.services.map((s) => ({ id: s.id, label: s.title })),
    [catalog.state.services],
  );
  const statusOptions = useMemo<Option[]>(() => STATUS_META.map((m) => ({ id: m.status, label: m.label })), []);

  const groups: { key: keyof BookingsFilter; title: string; all: string; options: Option[] }[] = [
    { key: 'specialists', title: 'Specialists', all: 'All specialists', options: specialistOptions },
    { key: 'services', title: 'Services', all: 'All services', options: serviceOptions },
    { key: 'statuses', title: 'Statuses', all: 'All statuses', options: statusOptions },
  ];

  const set = (key: keyof BookingsFilter, ids: string[]) => onFilterChange({ ...filter, [key]: ids } as BookingsFilter);

  const groupBody = (group: (typeof groups)[number]): ReactNode => {
    const selected = filter[group.key] as readonly string[];
    const ids = group.options.map((o) => o.id);
    return (
      <div className="flex w-56 flex-col items-start gap-1.5">
        {group.options.length === 0 ? (
          <span className="px-1 text-xs text-text-faint">Nothing to filter by yet.</span>
        ) : null}
        {group.options.map((option) => (
          <Checkbox
            key={option.id}
            checked={selected.length === 0 || selected.includes(option.id)}
            onChange={() => set(group.key, toggleFilterEntry(ids, selected, option.id))}
            label={option.label}
          />
        ))}
        {selected.length > 0 ? (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => set(group.key, [])}>
            {group.all}
          </Button>
        ) : null}
      </div>
    );
  };

  const groupLabel = (group: (typeof groups)[number]): string =>
    filterGroupLabel(
      filter[group.key] as readonly string[],
      (id) => group.options.find((o) => o.id === id)?.label,
      group.all,
    );

  if (combined) {
    const count = activeFilterCount(filter);
    return (
      <Popover
        aria-label="Filters"
        className={className}
        trigger={(props) => (
          <Button variant="ghost" size="md" aria-label={count > 0 ? `Filters, ${count} active` : 'Filters'} {...props}>
            <IconFilter size={14} />
            Filter
            <Badge count={count} />
          </Button>
        )}
      >
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.title}>
              <h4 className="mb-1.5 text-micro font-semibold uppercase tracking-wide text-text-faint">{group.title}</h4>
              {groupBody(group)}
            </section>
          ))}
          {isFilterEmpty(filter) ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange({ specialists: [], services: [], statuses: [] })}
            >
              Clear all filters
            </Button>
          )}
        </div>
      </Popover>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Popover
          key={group.key}
          aria-label={group.title}
          className={className}
          trigger={(props) => (
            <Button variant="ghost" size="md" aria-label={`${group.title}: ${groupLabel(group)}`} {...props}>
              <span className="max-w-40 truncate">{groupLabel(group)}</span>
            </Button>
          )}
        >
          {groupBody(group)}
        </Popover>
      ))}
    </>
  );
}
