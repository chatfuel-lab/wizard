/**
 * Segment read model ↔ SegmentInput round-trip for the SegmentEditor.
 *
 * Segments are written WHOLESALE (`...UpdateSegment(request: SegmentInput!)`)
 * — the server replaces the whole filter list, so every part the editor does
 * not explicitly edit must be carried back verbatim or it is destroyed.
 *
 * The editor edits single-value byAttribute default-strategy rows (the
 * dashboard's common case). Everything else — tag filters, stored-segment
 * filters, date strategies, in-flight sub-segments, multi-value attribute
 * filters — is PASSTHROUGH: rendered read-only and rebuilt into the input
 * verbatim on save.
 */
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  type FilterInput,
  type SegmentInput,
  type SegmentPartsFragment,
} from '~api/generated/flow-builder/graphql';

type FilterT = SegmentPartsFragment['filters'][number];

/** Operators whose comparableValues list must stay empty. */
export const VALUELESS_OPERATORS: readonly AttrFilterDefaultOperator[] = [
  AttrFilterDefaultOperator.IsEmpty,
  AttrFilterDefaultOperator.IsNotEmpty,
];

export interface AttributeRow {
  /** Existing FilterID, or a fresh client UUID for a new row. */
  filterId: string;
  attributeName: string;
  operator: AttrFilterDefaultOperator;
  /** Single comparable value ('' for the valueless operators). */
  value: string;
}

export interface SegmentModel {
  /** Rows the editor can change. */
  rows: AttributeRow[];
  /** Read-only summaries of the preserved filters, for honest display. */
  passthroughLabels: string[];
  resultOperator: BoolOperator;
}

/** True when the editor's row form can represent this filter. */
function isEditable(filter: FilterT): boolean {
  return Boolean(
    filter.byAttribute &&
    !filter.byAttribute.dateStrategy &&
    !filter.byTag &&
    !filter.byStoredSegment &&
    !filter.byInFlightSegment &&
    (filter.byAttribute.defaultStrategy?.comparableValues.length ?? 0) <= 1,
  );
}

function describePassthrough(filter: FilterT): string {
  if (filter.byTag) return `Tag filter: ${filter.byTag.operator} [${filter.byTag.tagNames.join(', ')}]`;
  if (filter.byStoredSegment) {
    return `Stored segment filter: ${filter.byStoredSegment.operator} (${filter.byStoredSegment.segmentIDs.length})`;
  }
  if (filter.byInFlightSegment) return `Nested segment (${filter.byInFlightSegment.filters.length} filters)`;
  if (filter.byAttribute?.dateStrategy) {
    return `${filter.byAttribute.attribute.name}: date ${filter.byAttribute.dateStrategy.operator}`;
  }
  if (filter.byAttribute) {
    const strategy = filter.byAttribute.defaultStrategy;
    return `${filter.byAttribute.attribute.name}: ${strategy?.operator ?? '?'} [${(strategy?.comparableValues ?? []).join(', ')}]`;
  }
  return 'Unknown filter (preserved)';
}

export function toSegmentModel(segment: SegmentPartsFragment): SegmentModel {
  const rows: AttributeRow[] = [];
  const passthroughLabels: string[] = [];
  for (const filter of segment.filters) {
    if (isEditable(filter)) {
      const strategy = filter.byAttribute?.defaultStrategy;
      rows.push({
        filterId: filter.id,
        attributeName: filter.byAttribute?.attribute.name ?? '',
        operator: strategy?.operator ?? AttrFilterDefaultOperator.Is,
        value: strategy?.comparableValues[0] ?? '',
      });
    } else {
      passthroughLabels.push(describePassthrough(filter));
    }
  }
  return { rows, passthroughLabels, resultOperator: segment.resultOperator };
}

/** Read filter → input filter, byte-faithful (the preservation path). */
function toFilterInput(filter: FilterT): FilterInput {
  return {
    id: filter.id,
    byAttribute: filter.byAttribute
      ? {
          name: filter.byAttribute.attribute.name,
          defaultStrategy: filter.byAttribute.defaultStrategy
            ? {
                operator: filter.byAttribute.defaultStrategy.operator,
                comparableValues: [...filter.byAttribute.defaultStrategy.comparableValues],
              }
            : undefined,
          // comparableDate is nullable on the read model but required in the
          // input — a date strategy without a date cannot be expressed, so it
          // is dropped (practically: no date was ever set).
          dateStrategy:
            filter.byAttribute.dateStrategy && filter.byAttribute.dateStrategy.comparableDate != null
              ? {
                  operator: filter.byAttribute.dateStrategy.operator,
                  comparableDate: filter.byAttribute.dateStrategy.comparableDate,
                }
              : undefined,
        }
      : undefined,
    byTag: filter.byTag ? { operator: filter.byTag.operator, tagNames: [...filter.byTag.tagNames] } : undefined,
    byStoredSegment: filter.byStoredSegment
      ? { operator: filter.byStoredSegment.operator, segmentIDs: [...filter.byStoredSegment.segmentIDs] }
      : undefined,
    byInFlightSegment:
      'byInFlightSegment' in filter && filter.byInFlightSegment
        ? {
            id: filter.byInFlightSegment.id,
            name: filter.byInFlightSegment.name,
            resultOperator: filter.byInFlightSegment.resultOperator,
            filters: filter.byInFlightSegment.filters.map((nested) => toFilterInput(nested as FilterT)),
          }
        : undefined,
  };
}

/**
 * Rebuild the wholesale SegmentInput: edited rows replace their originals in
 * place (stable filter ids), passthrough filters are carried verbatim, new
 * rows get client UUIDs, and the original filter ORDER is kept — rows deleted
 * in the editor simply drop out.
 */
export function buildSegmentInput(
  segment: SegmentPartsFragment,
  rows: AttributeRow[],
  resultOperator: BoolOperator,
): SegmentInput {
  const rowById = new Map(rows.map((row) => [row.filterId, row]));
  const seen = new Set<string>();
  const filters: FilterInput[] = [];

  for (const filter of segment.filters) {
    if (isEditable(filter)) {
      const row = rowById.get(filter.id);
      if (!row) continue; // deleted in the editor
      seen.add(row.filterId);
      filters.push(rowToFilterInput(row));
    } else {
      filters.push(toFilterInput(filter));
    }
  }
  for (const row of rows) {
    if (!seen.has(row.filterId)) filters.push(rowToFilterInput(row));
  }

  return { id: segment.id, name: segment.name, resultOperator, filters };
}

function rowToFilterInput(row: AttributeRow): FilterInput {
  const valueless = VALUELESS_OPERATORS.includes(row.operator);
  return {
    id: row.filterId,
    byAttribute: {
      name: row.attributeName,
      defaultStrategy: {
        operator: row.operator,
        comparableValues: valueless ? [] : [row.value],
      },
    },
  };
}

/** filterIDs carrying segmentErrors (empty filterID = whole-segment error). */
export function segmentErrorFilterIds(errors: readonly { filterID?: string | null }[] | null | undefined): Set<string> {
  return new Set((errors ?? []).flatMap((e) => (e.filterID ? [e.filterID] : [])));
}

export function newAttributeRow(): AttributeRow {
  return {
    filterId: crypto.randomUUID(),
    attributeName: '',
    operator: AttrFilterDefaultOperator.Is,
    value: '',
  };
}
