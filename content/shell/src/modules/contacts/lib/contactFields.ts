/**
 * The record page's own vocabulary: the handful of fields a salesperson looks
 * for first, and the sales stage.
 *
 * ## Why a convention rather than a schema
 *
 * The Chatfuel API has no notion of a "field" beyond a contact attribute. A
 * contact carries `name`, `note`, `salesStageV2`, an assignee, and — on
 * WhatsApp — a `phone`; everything else a CRM would call a field is a custom
 * attribute created by the first write to it, instantly and as
 * `type: custom, dataType: string`.
 *
 * So "email", "company", "city" are a CONVENTION this module declares, and the
 * whole convention is this table. Rename an `attributeName` here and the record
 * page and the deal card follow. There is no rename mutation in
 * the API, so changing a name after data exists orphans that data — add the old
 * name to `aliases` instead.
 *
 * The deal-money names deliberately match `modules/deals`' own convention, so a
 * bot that already sells through the Deals board shows the same numbers here
 * instead of quietly creating a second `deal amount` beside the first.
 *
 * ## Why binding exists
 *
 * A bot may already carry `Deal Amount` from the dashboard, or a localized
 * alias, or `E-Mail`. Binding matches the convention against what the bot
 * really has — exact name, exact alias, case-insensitive, then a localized
 * alias — the same order `deals/lib/dealFieldBinding.ts` uses, for the same
 * reason: a field should FIND the attribute a person has been filling in for a
 * year rather than open an empty second one next to it.
 *
 * Nothing here is load-bearing before the catalog answers. An unknown attribute
 * name is silently omitted from `contact.attributes(names:)` rather than
 * erroring, so an unbound field is simply an empty one.
 */
import { AttributeType, SalesStageV2 } from '~api/generated/contacts/graphql';
import { APP_CONFIG } from '../../shellConfig';
import type { TagProps } from '~ui';
import { DAY as DAY_MS } from './time';

// ---------------------------------------------------------------------------
// The convention
// ---------------------------------------------------------------------------

export type ContactFieldKey =
  'phone' | 'email' | 'company' | 'city' | 'dealAmount' | 'dealCurrency' | 'signedUp' | 'lastSeen';

/** Decides the editor, the parse and the way the value is printed. */
export type ContactFieldKind = 'phone' | 'email' | 'text' | 'money' | 'currency' | 'date';

export interface ContactFieldSpec {
  key: ContactFieldKey;
  /** The attribute name written to the API when nothing better is bound. */
  attributeName: string;
  label: string;
  kind: ContactFieldKind;
  /** Read-only fallbacks, so an attribute made by hand still resolves. */
  aliases: readonly string[];
  placeholder?: string;
}

/** Used when a contact has a deal amount but no currency of its own. */
export const DEFAULT_CURRENCY = APP_CONFIG.currency;

export const CONTACT_FIELDS: readonly ContactFieldSpec[] = [
  {
    key: 'phone',
    attributeName: 'phone',
    label: 'Phone',
    kind: 'phone',
    aliases: ['phone number', 'phone_number', 'msisdn', 'tel', 'mobile', 'whatsapp phone'],
    placeholder: '+49 151 1234567',
  },
  {
    key: 'email',
    attributeName: 'email',
    label: 'Email',
    kind: 'email',
    aliases: ['e-mail', 'email address', 'email_address', 'mail'],
    placeholder: 'anna@example.com',
  },
  {
    key: 'company',
    attributeName: 'company',
    label: 'Company',
    kind: 'text',
    aliases: ['organization', 'organisation', 'account', 'deal company', 'deal_company'],
  },
  {
    key: 'city',
    attributeName: 'city',
    label: 'City',
    kind: 'text',
    aliases: ['town', 'location'],
  },
  {
    key: 'dealAmount',
    attributeName: 'deal amount',
    label: 'Deal amount',
    kind: 'money',
    aliases: ['deal_amount', 'dealAmount', 'amount', 'deal value'],
    placeholder: '1500.50',
  },
  {
    key: 'dealCurrency',
    attributeName: 'deal currency',
    label: 'Currency',
    kind: 'currency',
    aliases: ['deal_currency', 'currency'],
    placeholder: DEFAULT_CURRENCY,
  },
  {
    key: 'signedUp',
    attributeName: 'signed up',
    label: 'Signed up',
    kind: 'date',
    aliases: ['signed_up', 'signup date', 'sign up date', 'first seen', 'created'],
  },
  {
    key: 'lastSeen',
    attributeName: 'last seen',
    label: 'Last seen',
    kind: 'date',
    aliases: ['last_seen', 'last active', 'last activity', 'last seen at'],
  },
];

