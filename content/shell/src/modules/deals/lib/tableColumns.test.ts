import { describe, expect, it } from 'vitest';
import { Sort } from '~api/generated/deals/graphql';
import { bindDealFields, unboundFields } from './dealFieldBinding';
import { EMPTY_FILTER } from './dealsFilter';
import {
  DEFAULT_HIDDEN,
  assigneeLabel,
  cardLayout,
  contactName,
  fieldCell,
  hiddenForBand,
  isSortable,
  sortFromState,
  sortStateFor,
  tableColumns,
  toggleHidden,
  type TableColumnSpec,
} from './tableColumns';

const columns = tableColumns(unboundFields());
const by = (key: string): TableColumnSpec => {
  const column = columns.find((each) => each.key === key);
  if (!column) throw new Error(`no column ${key}`);
  return column;
};

describe('tableColumns', () => {
  it('leads with the deal and its stage, then the money', () => {
    expect(columns.slice(0, 3).map((column) => column.key)).toEqual(['contact', 'stage', 'amount']);
  });

  it('covers every deal field exactly once', () => {
    const fieldKeys = columns.flatMap((column) => (column.fieldKey ? [column.fieldKey] : []));
    expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
    expect(fieldKeys).toContain('lostReason');
    expect(fieldKeys).toContain('currency');
  });

  it('follows the catalog binding, so a bot with its own name still sorts on it', () => {
    const bound = tableColumns(bindDealFields([{ name: 'Deal Amount' }]));
    const amount = bound.find((column) => column.key === 'amount');
    expect(amount?.attributeName).toBe('Deal Amount');
    expect(amount?.label).toBe('Amount');
  });

  it('hides only columns that exist', () => {
    for (const key of DEFAULT_HIDDEN) expect(columns.some((column) => column.key === key)).toBe(true);
  });

  it('makes exactly the attribute-backed columns sortable — orderBy takes an AttributeName', () => {
    expect(isSortable(by('amount'))).toBe(true);
    expect(isSortable(by('company'))).toBe(true);
    expect(isSortable(by('stage'))).toBe(false);
    expect(isSortable(by('lastMessage'))).toBe(false);
    expect(isSortable(by('contact'))).toBe(false);
    expect(isSortable(by('unread'))).toBe(false);
  });
});

describe('toggleHidden', () => {
  it('hides, then shows again, and touches nothing else', () => {
    expect(toggleHidden(['note'], 'amount')).toEqual(['note', 'amount']);
    expect(toggleHidden(['note', 'amount'], 'note')).toEqual(['amount']);
  });
});

describe('hiddenForBand', () => {
  it('leaves a wide container alone', () => {
    expect(hiddenForBand(['note'], 'wide')).toEqual(['note']);
    expect(hiddenForBand(['note'], 'inline')).toEqual(['note']);
  });

  it('drops the wide columns in a narrow one, without duplicating a choice', () => {
    const narrow = hiddenForBand(['note', 'company'], 'narrow');
    expect(narrow).toContain('company');
    expect(narrow).toContain('lastMessage');
    expect(narrow.filter((key) => key === 'company')).toHaveLength(1);
    expect(narrow).not.toContain('amount');
  });
});

describe('cardLayout', () => {
  const keysOf = (hidden: readonly string[]): string[] => {
    const layout = cardLayout(columns, hidden);
    return [...(layout.identity ? [layout.identity.key] : []), ...layout.lines.map((c) => c.key)];
  };

  it('makes the deal the heading and everything else a line', () => {
    const layout = cardLayout(columns, []);
    expect(layout.identity?.key).toBe('contact');
    expect(layout.lines.map((column) => column.key).slice(0, 2)).toEqual(['stage', 'amount']);
  });

  it('never repeats the heading as one of the lines', () => {
    const layout = cardLayout(columns, [...DEFAULT_HIDDEN]);
    expect(layout.lines.map((column) => column.key)).not.toContain(layout.identity?.key);
  });

  /* The rule the card mode exists to keep: a column cannot render on a desktop
   * and silently vanish on a phone, because both sides read one list. The
   * expectation is written out independently rather than by calling the same
   * helper, or it would only be testing that a function equals itself. */
  it('shows exactly the columns the table shows, never a second list of fields', () => {
    for (const band of ['compact', 'narrow', 'wide', 'inline'] as const) {
      const hidden = hiddenForBand(DEFAULT_HIDDEN, band);
      expect(keysOf(hidden)).toEqual(
        columns.filter((column) => !hidden.includes(column.key)).map((column) => column.key),
      );
    }
  });

  it('keeps which deal, where it is and how much on a phone — and drops the rest', () => {
    const keys = keysOf(hiddenForBand(DEFAULT_HIDDEN, 'compact'));
    expect(keys[0]).toBe('contact');
    expect(keys).toContain('stage');
    expect(keys).toContain('amount');
    /* hiddenForBand's own drops, which the card must honour: a nine-line card is
     * the horizontal scroll again, only vertical. */
    for (const key of ['company', 'closeDate', 'assignee', 'lastMessage', 'unread']) {
      expect(keys).not.toContain(key);
    }
  });

  it('promotes the next column when the deal column itself is hidden', () => {
    expect(cardLayout(columns, ['contact']).identity?.key).toBe('stage');
  });

  /* visibleColumns keeps the first column alive when everything is hidden — a
   * headless card would be a stack of labelled values belonging to nobody. */
  it('always has a heading, even with every column hidden', () => {
    const layout = cardLayout(
      columns,
      columns.map((column) => column.key),
    );
    expect(layout.identity?.key).toBe('contact');
    expect(layout.lines).toEqual([]);
  });

  it('has no heading only when there are no columns at all', () => {
    expect(cardLayout([], [])).toEqual({ identity: null, lines: [] });
  });
});

