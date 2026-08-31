/**
 * The table's column model, as data.
 *
 * Nothing here renders. `DealsTable.tsx` maps a spec onto a `DataTableColumn`
 * and supplies the JSX; everything that could be wrong — which columns exist,
 * which of them can be sorted and what a cell says when the value is not what
 * the module wrote — is a pure function with a test.
 *
 * **Only attribute-backed columns are sortable**, and that is a statement about
 * the API rather than a simplification: engine B has no `orderBy` at all, and
 * engine C's is a `ContactSearchOrderByInput` whose `orderBy` is an
 * `AttributeName`. There is no attribute name for "stage" or "last message", so
 * a sortable header there would be a control that cannot work.
 *
 * The deal-field columns are derived from `lib/dealFields.ts` through the
 * catalog binding, so renaming a field in one file renames its column, its
 * sort key and its predicate name together.
 */
import { visibleColumns, type SortState } from '~ui';
import { Sort } from '~api/generated/deals/graphql';
import type { DealFieldBindings } from './dealFieldBinding';
import { DEAL_FIELDS, type DealFieldKey, type DealFieldKind } from './dealFields';
import type { DealsFilter, DealsSort } from './dealsFilter';
import { currencyOf, formatMoney, readValue } from './dealFieldValue';
import { isNarrow, type Band } from './layout';

/** Built-in columns read a contact field; deal-field columns read an attribute. */
export type ColumnKind = 'contact' | 'stage' | 'assignee' | 'lastMessage' | 'platform' | 'unread' | 'note';

export interface TableColumnSpec {
  key: string;
  label: string;
  /** CSS width handed to `<colgroup>`. */
  width: string;
  align?: 'start' | 'end';
  /** The attribute this column reads — and the only thing `orderBy` can take. */
  attributeName: string | null;
  kind: ColumnKind | DealFieldKind;
  fieldKey?: DealFieldKey;
}

/** Deal fields in reading order; the rest of `DEAL_FIELDS` follows. */
const FIELD_ORDER: readonly DealFieldKey[] = [
  'amount',
  'closeDate',
  'company',
  'probability',
  'source',
  'lostReason',
  'currency',
];

const FIELD_WIDTH: Record<DealFieldKind, string> = {
  money: '9rem',
  currency: '6rem',
  date: '8rem',
  percent: '6rem',
  text: '11rem',
};

const FIELD_ALIGN: Partial<Record<DealFieldKind, 'end'>> = { money: 'end', percent: 'end' };

/**
 * Off by default because they are narrow-interest, not because they are
 * second-class: the column menu turns any of them on, and the choice is the
 * view's own state rather than something a URL has to carry.
 */
export const DEFAULT_HIDDEN: readonly string[] = [
  'currency',
  'probability',
  'source',
  'lostReason',
  'platform',
  'note',
];

export function tableColumns(bindings: DealFieldBindings): TableColumnSpec[] {
  const fields = FIELD_ORDER.map((key) => {
    const binding = bindings[key];
    const spec: TableColumnSpec = {
      key,
      label: binding.spec.label,
      width: FIELD_WIDTH[binding.spec.kind],
      attributeName: binding.name,
      kind: binding.spec.kind,
      fieldKey: key,
    };
    const align = FIELD_ALIGN[binding.spec.kind];
    return align ? { ...spec, align } : spec;
  });

  /* Any deal field the convention gains later still gets a column. */
  const extra = DEAL_FIELDS.filter((spec) => !FIELD_ORDER.includes(spec.key)).map((spec) => ({
    key: spec.key,
    label: bindings[spec.key].spec.label,
    width: FIELD_WIDTH[spec.kind],
    attributeName: bindings[spec.key].name,
    kind: spec.kind,
    fieldKey: spec.key,
  }));

  return [
    { key: 'contact', label: 'Deal', width: '17rem', attributeName: null, kind: 'contact' },
    { key: 'stage', label: 'Stage', width: '9.5rem', attributeName: null, kind: 'stage' },
    ...fields,
    ...extra,
    { key: 'assignee', label: 'Owner', width: '10rem', attributeName: null, kind: 'assignee' },
    { key: 'lastMessage', label: 'Last message', width: '8rem', attributeName: null, kind: 'lastMessage' },
    { key: 'platform', label: 'Channel', width: '7rem', attributeName: null, kind: 'platform' },
    { key: 'unread', label: 'Unread', width: '5.5rem', align: 'end', attributeName: null, kind: 'unread' },
    { key: 'note', label: 'Note', width: '14rem', attributeName: null, kind: 'note' },
  ];
}

/**
 * What a container narrower than the wide band drops on top of the user's own
 * choice. Nine columns in 700px is nine truncated columns; this leaves the
 * three that answer "which deal, where is it, how much".
 */
export const NARROW_EXTRA_HIDDEN: readonly string[] = ['closeDate', 'company', 'assignee', 'lastMessage', 'unread'];

/** Band-aware hiding. The user's own list is never mutated, only added to. */
export function hiddenForBand(hidden: readonly string[], band: Band): string[] {
  if (!isNarrow(band)) return [...hidden];
  return [...new Set([...hidden, ...NARROW_EXTRA_HIDDEN])];
}

