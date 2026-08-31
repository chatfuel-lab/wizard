import {
  AttributeDataType,
  AttributeType,
  DashboardLocale,
  type InboxAttributeValueFragment,
  type InboxBotAttributeFragment,
  type InboxContactAttributeFragment,
  type InboxContactDetailFragment,
} from '~api/generated/livechat/graphql';

/**
 * Custom attributes, from the wire to the panel and back.
 *
 * Three things are true about this API at once and each of them is a way to
 * ship a panel that lies:
 *
 * 1. `attrValue` is ALWAYS a String, whatever the attribute's `dataType`.
 *    Milliseconds for a datetime, the literal "true"/"false" for a boolean, a
 *    bare number for long and double. So the value the panel writes and the
 *    value it shows are two different strings, and the conversion is a decision
 *    rather than a formatting flourish.
 * 2. For a CUSTOM attribute the server always answers the String branch of
 *    `BotAttributeValue` — the typed branches the SDL advertises do not surface
 *    here. The panel still reads all five, because system attributes do come
 *    back typed and reading one branch would blank them.
 * 3. Writing a name the bot does not have CREATES it, and a name the server
 *    declines to store is not reported as an error — the mutation answers with
 *    the whole contact, so the only evidence a write landed is that contact.
 *    Which is why `confirmAttributeWrite` exists and why nothing in this module
 *    trusts an optimistic value.
 */

export type ContactAttribute = InboxContactAttributeFragment;
export type BotAttribute = InboxBotAttributeFragment;

/**
 * The stored string, whichever branch carried it.
 *
 * `null` means "no value", which is not the same as the empty string: an
 * attribute the contact has never been given reads back with no value at all,
 * and the panel says so rather than showing a blank that looks set.
 */
export function rawAttributeValue(value: InboxAttributeValueFragment): string | null {
  switch (value.__typename) {
    case 'BotAttributeValueString':
      return value.stringValue;
    case 'BotAttributeValueLong':
      return String(value.longValue);
    case 'BotAttributeValueDouble':
      return String(value.doubleValue);
    case 'BotAttributeValueBoolean':
      return value.booleanValue ? 'true' : 'false';
    case 'BotAttributeValueDatetime':
      return value.datetimeValue;
    default:
      return null;
  }
}

/**
 * The stored string, in the words a person reads.
 *
 * Every conversion falls back to the raw string when it cannot be made sense
 * of. A datetime attribute holding "soon" is not a date, and printing "Invalid
 * Date" over the top of what is actually stored hides the one fact an operator
 * could act on.
 */