describe('sort mapping', () => {
  it('marks the header that carries the sorted attribute', () => {
    expect(
      sortStateFor({ ...EMPTY_FILTER, sort: { attribute: 'deal amount', direction: Sort.Desc } }, columns),
    ).toEqual({ key: 'amount', dir: 'desc' });
  });

  it('marks nothing when no column shows the sorted attribute', () => {
    expect(sortStateFor({ ...EMPTY_FILTER, sort: { attribute: 'zzz', direction: Sort.Asc } }, columns)).toBeNull();
    expect(sortStateFor(EMPTY_FILTER, columns)).toBeNull();
  });

  it('turns a header click back into an attribute sort', () => {
    expect(sortFromState({ key: 'closeDate', dir: 'asc' }, columns)).toEqual({
      attribute: 'deal close date',
      direction: Sort.Asc,
    });
  });

  it('clears the sort on the third click, and refuses a column that cannot sort', () => {
    expect(sortFromState(null, columns)).toBeNull();
    expect(sortFromState({ key: 'stage', dir: 'asc' }, columns)).toBeNull();
    expect(sortFromState({ key: 'nope', dir: 'asc' }, columns)).toBeNull();
  });

  it('round-trips', () => {
    const sort = sortFromState({ key: 'amount', dir: 'desc' }, columns);
    expect(sortStateFor({ ...EMPTY_FILTER, sort }, columns)).toEqual({ key: 'amount', dir: 'desc' });
  });
});

describe('fieldCell', () => {
  const values = {
    'deal amount': '18900.50',
    'deal currency': 'USD',
    'deal close date': '1790121600000',
    'deal probability': '60',
    'deal company': 'Northwind',
  };

  it('is empty, not a dash, when the attribute was never written', () => {
    expect(fieldCell(by('amount'), {}, 'deal currency')).toEqual({ text: '' });
  });

  it('formats money in the deal’s own currency', () => {
    expect(fieldCell(by('amount'), values, 'deal currency').text).toContain('18,900.5');
  });

  it('renders an unreadable amount as a dash carrying the raw text — never NaN', () => {
    expect(fieldCell(by('amount'), { 'deal amount': 'about 5k' }, 'deal currency')).toEqual({
      text: '—',
      title: 'Not a number: “about 5k”',
    });
  });

  it('reads a millisecond timestamp as a date', () => {
    expect(fieldCell(by('closeDate'), values, 'deal currency').text).not.toBe('—');
  });

  it('renders an unreadable date as a dash too', () => {
    expect(fieldCell(by('closeDate'), { 'deal close date': 'next quarter' }, 'deal currency')).toEqual({
      text: '—',
      title: 'Not a date: “next quarter”',
    });
  });

  it('suffixes a percent and passes text through', () => {
    expect(fieldCell(by('probability'), values, 'deal currency').text).toBe('60%');
    expect(fieldCell(by('company'), values, 'deal currency').text).toBe('Northwind');
  });
});

describe('row labels', () => {
  it('names the three assignee states the union can be in', () => {
    expect(assigneeLabel({ name: 'a', assignee: null })).toBe('Unassigned');
    expect(assigneeLabel({ name: 'a', assignee: { __typename: 'FuelyAIAssignee' } })).toBe('Fuely AI');
    expect(
      assigneeLabel({
        name: 'a',
        assignee: { __typename: 'PublicUserAccount', name: 'Sam', isUnknown: false },
      }),
    ).toBe('Sam');
    expect(
      assigneeLabel({
        name: 'a',
        assignee: { __typename: 'PublicUserAccount', name: '', isUnknown: true },
      }),
    ).toBe('Deleted user');
  });

  it('never renders a blank name cell', () => {
    expect(contactName({ name: '   ' })).toBe('Unnamed');
    expect(contactName({ name: 'Aylin K.' })).toBe('Aylin K.');
  });
});
