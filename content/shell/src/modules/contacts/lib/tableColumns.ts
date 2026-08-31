/**
 * The list's columns, as data.
 *
 * A column is either **fixed** (a field on `Contact`) or **attribute-backed**
 * (any name in the bot's catalog). Only attribute-backed columns are sortable,
 * and that is a statement about the API rather than a simplification:
 * `ContactSearchOrderByInput.orderBy` is an `AttributeName!`, so there is no
 * way to ask the server to order by `unreadMessagesCount` or by the stage.
 *
 * Nothing here renders. `components/list/ContactsTable.tsx` maps a spec onto a
 * `DataTableColumn` and supplies the JSX; everything that could be wrong —
 * which columns exist, in what order, which of them are on screen, and what a
 * cell says when the stored value is not what anyone expected — is a pure
 * function with a test, because vitest here is node-only and a `.tsx` file is
 * the one thing no test can reach.
 */
import type { Band, SortState, TagProps } from '~ui';
import { AttributeDataType, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import type { AttributeEntry, ContactRow } from '../types';
import type { SortSpec } from './contactsFilter';
import type { Density } from './contactsParams';
import { shortTime } from './time';

export type FixedColumnId = 'name' | 'channel' | 'phone' | 'stage' | 'assignee' | 'unread' | 'lastActive' | 'note';

export interface ColumnSpec {
  /** `fixed:<id>` or `attr:<attribute name>`. */
  key: string;
  header: string;
  kind: 'fixed' | 'attribute';
  /** Attribute name for an attribute column. */
  attribute?: string;
  dataType?: AttributeDataType;
  width?: string;
  sortable: boolean;
  /** Editable in place. Restricted rows are never editable whatever this says. */
  editable: boolean;
}

export const FIXED_COLUMNS: Record<FixedColumnId, ColumnSpec> = {
  name: { key: 'fixed:name', header: 'Name', kind: 'fixed', width: '18rem', sortable: false, editable: true },
  channel: { key: 'fixed:channel', header: 'Channel', kind: 'fixed', width: '8rem', sortable: false, editable: false },
  phone: { key: 'fixed:phone', header: 'Phone', kind: 'fixed', width: '11rem', sortable: false, editable: false },
  stage: { key: 'fixed:stage', header: 'Stage', kind: 'fixed', width: '9rem', sortable: false, editable: true },
  assignee: { key: 'fixed:assignee', header: 'Owner', kind: 'fixed', width: '11rem', sortable: false, editable: true },
  unread: { key: 'fixed:unread', header: 'Unread', kind: 'fixed', width: '6rem', sortable: false, editable: false },
  lastActive: {
    key: 'fixed:lastActive',
    header: 'Last active',
    kind: 'fixed',
    width: '9rem',
    sortable: false,
    editable: false,
  },
  note: { key: 'fixed:note', header: 'Note', kind: 'fixed', width: '16rem', sortable: false, editable: true },
};

/** Every fixed column, in the order the picker lists them. */
export const FIXED_ORDER: readonly FixedColumnId[] = [
  'name',
  'channel',
  'phone',
  'stage',
  'assignee',
  'lastActive',
  'unread',
  'note',
];

/** What a fresh install shows, in order. */
export const DEFAULT_COLUMNS: readonly string[] = [
  FIXED_COLUMNS.name.key,
  FIXED_COLUMNS.channel.key,
  FIXED_COLUMNS.phone.key,
  FIXED_COLUMNS.stage.key,
  FIXED_COLUMNS.assignee.key,
  FIXED_COLUMNS.lastActive.key,
];

/**
 * Fixed columns that exist but start hidden. They keep their place in the
 * order, so turning one on puts it back where it belongs rather than at the end.
 */
export const DEFAULT_HIDDEN: readonly string[] = [FIXED_COLUMNS.unread.key, FIXED_COLUMNS.note.key];

/** Dropped first when the container is narrow — a reading decision, not a filter. */
export const NARROW_HIDDEN: readonly string[] = [
  FIXED_COLUMNS.phone.key,
  FIXED_COLUMNS.assignee.key,
  FIXED_COLUMNS.note.key,
];

/** The name column is the row's identity: hiding it leaves a table of dashes. */
export const PINNED_COLUMN = FIXED_COLUMNS.name.key;

export const attributeColumnKey = (name: string): string => `attr:${name}`;

export const isAttributeColumn = (key: string): boolean => key.startsWith('attr:');

export const attributeOfColumn = (key: string): string | null => (isAttributeColumn(key) ? key.slice(5) : null);

export function attributeColumn(name: string, dataType?: AttributeDataType): ColumnSpec {
  return {
    key: attributeColumnKey(name),
    header: name,
    kind: 'attribute',
    attribute: name,
    dataType,
    width: '12rem',
    sortable: true,
    editable: true,
  };
}

export function columnSpec(
  key: string,
  dataTypeOf: (name: string) => AttributeDataType | undefined,
): ColumnSpec | null {
  const attribute = attributeOfColumn(key);
  if (attribute) return attributeColumn(attribute, dataTypeOf(attribute));
  const fixed = Object.values(FIXED_COLUMNS).find((column) => column.key === key);
  return fixed ?? null;
}

/**
 * The attribute names a page of rows must carry: exactly the attribute columns
 * on screen. Asking for `null` would return every attribute of every row.
 */
export function attributeNamesFor(columns: readonly string[]): string[] {
  return columns.map(attributeOfColumn).filter((name): name is string => name !== null);
}

/** Columns actually rendered at this band. */
export function visibleColumnKeys(columns: readonly string[], band: Band): string[] {
  if (band === 'wide' || band === 'inline') return [...columns];
  const dropped = band === 'compact' ? NARROW_HIDDEN : NARROW_HIDDEN.slice(0, 1);
  const kept = columns.filter((key) => !dropped.includes(key));
  /* Never return nothing: a container narrow enough to drop every chosen
     column still has to show which contact a row is. */
  return kept.length > 0 ? kept : columns.slice(0, 1);
}

export const DENSITY_LABELS: Record<Density, string> = {
  compact: 'Compact',
  cozy: 'Cozy',
  comfortable: 'Comfortable',
};

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

/**
 * Stage labels and tones live here rather than in `contactsFilter.ts` because
 * a stage is drawn in three places (the cell, the row menu, the bulk bar) and
 * only ever *filtered* in one. `tone` cannot tell all six apart — `TagProps`
 * has no `info` — so Ready and Working on share `warning`, exactly as the deals
 * board does; the label is what distinguishes them.
 */
export const STAGE_META: Record<SalesStageV2, { label: string; tone: NonNullable<TagProps['tone']> }> = {
  [SalesStageV2.New]: { label: 'New', tone: 'accent' },
  [SalesStageV2.Sorting]: { label: 'Sorting', tone: 'neutral' },
  [SalesStageV2.Ready]: { label: 'Ready', tone: 'warning' },
  [SalesStageV2.WorkingOn]: { label: 'Working on', tone: 'warning' },
  [SalesStageV2.Won]: { label: 'Won', tone: 'success' },
  [SalesStageV2.Lost]: { label: 'Lost', tone: 'danger' },
};

export const STAGE_ORDER: readonly SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

export const stageLabel = (stage: SalesStageV2 | null | undefined): string =>
  stage ? (STAGE_META[stage]?.label ?? stage) : 'No stage';

// ---------------------------------------------------------------------------
// Reading a row
// ---------------------------------------------------------------------------

export const contactName = (row: { name: string }): string => (row.name.trim() === '' ? 'Unnamed' : row.name);

export function assigneeLabel(row: Pick<ContactRow, 'assignee'>): string {
  const assignee = row.assignee;
  if (!assignee) return 'Unassigned';
  if (assignee.__typename === 'FuelyAIAssignee') return 'Fuely AI';
  return assignee.isUnknown ? 'Deleted user' : assignee.name;
}

export const attributeEntry = (row: Pick<ContactRow, 'attributes'>, name: string): AttributeEntry | undefined =>
  row.attributes.find((entry) => entry.attr.name === name);

/**
 * A record, folded back into the row the list is holding.
 *
 * The record page reads the SAME contact through a wider
 * selection set: every attribute, not the handful the visible columns asked
 * for. Writing that straight into the list cache would widen the row for good
 * — every later render, every optimistic patch and every live echo would then
 * carry attributes no column shows — so the attributes are narrowed back to
 * what this table needs before the row is replaced. `useRowMutations` narrows
 * its own mutation answers for exactly the same reason.
 *
 * `wanted` is the COLUMNS' names plus whatever the row already had, not just
 * the latter: filling in a field that was empty on this row is the common
 * case, and reading the wanted set off the row alone would drop the value that
 * was just written.
 *
 * The cast is the one place this module says out loud that a row and a record
 * are the same contact seen twice. TypeScript cannot express "the same union
 * member under a different selection set", and the spread order is what makes
 * it safe: the record wins wherever it has an answer, and a field only the row
 * selects — `username`, which `ContactFull` does not ask for — survives.
 */
export function rowFromRecord(
  row: ContactRow,
  record: { id: string; attributes: readonly AttributeEntry[] },
  attrNames: readonly string[],
): ContactRow {
  const wanted = new Set([...attrNames, ...row.attributes.map((entry) => entry.attr.name)]);
  return {
    ...row,
    ...record,
    attributes: record.attributes.filter((entry) => wanted.has(entry.attr.name)),
  } as ContactRow;
}

export interface CellText {
  text: string;
  /** A `title` for the cell — set only when the text hides something. */
  title?: string;
}

/**
 * One attribute cell.
 *
 * Anything can write into an attribute — a flow, a CSV import, a person — and
 * the API stores every custom one as a string. An unreadable value renders as a
 * dash carrying the raw text in its title, never as `NaN` and never as a silent
 * zero, and a datetime that is neither a millisecond stamp nor an RFC-3339
 * string is shown verbatim rather than as "Invalid Date".
 */
export function attributeCell(entry: AttributeEntry | undefined, now = Date.now()): CellText {
  if (!entry) return { text: '' };
  const value = entry.value;
  switch (value.__typename) {
    case 'BotAttributeValueString':
      return { text: value.stringValue };
    case 'BotAttributeValueLong':
      return { text: String(value.longValue) };
    case 'BotAttributeValueDouble':
      return { text: String(value.doubleValue) };
    case 'BotAttributeValueBoolean':
      return { text: value.booleanValue ? 'Yes' : 'No' };
    case 'BotAttributeValueDatetime': {
      const raw = value.datetimeValue;
      if (raw.trim() === '') return { text: '' };
      /* Both forms answered live: a millisecond-timestamp string and an
         RFC-3339 one. Anything else is somebody else's data, shown as it is. */
      const ms = /^-?\d+$/.test(raw.trim()) ? Number(raw.trim()) : Date.parse(raw);
      if (!Number.isFinite(ms)) return { text: raw, title: `Not a date: “${raw}”` };
      return { text: shortTime(new Date(ms).toISOString(), now), title: raw };
    }
    default:
      return { text: '' };
  }
}

// ---------------------------------------------------------------------------
// Reading preferences
// ---------------------------------------------------------------------------

/**
 * Which columns exist, in what order, which are hidden and how wide they are.
 *
 * A reading preference, not a filter: putting it in the URL would mean sharing
 * a link changes what the reader sees. The list holds it in state and hands it
 * to the saved-view payload — this module has no other persistence, since
 * `userStorageItem` is per-user and there are no server-persisted segments.
 *
 * `order` carries hidden keys too, so turning a column back on returns it to
 * its place rather than appending it.
 */
export interface ListPreferences {
  order: string[];
  hidden: string[];
  /** Interactive widths in px, by column key. Absent means the spec's width. */
  widths: Record<string, number>;
}

export const DEFAULT_PREFERENCES: ListPreferences = {
  order: [...DEFAULT_COLUMNS, ...DEFAULT_HIDDEN],
  hidden: [...DEFAULT_HIDDEN],
  widths: {},
};

/** The keys drawn, before the band has its say. */
export function shownColumns(preferences: ListPreferences): string[] {
  const shown = preferences.order.filter((key) => !preferences.hidden.includes(key));
  return shown.length > 0 ? shown : [PINNED_COLUMN];
}

/** Hide / show one column. The name column cannot be hidden — see `PINNED_COLUMN`. */
export function toggleColumn(preferences: ListPreferences, key: string): ListPreferences {
  if (key === PINNED_COLUMN) return preferences;
  const hidden = preferences.hidden.includes(key)
    ? preferences.hidden.filter((each) => each !== key)
    : [...preferences.hidden, key];
  /* A column toggled on that the order never knew about (a fresh attribute)
     joins at the end, where the picker just put it. */
  const order = preferences.order.includes(key) ? preferences.order : [...preferences.order, key];
  return { ...preferences, order, hidden };
}

/**
 * Move a column `delta` places among the ones ON SCREEN.
 *
 * Stepping through hidden columns is what makes an up-arrow look broken: the
 * user presses it, nothing moves, because the neighbour it swapped with is not
 * drawn. So the swap is computed on the visible list and written back into the
 * full order.
 */
export function moveColumn(preferences: ListPreferences, key: string, delta: number): ListPreferences {
  const shown = shownColumns(preferences);
  const from = shown.indexOf(key);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= shown.length) return preferences;

  const reordered = [...shown];
  reordered.splice(from, 1);
  reordered.splice(to, 0, key);
  return writeShownOrder(preferences, reordered);
}

