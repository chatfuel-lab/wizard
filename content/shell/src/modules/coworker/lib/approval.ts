import { bareAction, describeTool, humanize, humanizeLower } from './toolCalls';

/**
 * Reading a pending tool batch: one honest line per tool, and the whole of the
 * arguments a click away.
 *
 * This is the file behind the only screen in the product where a person
 * authorises software to change their account, so the bar is that the line
 * under "Create service" says what will exist afterwards — "45-min Colour
 * Consultation · 45 min · €80.00" — and never says nothing.
 *
 * The shape is:
 *
 *   { botId, service: { title, description, durationSeconds, images,
 *                       isAvailable, price: { amount, currency } } }
 *
 * Three deep, with the identifying words at the bottom. What the module does
 * today is `JSON.stringify(arguments, null, 2)` inside a <pre>, which is a
 * developer reading a payload, not an owner approving a change.
 *
 * How the line is built, and why this way round:
 *
 * 1. The bot id is dropped. Every call carries it and it identifies nothing.
 * 2. The arguments are flattened to leaves, and the first leaf whose KEY is an
 *    identifying one (title, name, label, …) becomes the headline.
 * 3. Up to two qualifiers are read from the object that leaf sits in —
 *    duration and price, formatted like a person writes them.
 * 4. With no identifying leaf, the first few scalars are named honestly
 *    ("Start time: 2026-08-20T10:00"). Ugly beats blank, and the full
 *    arguments are one click away — as `~ui`'s `JsonView`, which is where the
 *    raw half of this file went. This one derives the sentence a decision is
 *    made on; the tree behind "Arguments" is a rendering of the payload and
 *    was never this module's to own.
 *
 * The alternative was a table of tools — `create_booking` reads THIS, `add_faq`
 * reads THAT. Rejected: exactly two argument shapes have ever been observed
 * (`create_service` and the `list_*` family, which take a bot id and nothing
 * else), so such a table would be nine parts invention, and every tool the
 * server gains would silently fall out of it and back to a blank line. What
 * survives is a table of one, `KNOWN_SHAPES` below — for a shape we have
 * actually seen, so its fields are ordered the way the assistant said them.
 */

export interface ApprovalTool {
  toolID: string;
  arguments: Record<string, unknown>;
  needsManualApprove: boolean;
}

type Scalar = string | number | boolean | null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): value is Scalar =>
  value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/* Every tool call carries the bot it runs on. It is never the answer to "what
   is this going to do", and on a `list_*` call it is the ONLY argument. */
const BOT_KEYS = new Set(['botid', 'bot_id', 'bot']);
const isBotKey = (key: string): boolean => BOT_KEYS.has(key.toLowerCase());

/* Guards, not limits anyone should hit: these are model-authored arguments for
   one action, and a cycle in them would come from a client-side bug, not the
   wire. */
const MAX_DEPTH = 8;
const MAX_LEAVES = 400;

interface Leaf {
  key: string;
  value: Scalar;
  depth: number;
  /** The object the leaf sits in — where its qualifiers live. */
  parent: Record<string, unknown>;
}

function collectLeaves(node: Record<string, unknown>, depth: number, out: Leaf[]): void {
  if (depth > MAX_DEPTH || out.length >= MAX_LEAVES) return;
  for (const [key, value] of Object.entries(node)) {
    if (depth === 0 && isBotKey(key)) continue;
    if (out.length >= MAX_LEAVES) return;
    if (isScalar(value)) out.push({ key, value, depth, parent: node });
    else if (isPlainObject(value)) collectLeaves(value, depth + 1, out);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (isPlainObject(item)) collectLeaves(item, depth + 1, out);
      }
    }
  }
}

/**
 * Keys that identify the thing being acted on, best first. Priority beats
 * depth: a `title` three levels down is still a better headline than a `name`
 * at the root, because the root of one of these payloads is plumbing.
 * `description` is deliberately absent — it is prose, not a name.
 */
const IDENTITY_KEYS = ['title', 'name', 'label', 'subject', 'question', 'text', 'email', 'phone', 'url'];

const HEADLINE_MAX = 64;

const clip = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/** Human text for one scalar. Booleans read as words; null reads as absent. */
function scalarText(value: Scalar): string {
  if (value === null) return 'none';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  return value.trim();
}

/* One formatter per (locale, currency), like every other money label in this
   repo. An unknown currency code throws inside Intl, so it falls back to the
   amount and the code, which is still true. */
const PRICE_FORMATTERS = new Map<string, Intl.NumberFormat | null>();

export function priceText(amount: string | number, currency: string, locale?: string): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return `${String(amount)} ${currency}`.trim();
  if (value === 0) return 'Free';
  const key = `${locale ?? ''}|${currency}`;
  let formatter = PRICE_FORMATTERS.get(key);
  if (formatter === undefined) {
    try {
      formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    } catch {
      formatter = null;
    }
    PRICE_FORMATTERS.set(key, formatter);
  }
  return formatter ? formatter.format(value) : `${value} ${currency}`;
}

