import { useMemo } from 'react';
import { Command, IconChecks, IconExternal, IconFilter, IconMegaphone, IconNavigate, IconPlus, IconRefresh } from '~ui';
import {
  buildCommandGroups,
  type BroadcastsCommandContext,
  type BroadcastsCommandHandlers,
  type BroadcastsCommandIcons,
} from '../lib/commands';

export interface BroadcastsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: BroadcastsCommandContext;
  handlers: BroadcastsCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive.
 *
 * All the judgement — which commands exist in which state — is in
 * `lib/commands.ts` and has tests. This file is the JSX the pure module
 * cannot hold: the icons, and the one primitive that draws the groups. A
 * copy of the publishing module's `components/PublishingCommandPalette.tsx`
 * over this module's table.
 */
const ICONS: BroadcastsCommandIcons = {
  new: <IconPlus size={14} />,
  refresh: <IconRefresh size={14} />,
  go: <IconNavigate size={14} />,
  status: <IconFilter size={14} />,
  manager: <IconExternal size={14} />,
  checkTemplates: <IconChecks size={14} />,
  open: <IconMegaphone size={14} />,
};

export function BroadcastsCommandPalette({ open, onClose, context, handlers }: BroadcastsCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);

  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
