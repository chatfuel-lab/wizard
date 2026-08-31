import { useMemo } from 'react';
import {
  Command,
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconFacebook,
  IconInstagram,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTikTok,
  IconUndo,
  IconWhatsApp,
  IconWidget,
} from '~ui';
import {
  buildCommandGroups,
  type AutomationsCommandContext,
  type AutomationsCommandHandlers,
  type AutomationsCommandIcons,
} from '../lib/commands';

export interface AutomationsCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  context: AutomationsCommandContext;
  handlers: AutomationsCommandHandlers;
}

/**
 * ⌘K over the `Command` primitive. All the judgement — which commands exist
 * in which state — is in `lib/commands.ts` and has tests; this is the JSX the
 * pure module cannot hold.
 */
const ICONS: AutomationsCommandIcons = {
  new: <IconPlus size={14} />,
  undo: <IconUndo size={14} />,
  save: <IconCheck size={14} />,
  search: <IconSearch size={14} />,
  'ai.on': <IconBolt size={14} />,
  'ai.off': <IconBolt size={14} />,
  refresh: <IconRefresh size={14} />,
  shortcuts: <IconSparkles size={14} />,
  scope: <IconArrowRight size={14} />,
  'preview.restart': <IconRefresh size={14} />,
  /* A source item carries its channel's glyph on the channel token; the All
     scope keeps the arrow. Full class names — Tailwind only emits what it reads. */
  platforms: {
    instagram: <IconInstagram size={14} className="text-channel-instagram" />,
    whatsapp: <IconWhatsApp size={14} className="text-channel-whatsapp" />,
    facebook: <IconFacebook size={14} className="text-channel-facebook" />,
    tiktok: <IconTikTok size={14} className="text-channel-tiktok" />,
    widget: <IconWidget size={14} className="text-channel-widget" />,
  },
};

export function AutomationsCommandPalette({ open, onClose, context, handlers }: AutomationsCommandPaletteProps) {
  const groups = useMemo(() => buildCommandGroups(context, handlers, ICONS), [context, handlers]);
  return (
    <Command open={open} onClose={onClose} groups={groups} placeholder="Search commands…" empty="No matching command" />
  );
}
