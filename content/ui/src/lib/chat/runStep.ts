/**
 * What a tool id means, in words a person recognises.
 *
 * The assistant's transcript is full of machine names: `chatfuel_gql-create_service`,
 * `frontend_action-navigate`, `skill-<name>`, `get_frontend_state`.
 * The module renders one of them today as the sentence "Ran Create service",
 * which is most of the way to nothing: it does not say what kind of thing
 * happened, whether the account changed, or which of the four families the tool
 * belongs to — and those are exactly the questions an operator staring at a
 * pending approval is asking.
 *
 * This is the vocabulary half, kept pure and tested, because it is a naming
 * scheme rather than a rendering: the same descriptor feeds the step card, the
 * approval banner and the accessible label, and the three used to disagree.
 *
 * ## The four families
 *
 * Three are documented in the module's guide. The fourth, `skill-*`, is not in
 * any document, which is why `family` is a closed union with an explicit `other`
 * member rather than an exhaustive one: the server can add a family tomorrow
 * and the step must still render.
 *
 * ## Why `mutating` is here
 *
 * A pending approval batch mixes reads and writes — the live one held
 * `create_service` (write) beside `list_catalog` (read) — and one boolean
 * approves all of them. The person deciding needs to see which ones touch the
 * account, and the only signal available is the verb in the tool id. It is a
 * heuristic and it is named as one; a verb this does not know is reported as
 * NOT mutating, because a false "this will change your data" on a read is the
 * warning that teaches people to ignore warnings.
 */

export type ToolFamily =
  /** `chatfuel_gql-*` — reads and writes on the account itself. */
  | 'data'
  /** `frontend_action-*` — moves the operator, or offers them a choice. */
  | 'navigation'
  /** `skill-*` — the assistant reading its own instructions before answering. */
  | 'skill'
  /** `get_frontend_state` — asking what is on the operator's screen right now. */
  | 'screen'
  /** `search_help_docs` — looking something up in the product documentation. */
  | 'docs'
  /** `fetch_url` — reading a page on the open web. */
  | 'web'
  /** Anything the server grows after this was written. */
  | 'other';

export interface ToolDescriptor {
  family: ToolFamily;
  /** A sentence fragment a person recognises: "Create service". */
  title: string;
  /** The bare name inside the family: `create_service`. */
  action: string;
  /** Whether running it changes account data. A heuristic — see the header. */
  mutating: boolean;
}

/** What each family is, for a legend or a group heading. */
export const TOOL_FAMILY_LABEL: Record<ToolFamily, string> = {
  data: 'Account data',
  navigation: 'Navigation',
  skill: 'Instructions',
  screen: 'Your screen',
  docs: 'Help docs',
  web: 'The web',
  other: 'Tool',
};

/**
 * Ids whose generated title would be wrong or merely unhelpful.
 *
 * Every one of these was seen in practice. `navigate` de-snake-cases to
 * "Navigate", which is a verb with no object; `get_frontend_state` becomes "Get
 * frontend state", which describes the implementation rather than the act. Small
 * table, and it only grows when a real id proves it needs to.
 */
const KNOWN_TITLES: Record<string, string> = {
  'frontend_action-navigate': 'Open a screen',
  'frontend_action-suggest_quick_reply': 'Offer a reply',
  get_frontend_state: 'Read your screen',
  search_help_docs: 'Search the help docs',
  fetch_url: 'Read a web page',
};

/**
 * Words that are shouted rather than capitalised.
 *
 * Without this, `get_api_key` reads "Get api key" — which looks like a typo in
 * a card an operator is being asked to approve.
 */
const ACRONYMS = new Set(['ai', 'api', 'crm', 'csv', 'faq', 'gql', 'id', 'ids', 'qr', 'sms', 'url', 'urls', 'wa']);

/**
 * Verbs that change something.
 *
 * Prefix match on the action, because the action is `verb_noun` by convention
 * on every id seen so far. A verb that is not here is treated as a read.
 */
const MUTATING_VERBS = [
  'add',
  'archive',
  'assign',
  'attach',
  'block',
  'cancel',
  'clear',
  'create',
  'delete',
  'disable',
  'duplicate',
  'enable',
  'import',
  'move',
  'pause',
  'publish',
  'remove',
  'rename',
  'reset',
  'resume',
  'schedule',
  'send',
  'set',
  'start',
  'stop',
  'subscribe',
  'unassign',
  'unblock',
  'unsubscribe',
  'update',
  'upsert',
];

