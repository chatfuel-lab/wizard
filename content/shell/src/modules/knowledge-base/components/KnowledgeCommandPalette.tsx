import { useMemo } from 'react';
import {
  Command,
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconFile,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconUndo,
  IconWarning,
} from '~ui';
import {
  buildCommandGroups,
  type KnowledgeCommandContext,
  type KnowledgeCommandHandlers,
  type KnowledgeCommandIcons,
} from '../lib/commands';

export interface KnowledgeCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: KnowledgeCommandContext;
  handlers: KnowledgeCommandHandlers;
}

/**
 * Command-K over the `Command` primitive. All the judgement - which commands
 * exist in which state - is in `lib/commands.ts` and has tests; this is the JSX
 * the pure module cannot hold.
 */
const ICONS: KnowledgeCommandIcons = {
  new: <IconPlus size={14} />,
  import: <IconFile size={14} />,
  export: <IconDownload size={14} />,
  undo: <IconUndo size={14} />,
  save: <IconCheck size={14} />,
  search: <IconSearch size={14} />,
  refresh: <IconRefresh size={14} />,
  shortcuts: <IconSparkles size={14} />,
  scan: <IconWarning size={14} />,
  source: <IconArrowRight size={14} />,
};

export function KnowledgeCommandPalette({ open, onClose, context, handlers }: KnowledgeCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);
  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