/**
 * Drop `key` at index `to` of the visible list — the shape a drag-reorder API
 * hands back. Same write-back as `moveColumn`, so both routes produce the same
 * order and only one of them has to be understood.
 */
export function reorderColumns(preferences: ListPreferences, key: string, to: number): ListPreferences {
  const shown = shownColumns(preferences);
  const from = shown.indexOf(key);
  if (from === -1 || to < 0 || to >= shown.length || from === to) return preferences;
  const reordered = [...shown];
  reordered.splice(from, 1);
  reordered.splice(to, 0, key);
  return writeShownOrder(preferences, reordered);
}

/** Put a new visible order back into the full one, leaving hidden keys where they sit. */
function writeShownOrder(preferences: ListPreferences, shown: readonly string[]): ListPreferences {
  const queue = [...shown];
  const order = preferences.order.map((key) => (preferences.hidden.includes(key) ? key : (queue.shift() ?? key)));
  return { ...preferences, order };
}

/** Add an attribute column the order has never seen, visible, at the end. */
export function addAttributeColumn(preferences: ListPreferences, name: string): ListPreferences {
  const key = attributeColumnKey(name);
  if (preferences.order.includes(key)) {
    return { ...preferences, hidden: preferences.hidden.filter((each) => each !== key) };
  }
  return { ...preferences, order: [...preferences.order, key], hidden: preferences.hidden.filter((e) => e !== key) };
}