/** 2700 → "45 min", 5400 → "1 h 30 min", 45 → "45 s". */
export function durationText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function priceOf(parent: Record<string, unknown>, locale?: string): string | null {
  const price = parent.price;
  if (isPlainObject(price)) {
    const amount = price.amount;
    const currency = price.currency;
    if ((typeof amount === 'string' || typeof amount === 'number') && typeof currency === 'string') {
      return priceText(amount, currency, locale);
    }
  }
  const amount = price ?? parent.amount;
  const currency = parent.currency;
  if ((typeof amount === 'string' || typeof amount === 'number') && typeof currency === 'string') {
    return priceText(amount, currency, locale);
  }
  return null;
}

function durationOf(parent: Record<string, unknown>): string | null {
  const seconds = parent.durationSeconds ?? parent.duration_seconds;
  if (typeof seconds === 'number') return durationText(seconds) || null;
  const minutes = parent.durationMinutes ?? parent.duration_minutes;
  if (typeof minutes === 'number') return durationText(minutes * 60) || null;
  return null;
}

/** "3 images" / "1 image" — a non-empty list is worth a word, an empty one is not. */
function countOf(parent: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(parent)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const noun = humanizeLower(key);
    return value.length === 1 ? `1 ${noun.replace(/s$/, '')}` : `${value.length} ${noun}`;
  }
  return null;
}

/** Up to two, in this order: how long, how much, how many. */
function qualifiers(parent: Record<string, unknown>, locale?: string): string[] {
  const found = [durationOf(parent), priceOf(parent, locale), countOf(parent)];
  return found.filter((part): part is string => part !== null && part !== '').slice(0, 2);
}

function headline(leaves: readonly Leaf[]): Leaf | null {
  for (const key of IDENTITY_KEYS) {
    const matches = leaves.filter(
      (leaf) => leaf.key.toLowerCase() === key && typeof leaf.value === 'string' && leaf.value.trim() !== '',
    );
    if (matches.length === 0) continue;
    return matches.reduce((best, leaf) => (leaf.depth < best.depth ? leaf : best));
  }
  return null;
}

/* The one shape we have actually seen, so its fields come out in the order the
   assistant said them rather than in the order the generic walk finds them.
   Add an entry here only for a payload somebody has watched arrive. */
const KNOWN_SHAPES: Record<string, (args: Record<string, unknown>, locale?: string) => string | null> = {
  create_service: serviceLine,
  update_service: serviceLine,
};

function serviceLine(args: Record<string, unknown>, locale?: string): string | null {
  const service = args.service;
  if (!isPlainObject(service)) return null;
  const title = typeof service.title === 'string' ? service.title.trim() : '';
  if (title === '') return null;
  return [clip(title, HEADLINE_MAX), ...qualifiers(service, locale)].join(' · ');
}

const NOTHING_BUT_THE_BOT = 'No inputs beyond this bot';

/**
 * One line under the tool's name, derived from its arguments. Never empty.
 */
export function summarizeArguments(toolID: string, args: Record<string, unknown>, locale?: string): string {
  const known = KNOWN_SHAPES[bareAction(toolID)];
  const line = known?.(args, locale);
  if (line !== null && line !== undefined && line !== '') return line;

  const leaves: Leaf[] = [];
  collectLeaves(args, 0, leaves);

  const identity = headline(leaves);
  if (identity !== null && typeof identity.value === 'string') {
    return [clip(identity.value.trim(), HEADLINE_MAX), ...qualifiers(identity.parent, locale)].join(' · ');
  }

  const said = leaves
    .filter((leaf) => scalarText(leaf.value) !== '')
    .slice(0, 3)
    .map((leaf) => `${humanize(leaf.key)}: ${clip(scalarText(leaf.value), 32)}`);
  if (said.length > 0) return said.join(' · ');

  return Object.keys(args).some((key) => isBotKey(key)) ? NOTHING_BUT_THE_BOT : 'No inputs';
}

/* --- the batch ------------------------------------------------------------- */

interface BatchFacts {
  total: number;
  /** How many carry `needsManualApprove`. At least one always does (guide.md). */
  needsApproval: number;
  /** How many change anything at all — the rest only read. */
  writes: number;
  /** Any delete/remove/cancel in the batch — the card turns red for these. */
  destructive: boolean;
}

/**
 * What the header says. The API resolves the batch with ONE boolean, so these
 * are counts for the sentence, never per-tool switches: there is no way to
 * approve half of it, and pretending otherwise in the interface would be a lie
 * the server cannot keep.
 */
export function summarizeBatch(tools: readonly ApprovalTool[]): BatchFacts {
  const effects = tools.map((tool) => describeTool(tool.toolID).effect);
  return {
    total: tools.length,
    needsApproval: tools.filter((tool) => tool.needsManualApprove).length,
    writes: effects.filter((effect) => effect !== 'read').length,
    destructive: effects.includes('destroy'),
  };
}
