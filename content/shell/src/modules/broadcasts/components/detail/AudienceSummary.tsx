import { Tag } from '~ui';
import type { SegmentRead } from '../../types';

const OPERATOR_WORDS: Record<string, string> = {
  IS: 'is',
  IS_NOT: 'is not',
  STARTS_WITH: 'starts with',
  CONTAINS: 'contains',
  LT: 'is less than',
  GT: 'is greater than',
  IS_EMPTY: 'is empty',
  IS_NOT_EMPTY: 'is not empty',
};

interface Line {
  text: string;
  nested: boolean;
  /** The word before this line — the outer operator between top-level items, the group's own inside it. */
  joiner: string | null;
}

const word = (operator: string): string => (operator === 'AND' ? 'and' : 'or');

/** A segment as sentences: one per filter, a nested group's lines indented under its own operator. */
export function segmentLines(segment: SegmentRead): Line[] {
  const lines: Line[] = [];
  const describe = (filter: SegmentRead['filters'][number]): string | null => {
    if (filter.byAttribute) {
      const { attribute, defaultStrategy, dateStrategy } = filter.byAttribute;
      const strategy = defaultStrategy ?? dateStrategy;
      if (!strategy) return attribute.name;
      const values =
        'comparableValues' in strategy ? strategy.comparableValues.join(', ') : (strategy.comparableDate ?? '');
      const operator = OPERATOR_WORDS[String(strategy.operator)] ?? String(strategy.operator).toLowerCase();
      return values ? `${attribute.name} ${operator} ${values}` : `${attribute.name} ${operator}`;
    }
    if (filter.byTag)
      return `tag ${OPERATOR_WORDS[String(filter.byTag.operator)] ?? ''} ${filter.byTag.tagNames.join(', ')}`;
    if (filter.byStoredSegment)
      return `segment ${filter.byStoredSegment.segmentIDs.length === 1 ? '' : 'one of '}${filter.byStoredSegment.segmentIDs.join(', ')}`;
    return null;
  };
  const outer = word(String(segment.resultOperator));
  let items = 0;
  for (const filter of segment.filters) {
    const own = describe(filter);
    if (own) {
      lines.push({ text: own, nested: false, joiner: items > 0 ? outer : null });
      items += 1;
    }
    if (filter.byInFlightSegment) {
      const inner = word(String(filter.byInFlightSegment.resultOperator));
      let innerItems = 0;
      for (const deep of filter.byInFlightSegment.filters) {
        const text = describe(deep);
        if (!text) continue;
        lines.push({ text, nested: true, joiner: innerItems > 0 ? inner : items > 0 ? outer : null });
        innerItems += 1;
        if (innerItems === 1) items += 1;
      }
    }
  }
  return lines;
}

export function AudienceSummary({ segment }: { segment: SegmentRead }) {
  const lines = segmentLines(segment);
  if (lines.length === 0) return <Tag tone="accent">Every WhatsApp contact</Tag>;
  return (
    <ul className="space-y-1 text-sm text-text">
      {lines.map((line, index) => (
        <li key={index} className={line.nested ? 'pl-4 text-text-muted' : ''}>
          {line.joiner ? <span className="mr-1 text-micro uppercase text-text-faint">{line.joiner}</span> : null}
          {line.text}
        </li>
      ))}
    </ul>
  );
}