const BY_KEY = new Map(CONTACT_FIELDS.map((spec) => [spec.key, spec]));

export function contactField(key: ContactFieldKey): ContactFieldSpec {
  const spec = BY_KEY.get(key);
  if (!spec) throw new Error(`Unknown contact field: ${key}`);
  return spec;
}

/** The configured names, before any alias the catalog resolves. */
export const CONTACT_FIELD_NAMES: readonly string[] = CONTACT_FIELDS.map((spec) => spec.attributeName);

/** The two fields the deal card sums and prints. */
export const DEAL_CARD_FIELDS: readonly ContactFieldKey[] = ['dealAmount', 'dealCurrency'];

// ---------------------------------------------------------------------------
// Binding the convention to a particular bot
// ---------------------------------------------------------------------------

export interface CatalogAlias {
  locale: string;
  alias: string;
}

/** Structurally compatible with `useAttributeCatalog`'s entry, and with less. */
export interface CatalogLike {
  name: string;
  type?: string;
  aliases?: readonly CatalogAlias[];
}

/** How the name was found. Anything but `exact` is worth showing on the row. */
export type BindingVia = 'exact' | 'alias' | 'case' | 'localized' | 'none';

export interface ContactFieldBinding {
  spec: ContactFieldSpec;
  /** The attribute this bot really has; the configured name when unbound. */
  name: string;
  bound: boolean;
  via: BindingVia;
  /**
   * A system attribute is the bot's own bookkeeping and the API refuses most
   * writes to it silently, so the row is read-only. Same rule the inbox panel
   * applies, for the same reason: an input that fails without saying so is
   * worse than no input.
   */
  system: boolean;
}

export type ContactFieldBindings = Record<ContactFieldKey, ContactFieldBinding>;

const lower = (value: string) => value.trim().toLowerCase();

/** Match order: exact name → exact alias → case-insensitive → localized alias. */
export function bindContactFields(catalog: readonly CatalogLike[]): ContactFieldBindings {
  const byName = new Map<string, CatalogLike>();
  const byLower = new Map<string, CatalogLike>();
  for (const entry of catalog) {
    if (!byName.has(entry.name)) byName.set(entry.name, entry);
    if (!byLower.has(lower(entry.name))) byLower.set(lower(entry.name), entry);
  }

  /* One catalog entry may satisfy only one field. Without this, `company` and
     `deal company` would both bind to the same attribute and the second row
     would silently overwrite the first. */
  const claimed = new Set<string>();
  const bindings = {} as ContactFieldBindings;

  for (const spec of CONTACT_FIELDS) {
    const take = (entry: CatalogLike | undefined, via: BindingVia): boolean => {
      if (!entry || claimed.has(entry.name)) return false;
      claimed.add(entry.name);
      bindings[spec.key] = {
        spec,
        name: entry.name,
        bound: true,
        via,
        system: entry.type === AttributeType.System,
      };
      return true;
    };

    if (take(byName.get(spec.attributeName), 'exact')) continue;
    if (spec.aliases.some((alias) => take(byName.get(alias), 'alias'))) continue;
    if (take(byLower.get(lower(spec.attributeName)), 'case')) continue;
    if (spec.aliases.some((alias) => take(byLower.get(lower(alias)), 'case'))) continue;

    // A localized alias is a property of the catalog entry, so this one scans.
    const wanted = new Set([lower(spec.attributeName), lower(spec.label), ...spec.aliases.map(lower)]);
    const localized = catalog.find(
      (entry) => !claimed.has(entry.name) && (entry.aliases ?? []).some((alias) => wanted.has(lower(alias.alias))),
    );
    if (take(localized, 'localized')) continue;

    bindings[spec.key] = { spec, name: spec.attributeName, bound: false, via: 'none', system: false };
  }

  return bindings;
}