export function displayAttributeValue(raw: string | null, dataType: AttributeDataType, locale = 'en-GB'): string {
  if (raw === null || raw === '') return '';
  switch (dataType) {
    case AttributeDataType.Boolean:
      return raw === 'true' ? 'Yes' : raw === 'false' ? 'No' : raw;
    case AttributeDataType.Datetime: {
      const ms = Number(raw);
      if (!Number.isFinite(ms)) return raw;
      const date = new Date(ms);
      return Number.isNaN(date.getTime())
        ? raw
        : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
    default:
      return raw;
  }
}

/**
 * What the operator typed, in the string the mutation takes.
 *
 * `null` means "do not send this" — an unparseable date is a refusal rather
 * than a silent 1970, because `contactAttributeUpdate` accepts any string and
 * the wrong one is stored without complaint.
 */
export function toStoredValue(input: string, dataType: AttributeDataType): string | null {
  const text = input.trim();
  switch (dataType) {
    case AttributeDataType.Boolean: {
      const lower = text.toLowerCase();
      if (lower === 'true' || lower === 'yes') return 'true';
      if (lower === 'false' || lower === 'no') return 'false';
      return null;
    }
    case AttributeDataType.Datetime: {
      /* Already milliseconds — a value read back off the wire and written
         straight out again must round-trip unchanged. */
      if (/^\d+$/.test(text)) return text;
      const parsed = Date.parse(text);
      return Number.isFinite(parsed) ? String(parsed) : null;
    }
    case AttributeDataType.Long:
    case AttributeDataType.Double: {
      const number = Number(text);
      return text !== '' && Number.isFinite(number) ? text : null;
    }
    default:
      return text;
  }
}

/**
 * The label, from the catalog's aliases when there is one for this locale.
 *
 * The bot's own name for an attribute is what every flow references and what
 * the API takes, but it is frequently `deal_amount_v2`. An alias is the
 * dashboard's label for the same thing, and the panel is a place to read rather
 * than a place to reference.
 */
export function attributeLabel(attr: BotAttribute, locale: DashboardLocale): string {
  const exact = attr.aliases.find((alias) => alias.locale === locale)?.alias;
  const english = attr.aliases.find((alias) => alias.locale === DashboardLocale.En)?.alias;
  return (exact ?? english ?? attr.name).trim() || attr.name;
}

export interface AttributeRow {
  /** The API's name — the write key, and stable across relabelling. */
  name: string;
  label: string;
  dataType: AttributeDataType;
  /** System attributes are the bot's own and are shown read-only. */
  system: boolean;
  raw: string | null;
  text: string;
}

/**
 * Which attributes the panel shows, and in what order.
 *
 * Everything the contact carries, custom before system, alphabetical by label
 * inside each group. Two decisions worth naming:
 *
 * - No hidden subset. `InboxContactDetail` selects `attributes` with no `names`
 *   argument, so the contact arrives with all of them, and a panel that then
 *   showed only a configured few would be hiding data the operator can see in
 *   the dashboard. Deals asks for a subset because a board has columns; a
 *   contact card does not.
 * - System attributes go last and are marked. They are the bot's own
 *   bookkeeping — locale, last seen, the platform's own ids — and an operator
 *   scanning for the note they left is not scanning for those.
 *
 * The catalog only ever supplies a nicer label. An attribute missing from it is
 * still shown, under its own name: the catalog is paginated and a contact can
 * hold an attribute that did not come back on the page that was fetched.
 */
export function attributeRows(
  attributes: readonly ContactAttribute[],
  catalog: ReadonlyMap<string, BotAttribute>,
  locale: DashboardLocale,
): AttributeRow[] {
  const rows = attributes.map((attribute) => {
    const attr = catalog.get(attribute.attr.name) ?? attribute.attr;
    const raw = rawAttributeValue(attribute.value);
    return {
      name: attribute.attr.name,
      label: attributeLabel(attr, locale),
      dataType: attribute.attr.dataType,
      system: attribute.attr.type === AttributeType.System,
      raw,
      text: displayAttributeValue(raw, attribute.attr.dataType),
    };
  });
  return rows.sort((a, b) => {
    if (a.system !== b.system) return a.system ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

/** Catalog entries the contact does not already carry — the "add" picker. */
export function addableAttributes(
  catalog: readonly BotAttribute[],
  attributes: readonly ContactAttribute[],
  locale: DashboardLocale,
): { name: string; label: string; dataType: AttributeDataType }[] {
  const held = new Set(attributes.map((attribute) => attribute.attr.name));
  return catalog
    .filter((attr) => attr.type === AttributeType.Custom && !held.has(attr.name))
    .map((attr) => ({ name: attr.name, label: attributeLabel(attr, locale), dataType: attr.dataType }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export type AttributeWriteResult =
  /** The contact came back carrying exactly what was written. */
  | { status: 'stored' }
  /** The name is gone from the response: the server declined it, silently. */
  | { status: 'dropped' }
  /** It is there, holding something else — a coercion, or another writer. */
  | { status: 'changed'; actual: string };

/**
 * Did the write land?
 *
 * `contactAttributeUpdate` returns the WHOLE contact, which is the only reason
 * this question can be answered at all — and answering it is not optional. The
 * answer to a name the server will not store carries the contact without that
 * attribute. An optimistic update is never contradicted, so the panel goes on
 * showing a value that exists nowhere but in this browser, and it survives
 * every re-render until a refresh quietly loses it.
 *
 * 'changed' rather than 'stored' when the value differs is deliberate. A
 * datetime written as "1720456863000" comes back as that same string, but a
 * boolean written as "yes" would come back as "true" — and a second operator
 * editing the same contact comes back as something else entirely. All three are
 * cases where what is on screen is not what is stored, which is the only thing
 * the panel needs to know.
 */
export function confirmAttributeWrite(
  contact: InboxContactDetailFragment,
  name: string,
  expected: string,
): AttributeWriteResult {
  const attribute = contact.attributes.find((entry) => entry.attr.name === name);
  if (!attribute) return { status: 'dropped' };
  const actual = rawAttributeValue(attribute.value);
  if (actual === expected) return { status: 'stored' };
  return { status: 'changed', actual: actual ?? '' };
}

/** The sentence the panel shows when a write did not land. */
export function attributeWriteMessage(result: AttributeWriteResult, label: string): string | null {
  switch (result.status) {
    case 'stored':
      return null;
    case 'dropped':
      return `The server did not store ${label}. It answered without that attribute at all.`;
    case 'changed':
      return `${label} was stored as “${result.actual}”.`;
  }
}