/** Forget an attribute column entirely — the fixed set is never removable. */
export function removeAttributeColumn(preferences: ListPreferences, key: string): ListPreferences {
  if (!isAttributeColumn(key)) return preferences;
  return {
    order: preferences.order.filter((each) => each !== key),
    hidden: preferences.hidden.filter((each) => each !== key),
    widths: Object.fromEntries(Object.entries(preferences.widths).filter(([each]) => each !== key)),
  };
}

export function setWidths(preferences: ListPreferences, widths: Record<string, number>): ListPreferences {
  return { ...preferences, widths };
}

// ---------------------------------------------------------------------------
// Columns handed over from another surface
// ---------------------------------------------------------------------------

/** The link parameter the Fields surface uses to put columns on the list. */
export const COLUMNS_PARAM = 'cols';

/**
 * Attribute columns arriving through `cols=attr:Plan,attr:City`.
 *
 * "Show this field in the list" on the Fields surface is a navigation, not a
 * shared store: the two surfaces never render at the same time, so a link is
 * the whole handover. Reading preferences themselves stay out of the URL —
 * only this one-shot instruction travels.
 *
 * Parsing is deliberately forgiving, for the same reason `contactsParams.ts`
 * is: a stale or hand-edited link must add what it can and drop the rest
 * rather than render nothing. Two consequences worth stating:
 *
 * - A comma separates keys, so an attribute whose NAME contains one cannot
 *   travel this way and is dropped rather than half-applied. The column picker
 *   is the route for those.
 * - Only `attr:` keys are honoured. A fixed column is part of every list
 *   already and a link that could hide one would be a link that changes what
 *   the reader sees — which is exactly what these preferences are not.
 */
