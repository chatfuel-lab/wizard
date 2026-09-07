/**
 * What the ⌘K palette offers, as data.
 *
 * The shape follows the publishing module's `lib/commands.ts`: a table of
 * commands, each with a `when` that says in which state it exists, and one
 * function that turns the table into the groups the `Command` primitive
 * draws. Pure, so "which commands exist in which state" is a test rather
 * than a component to click through. Icons arrive from the component as a
 * map: a `.ts` file cannot render JSX, and turning this into a `.tsx` to
 * hold ten icons would take the rules out of the test suite.
 *
 * Workspace-scoped on purpose: every command acts on state the workspace
 * already owns — the view, the list's status filter, the draft it can
 * create, the catalog it can ask Meta about, the WhatsApp Manager page it
 * can open. The one thing that reads like a selection — "Open <name>", one
 * row per campaign — is navigation: it opens the row's panel, the same as a
 * click on the row, and nothing destructive is a keystroke away from a
 * name typed blind. Send, schedule and delete stay on the panel and in the
 * row menu, where the campaign is on screen and a dialog confirms.
 *
 * Nothing here restates a key. `shortcutChips` reads the binding out of
 * `lib/shortcuts.ts`, so a rebinding moves the palette with it — the rule
 * the `?` sheet already lives by.
 */
import type { ReactNode } from 'react';
import type { CommandGroup, CommandItem } from '~ui';
import type { BroadcastsView } from './broadcastsParams';
import { CAMPAIGN_STATUSES, STATUS_LABELS, type CampaignStatus } from './campaign';
import { BINDINGS, type ShortcutId } from './shortcuts';

export type CommandSection = 'Actions' | 'Go to' | 'Filter by status' | 'Templates' | 'Campaigns';

/** The sections in the order the palette lists them when nothing is typed. */
export const COMMAND_SECTIONS: readonly CommandSection[] = [
  'Actions',
  'Go to',
  'Filter by status',
  'Templates',
  'Campaigns',
];

export type BroadcastsCommandId =
  | 'new'
  | 'refresh'
  | 'shortcuts'
  | 'go.campaigns'
  | 'go.templates'
  | 'status.all'
  | `status.${CampaignStatus}`
  | 'manager'
  | 'checkTemplates'
  | `open.${string}`;

/** A campaign as the palette needs it: enough to name a row and open it. */
export interface CommandCampaign {
  flowId: string;
  name: string;
  status: CampaignStatus;
}

export interface BroadcastsCommandContext {
  view: BroadcastsView;
  /** The list's status filter. Null is every status. */
  status: CampaignStatus | null;
  /** Flows: Edit, answered. False while the role is still loading — nothing is offered on a guess. */
  canEdit: boolean;
  /** A WhatsApp number is connected, so the WhatsApp Manager page behind it exists. */
  whatsappConnected: boolean;
  /** Every campaign the list holds, newest first. */
  campaigns: readonly CommandCampaign[];
}

export interface BroadcastsCommandHandlers {
  newCampaign: () => void;
  refresh: () => void;
  openShortcuts: () => void;
  setView: (view: Exclude<BroadcastsView, 'compose'>) => void;
  setStatus: (status: CampaignStatus | null) => void;
  openManager: () => void;
  checkTemplates: () => void;
  /** Open the campaign's panel beside the list. */
  openCampaign: (flowId: string) => void;
}

/**
 * One command. `when` is the whole rule for its presence: absent means
 * always. `shortcut` is a binding id, resolved to chips at build time so a
 * rebinding in `lib/shortcuts.ts` moves the palette with it.
 */
export interface CommandDef {
  id: BroadcastsCommandId;
  label: string;
  section: CommandSection;
  keywords: readonly string[];
  when?: (ctx: BroadcastsCommandContext) => boolean;
  shortcut?: ShortcutId;
  run: (handlers: BroadcastsCommandHandlers) => void;
}

export type BroadcastsCommandIcons = Partial<
  Record<'new' | 'refresh' | 'shortcuts' | 'go' | 'status' | 'manager' | 'checkTemplates' | 'open', ReactNode>
>;

/**
 * `'mod+k'` → `['mod', 'k']`, `'g c'` → `['g', 'c']`: one `Kbd` group. Both
 * separators, because a spec uses both and they mean different things: `+`
 * is keys held together and a space is keystrokes one after the other.
 */
const chipsFor = (keys: string): readonly string[] => keys.split(/[+\s]+/).filter(Boolean);

const CHIPS = new Map<ShortcutId, readonly string[]>(
  BINDINGS.map((binding) => [binding.id as ShortcutId, chipsFor(binding.keys)]),
);

/** The keys a binding fires on, for anything that prints them. An id nothing binds prints nothing. */
export const shortcutChips = (id: ShortcutId): readonly string[] => CHIPS.get(id) ?? [];

const onList = (ctx: BroadcastsCommandContext): boolean => ctx.view === 'campaigns';

/**
 * The fixed part of the table. The per-campaign rows are appended by
 * `commandDefs` because they are as many as the list holds.
 */
