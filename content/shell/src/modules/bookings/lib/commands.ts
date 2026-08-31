/**
 * What the ⌘K palette offers, as data.
 *
 * **Workspace-scoped on purpose** (deals' rule): every command acts on state
 * `BookingsWorkspace` already owns — the section, the calendar mode and
 * anchor, the shared filter, the density, the pending undo, the wizard.
 * Nothing reaches into a view and nothing acts on a selection; bulk actions
 * live on the `ActionBar`, where the count is visible.
 *
 * Pure, so "which commands appear in which state" is a test. Icons come in as
 * a map from the component.
 */
import type { ReactNode } from 'react';
import type { CommandGroup, CommandItem } from '~ui';
import { isFilterEmpty, type BookingsFilter } from './bookingsFilter';
import {
  MODES,
  VIEWS,
  type BookingsView,
  type CalendarBy,
  type CalendarColor,
  type CalendarMode,
} from './bookingsParams';
import { DENSITIES, type Density } from './layout';

export type BookingsCommandId =
  | 'new'
  | 'undo'
  | 'search'
  | 'filter.clear'
  | 'refresh'
  | 'shortcuts'
  | 'today'
  | 'mode'
  | 'by'
  | 'color'
  | 'zone'
  | 'view'
  | 'filter.specialist'
  | 'density';

export interface BookingsCommandSpecialist {
  id: string;
  name: string;
}

export interface BookingsCommandContext {
  view: BookingsView;
  mode: CalendarMode;
  by: CalendarBy;
  color: CalendarColor;
  filter: BookingsFilter;
  density: Density;
  undoLabel: string | null;
  canEdit: boolean;
  specialists: readonly BookingsCommandSpecialist[];
  /** The other zone the calendar could show, or null when the bot's zone is the operator's. */
  otherZone: { label: string; source: 'bot' | 'local' } | null;
}

export interface BookingsCommandHandlers {
  setView: (view: BookingsView) => void;
  setMode: (mode: CalendarMode) => void;
  setBy: (by: CalendarBy) => void;
  setColor: (color: CalendarColor) => void;
  setSpecialistFilter: (ids: string[]) => void;
  setDensity: (density: Density) => void;
  clearFilter: () => void;
  focusSearch: () => void;
  refresh: () => void;
  undo: () => void;
  today: () => void;
  newBooking: () => void;
  toggleZone: () => void;
  openShortcuts: () => void;
}

export type BookingsCommandIcons = Partial<Record<BookingsCommandId, ReactNode>>;

export const VIEW_LABELS: Record<BookingsView, string> = {
  calendar: 'Calendar',
  appointments: 'Appointments',
  staff: 'Staff',
  services: 'Services',
  settings: 'Settings',
  insights: 'Insights',
};

const VIEW_KEYWORDS: Record<BookingsView, string[]> = {
  calendar: ['grid', 'week', 'day', 'month', 'schedule'],
  appointments: ['list', 'table', 'upcoming', 'past', 'rows'],
  staff: ['specialists', 'team', 'people', 'hours', 'google calendar'],
  services: ['catalog', 'prices', 'duration', 'offer'],
  settings: ['ai', 'reminders', 'timezone', 'autonomy', 'notifications'],
  insights: ['stats', 'analytics', 'utilisation', 'no-show', 'revenue'],
};

const VIEW_SHORTCUT: Record<BookingsView, string[]> = {
  calendar: ['g', 'c'],
  appointments: ['g', 'a'],
  staff: ['g', 's'],
  services: ['g', 'v'],
  settings: ['g', 'e'],
  insights: ['g', 'i'],
};

const MODE_LABELS: Record<CalendarMode, string> = { day: 'Day', week: 'Week', month: 'Month' };
const MODE_KEY: Record<CalendarMode, string> = { day: 'd', week: 'w', month: 'm' };

/* `VIEWS`, `MODES` and `DENSITIES` are the URL schema's (`bookingsParams.ts`),
 * imported rather than restated: adding a section is one edit, not two, and a
 * palette that offers a view the parser rejects is the failure that costs. Only
 * the labels live here — the palette is the only place that needs them. */
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compact rows', comfortable: 'Comfortable rows' };

/** Sections where a filter applies (the others ignore it, so offering it would change nothing visible). */
const FILTERED_VIEWS: BookingsView[] = ['calendar', 'appointments', 'insights'];
const DENSE_VIEWS: BookingsView[] = ['calendar', 'appointments', 'staff'];

