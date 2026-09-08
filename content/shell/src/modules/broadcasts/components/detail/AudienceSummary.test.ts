import { describe, expect, it } from 'vitest';
import { BoolOperator } from '~api/generated/broadcasts/graphql';
import { sampleSegment } from '../../lib/samples';
import type { SegmentRead } from '../../types';
import { segmentLines } from './AudienceSummary';

type Filter = SegmentRead['filters'][number];

const attr = (id: string, name: string, value: string): Filter => ({
  id,
  byAttribute: {
    attribute: { name, type: 'custom' as never, dataType: 'string' as never },
    defaultStrategy: { operator: 'IS' as never, comparableValues: [value] },
    dateStrategy: null,
  },
  byTag: null,
  byStoredSegment: null,
  byInFlightSegment: null,
});

describe('the audience as sentences', () => {
  it('joins top-level filters with the outer operator', () => {
    const lines = segmentLines(
      sampleSegment({
        resultOperator: BoolOperator.And,
        filters: [attr('a', 'city', 'Berlin'), attr('b', 'plan', 'pro')],
      }),
    );
    expect(lines.map((line) => [line.joiner, line.text])).toEqual([
      [null, 'city is Berlin'],
      ['and', 'plan is pro'],
    ]);
  });

  it('joins a nested group with its own operator inside and the outer one before it', () => {
    const lines = segmentLines(
      sampleSegment({
        resultOperator: BoolOperator.Or,
        filters: [
          {
            ...attr('n1', '', ''),
            byAttribute: null,
            byInFlightSegment: {
              id: 's1',
              name: null,
              resultOperator: BoolOperator.And,
              filters: [attr('a', 'city', 'Berlin'), attr('b', 'plan', 'pro')],
            },
          },
          {
            ...attr('n2', '', ''),
            byAttribute: null,
            byInFlightSegment: {
              id: 's2',
              name: null,
              resultOperator: BoolOperator.And,
              filters: [attr('c', 'company', 'X')],
            },
          },
        ],
      }),
    );
    expect(lines.map((line) => [line.joiner, line.nested, line.text])).toEqual([
      [null, true, 'city is Berlin'],
      ['and', true, 'plan is pro'],
      ['or', true, 'company is X'],
    ]);
  });
});
