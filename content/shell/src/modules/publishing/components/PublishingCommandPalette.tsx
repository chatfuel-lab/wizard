import { useMemo } from 'react';
import {
  Command,
  IconCalendar,
  IconColumns,
  IconFilter,
  IconInstagram,
  IconLayoutGrid,
  IconLayoutList,
  IconPlus,
  IconRefresh,
} from '~ui';
import {
  buildCommandGroups,
  type PublishingCommandContext,
  type PublishingCommandHandlers,
  type PublishingCommandIcons,
} from '../lib/commands';

export interface PublishingCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: PublishingCommandContext;
  handlers: PublishingCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state — is in
 * `lib/commands.ts` and has tests. This file is the JSX the pure module cannot
 * hold: a `.ts` cannot render an icon, and turning the rules into a `.tsx` to
 * carry ten of them would take them out of the test suite.
 *
 * The three calendar shapes wear the icons the calendar's own control wears, so
 * a row here and the segmented control it duplicates read as the same thing.
 */
const ICONS: PublishingCommandIcons = {
  new: <IconPlus size={14} />,
  refresh: <IconRefresh size={14} />,
  pull: <IconInstagram size={14} />,
  today: <IconCalendar size={14} />,
  'mode.month': <IconCalendar size={14} />,
  'mode.week': <IconColumns size={14} />,
  'mode.list': <IconLayoutList size={14} />,
  'view.calendar': <IconCalendar size={14} />,
  'view.queue': <IconLayoutList size={14} />,
  'view.library': <IconLayoutGrid size={14} />,
  'filter.status': <IconFilter size={14} />,
  'filter.kind': <IconFilter size={14} />,
};

export function PublishingCommandPalette({ open, onClose, context, handlers }: PublishingCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);

  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