export const COMMANDS: readonly CommandDef[] = [
  {
    id: 'new',
    label: 'New campaign',
    section: 'Actions',
    keywords: ['create', 'add', 'compose', 'draft', 'write'],
    /* Same condition as the header button: a role without Flows: Edit gets
       no draft, a bot with no number has nothing to send from, and the
       composer is already a draft. */
    when: (ctx) => ctx.canEdit && ctx.whatsappConnected && ctx.view !== 'compose',
    shortcut: 'newCampaign',
    run: (handlers) => handlers.newCampaign(),
  },
  {
    id: 'refresh',
    label: 'Refresh',
    section: 'Actions',
    keywords: ['reload', 'refetch', 'read again'],
    shortcut: 'refresh',
    run: (handlers) => handlers.refresh(),
  },
  {
    id: 'shortcuts',
    label: 'Keyboard shortcuts',
    section: 'Actions',
    keywords: ['keys', 'help', 'cheat sheet'],
    shortcut: 'help',
    run: (handlers) => handlers.openShortcuts(),
  },
  {
    id: 'go.campaigns',
    label: 'Campaigns',
    section: 'Go to',
    keywords: ['list', 'table', 'rows', 'drafts', 'sent', 'scheduled'],
    /* The view you are on is not a destination. */
    when: (ctx) => ctx.view !== 'campaigns',
    shortcut: 'goCampaigns',
    run: (handlers) => handlers.setView('campaigns'),
  },
  {
    id: 'go.templates',
    label: 'Templates',
    section: 'Go to',
    keywords: ['catalog', 'meta', 'approved', 'whatsapp'],
    when: (ctx) => ctx.view !== 'templates',
    shortcut: 'goTemplates',
    run: (handlers) => handlers.setView('templates'),
  },
  {
    id: 'status.all',
    label: 'All campaigns',
    section: 'Filter by status',
    keywords: ['status', 'filter', 'clear', 'everything'],
    /* Nothing to clear when nothing is filtered. */
    when: (ctx) => onList(ctx) && ctx.status !== null,
    run: (handlers) => handlers.setStatus(null),
  },
  ...CAMPAIGN_STATUSES.map((status): CommandDef => ({
    id: `status.${status}`,
    /* The same word the control on screen prints. */
    label: STATUS_LABELS[status],
    section: 'Filter by status',
    keywords: ['status', 'filter', 'only'],
    when: (ctx) => onList(ctx) && ctx.status !== status,
    run: (handlers) => handlers.setStatus(status),
  })),
  {
    id: 'manager',
    label: 'Open WhatsApp Manager',
    section: 'Templates',
    keywords: ['meta', 'new template', 'business', 'waba', 'create template'],
    /* The page is built from the WhatsApp Business Account behind the bot's
       number; without a number there is no page to open. */
    when: (ctx) => ctx.whatsappConnected,
    run: (handlers) => handlers.openManager(),
  },
  {
    id: 'checkTemplates',
    label: 'Check templates with Meta',
    section: 'Templates',
    keywords: ['sync', 'refetch', 'approved', 'pending', 'catalog', 'refresh templates'],
    when: (ctx) => ctx.whatsappConnected,
    run: (handlers) => handlers.checkTemplates(),
  },
];

/** The whole table for one state: the fixed rows, then one row per campaign. */
export function commandDefs(ctx: BroadcastsCommandContext): CommandDef[] {
  const fixed = COMMANDS.filter((def) => def.when === undefined || def.when(ctx));
  const perCampaign = ctx.campaigns.map((campaign): CommandDef => ({
    id: `open.${campaign.flowId}`,
    label: `Open ${campaign.name}`,
    section: 'Campaigns',
    /* The status is a search term, not a caption: typing "sent" finds the
         sent ones without a word on screen saying so. */
    keywords: [STATUS_LABELS[campaign.status].toLowerCase(), 'open', 'campaign', 'panel'],
    run: (handlers) => handlers.openCampaign(campaign.flowId),
  }));
  return [...fixed, ...perCampaign];
}

const SECTION_ICON: Record<CommandSection, keyof BroadcastsCommandIcons | null> = {
  Actions: null,
  'Go to': 'go',
  'Filter by status': 'status',
  Templates: null,
  Campaigns: 'open',
};

function iconFor(def: CommandDef, icons: BroadcastsCommandIcons): ReactNode {
  if (
    def.id === 'new' ||
    def.id === 'refresh' ||
    def.id === 'shortcuts' ||
    def.id === 'manager' ||
    def.id === 'checkTemplates'
  ) {
    return icons[def.id];
  }
  const key = SECTION_ICON[def.section];
  return key ? icons[key] : undefined;
}

/** The groups the `Command` primitive draws, in `COMMAND_SECTIONS` order, empty ones left out. */
export function buildCommandGroups(
  ctx: BroadcastsCommandContext,
  handlers: BroadcastsCommandHandlers,
  icons: BroadcastsCommandIcons = {},
): CommandGroup[] {
  const defs = commandDefs(ctx);
  const groups: CommandGroup[] = [];
  for (const section of COMMAND_SECTIONS) {
    const items: CommandItem[] = defs
      .filter((def) => def.section === section)
      .map((def) => ({
        id: def.id,
        label: def.label,
        keywords: def.keywords,
        shortcut: def.shortcut ? shortcutChips(def.shortcut) : undefined,
        icon: iconFor(def, icons),
        onSelect: () => def.run(handlers),
      }));
    if (items.length > 0) groups.push({ id: section, label: section, items });
  }
  return groups;
}