export function parseColumnParam(raw: string | null | undefined): string[] {
  if (raw === null || raw === undefined || raw === '') return [];
  const keys: string[] = [];
  for (const part of raw.split(',')) {
    const name = attributeOfColumn(part.trim())?.trim();
    if (name !== undefined && name !== '') keys.push(attributeColumnKey(name));
  }
  return [...new Set(keys)];
}

/**
 * Fold those columns into the reading preferences.
 *
 * Returns the SAME object when there is nothing to add — the list applies this
 * from an effect, and a fresh-but-equal object on every render is a loop. A
 * key already present but hidden is un-hidden: the user asked for it on the
 * other surface, and leaving it off would look like the button did nothing.
 */
export function withParamColumns(preferences: ListPreferences, keys: readonly string[]): ListPreferences {
  const missing = keys.filter((key) => !preferences.order.includes(key) || preferences.hidden.includes(key));
  if (missing.length === 0) return preferences;
  return missing.reduce((current, key) => {
    const name = attributeOfColumn(key);
    return name === null ? current : addAttributeColumn(current, name);
  }, preferences);
}

// ---------------------------------------------------------------------------
// The saved-view payload
// ---------------------------------------------------------------------------

/**
 * Preferences out of JSON.
 *
 * Never throws and never returns a half-built object: a payload written by an
 * older build, hand-edited, or belonging to a bot whose attributes have since
 * been renamed must render the default rather than a white screen. Same rule
 * as `contactsParams.ts`, applied to the half a URL cannot carry.
 *
 * The saved-views track stores the same three fields under its own names, so
 * `toColumnLayout` / `applyColumnLayout` below are the pair the list actually
 * hands over; this is the tolerant core both of them lean on.
 */