/**
 * Bind against the bot's catalog first, then against the names this contact
 * actually carries.
 *
 * The catalog is a separate request that is allowed to fail, is walked five
 * pages deep, and arrives after the record on a cold open. Binding against it
 * alone means a contact that plainly holds an `E-Mail` reads "Not set" on the
 * Overview whenever that request is late, short or dead — the value is right
 * there in `contact.attributes`, under the bot's own spelling.
 *
 * The record's own attributes are a catalog of exactly the names it carries,
 * which is all the binding needs. The bot catalog still wins where both have a
 * name, because it also carries the localized aliases and the system flag, and
 * `bindContactFields` keeps the first entry for a name.
 */
export function bindForContact(
  catalog: readonly CatalogLike[],
  attributes: readonly { attr: CatalogLike }[] | null | undefined,
): ContactFieldBindings {
  return bindContactFields([...catalog, ...(attributes ?? []).map((entry) => entry.attr)]);
}

/** The unbound state, available before the catalog answers — nothing waits on it. */
export function unboundContactFields(): ContactFieldBindings {
  const bindings = {} as ContactFieldBindings;
  for (const spec of CONTACT_FIELDS) {
    bindings[spec.key] = { spec, name: spec.attributeName, bound: false, via: 'none', system: false };
  }
  return bindings;
}

/** Every configured name plus whatever binding resolved. Sorted, so identity is stable. */
export function requestedFieldNames(bindings: ContactFieldBindings | null): string[] {
  const names = new Set<string>(CONTACT_FIELD_NAMES);
  for (const binding of Object.values(bindings ?? {})) names.add(binding.name);
  return [...names].sort();
}

// ---------------------------------------------------------------------------
// Reading a value
// ---------------------------------------------------------------------------

export interface FieldValue {
  /** Exactly what the server holds; `''` when the attribute is unset. */
  raw: string;
  /** money → a number, date → epoch ms, everything else → null. */
  parsed: number | null;
  /** False only when there IS a value and this field cannot read it. */
  ok: boolean;
}

const EMPTY_VALUE: FieldValue = { raw: '', parsed: null, ok: true };

/**
 * A single comma with exactly three digits after it and something before it is
 * a thousands separator (`1,234`); otherwise it is a decimal comma (`1,50`).
 * The canonical form this module writes has no separators at all, so the rule
 * only ever applies to values a flow, a CSV import or a person typed elsewhere.
 */
function parseMoney(input: string): number | null {
  // A currency code on either side is fine; any other letter means this is
  // prose. Stripping letters wholesale would read "about 5k" as 5.
  const withoutCode = input
    .trim()
    .replace(/^[A-Za-z]{3}\s+/, '')
    .replace(/\s+[A-Za-z]{3}$/, '');
  if (/[A-Za-z]/.test(withoutCode)) return null;
  const cleaned = withoutCode.replace(/[^\d.,-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalAt = Math.max(lastComma, lastDot);
    normalized = `${cleaned.slice(0, decimalAt).replace(/[.,]/g, '')}.${cleaned.slice(decimalAt + 1)}`;
  } else if (lastComma !== -1) {
    const after = cleaned.length - lastComma - 1;
    const before = cleaned.slice(0, lastComma).replace('-', '');
    normalized = after === 3 && before.length > 0 ? cleaned.replace(/,/g, '') : cleaned.replace(/,/g, '.');
  }
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/**
 * Ten-ish digits is a seconds timestamp; thirteen is milliseconds.
 *
 * Both spellings really occur: `contactAttributeUpdate` takes datetime values
 * as a millisecond-timestamp STRING, but a CSV import or a flow may have
 * written an ISO instant into the same attribute, and both must read.
 */
export function parseInstant(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (/^-?\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return null;
    return Math.abs(numeric) < 1e11 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readContactField(kind: ContactFieldKind, raw: string | undefined): FieldValue {
  if (raw === undefined || raw.trim() === '') return EMPTY_VALUE;
  switch (kind) {
    case 'money': {
      const parsed = parseMoney(raw);
      return { raw, parsed, ok: parsed !== null };
    }
    case 'date': {
      const parsed = parseInstant(raw);
      return { raw, parsed, ok: parsed !== null };
    }
    case 'phone':
    case 'email':
    case 'currency':
    case 'text':
      return { raw, parsed: null, ok: true };
  }
}

/** `YYYY-MM-DD` is read as UTC midnight, so the day never drifts by timezone. */
function dateToMs(input: string): number | null {
  const trimmed = input.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) return Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  return parseInstant(trimmed);
}

/**
 * Editable input → the canonical wire string.
 *
 * `''` means "clear this field", which the caller turns into
 * `contactAttributeDelete` rather than a write: an empty string is a value, it
 * would keep the attribute alive, and every IS_EMPTY filter would then
 * disagree with what the field looks like.
 */
export function toContactFieldValue(kind: ContactFieldKind, input: string): string {
  const trimmed = input.trim();
  if (trimmed === '') return '';
  switch (kind) {
    case 'money': {
      const value = parseMoney(trimmed);
      return value === null ? trimmed : String(value);
    }
    case 'date': {
      const ms = dateToMs(trimmed);
      return ms === null ? trimmed : String(ms);
    }
    case 'currency':
      return /^[A-Za-z]{3}$/.test(trimmed) ? trimmed.toUpperCase() : trimmed;
    case 'phone':
    case 'email':
    case 'text':
      return trimmed;
  }
}

/** The value an `<input type="date">` wants back. */
export function toDateInputValue(value: FieldValue): string {
  if (value.parsed === null) return '';
  return new Date(value.parsed).toISOString().slice(0, 10);
}

/**
 * A stored instant → the `YYYY-MM-DD` a native date input wants.
 *
 * `''` when the value is not an instant at all, which is an ordinary state: a
 * datetime attribute can hold "soon" because `contactAttributeUpdate` accepts
 * any string for any dataType. The editor shows what is really stored beside an
 * empty picker rather than pretending the field is unset.
 */
export function toDayInput(raw: string): string {
  return toDateInputValue(readContactField('date', raw));
}

/** An unknown or malformed currency code must not throw — it falls back to `1500.5 XYZ`. */
export function formatMoney(amount: number, currency: string, locale?: string): string {
  const code = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : '';
  if (code !== '') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      }).format(amount);
    } catch {
      /* not a real ISO code — fall through */
    }
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount);
  return currency.trim() === '' ? number : `${number} ${currency.trim()}`;
}