export interface CardLayout {
  /** The card's heading. Null only when there are no columns at all. */
  identity: TableColumnSpec | null;
  /** Everything else, in table order — one labelled line each. */
  lines: TableColumnSpec[];
}

/**
 * The compact band's card mode, as data.
 *
 * Below 600px a deal is a card rather than a row, because nine columns in 360px
 * is a horizontal scroll nobody uses. The card is built from the SAME specs the
 * table is built from, split in two: the first column still on screen is the
 * deal's identity and becomes the heading, everything after it is a labelled
 * line.
 *
 * Deriving it is the entire rule, and the reason this function exists at all
 * rather than a list of fields written out inside the component. A second list
 * is how a column comes to exist on a desktop and quietly not exist on a phone,
 * and how nobody notices for months. Un-hide `note` from the column menu and it
 * appears in both places at once, because there is only one place it can come
 * from.
 *
 * `hidden` is the EFFECTIVE list — `hiddenForBand`'s output — so the band's own
 * drops are already in it. `visibleColumns` is `~ui`'s, the same function
 * `DataTable` applies `hiddenColumns` with, which is what makes "the card shows
 * what the table shows" true by construction rather than by agreement. It keeps
 * the first column alive even when every key is hidden, so a card can never end
 * up headless.
 */
export function cardLayout(columns: readonly TableColumnSpec[], hidden: readonly string[]): CardLayout {
  const [identity, ...lines] = visibleColumns(columns, hidden);
  return { identity: identity ?? null, lines };
}

export function isSortable(column: TableColumnSpec): boolean {
  return column.attributeName !== null && column.attributeName.trim() !== '';
}

/** Column menu toggle. A column already hidden comes back; the rest is untouched. */
export function toggleHidden(hidden: readonly string[], key: string): string[] {
  return hidden.includes(key) ? hidden.filter((each) => each !== key) : [...hidden, key];
}

/**
 * The filter's sort, expressed as the header state `DataTable` draws.
 *
 * A sort on an attribute no column shows — a saved view built when a field had
 * another name, say — returns null rather than an arrow on the wrong header.
 * The sort itself still applies; only the marker is missing.
 */
export function sortStateFor(filter: DealsFilter, columns: readonly TableColumnSpec[]): SortState | null {
  if (filter.sort === null) return null;
  const column = columns.find((each) => each.attributeName === filter.sort!.attribute);
  if (!column) return null;
  return { key: column.key, dir: filter.sort.direction === Sort.Asc ? 'asc' : 'desc' };
}

/** A header click, back into the filter model. Unsortable columns clear the sort. */
export function sortFromState(next: SortState | null, columns: readonly TableColumnSpec[]): DealsSort | null {
  if (next === null) return null;
  const column = columns.find((each) => each.key === next.key);
  if (!column || !isSortable(column) || column.attributeName === null) return null;
  return {
    attribute: column.attributeName,
    direction: next.dir === 'asc' ? Sort.Asc : Sort.Desc,
  };
}

export interface CellText {
  text: string;
  /** A `title` for the cell — set only when the text hides something. */
  title?: string;
}

const EM_DASH = '—';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * One deal-field cell.
 *
 * Anything can write into a custom attribute — a flow, a CSV import, a person.
 * An unreadable value renders as a dash carrying the raw text in its title,
 * never as `NaN` and never as a silent zero.
 */
export function fieldCell(column: TableColumnSpec, values: Record<string, string>, currencyName: string): CellText {
  const raw = column.attributeName === null ? '' : (values[column.attributeName] ?? '');
  if (raw.trim() === '') return { text: '' };

  switch (column.kind) {
    case 'money': {
      const value = readValue('money', raw);
      if (value.parsed === null) return { text: EM_DASH, title: `Not a number: “${raw}”` };
      return { text: formatMoney(value.parsed, currencyOf(values, currencyName)) };
    }
    case 'date': {
      const value = readValue('date', raw);
      if (value.parsed === null) return { text: EM_DASH, title: `Not a date: “${raw}”` };
      return { text: dateFormat.format(new Date(value.parsed)) };
    }
    case 'percent': {
      const value = readValue('percent', raw);
      if (value.parsed === null) return { text: EM_DASH, title: `Not a number: “${raw}”` };
      return { text: `${value.parsed}%` };
    }
    default:
      return { text: raw };
  }
}

/** The shape the label helpers need — every contact typename satisfies it. */
export interface LabelledRow {
  name: string;
  assignee?:
    { __typename: 'FuelyAIAssignee' } | { __typename: 'PublicUserAccount'; name: string; isUnknown: boolean } | null;
}

export function assigneeLabel(row: LabelledRow): string {
  const assignee = row.assignee;
  if (!assignee) return 'Unassigned';
  if (assignee.__typename === 'FuelyAIAssignee') return 'Fuely AI';
  return assignee.isUnknown ? 'Deleted user' : assignee.name;
}

export function contactName(row: LabelledRow): string {
  return row.name.trim() === '' ? 'Unnamed' : row.name;
}
