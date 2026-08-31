/**
 * What a tool call is called, in words the person who owns the account
 * recognises.
 *
 * Tools arrive as bare ids on the wire and this module has to name them twice:
 * once in the thread, as a step that has already run, and once in the approval
 * card, as something about to run. Both readings come from here. A batch that
 * offers "Create service" beside a step that reads "Ran chatfuel gql create
 * service" is two vocabularies for one event, and the second one is what the
 * module shipped with.
 *
 * Four families:
 *
 *   chatfuel_gql-<action>   the account:    create_service, list_catalog
 *   frontend_action-<type>  the interface:  navigate, suggest_quick_reply
 *   skill-<name>            the assistant reading its own instructions
 *   <builtin>               get_frontend_state, search_help_docs, fetch_url
 *
 * `effect` is a claim about the ACCOUNT, not about the call: a navigation and
 * a skill read are both `read` because neither changes anything a person owns.
 * The approval card colours itself by it, which is why an unrecognised verb
 * counts as a write — that is the safe direction to be wrong in, and the same
 * reason an unknown tool id does too.
 *
 * One title per tool, not a past tense for the thread and an imperative for
 * the card. Deriving "Created service" from "create_service" needs a verb
 * table with irregulars in it (get → got, set → set, send → sent), and a table
 * of guesses about words nobody has seen is exactly what this file exists to
 * avoid.
 */

type ToolFamily = 'data' | 'navigation' | 'skill' | 'builtin' | 'unknown';

/** What it does to the account. */
type ToolEffect = 'read' | 'write' | 'destroy';

/** Which icon the step and the approval row draw. Chosen here so it is testable. */
export type ToolGlyph = ToolEffect | 'navigate' | 'skill' | 'screen' | 'docs' | 'web' | 'tool';

interface ToolDescription {
  family: ToolFamily;
  effect: ToolEffect;
  glyph: ToolGlyph;
  /** Sentence case, no trailing stop: "Create service". */
  title: string;
}

/* Words the product spells in capitals. Small on purpose: every entry is a
   word that looks wrong in lower case, not every word we happen to know. */
const ACRONYMS = new Set(['ai', 'api', 'crm', 'faq', 'id', 'qr', 'sms', 'url', 'utm']);

/* snake_case, kebab-case and camelCase all reach this file — tool ids are
   snake, argument keys (approval.ts humanises those too) are camel. */
const words = (value: string): string[] =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\-\s]+/)
    .filter((part) => part !== '');

const word = (part: string): string => (ACRONYMS.has(part.toLowerCase()) ? part.toUpperCase() : part.toLowerCase());

/** "create_service" → "create service"; acronyms keep shouting. */
export function humanizeLower(value: string): string {
  return words(value).map(word).join(' ');
}

/** "create_service" → "Create service", "list_faq" → "List FAQ". */
export function humanize(value: string): string {
  const lower = humanizeLower(value);
  return lower === '' ? '' : lower[0]!.toUpperCase() + lower.slice(1);
}

/* Leading verbs, and only leading verbs: `list_deals` reads, `create_service`
   writes, `cancel_booking` destroys. Anything whose verb is not in either set
   is a write. */
const READ_VERBS = new Set([
  'check',
  'count',
  'describe',
  'export',
  'fetch',
  'find',
  'get',
  'has',
  'is',
  'list',
  'load',
  'preview',
  'read',
  'search',
  'show',
]);
const DESTROY_VERBS = new Set([
  'archive',
  'cancel',
  'clear',
  'deactivate',
  'delete',
  'destroy',
  'disconnect',
  'purge',
  'remove',
  'revoke',
  'unpublish',
]);

export function effectOf(action: string): ToolEffect {
  const verb = words(action)[0]?.toLowerCase() ?? '';
  if (DESTROY_VERBS.has(verb)) return 'destroy';
  if (READ_VERBS.has(verb)) return 'read';
  return 'write';
}

/* The three built-ins the guide names and practice confirmed. They get
   written-out titles because their ids are engineering words: nobody reading a
   thread should have to know what "frontend state" is. */
const BUILTINS: Record<string, { title: string; glyph: ToolGlyph }> = {
  get_frontend_state: { title: 'Check what is on your screen', glyph: 'screen' },
  search_help_docs: { title: 'Search the help docs', glyph: 'docs' },
  fetch_url: { title: 'Read a web page', glyph: 'web' },
};

/* The two `frontend_action-*` ids, for the case where one is listed in an
   approval batch rather than sent as a CoworkerFrontendAction. A navigation
   the runtime actually performed is named by its outcome instead — "Opened
   Deals" — because only the shell knows where it landed. */
const ACTION_TITLES: Record<string, string> = {
  navigate: 'Open a page',
  suggest_quick_reply: 'Offer a quick reply',
};

const SKILL_SUFFIX = /[_-](instr|instructions|skill)$/;

/** `skill-booking_assistant_instr` → "Read its booking assistant instructions". */
function skillTitle(name: string): string {
  const label = humanizeLower(name.replace(SKILL_SUFFIX, ''));
  return label === '' ? 'Read its own instructions' : `Read its ${label} instructions`;
}

const GQL_PREFIX = 'chatfuel_gql-';
const ACTION_PREFIX = 'frontend_action-';
const SKILL_PREFIX = 'skill-';

/** The bare action, family prefix stripped: `chatfuel_gql-create_service` → `create_service`. */
export function bareAction(toolID: string): string {
  for (const prefix of [GQL_PREFIX, ACTION_PREFIX, SKILL_PREFIX]) {
    if (toolID.startsWith(prefix)) return toolID.slice(prefix.length);
  }
  return toolID;
}

export function describeTool(toolID: string): ToolDescription {
  const builtin = BUILTINS[toolID];
  if (builtin) return { family: 'builtin', effect: 'read', glyph: builtin.glyph, title: builtin.title };

  if (toolID.startsWith(GQL_PREFIX)) {
    const action = toolID.slice(GQL_PREFIX.length);
    const effect = effectOf(action);
    /* The glyph IS the effect for this family: the one thing worth seeing at a
       glance in a list of steps is which of them changed something. */
    return { family: 'data', effect, glyph: effect, title: humanize(action) || toolID };
  }
  if (toolID.startsWith(ACTION_PREFIX)) {
    const type = toolID.slice(ACTION_PREFIX.length);
    return {
      family: 'navigation',
      effect: 'read',
      glyph: 'navigate',
      title: ACTION_TITLES[type] ?? (humanize(type) || toolID),
    };
  }
  if (toolID.startsWith(SKILL_PREFIX)) {
    return {
      family: 'skill',
      effect: 'read',
      glyph: 'skill',
      title: skillTitle(toolID.slice(SKILL_PREFIX.length)),
    };
  }
  return { family: 'unknown', effect: 'write', glyph: 'tool', title: humanize(toolID) || toolID };
}

/** Delete, remove, cancel — the verbs the approval card turns red for. */
export function isDestructive(toolID: string): boolean {
  return describeTool(toolID).effect === 'destroy';
}