/** The currency a contact's deal amount is in — its own field, else the default. */
export function currencyOf(values: Record<string, string>, currencyName: string): string {
  const raw = values[currencyName]?.trim() ?? '';
  return raw === '' ? DEFAULT_CURRENCY : raw.toUpperCase();
}

/**
 * What the row prints. `null` means there is nothing to print — the row shows
 * its own placeholder rather than a dash pretending to be a value.
 *
 * A value this field cannot read is printed RAW rather than as `NaN` or
 * `Invalid Date`: what is actually stored is the one fact a person can act on.
 */
export function formatContactField(
  kind: ContactFieldKind,
  raw: string | undefined,
  options: { currency?: string; locale?: string } = {},
): string | null {
  const value = readContactField(kind, raw);
  if (value.raw === '') return null;
  if (!value.ok) return value.raw;
  switch (kind) {
    case 'money':
      return value.parsed === null
        ? value.raw
        : formatMoney(value.parsed, options.currency ?? DEFAULT_CURRENCY, options.locale);
    case 'date':
      return value.parsed === null
        ? value.raw
        : new Intl.DateTimeFormat(options.locale, { dateStyle: 'medium' }).format(new Date(value.parsed));
    default:
      return value.raw;
  }
}

// ---------------------------------------------------------------------------
// The stage
// ---------------------------------------------------------------------------

/**
 * The six stages, in pipeline order, with the tone each one wears.
 *
 * `dot` exists because `TagProps['tone']` has only five tones and the six
 * stages would collapse into pairs; the pipeline ramp gives each column its own
 * colour without touching `content/ui`.
 */
export const STAGES: readonly SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

export interface StageMeta {
  label: string;
  tone: NonNullable<TagProps['tone']>;
  dot: string;
}

export const STAGE_META: Record<SalesStageV2, StageMeta> = {
  [SalesStageV2.New]: { label: 'New', tone: 'accent', dot: 'bg-pipeline-1' },
  [SalesStageV2.Sorting]: { label: 'Sorting', tone: 'neutral', dot: 'bg-pipeline-2' },
  [SalesStageV2.Ready]: { label: 'Ready', tone: 'warning', dot: 'bg-pipeline-3' },
  [SalesStageV2.WorkingOn]: { label: 'Working on', tone: 'warning', dot: 'bg-pipeline-4' },
  [SalesStageV2.Won]: { label: 'Won', tone: 'success', dot: 'bg-success' },
  [SalesStageV2.Lost]: { label: 'Lost', tone: 'danger', dot: 'bg-danger' },
};

