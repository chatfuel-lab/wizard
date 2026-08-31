import { useMemo } from 'react';
import {
  Command,
  IconArrowRight,
  IconCalendar,
  IconClock,
  IconColumns,
  IconFilter,
  IconLayoutList,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconUndo,
  IconUser,
} from '~ui';
import {
  buildCommandGroups,
  type BookingsCommandContext,
  type BookingsCommandHandlers,
  type BookingsCommandIcons,
} from '../lib/commands';

export interface BookingsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: BookingsCommandContext;
  handlers: BookingsCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive. All the judgement — which commands exist
 * in which state — is in `lib/commands.ts` and has tests; this is the JSX the
 * pure module cannot hold.
 */
const ICONS: BookingsCommandIcons = {
  new: <IconPlus size={14} />,
  undo: <IconUndo size={14} />,
  search: <IconSearch size={14} />,
  'filter.clear': <IconFilter size={14} />,
  'filter.specialist': <IconUser size={14} />,
  refresh: <IconRefresh size={14} />,
  shortcuts: <IconSparkles size={14} />,
  today: <IconCalendar size={14} />,
  mode: <IconCalendar size={14} />,
  by: <IconColumns size={14} />,
  color: <IconSparkles size={14} />,
  zone: <IconClock size={14} />,
  view: <IconArrowRight size={14} />,
  density: <IconLayoutList size={14} />,
};

export function BookingsCommandPalette({ open, onClose, context, handlers }: BookingsCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);
  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
