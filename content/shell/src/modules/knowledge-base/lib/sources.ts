/**
 * The rail, as data.
 *
 * The server keeps ONE record — `bot.fuelyConfig.knowledgeBase` plus the goods
 * catalog and the specialists. A person reads that record as separate sources,
 * the way a dataset list reads in any AI-agent platform, and every part of the
 * module keys off this table: the rail, the deep links, the budget breakdown,
 * the command palette and the readiness checklist.
 *
 * `ownedBy` is the one piece of policy in here. Services and Team are edited in
 * the bookings module — a service is a bookable thing there, and two editors
 * over one entity drift. Knowledge Base still SHOWS them, because they are part
 * of what the AI reads and they spend the same character budget; it just sends
 * the edit somewhere else when that module is installed.
 */
export type SourceId = 'overview' | 'profile' | 'instructions' | 'faq' | 'products' | 'services' | 'team' | 'gaps';

export type SourceGroup = 'Overview' | 'Your business' | 'What the AI can answer' | 'Improve';

export interface SourceMeta {
  id: SourceId;
  /** Rail row. */
  label: string;
  /** Page header. */
  title: string;
  /** One line under the title, and the rail tooltip. */
  blurb: string;
  group: SourceGroup;
  /** The module that owns editing, when it is not this one. */
  ownedBy?: 'bookings';
  /** Deep link into the owning module's editor. */
  ownerHref?: string;
  /** Does this source spend the AI's character budget? Overview and Gaps do not. */
  spendsBudget: boolean;
  /** Reading this source needs `Inbox: View` rather than `Ai: Edit`. */
  needsInbox?: boolean;
}

export const SOURCES: readonly SourceMeta[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Overview',
    blurb: 'What your AI knows, what it costs, and what is missing.',
    group: 'Overview',
    spendsBudget: false,
  },
  {
    id: 'profile',
    label: 'Business profile',
    title: 'Business profile',
    blurb: 'Who you are: name, contacts, address, opening hours, how to pay.',
    group: 'Your business',
    spendsBudget: true,
  },
  {
    /* The id matches the wire field (`additionalInstructions`) and stays; the
       NAME does not, because the field is misnamed on the server. The behaviour
       prompt moved to the automation settings — what lives here is the free-text
       half of the business, and calling it "AI instructions" sent people to
       write a prompt in a box meant for facts. */
    id: 'instructions',
    label: 'About the business',
    title: 'About the business',
    blurb: 'Anything else the assistant should know — how you work, and what you do not do.',
    group: 'Your business',
    spendsBudget: true,
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'FAQ',
    blurb: 'Question and answer pairs, phrased the way customers ask them.',
    group: 'What the AI can answer',
    spendsBudget: true,
  },
  {
    id: 'products',
    label: 'Products',
    title: 'Products',
    blurb: 'What you sell: title, description, price, photos, availability.',
    group: 'What the AI can answer',
    spendsBudget: true,
  },
  {
    id: 'services',
    label: 'Services',
    title: 'Services',
    blurb: 'Bookable services the assistant can offer and schedule.',
    group: 'What the AI can answer',
    ownedBy: 'bookings',
    ownerHref: '/bookings/services',
    spendsBudget: true,
  },
  {
    id: 'team',
    label: 'Team',
    title: 'Team',
    blurb: 'The specialists a customer can be booked with.',
    group: 'What the AI can answer',
    ownedBy: 'bookings',
    ownerHref: '/bookings/staff',
    spendsBudget: true,
  },
  {
    id: 'gaps',
    label: 'Gaps',
    title: 'Gaps',
    blurb: 'Questions the assistant handed to a human — the list of what to write next.',
    group: 'Improve',
    spendsBudget: false,
    needsInbox: true,
  },
];

export const SOURCE_IDS: readonly SourceId[] = SOURCES.map((s) => s.id);

export const SOURCE_GROUPS: readonly SourceGroup[] = ['Overview', 'Your business', 'What the AI can answer', 'Improve'];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceMeta(id: SourceId): SourceMeta {
  const meta = BY_ID.get(id);
  /* SOURCE_IDS is the only way to get a SourceId, so this cannot miss — but a
   * stale deep link goes through `parseSource`, never through here. */
  if (!meta) throw new Error(`unknown knowledge source: ${id}`);
  return meta;
}

export const isSourceId = (raw: string | null): raw is SourceId => raw !== null && BY_ID.has(raw as SourceId);

/** Sources in one group, in rail order. */
export const sourcesIn = (group: SourceGroup): readonly SourceMeta[] => SOURCES.filter((s) => s.group === group);

/**
 * A mirror is editable here only when nobody else owns it. `installedModules`
 * comes from the shell registry, so a scaffold that took Knowledge Base without
 * Bookings still gets a working editor instead of a link to nowhere.
 */
export function editsHere(meta: SourceMeta, installedModules: readonly string[]): boolean {
  return meta.ownedBy === undefined || !installedModules.includes(meta.ownedBy);
}
