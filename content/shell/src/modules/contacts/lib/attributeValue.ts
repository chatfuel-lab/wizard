/**
 * Attribute values, from the wire to a field and back — and the rules the
 * Fields tab applies to them.
 *
 * Four facts about this API are true at once, and each of them is a way to ship
 * a record page that lies:
 *
 * 1. **`attrValue` is ALWAYS a String**, whatever the attribute's `dataType`.
 *    Milliseconds for a datetime, the literal "true"/"false" for a boolean, a
 *    bare number for long and double. So the value shown and the value written
 *    are two different strings, and the conversion is a decision rather than a
 *    formatting flourish.
 * 2. **A custom attribute always comes back as the String branch.** The typed
 *    branches the SDL advertises do not surface. All five branches are still
 *    read, because SYSTEM attributes do come back typed and reading one branch
 *    would blank them.
 * 3. **Writing a name the bot does not have CREATES it** — instantly, as
 *    `type: custom, dataType: string`, filterable immediately. And deleting
 *    the last contact's value removes the field from the bot catalog
 *    altogether.
 * 4. **A write the server declines is not reported as an error.** `contactAttributeUpdate`
 *    answers 200 with the whole contact — simply without that attribute. So an
 *    optimistic value is never contradicted and goes on showing something that
 *    exists nowhere but in this browser. `confirmAttributeWrite` is why nothing
 *    on the record page is optimistic: the mutation's own response is the only
 *    evidence a write landed.
 */
import { AttributeDataType, AttributeType } from '~api/generated/contacts/graphql';
import type { AttributeEntry } from '../types';

type ValueUnion = NonNullable<AttributeEntry['value']>;

/** Loosely typed so this file works against the row shape and the record shape alike. */
export interface AttributeValueLike {
  __typename?: string;
  stringValue?: string | null;
  longValue?: number | string | null;
  doubleValue?: number | null;
  booleanValue?: boolean | null;
  datetimeValue?: string | null;
}

export interface AttributeAliasLike {
  locale: string;
  alias: string;
}

export interface BotAttributeLike {
  name: string;
  dataType: AttributeDataType;
  type: AttributeType;
  aliases?: readonly AttributeAliasLike[];
}

export interface AttributeEntryLike {
  attr: BotAttributeLike;
  value: AttributeValueLike | null;
}

// ---------------------------------------------------------------------------
// Reading one value
// ---------------------------------------------------------------------------

/** Union branch → the editable string form. Datetime (ms-timestamp string) becomes ISO. */
export function attributeValueToInput(value: ValueUnion | null | undefined): string {
  if (!value) return '';
  switch (value.__typename) {
    case 'BotAttributeValueString':
      return value.stringValue;
    case 'BotAttributeValueLong':
      return String(value.longValue);
    case 'BotAttributeValueDouble':
      return String(value.doubleValue);
    case 'BotAttributeValueBoolean':
      return value.booleanValue ? 'true' : 'false';
    case 'BotAttributeValueDatetime': {
      const ms = Number(value.datetimeValue);
      return Number.isFinite(ms) && value.datetimeValue !== '' ? new Date(ms).toISOString() : value.datetimeValue;
    }
    default:
      return '';
  }
}

/**
 * The stored string, whichever branch carried it.
 *
 * `null` means "no value at all", which is not the empty string: an attribute a
 * contact has never been given reads back with no value, and a row that showed
 * a blank input for it would look set.
 */
export function rawAttributeValue(value: AttributeValueLike | null | undefined): string | null {
  if (!value) return null;
  if (typeof value.stringValue === 'string') return value.stringValue;
  if (value.longValue !== null && value.longValue !== undefined) return String(value.longValue);
  if (value.doubleValue !== null && value.doubleValue !== undefined) return String(value.doubleValue);
  if (typeof value.datetimeValue === 'string') return value.datetimeValue;
  if (typeof value.booleanValue === 'boolean') return value.booleanValue ? 'true' : 'false';
  return null;
}

/** `contact.attributes` → name → raw string. Names never written are simply absent. */
export function attributeMap(entries: readonly AttributeEntryLike[] | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of entries ?? []) map[entry.attr.name] = rawAttributeValue(entry.value) ?? '';
  return map;
}

/**
 * The stored string, in the words a person reads.
 *
 * Every conversion falls back to the raw string when it cannot be made sense
 * of. A datetime attribute holding "soon" is not a date, and printing "Invalid
 * Date" over the top of what is stored hides the one fact a person could act
 * on. Never `NaN`, never `Invalid Date`.
 */