/** A stage the API answered with that this table does not know still reads. */
export function stageLabel(stage: SalesStageV2 | null | undefined): string {
  if (!stage) return 'No stage';
  return STAGE_META[stage]?.label ?? stage;
}

/**
 * "Moved 3 days ago", or null when the API has no timestamp to say it with.
 *
 * Emitted ONLY when `lastSalesStageUpdateTime` is a readable instant. A contact
 * that has never been moved carries null there, and inventing "moved today"
 * from `updatedAt` would be a different fact wearing this one's words.
 */
export function stageMovedAgo(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const days = Math.floor(Math.max(0, now - time) / DAY_MS);
  if (days === 0) return 'Moved today';
  if (days === 1) return 'Moved yesterday';
  if (days < 30) return `Moved ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Moved ${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(months / 12);
  return `Moved ${years} ${years === 1 ? 'year' : 'years'} ago`;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * What the header calls this contact.
 *
 * A contact with no name is ordinary — a CSV import without a name column, a
 * WhatsApp number that has never introduced itself — so the fallback is a
 * deliberate word rather than an empty heading. `fallback` is the phone or the
 * @handle when there is one, which is the only other thing that identifies
 * them.
 */
export function displayName(name: string | null | undefined, fallback: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (trimmed !== '') return trimmed;
  const alternative = (fallback ?? '').trim();
  return alternative !== '' ? alternative : 'Unnamed contact';
}

export type AssigneeLike =
  | { __typename: 'FuelyAIAssignee' }
  | { __typename: 'PublicUserAccount'; id: string; name: string; isUnknown: boolean }
  | { __typename: string }
  | null
  | undefined;

/**
 * Who owns this contact, in words.
 *
 * `isUnknown` is how the API spells a user account that no longer exists — the
 * assignment survives the person. Saying "Unassigned" there would be a lie the
 * owner picker then contradicts, so the deleted owner is named as one.
 */
export function assigneeLabel(assignee: AssigneeLike): string {
  if (!assignee) return 'Unassigned';
  if (assignee.__typename === 'FuelyAIAssignee') return 'Fuely AI';
  if (assignee.__typename === 'PublicUserAccount') {
    const account = assignee as { name: string; isUnknown: boolean };
    if (account.isUnknown) return 'Deleted user';
    return account.name.trim() || 'Unnamed teammate';
  }
  return 'Unassigned';
}

/** The value the owner `Combobox` holds, or null for unassigned. */
export const AI_OPTION = '__ai__';

export function assigneeValue(assignee: AssigneeLike): string | null {
  if (!assignee) return null;
  if (assignee.__typename === 'FuelyAIAssignee') return AI_OPTION;
  if (assignee.__typename === 'PublicUserAccount') return (assignee as { id: string }).id;
  return null;
}

// ---------------------------------------------------------------------------
// Stepping through the list
// ---------------------------------------------------------------------------

export interface Neighbours {
  prev: string | null;
  next: string | null;
  /** 1-based, for "4 of 50". Null when this contact is not in the order at all. */
  position: number | null;
  /** How many the list had LOADED — not how many the filter matches. */
  total: number;
}

/**
 * The contact before and after this one, in the order the list was showing.
 *
 * The order is the list's, not the server's: `contactsConnection` pages, so the
 * caller holds however many rows have been loaded, and stepping past the end of
 * that is a page the record page cannot fetch. So the last loaded contact
 * simply has no next, and `total` is the loaded count — which is why the header
 * says "of 50 loaded" rather than "of 50".
 *
 * A contact that is not in the order has no neighbours at all. That is the
 * ordinary case for a link pasted into a chat: the record opens, and there is
 * nothing to step through.
 */
export function neighbours(order: readonly string[] | undefined, contactId: string): Neighbours {
  const list = order ?? [];
  const index = list.indexOf(contactId);
  if (index === -1) return { prev: null, next: null, position: null, total: list.length };
  return {
    prev: index > 0 ? list[index - 1] : null,
    next: index + 1 < list.length ? list[index + 1] : null,
    position: index + 1,
    total: list.length,
  };
}