const stringList = (raw: unknown): string[] | null =>
  Array.isArray(raw) && raw.every((each) => typeof each === 'string') ? (raw as string[]) : null;

export function decodePreferences(raw: unknown): ListPreferences {
  if (raw === null || typeof raw !== 'object') return DEFAULT_PREFERENCES;
  const record = raw as Record<string, unknown>;
  const order = stringList(record.order);
  if (order === null || order.length === 0) return DEFAULT_PREFERENCES;

  const known = order.filter((key) => isAttributeColumn(key) || columnSpec(key, () => undefined) !== null);
  if (known.length === 0) return DEFAULT_PREFERENCES;

  /* The name column is not optional; a payload without it gets it back at the
     front, because a table whose rows have no identity is not a table. */
  const withPin = known.includes(PINNED_COLUMN) ? known : [PINNED_COLUMN, ...known];
  const hidden = (stringList(record.hidden) ?? []).filter((key) => key !== PINNED_COLUMN && withPin.includes(key));

  const widths: Record<string, number> = {};
  const rawWidths = record.widths;
  if (rawWidths !== null && typeof rawWidths === 'object') {
    for (const [key, value] of Object.entries(rawWidths as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) widths[key] = value;
    }
  }
  return { order: [...new Set(withPin)], hidden: [...new Set(hidden)], widths };
}

/**
 * The same preferences under the names a saved view stores them by.
 *
 * Structural on purpose: `ContactsListLayout` belongs to the saved-views
 * track and this file does not import it. The two shapes agree field for
 * field, and the call site is where TypeScript checks that they still do — so
 * neither file has to depend on the other to stay honest.
 */
export interface ColumnLayout {
  columns: string[];
  hidden: string[];
  widths: Record<string, number>;
}

export const toColumnLayout = (preferences: ListPreferences): ColumnLayout => ({
  columns: [...preferences.order],
  hidden: [...preferences.hidden],
  widths: { ...preferences.widths },
});

/**
 * A stored layout, back into reading preferences.
 *
 * An ABSENT layout leaves the table exactly as it is. A view saved before
 * views carried columns — or by a surface that has none — must not silently
 * reset somebody's table to the default six; it simply has nothing to say
 * about columns. A layout that is present but unreadable goes through
 * `decodePreferences`, which is where that tolerance already lives.
 */
export function applyColumnLayout(preferences: ListPreferences, layout: unknown): ListPreferences {
  if (layout === null || layout === undefined || typeof layout !== 'object') return preferences;
  const record = layout as Record<string, unknown>;
  return decodePreferences({ order: record.columns, hidden: record.hidden, widths: record.widths });
}

// ---------------------------------------------------------------------------
// The column picker
// ---------------------------------------------------------------------------

/** One row of the picker. `usersCount` is null when the API declined to count. */
export interface PickerEntry {
  key: string;
  label: string;
  kind: 'fixed' | 'attribute';
  /** `custom` / `system` for an attribute, empty for a fixed column. */
  type: string;
  dataType: AttributeDataType | null;
  usersCount: number | null;
  /** A bot-wide default makes every contact read this field as non-empty. */
  hasDefault: boolean;
  shown: boolean;
  /** False for the name column, which is the row's identity. */
  canHide: boolean;
  /** True for a column the user added; only those can be removed outright. */
  removable: boolean;
}

/** What the picker needs from the catalog, without importing the hook. */
export interface CatalogLike {
  entries: readonly {
    name: string;
    type: string;
    dataType: AttributeDataType;
    usersCount: number | null;
    defaultValue: string | null;
  }[];
}