export function displayAttributeValue(raw: string | null, dataType: AttributeDataType, locale?: string): string {
  if (raw === null || raw === '') return '';
  switch (dataType) {
    case AttributeDataType.Boolean:
      return raw === 'true' ? 'Yes' : raw === 'false' ? 'No' : raw;
    case AttributeDataType.Datetime: {
      const ms = Number(raw);
      if (!Number.isFinite(ms) || raw.trim() === '') {
        const parsed = Date.parse(raw);
        if (Number.isNaN(parsed)) return raw;
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
      }
      const date = new Date(ms);
      return Number.isNaN(date.getTime())
        ? raw
        : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
    default:
      return raw;
  }
}

// ---------------------------------------------------------------------------
// Writing one value
// ---------------------------------------------------------------------------

/**
 * Editable string → the wire form. `contactAttributeUpdate` takes `attrValue`
 * as a STRING always; a datetime attribute needs a millisecond-timestamp string
 * ("1720456863000"), accepted as-is or converted from an ISO / date input.
 */
export function inputToAttrValue(dataType: AttributeDataType | undefined, input: string): string {
  const trimmed = input.trim();
  if (dataType === AttributeDataType.Datetime && trimmed !== '') {
    if (/^\d+$/.test(trimmed)) return trimmed; // already a ms timestamp
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return String(parsed);
  }
  return trimmed;
}

/**
 * What a person typed, in the string the mutation takes — or `null` for "do not
 * send this".
 *
 * A refusal rather than a silent coercion: `contactAttributeUpdate` accepts ANY
 * string for any dataType, so an unparseable date is stored as prose and the
 * server-side filters that read the typed interpretation stop matching it. The
 * row says so instead.
 */
export function toStoredValue(input: string, dataType: AttributeDataType): string | null {
  const text = input.trim();
  if (text === '') return '';
  switch (dataType) {
    case AttributeDataType.Boolean: {
      const value = text.toLowerCase();
      if (value === 'true' || value === 'yes' || value === '1') return 'true';
      if (value === 'false' || value === 'no' || value === '0') return 'false';
      return null;
    }
    case AttributeDataType.Datetime: {
      /* Already milliseconds — a value read off the wire and written straight
         back out again must round-trip unchanged. */
      if (/^\d+$/.test(text)) return text;
      const parsed = Date.parse(text);
      return Number.isFinite(parsed) ? String(parsed) : null;
    }
    case AttributeDataType.Long:
    case AttributeDataType.Double: {
      const number = Number(text);
      return Number.isFinite(number) ? text : null;
    }
    default:
      return text;
  }
}

/** Why a typed value was refused, in the words of the field that refused it. */
export function invalidValueMessage(dataType: AttributeDataType): string {
  switch (dataType) {
    case AttributeDataType.Boolean:
      return 'Type yes or no.';
    case AttributeDataType.Datetime:
      return 'Type a date, or the milliseconds this API stores.';
    case AttributeDataType.Long:
    case AttributeDataType.Double:
      return 'Type a number.';
    default:
      return 'That value cannot be stored.';
  }
}

/** Human-readable dataType label for the attribute rows. */
export function dataTypeLabel(dataType: AttributeDataType | undefined): string {
  return dataType ?? '';
}

/** The badge on a field row — short, because it sits beside the name. */
export function dataTypeBadge(dataType: AttributeDataType): string {
  switch (dataType) {
    case AttributeDataType.Boolean:
      return 'Yes / no';
    case AttributeDataType.Datetime:
      return 'Date';
    case AttributeDataType.Long:
      return 'Whole number';
    case AttributeDataType.Double:
      return 'Number';
    case AttributeDataType.String:
      return 'Text';
  }
}

/** Which editor the row renders. */
export type EditorKind = 'text' | 'date' | 'boolean' | 'number';

export function editorFor(dataType: AttributeDataType): EditorKind {
  switch (dataType) {
    case AttributeDataType.Boolean:
      return 'boolean';
    case AttributeDataType.Datetime:
      return 'date';
    case AttributeDataType.Long:
    case AttributeDataType.Double:
      return 'number';
    case AttributeDataType.String:
      return 'text';
  }
}

/**
 * The note about how a custom field is really stored — emitted ONLY where it
 * changes what a person should expect.
 *
 * A custom attribute is created by the first write, always as
 * `dataType: string`. So a custom field whose dataType is
 * anything else was declared elsewhere and the note would be wrong; and for a
 * system field the note is not this module's business. One sentence, on custom
 * string fields, and nowhere else.
 */
export function storedAsNote(type: AttributeType, dataType: AttributeDataType): string | null {
  if (type !== AttributeType.Custom) return null;
  if (dataType !== AttributeDataType.String) return null;
  return 'Custom fields are stored as text — filters compare the text.';
}

// ---------------------------------------------------------------------------
// The Fields tab
// ---------------------------------------------------------------------------

/**
 * The label, from the catalog's alias for this locale when there is one.
 *
 * The bot's own name is what every flow references and what the API takes, but
 * it is frequently `deal_amount_v2`. An alias is the dashboard's label for the
 * same thing, and a record page is a place to read rather than to reference —
 * so the label is the alias and the name is still shown as the row's title
 * attribute.
 */
export function attributeLabel(attr: BotAttributeLike, locale: string): string {
  const aliases = attr.aliases ?? [];
  const exact = aliases.find((alias) => alias.locale === locale)?.alias;
  const english = aliases.find((alias) => alias.locale === 'en')?.alias;
  return (exact ?? english ?? attr.name).trim() || attr.name;
}

export interface FieldRow {
  /** The API's name — the write key, stable across relabelling. */
  name: string;
  label: string;
  dataType: AttributeDataType;
  /** System attributes are the bot's own and are shown read-only. */
  system: boolean;
  /** Exactly what is stored, or null when the contact has no value. */
  raw: string | null;
  /** The same value in words. */
  text: string;
  /** No value at all, or the empty string. Drives "hide empty". */
  empty: boolean;
}

/**
 * Every attribute the contact carries, as rows.
 *
 * No hidden subset: `ContactFull` selects `attributes` with no `names`
 * argument, so the record arrives with all of them, and a Fields tab that then
 * showed a configured few would be hiding data a person can see in the
 * dashboard. That is exactly what the Overview tab is for.
 *
 * The catalog only ever supplies a nicer label and is allowed to be missing an
 * entry: it is paginated, and a contact can hold an attribute that did not come
 * back on the pages that were fetched.
 */
export function fieldRows(
  attributes: readonly AttributeEntryLike[] | null | undefined,
  catalog: ReadonlyMap<string, BotAttributeLike>,
  locale = 'en',
): FieldRow[] {
  const rows = (attributes ?? []).map((attribute) => {
    const attr = catalog.get(attribute.attr.name) ?? attribute.attr;
    const raw = rawAttributeValue(attribute.value);
    return {
      name: attribute.attr.name,
      label: attributeLabel(attr, locale),
      dataType: attribute.attr.dataType,
      system: attribute.attr.type === AttributeType.System,
      raw,
      text: displayAttributeValue(raw, attribute.attr.dataType),
      empty: raw === null || raw.trim() === '',
    };
  });
  return rows.sort((a, b) => {
    if (a.system !== b.system) return a.system ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

export interface FieldGroup {
  key: 'custom' | 'system';
  label: string;
  rows: FieldRow[];
}

/**
 * Custom first, system last, and each group named.
 *
 * System attributes go last and are read-only: they are the bot's own
 * bookkeeping — locale, the platform's ids, last seen — and a person scanning
 * for the company they typed is not scanning for those. An empty group is
 * dropped rather than rendered as a heading over nothing.
 */
export function groupFieldRows(rows: readonly FieldRow[]): FieldGroup[] {
  const custom = rows.filter((row) => !row.system);
  const system = rows.filter((row) => row.system);
  const groups: FieldGroup[] = [];
  if (custom.length > 0) {
    groups.push({
      key: 'custom',
      label: 'Custom fields',
      rows: custom,
    });
  }
  if (system.length > 0) {
    groups.push({
      key: 'system',
      label: 'System fields',
      rows: system,
    });
  }
  return groups;
}

/** "Hide empty" — a reading preference, not a filter on the data. */
export function visibleRows(rows: readonly FieldRow[], hideEmpty: boolean): FieldRow[] {
  return hideEmpty ? rows.filter((row) => !row.empty) : [...rows];
}

/** How many rows the toggle would hide. Printed only when it is more than zero. */
export function emptyRowCount(rows: readonly FieldRow[]): number {
  return rows.reduce((count, row) => (row.empty ? count + 1 : count), 0);
}

export interface AddableAttribute {
  name: string;
  label: string;
  dataType: AttributeDataType;
}

/**
 * Catalog entries the contact does not already carry — the "add field" picker.
 *
 * Custom only. A system attribute the contact has no value for is the bot's to
 * write, not this page's, and offering it would produce a write the server
 * declines without saying so.
 */
export function addableAttributes(
  catalog: readonly BotAttributeLike[],
  attributes: readonly AttributeEntryLike[] | null | undefined,
  locale = 'en',
): AddableAttribute[] {
  const held = new Set((attributes ?? []).map((attribute) => attribute.attr.name));
  return catalog
    .filter((attr) => attr.type === AttributeType.Custom && !held.has(attr.name))
    .map((attr) => ({ name: attr.name, label: attributeLabel(attr, locale), dataType: attr.dataType }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Did the write land?
// ---------------------------------------------------------------------------

export type AttributeWriteResult =
  /** The contact came back carrying exactly what was written. */
  | { status: 'stored' }
  /** The name is gone from the response: the server declined it, silently. */
  | { status: 'dropped' }
  /** It is there, holding something else — a coercion, or another writer. */
  | { status: 'changed'; actual: string };

/**
 * `contactAttributeUpdate` returns the WHOLE contact, which is the only reason
 * this question can be answered — and answering it is not optional. The
 * mutation does not error on a name the server will not store; it answers 200
 * with a contact that simply does not have it.
 *
 * 'changed' rather than 'stored' when the value differs is deliberate. A
 * datetime written as "1720456863000" comes back as that same string, but a
 * boolean written as "yes" comes back as "true", and a second person editing
 * the same contact comes back as something else entirely. All three are cases
 * where what is on screen is not what is stored.
 */
export function confirmAttributeWrite(
  attributes: readonly AttributeEntryLike[] | null | undefined,
  name: string,
  expected: string,
): AttributeWriteResult {
  const attribute = (attributes ?? []).find((entry) => entry.attr.name === name);
  if (!attribute) return { status: 'dropped' };
  const actual = rawAttributeValue(attribute.value);
  if (actual === expected) return { status: 'stored' };
  return { status: 'changed', actual: actual ?? '' };
}

/** The sentence the row shows when a write did not land. Null when it did. */
export function attributeWriteMessage(result: AttributeWriteResult, label: string): string | null {
  switch (result.status) {
    case 'stored':
      return null;
    case 'dropped':
      return `The server did not store ${label}. It answered without that field at all.`;
    case 'changed':
      return `${label} was stored as “${result.actual}”.`;
  }
}

// ---------------------------------------------------------------------------
// Live echoes
// ---------------------------------------------------------------------------

export interface LiveRecordLike {
  id: string;
  attributes: readonly AttributeEntryLike[];
}

/**
 * What the open record becomes when `contactUpdated` fires.
 *
 * Three rules, and every one of them was a bug before it was a rule:
 *
 * 1. **An echo for a record that is not open is dropped.** The subscription is
 *    torn down when the record closes, but a frame already in flight still
 *    arrives, and adopting it would repopulate a page the user has left.
 * 2. **An echo for a DIFFERENT contact is dropped.** Stepping to the next
 *    neighbour re-subscribes; the old socket's last frame must not overwrite
 *    the new contact.
 * 3. **A field being edited keeps its stored value.** `contactUpdated` fires on
 *    attribute writes, including this page's own, so a person
 *    typing into "company" while a flow writes "city" would otherwise have the
 *    box under their cursor replaced mid-word. Held names keep whatever the
 *    record already had; everything else takes the echo.
 */
export function mergeLiveRecord<T extends LiveRecordLike>(
  current: T | null,
  incoming: T,
  held: readonly string[] = [],
): T | null {
  if (!current) return null;
  if (current.id !== incoming.id) return current;
  if (held.length === 0) return incoming;

  const heldNames = new Set(held);
  const keep = current.attributes.filter((entry) => heldNames.has(entry.attr.name));
  const rest = incoming.attributes.filter((entry) => !heldNames.has(entry.attr.name));
  /* Patching the attributes of one contact cannot change its `__typename`, but
     TypeScript cannot see that through the six-member Contact union — hence the
     cast, which is the same one the deals panel pays for the same reason. */
  return { ...incoming, attributes: [...rest, ...keep] } as T;
}

/**
 * Should an input adopt a value that arrived from somewhere else?
 *
 * Only when the person is not in the box. `~ui`'s `Field` adopts on every
 * change of its `value` prop, which is right for a form and wrong for a record
 * page fed by a live subscription: the echo of one's own save arrives while the
 * next keystrokes are already going in.
 */
export function shouldAdoptExternalValue(input: { focused: boolean; incoming: string; committed: string }): boolean {
  if (input.focused) return false;
  return input.incoming !== input.committed;
}
