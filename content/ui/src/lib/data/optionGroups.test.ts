import { describe, expect, it } from 'vitest';
import { groupOptions, ungroupedCount } from './optionGroups';

interface Option {
  value: string;
  group?: string;
}

const groupOf = (option: Option) => option.group;

const FIELDS: Option[] = [
  { value: 'name' },
  { value: 'city', group: 'Custom fields' },
  { value: 'email' },
  { value: 'last_seen', group: 'System fields' },
  { value: 'plan', group: 'Custom fields' },
];

describe('groupOptions', () => {
  it('leaves a list with no groups exactly as it arrived', () => {
    /* The additive guarantee: a caller that never heard of groups must render
     * the list it always rendered, with no headers in it. */
    const flat = [{ value: 'a' }, { value: 'b' }];
    const grouped = groupOptions(flat, groupOf);
    expect(grouped.order).toEqual(flat);
    expect(grouped.runs).toEqual([]);
    expect(ungroupedCount(grouped)).toBe(2);
  });

  it('puts the ungrouped options first, header-free, in their own order', () => {
    const grouped = groupOptions(FIELDS, groupOf);
    expect(grouped.order.slice(0, 2).map((each) => each.value)).toEqual(['name', 'email']);
    expect(ungroupedCount(grouped)).toBe(2);
    expect(grouped.runs.some((run) => run.from < 2)).toBe(false);
  });

  it('orders the groups by where each was first mentioned', () => {
    expect(groupOptions(FIELDS, groupOf).runs.map((run) => run.label)).toEqual(['Custom fields', 'System fields']);
  });

  it('keeps a group contiguous and stable inside itself', () => {
    const grouped = groupOptions(FIELDS, groupOf);
    expect(grouped.order.map((each) => each.value)).toEqual(['name', 'email', 'city', 'plan', 'last_seen']);
    expect(grouped.runs).toEqual([
      { label: 'Custom fields', from: 2, count: 2 },
      { label: 'System fields', from: 4, count: 1 },
    ]);
  });

  it('describes runs that index the RETURNED order, not the input', () => {
    /* The whole point: the renderer slices `order` by these numbers, and the
     * arrow keys count the same indexes, so a header can never be landed on. */
    const grouped = groupOptions(FIELDS, groupOf);
    for (const run of grouped.runs) {
      const slice = grouped.order.slice(run.from, run.from + run.count);
      expect(slice).toHaveLength(run.count);
      expect(slice.every((each) => each.group === run.label)).toBe(true);
    }
  });

  it('emits no header for a group the filter emptied', () => {
    /* Filtering removes options, never groups. Without this an orphan
     * "System fields" would stand over nothing on most queries. */
    const remaining = FIELDS.filter((each) => each.group !== 'System fields');
    expect(groupOptions(remaining, groupOf).runs.map((run) => run.label)).toEqual(['Custom fields']);
  });

  it('treats an empty group name as no group at all', () => {
    const grouped = groupOptions([{ value: 'a', group: '' }, { value: 'b' }], groupOf);
    expect(grouped.runs).toEqual([]);
    expect(grouped.order.map((each) => each.value)).toEqual(['a', 'b']);
  });

  it('handles a list where every option is grouped', () => {
    const grouped = groupOptions(
      [
        { value: 'a', group: 'One' },
        { value: 'b', group: 'Two' },
      ],
      groupOf,
    );
    expect(ungroupedCount(grouped)).toBe(0);
    expect(grouped.runs).toEqual([
      { label: 'One', from: 0, count: 1 },
      { label: 'Two', from: 1, count: 1 },
    ]);
  });

  it('handles an empty list', () => {
    const grouped = groupOptions([], groupOf);
    expect(grouped.order).toEqual([]);
    expect(grouped.runs).toEqual([]);
    expect(ungroupedCount(grouped)).toBe(0);
  });

  it('never mutates the input', () => {
    const input = [...FIELDS];
    groupOptions(input, groupOf);
    expect(input).toEqual(FIELDS);
  });

  it('keeps every option exactly once', () => {
    const grouped = groupOptions(FIELDS, groupOf);
    expect(grouped.order).toHaveLength(FIELDS.length);
    expect(new Set(grouped.order.map((each) => each.value)).size).toBe(FIELDS.length);
  });
});