export function buildCommandGroups(
  context: BookingsCommandContext,
  handlers: BookingsCommandHandlers,
  icons: BookingsCommandIcons = {},
): CommandGroup[] {
  const groups: CommandGroup[] = [];
  const actions: CommandItem[] = [];

  if (context.canEdit) {
    actions.push({
      id: 'new',
      label: 'New booking',
      description: 'Pick a service, a specialist and a free slot',
      keywords: ['create', 'add', 'appointment', 'book'],
      shortcut: ['n'],
      icon: icons.new,
      onSelect: handlers.newBooking,
    });
  }

  if (context.undoLabel !== null) {
    actions.push({
      id: 'undo',
      label: context.undoLabel,
      keywords: ['revert', 'back', 'mistake'],
      shortcut: ['mod', 'z'],
      icon: icons.undo,
      onSelect: handlers.undo,
    });
  }

  if (context.view === 'appointments') {
    actions.push({
      id: 'search',
      label: 'Search appointments',
      description: 'By customer, phone, service or specialist — over the loaded rows',
      keywords: ['find', 'filter', 'name', 'phone'],
      shortcut: ['/'],
      icon: icons.search,
      onSelect: handlers.focusSearch,
    });
  }

  if (FILTERED_VIEWS.includes(context.view) && !isFilterEmpty(context.filter)) {
    actions.push({
      id: 'filter.clear',
      label: 'Clear all filters',
      keywords: ['reset', 'show everything'],
      icon: icons['filter.clear'],
      onSelect: handlers.clearFilter,
    });
  }

  actions.push({
    id: 'refresh',
    label: 'Refresh',
    keywords: ['reload', 'refetch'],
    shortcut: ['r'],
    icon: icons.refresh,
    onSelect: handlers.refresh,
  });

  actions.push({
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: ['?'],
    icon: icons.shortcuts,
    onSelect: handlers.openShortcuts,
  });

  groups.push({ id: 'actions', label: 'Actions', items: actions });

  if (context.view === 'calendar') {
    const calendar: CommandItem[] = [
      {
        id: 'today',
        label: 'Go to today',
        keywords: ['now', 'jump'],
        shortcut: ['t'],
        icon: icons.today,
        onSelect: handlers.today,
      },
      ...MODES.filter((mode) => mode !== context.mode).map((mode) => ({
        id: `mode.${mode}`,
        label: `${MODE_LABELS[mode]} view`,
        keywords: ['mode', 'zoom', 'period'],
        shortcut: [MODE_KEY[mode]],
        icon: icons.mode,
        onSelect: () => handlers.setMode(mode),
      })),
    ];
    if (context.mode !== 'month') {
      calendar.push({
        id: `by.${context.by === 'time' ? 'specialist' : 'time'}`,
        label: context.by === 'time' ? 'Columns by specialist' : 'Columns by day',
        description: context.by === 'time' ? 'One column per specialist (day view)' : 'One column per day',
        keywords: ['resource', 'columns', 'layout'],
        icon: icons.by,
        onSelect: () => handlers.setBy(context.by === 'time' ? 'specialist' : 'time'),
      });
    }
    calendar.push({
      id: `color.${context.color === 'specialist' ? 'status' : 'specialist'}`,
      label: context.color === 'specialist' ? 'Colour by status' : 'Colour by specialist',
      keywords: ['colors', 'colours', 'legend'],
      icon: icons.color,
      onSelect: () => handlers.setColor(context.color === 'specialist' ? 'status' : 'specialist'),
    });
    if (context.otherZone) {
      calendar.push({
        id: 'zone',
        label: `Show times in ${context.otherZone.label}`,
        description: context.otherZone.source === 'bot' ? "The bot's time zone" : 'Your time zone',
        keywords: ['timezone', 'time zone', 'clock', 'local'],
        icon: icons.zone,
        onSelect: handlers.toggleZone,
      });
    }
    groups.push({ id: 'calendar', label: 'Calendar', items: calendar });
  }

  const elsewhere = VIEWS.filter((view) => view !== context.view);
  groups.push({
    id: 'go',
    label: 'Go to',
    items: elsewhere.map((view) => ({
      id: `view.${view}`,
      label: VIEW_LABELS[view],
      keywords: VIEW_KEYWORDS[view],
      shortcut: VIEW_SHORTCUT[view],
      icon: icons.view,
      onSelect: () => handlers.setView(view),
    })),
  });

  if (FILTERED_VIEWS.includes(context.view) && context.specialists.length > 0) {
    const items: CommandItem[] = context.specialists
      .filter((sp) => !(context.filter.specialists.length === 1 && context.filter.specialists[0] === sp.id))
      .map((sp) => ({
        id: `specialist.${sp.id}`,
        label: sp.name,
        description: 'Show only their bookings',
        keywords: ['specialist', 'staff', 'filter'],
        icon: icons['filter.specialist'],
        onSelect: () => handlers.setSpecialistFilter([sp.id]),
      }));
    if (context.filter.specialists.length > 0) {
      items.unshift({
        id: 'specialist.all',
        label: 'Everyone',
        keywords: ['specialist', 'staff', 'filter', 'all'],
        icon: icons['filter.specialist'],
        onSelect: () => handlers.setSpecialistFilter([]),
      });
    }
    groups.push({ id: 'specialist', label: 'Filter by specialist', items });
  }

  if (DENSE_VIEWS.includes(context.view)) {
    const densities = DENSITIES.filter((value) => value !== context.density);
    groups.push({
      id: 'density',
      label: 'Density',
      items: densities.map((value) => ({
        id: `density.${value}`,
        label: DENSITY_LABELS[value],
        keywords: ['rows', 'compact', 'spacing'],
        icon: icons.density,
        onSelect: () => handlers.setDensity(value),
      })),
    });
  }

  return groups;
}