/**
 * Every column the picker offers: the fixed set, then every attribute in the
 * catalog, most-used first.
 *
 * Catalog order is already contacts-count descending (the query asks for it),
 * and it is preserved rather than re-sorted so the picker agrees with the
 * Fields surface. Attributes already in `order` keep their chosen position
 * relative to each other; the rest follow.
 */
export function pickerEntries(preferences: ListPreferences, catalog: CatalogLike): PickerEntry[] {
  const shown = new Set(shownColumns(preferences));
  const byName = new Map(catalog.entries.map((entry) => [entry.name, entry]));

  const fixed: PickerEntry[] = FIXED_ORDER.map((id) => {
    const spec = FIXED_COLUMNS[id];
    return {
      key: spec.key,
      label: spec.header,
      kind: 'fixed' as const,
      type: '',
      dataType: null,
      usersCount: null,
      hasDefault: false,
      shown: shown.has(spec.key),
      canHide: spec.key !== PINNED_COLUMN,
      removable: false,
    };
  });

  /* Chosen attribute columns first, in the user's own order, then the rest of
     the catalog. An attribute column whose name has since left the catalog is
     still listed — it is on screen, and the only way to get rid of it is here. */
  const chosen = preferences.order.map(attributeOfColumn).filter((name): name is string => name !== null);
  const names = [...new Set([...chosen, ...catalog.entries.map((entry) => entry.name)])];

  const attributes: PickerEntry[] = names.map((name) => {
    const entry = byName.get(name);
    return {
      key: attributeColumnKey(name),
      label: name,
      kind: 'attribute' as const,
      type: entry?.type ?? 'unknown',
      dataType: entry?.dataType ?? null,
      usersCount: entry?.usersCount ?? null,
      hasDefault: (entry?.defaultValue ?? null) !== null,
      shown: shown.has(attributeColumnKey(name)),
      canHide: true,
      removable: true,
    };
  });

  return [...fixed, ...attributes];
}

/** Free-text narrowing over the picker. Case- and space-insensitive. */
export function searchPicker(entries: readonly PickerEntry[], query: string): PickerEntry[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...entries];
  return entries.filter(
    (entry) => entry.label.toLowerCase().includes(needle) || entry.type.toLowerCase().includes(needle),
  );
}

/**
 * What the picker prints under an attribute's name.
 *
 * `usersCount` is "contacts carrying a value", which a bot-wide default makes
 * meaningless — every contact reads the field as non-empty then, whatever the
 * count says — so that case says so instead of printing a number nobody can act
 * on. A null count is not rendered as 0.
 */
export function coverageNote(entry: PickerEntry): string {
  if (entry.kind === 'fixed') return '';
  const type = entry.dataType === null ? entry.type : `${entry.type} · ${entry.dataType}`;
  if (entry.hasDefault) return `${type} · has a bot-wide default, so every contact carries it`;
  if (entry.usersCount === null) return type;
  return `${type} · ${entry.usersCount.toLocaleString()} ${entry.usersCount === 1 ? 'contact' : 'contacts'}`;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * The filter's sort, expressed as the header state `DataTable` draws.
 *
 * A sort on an attribute no column shows — a saved view built when a field had
 * another name, say — returns null rather than an arrow on the wrong header.
 * The sort itself still applies; only the marker is missing.
 */
export function sortStateFor(sort: SortSpec | null, columns: readonly ColumnSpec[]): SortState | null {
  if (sort === null) return null;
  const column = columns.find((each) => each.attribute === sort.name);
  if (!column) return null;
  return { key: column.key, dir: sort.direction === Sort.Asc ? 'asc' : 'desc' };
}

/**
 * A header click, back into the filter model.
 *
 * Only attribute columns can produce a sort, and that is the API talking:
 * `ContactSearchOrderByInput.orderBy` is an `AttributeName!`, so there is no
 * way to ask the server to order by the stage or by the unread count. A click
 * on any other header clears the sort rather than pretending.
 */
export function sortFromState(next: SortState | null, columns: readonly ColumnSpec[]): SortSpec | null {
  if (next === null) return null;
  const column = columns.find((each) => each.key === next.key);
  if (!column || !column.sortable || column.attribute === undefined) return null;
  return { name: column.attribute, direction: next.dir === 'asc' ? Sort.Asc : Sort.Desc };
}
