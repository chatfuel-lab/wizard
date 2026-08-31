import { useMemo, useState } from 'react';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import {
  Button,
  DropdownMenu,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconGlobe,
  IconPlus,
  MenuButton,
  MiniCalendar,
  Popover,
  SegmentedControl,
  Toolbar,
  monthKeyOf,
  type MenuItem,
} from '~ui';
import { UNASSIGNED, type BookingsFilter } from '../../lib/bookingsFilter';
import type { CalendarBy, CalendarColor, CalendarMode } from '../../lib/bookingsParams';
import { rangeLabel } from '../../lib/calendarLayout';
import type { DayRange, WeekStartsOn } from '../../lib/calendarRange';
import { specialistName } from '../../lib/catalogStore';
import type { Band } from '../../lib/layout';
import { STATUS_META } from '../../lib/status';
import { localZone, offsetLabel, sameWallClock } from '../../lib/zone';
import type { DisplayZone, ServiceRecord, SpecialistRecord } from '../../types';
import { FilterPopover } from './FilterPopover';
import { SpecialistChips } from './SpecialistChips';

export interface CalendarToolbarProps {
  band: Band;
  /** What the URL asks for; compact renders a day regardless. */
  requestedMode: CalendarMode;
  mode: CalendarMode;
  onMode: (mode: CalendarMode) => void;
  range: DayRange;
  anchor: string;
  todayKey: string;
  weekStartsOn: WeekStartsOn;
  onAnchor: (dayKey: string) => void;
  onStep: (delta: -1 | 1) => void;
  onToday: () => void;
  by: CalendarBy;
  onBy: (by: CalendarBy) => void;
  color: CalendarColor;
  onColor: (color: CalendarColor) => void;
  filter: BookingsFilter;
  onFilterChange: (next: BookingsFilter) => void;
  specialists: readonly SpecialistRecord[];
  services: readonly ServiceRecord[];
  zone: DisplayZone;
  nowMs: number;
  onZoneSourceChange: (source: 'bot' | 'local') => void;
  canEdit: boolean;
  onNew: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}