/** `create_service` becomes `Create service`; acronyms stay shouted. */
export function humanizeAction(action: string): string {
  const words = action
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== '');
  if (words.length === 0) return '';
  const spelled = words.map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : word));
  const first = spelled[0]!;
  /* Sentence case, not title case: this is a phrase in a line of prose, and
     "Create Service" reads like a button in a different product. */
  return [ACRONYMS.has(words[0]!) ? first : first.charAt(0).toUpperCase() + first.slice(1), ...spelled.slice(1)].join(
    ' ',
  );
}

function isMutating(action: string): boolean {
  const verb = action.split(/[-_]/)[0]?.toLowerCase() ?? '';
  return MUTATING_VERBS.includes(verb);
}

/** The three tools that belong to no family prefix. */
const BUILT_IN_FAMILIES: Record<string, ToolFamily> = {
  get_frontend_state: 'screen',
  search_help_docs: 'docs',
  fetch_url: 'web',
};

/**
 * A tool id, read.
 *
 * Total: every string produces a descriptor, including the empty one. A step
 * that cannot be named is still a step that happened, and dropping it is how
 * tool activity became invisible in the first place.
 */
export function describeTool(toolID: string): ToolDescriptor {
  const id = toolID.trim();

  const known = KNOWN_TITLES[id];

  if (id.startsWith('chatfuel_gql-')) {
    const action = id.slice('chatfuel_gql-'.length);
    return {
      family: 'data',
      title: known ?? (humanizeAction(action) || id),
      action,
      mutating: isMutating(action),
    };
  }

  if (id.startsWith('frontend_action-')) {
    const action = id.slice('frontend_action-'.length);
    return {
      family: 'navigation',
      title: known ?? (humanizeAction(action) || id),
      action,
      /* A frontend action moves the operator or offers them a chip. It never
         touches the account, whatever its verb looks like. */
      mutating: false,
    };
  }

  if (id.startsWith('skill-')) {
    const action = id.slice('skill-'.length);
    /* Skill ids end in an abbreviation of "instructions" — `booking_assistant_instr`.
       Left alone it reads "Booking assistant instr", which is the raw id with a
       space in it. Spelled out it reads like a thing: the assistant consulted
       its booking-assistant instructions. */
    const name = action.replace(/_(instr|instructions)$/, '');
    const spelled = humanizeAction(name);
    return {
      family: 'skill',
      title: spelled === '' ? 'Instructions' : `${spelled} instructions`,
      action,
      mutating: false,
    };
  }

  const builtIn = BUILT_IN_FAMILIES[id];
  if (builtIn) {
    return { family: builtIn, title: known ?? humanizeAction(id), action: id, mutating: false };
  }

  return {
    family: 'other',
    title: humanizeAction(id) || id,
    action: id,
    mutating: isMutating(id),
  };
}

/* -------------------------------------------------------------- run state */

/** Where one step of a run got to. */
export type RunState = 'running' | 'done' | 'failed' | 'skipped';

/**
 * One state for a whole run, from the states of its steps.
 *
 * The order of the tests is the point: a failure outranks everything, because a
 * group summarised as "done" with a failed step folded inside it is how a
 * broken run gets collapsed and never looked at. Then "still running", then
 * "nothing actually ran", and only an all-succeeded run reads as done. An empty
 * run is 'skipped' rather than 'done' — nothing happened, and claiming success
 * for it is a lie the summary line would tell every time an approval was
 * rejected.
 */
export function rollUpRunState(states: readonly RunState[]): RunState {
  if (states.length === 0) return 'skipped';
  if (states.includes('failed')) return 'failed';
  if (states.includes('running')) return 'running';
  if (states.every((state) => state === 'skipped')) return 'skipped';
  return 'done';
}

/**
 * How long a step took, in the shortest form that is still honest.
 *
 * Sub-second durations keep milliseconds because "0.0s" is not a duration;
 * seconds get one decimal up to a minute, because the difference between 6.2s
 * and 6.8s is the difference between fast and slow to the person waiting; past
 * a minute the decimal is noise and the shape becomes `1m 04s`.
 */
export function formatRunDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - minutes * 60);
  /* 59.6 seconds rounds to 60 and would print "1m 60s". */
  if (rest === 60) return `${minutes + 1}m 00s`;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

/**
 * The one line a collapsed run group shows: "4 steps · 6.2s".
 *
 * The separator is a middle dot with hair spaces around it, the same one the
 * conversation list and the page headers use, so a run summary reads as part of
 * the same product rather than as a log line.
 */
export function formatRunSummary(count: number, duration?: number | string): string {
  const steps = count === 1 ? '1 step' : `${count} steps`;
  const elapsed = typeof duration === 'number' ? formatRunDuration(duration) : (duration ?? '');
  return elapsed === '' ? steps : `${steps} · ${elapsed}`;
}