const MODES: { value: CalendarMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const BY_OPTIONS: { value: CalendarBy; label: string }[] = [
  { value: 'time', label: 'By time' },
  { value: 'specialist', label: 'By specialist' },
];

const COLOR_LABEL: Record<CalendarColor, string> = { specialist: 'Colour by specialist', status: 'Colour by status' };

/**
 * The calendar's own control row. Wide: everything inline. Compact: the
 * period navigation stays, and the rest folds into one menu (mode is not
 * offered — the compact band renders a day whatever the URL says).
 *
 * The zone caption and its switch appear only when the bot's zone shows a
 * different wall clock from the operator's right now; when the two agree the
 * question does not exist.
 */
export function CalendarToolbar(props: CalendarToolbarProps) {
  const {
    band,
    requestedMode,
    mode,
    onMode,
    range,
    anchor,
    todayKey,
    weekStartsOn,
    onAnchor,
    onStep,
    onToday,
    by,
    onBy,
    color,
    onColor,
    filter,
    onFilterChange,
    specialists,
    services,
    zone,
    nowMs,
    onZoneSourceChange,
    canEdit,
    onNew,
    selectedCount,
    onClearSelection,
  } = props;
  const compact = band === 'compact';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => monthKeyOf(anchor));

  const label = useMemo(() => rangeLabel(mode, range, anchor), [mode, range, anchor]);

  const local = localZone();
  const zoneCaption = useMemo(() => {
    if (!zone.botZone || sameWallClock(zone.botZone, local, nowMs)) return null;
    const showing =
      zone.source === 'bot'
        ? `Bot time · ${zone.botZone} (${offsetLabel(zone.botZone, nowMs)})`
        : `Your time · ${local} (${offsetLabel(local, nowMs)})`;
    const other =
      zone.source === 'bot'
        ? { label: 'Show in your time', source: 'local' as const }
        : { label: 'Show in bot time', source: 'bot' as const };
    return { showing, other };
  }, [zone.botZone, zone.source, local, nowMs]);

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.id, label: s.title, hint: s.isAvailable ? undefined : 'unavailable' })),
    [services],
  );
  const statusOptions = useMemo(() => STATUS_META.map((m) => ({ value: m.status, label: m.label })), []);

  const datePicker = (
    <Popover
      open={pickerOpen}
      onOpenChange={(open) => {
        setPickerOpen(open);
        if (open) setPickerMonth(monthKeyOf(anchor));
      }}
      placement="bottom-start"
      aria-label="Jump to a date"
      className="p-2"
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          variant="ghost"
          size="sm"
          className="font-semibold text-text"
          aria-label={`${label}. Jump to a date`}
        >
          <span className="truncate">{label}</span>
          <IconChevronDown size={12} />
        </Button>
      )}
    >
      <MiniCalendar
        month={pickerMonth}
        onMonthChange={setPickerMonth}
        value={anchor}
        onChange={(day) => {
          onAnchor(day);
          setPickerOpen(false);
        }}
        weekStartsOn={weekStartsOn}
        todayKey={todayKey}
        aria-label="Jump to a date"
      />
    </Popover>
  );

  const navigation = (
    <div className="flex items-center gap-1">
      <Button iconOnly variant="ghost" size="sm" aria-label={`Previous ${mode}`} onClick={() => onStep(-1)}>
        <IconChevronLeft />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday} disabled={anchor === todayKey && mode !== 'month'}>
        Today
      </Button>
      <Button iconOnly variant="ghost" size="sm" aria-label={`Next ${mode}`} onClick={() => onStep(1)}>
        <IconChevronRight />
      </Button>
      {datePicker}
    </div>
  );

  if (compact) {
    const items: MenuItem[] = [];
    if (canEdit)
      items.push({ id: 'new', label: 'New booking', icon: <IconPlus size={14} />, shortcut: ['n'], onSelect: onNew });
    items.push({ kind: 'separator', id: 's-sp' });
    items.push({ kind: 'label', id: 'sp', label: 'Specialists' });
    for (const sp of specialists) {
      const on = filter.specialists.includes(sp.id);
      items.push({
        id: `sp-${sp.id}`,
        label: specialistName(sp.profile),
        checked: on,
        onSelect: () =>
          onFilterChange({
            ...filter,
            specialists: on ? filter.specialists.filter((id) => id !== sp.id) : [...filter.specialists, sp.id],
          }),
      });
    }
    {
      const on = filter.specialists.includes(UNASSIGNED);
      items.push({
        id: 'sp-none',
        label: 'Unassigned',
        checked: on,
        onSelect: () =>
          onFilterChange({
            ...filter,
            specialists: on
              ? filter.specialists.filter((id) => id !== UNASSIGNED)
              : [...filter.specialists, UNASSIGNED],
          }),
      });
    }
    if (services.length > 0) {
      items.push({ kind: 'separator', id: 's-svc' });
      items.push({ kind: 'label', id: 'svc', label: 'Services' });
      for (const s of services) {
        const on = filter.services.includes(s.id);
        items.push({
          id: `svc-${s.id}`,
          label: s.title,
          checked: on,
          onSelect: () =>
            onFilterChange({
              ...filter,
              services: on ? filter.services.filter((id) => id !== s.id) : [...filter.services, s.id],
            }),
        });
      }
    }
    items.push({ kind: 'separator', id: 's-status' });
    items.push({ kind: 'label', id: 'status', label: 'Status' });
    for (const m of STATUS_META) {
      const on = filter.statuses.includes(m.status);
      items.push({
        id: `status-${m.status}`,
        label: m.label,
        checked: on,
        onSelect: () =>
          onFilterChange({
            ...filter,
            statuses: on
              ? filter.statuses.filter((s) => s !== m.status)
              : STATUS_META.map((x) => x.status).filter((s) => s === m.status || filter.statuses.includes(s)),
          }),
      });
    }
    items.push({ kind: 'separator', id: 's-color' });
    items.push({
      id: 'color-specialist',
      label: 'Colour by specialist',
      checked: color === 'specialist',
      onSelect: () => onColor('specialist'),
    });
    items.push({
      id: 'color-status',
      label: 'Colour by status',
      checked: color === 'status',
      onSelect: () => onColor('status'),
    });
    if (zoneCaption) {
      items.push({ kind: 'separator', id: 's-zone' });
      items.push({
        id: 'zone',
        label: zoneCaption.other.label,
        icon: <IconGlobe size={14} />,
        onSelect: () => onZoneSourceChange(zoneCaption.other.source),
      });
    }
    return (
      <Toolbar>
        {navigation}
        <div className="ml-auto flex items-center gap-1">
          {selectedCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              {selectedCount} selected · clear
            </Button>
          ) : null}
          <MenuButton items={items} label="Calendar options" />
        </div>
      </Toolbar>
    );
  }

  return (
    <Toolbar>
      <SegmentedControl aria-label="Calendar mode" size="sm" value={requestedMode} onChange={onMode} options={MODES} />
      {navigation}
      {mode === 'day' ? (
        <SegmentedControl aria-label="Columns" size="sm" value={by} onChange={onBy} options={BY_OPTIONS} />
      ) : null}
      <SpecialistChips
        specialists={specialists}
        value={filter.specialists}
        onChange={(next) => onFilterChange({ ...filter, specialists: next })}
        showTone={color === 'specialist'}
      />
      <FilterPopover
        label="Service"
        options={serviceOptions}
        value={filter.services}
        onChange={(next) => onFilterChange({ ...filter, services: next })}
      />
      <FilterPopover<BookingStatus>
        label="Status"
        options={statusOptions}
        value={filter.statuses}
        onChange={(next) => onFilterChange({ ...filter, statuses: next })}
      />
      <DropdownMenu
        aria-label="Colour"
        placement="bottom-start"
        items={[
          {
            id: 'specialist',
            label: 'By specialist',
            checked: color === 'specialist',
            onSelect: () => onColor('specialist'),
          },
          { id: 'status', label: 'By status', checked: color === 'status', onSelect: () => onColor('status') },
        ]}
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant="ghost" size="sm" aria-label={COLOR_LABEL[color]}>
            {color === 'specialist' ? 'Colour: specialist' : 'Colour: status'}
            <IconChevronDown size={12} />
          </Button>
        )}
      />
      {selectedCount > 0 ? (
        <span className="text-xs text-text-muted">
          {selectedCount} selected
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-2 rounded underline decoration-dotted focus-visible:focus-ring"
          >
            clear
          </button>
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        {zoneCaption ? (
          <span className="flex items-center gap-1.5 text-micro text-text-muted">
            <IconGlobe size={12} />
            <span className="hidden @wide:inline">{zoneCaption.showing}</span>
            <Button variant="ghost" size="xs" onClick={() => onZoneSourceChange(zoneCaption.other.source)}>
              {zoneCaption.other.label}
            </Button>
          </span>
        ) : null}
        {canEdit ? (
          <Button variant="outline" size="sm" onClick={onNew}>
            <IconPlus />
            New
          </Button>
        ) : null}
      </div>
    </Toolbar>
  );
}
