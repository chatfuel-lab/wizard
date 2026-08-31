import { describe, expect, it } from 'vitest';
import { AttributeDataType, AttributeType, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import { usernameOf, type AttributeEntry, type ContactRow } from '../types';
import {
  DEFAULT_COLUMNS,
  DEFAULT_PREFERENCES,
  FIXED_COLUMNS,
  PINNED_COLUMN,
  STAGE_META,
  STAGE_ORDER,
  addAttributeColumn,
  assigneeLabel,
  attributeCell,
  attributeColumn,
  attributeColumnKey,
  attributeEntry,
  attributeNamesFor,
  attributeOfColumn,
  columnSpec,
  contactName,
  coverageNote,
  applyColumnLayout,
  decodePreferences,
  isAttributeColumn,
  moveColumn,
  parseColumnParam,
  pickerEntries,
  removeAttributeColumn,
  reorderColumns,
  rowFromRecord,
  searchPicker,
  shownColumns,
  sortFromState,
  sortStateFor,
  stageLabel,
  toColumnLayout,
  toggleColumn,
  visibleColumnKeys,
  withParamColumns,
  type CatalogLike,
  type ListPreferences,
} from './tableColumns';

describe('column keys', () => {
  it('round-trips an attribute name, spaces and all', () => {
    const key = attributeColumnKey('deal amount');
    expect(isAttributeColumn(key)).toBe(true);
    expect(attributeOfColumn(key)).toBe('deal amount');
  });

  it('does not mistake a fixed column for an attribute', () => {
    expect(isAttributeColumn('fixed:name')).toBe(false);
    expect(attributeOfColumn('fixed:name')).toBeNull();
  });

  it('asks the server only for the attributes on screen', () => {
    expect(attributeNamesFor([...DEFAULT_COLUMNS, attributeColumnKey('city')])).toEqual(['city']);
    expect(attributeNamesFor(DEFAULT_COLUMNS)).toEqual([]);
  });
});

describe('columnSpec', () => {
  it('marks only attribute columns sortable — the API sorts by attribute name alone', () => {
    expect(columnSpec('fixed:stage', () => undefined)?.sortable).toBe(false);
    expect(columnSpec(attributeColumnKey('city'), () => undefined)?.sortable).toBe(true);
  });

  it('is null for a key nobody knows', () => {
    expect(columnSpec('made:up', () => undefined)).toBeNull();
  });
});

describe('visibleColumnKeys', () => {
  it('keeps everything when there is room — wide and inline are the roomy bands', () => {
    expect(visibleColumnKeys(DEFAULT_COLUMNS, 'wide')).toEqual([...DEFAULT_COLUMNS]);
    expect(visibleColumnKeys(DEFAULT_COLUMNS, 'inline')).toEqual([...DEFAULT_COLUMNS]);
  });

  it('drops the widest reading columns first as the container narrows', () => {
    const narrow = visibleColumnKeys(DEFAULT_COLUMNS, 'narrow');
    const compact = visibleColumnKeys(DEFAULT_COLUMNS, 'compact');
    expect(narrow).not.toContain('fixed:phone');
    expect(compact.length).toBeLessThanOrEqual(narrow.length);
    expect(compact).toContain('fixed:name');
  });

  it('never returns nothing, however narrow the container is', () => {
    expect(visibleColumnKeys(['fixed:phone'], 'compact')).toEqual(['fixed:phone']);
  });
});

describe('stages', () => {
  it('names every stage the API has, and calls the absence of one what it is', () => {
    expect(STAGE_ORDER).toHaveLength(6);
    for (const stage of STAGE_ORDER) expect(STAGE_META[stage].label).not.toBe('');
    expect(Object.keys(STAGE_META).sort()).toEqual(Object.values(SalesStageV2).sort());
    expect(stageLabel(null)).toBe('No stage');
    expect(stageLabel(SalesStageV2.WorkingOn)).toBe('Working on');
  });
});

const entry = (value: AttributeEntry['value']): AttributeEntry => ({
  id: 'a1',
  attr: { name: 'field', dataType: AttributeDataType.String, type: AttributeType.Custom, aliases: [] },
  value,
});

describe('attributeCell', () => {
  it('reads every branch of the value union', () => {
    expect(attributeCell(entry({ __typename: 'BotAttributeValueString', id: 'v', stringValue: 'Berlin' })).text).toBe(
      'Berlin',
    );
    expect(attributeCell(entry({ __typename: 'BotAttributeValueLong', id: 'v', longValue: 42 })).text).toBe('42');
    expect(attributeCell(entry({ __typename: 'BotAttributeValueDouble', id: 'v', doubleValue: 1.5 })).text).toBe('1.5');
    expect(attributeCell(entry({ __typename: 'BotAttributeValueBoolean', id: 'v', booleanValue: false })).text).toBe(
      'No',
    );
  });

  it('is empty, not a dash, when the attribute is simply absent', () => {
    expect(attributeCell(undefined)).toEqual({ text: '' });
  });

  it('reads a datetime as a millisecond stamp or as RFC-3339, the two forms the API takes', () => {
    const ms = attributeCell(
      entry({ __typename: 'BotAttributeValueDatetime', id: 'v', datetimeValue: '1720456863000' }),
      Date.parse('2024-07-08T18:01:03.000Z'),
    );
    expect(ms.text).not.toBe('');
    expect(ms.title).toBe('1720456863000');

    const iso = attributeCell(
      entry({ __typename: 'BotAttributeValueDatetime', id: 'v', datetimeValue: '2024-07-08T18:01:03Z' }),
      Date.parse('2024-07-08T18:01:03.000Z'),
    );
    expect(iso.text).not.toBe('');
  });

  it('never renders Invalid Date or NaN for something nobody can parse', () => {
    const cell = attributeCell(entry({ __typename: 'BotAttributeValueDatetime', id: 'v', datetimeValue: 'soon' }));
    expect(cell.text).toBe('soon');
    expect(cell.title).toContain('Not a date');
    expect(cell.text).not.toContain('NaN');
    expect(cell.text).not.toContain('Invalid');
  });
});

describe('naming a row', () => {
  it('never shows an empty name or an id', () => {
    expect(contactName({ name: '   ' })).toBe('Unnamed');
    expect(contactName({ name: 'Anna' })).toBe('Anna');
  });

  it('distinguishes unassigned, the AI and a deleted user', () => {
    expect(assigneeLabel({ assignee: null })).toBe('Unassigned');
    expect(assigneeLabel({ assignee: { __typename: 'FuelyAIAssignee', fakeField: null } })).toBe('Fuely AI');
    expect(
      assigneeLabel({
        assignee: { __typename: 'PublicUserAccount', id: 'u', name: 'ghost', isUnknown: true, profilePicture: null },
      }),
    ).toBe('Deleted user');
  });
});

describe('a record, folded back into its row', () => {
  const attr = (name: string, value: string): AttributeEntry => ({
    id: `a-${name}`,
    attr: { name, dataType: AttributeDataType.String, type: AttributeType.Custom, aliases: [] },
    value: { __typename: 'BotAttributeValueString', id: `v-${name}`, stringValue: value },
  });

  const listRow = (over: Partial<ContactRow> = {}): ContactRow =>
    ({
      __typename: 'InstagramContact',
      id: 'c1',
      name: 'Anna Koch',
      username: 'anna',
      profilePictureUrl: null,
      updatedAt: '2026-08-18T10:00:00.000Z',
      note: null,
      salesStageV2: null,
      lastSalesStageUpdateTime: null,
      lastConversationMessageTime: null,
      unreadMessagesCount: 0,
      unhandledSwitchToHuman: false,
      assignee: null,
      conversation: null,
      attributes: [],
      ...over,
    }) as ContactRow;

  it('adopts what the record answered', () => {
    const merged = rowFromRecord(listRow(), { id: 'c1', name: 'Anna K.', note: 'VIP', attributes: [] } as never, []);
    expect(merged.name).toBe('Anna K.');
    expect(merged.note).toBe('VIP');
  });

  it('keeps a field only the row selects — ContactFull does not ask for the handle', () => {
    const merged = rowFromRecord(listRow(), { id: 'c1', attributes: [] } as never, []);
    expect(usernameOf(merged)).toBe('anna');
  });

  it('narrows the attributes back to the ones the columns asked for', () => {
    const merged = rowFromRecord(
      listRow(),
      { id: 'c1', attributes: [attr('Plan', 'Pro'), attr('Secret', 'x')] } as never,
      ['Plan'],
    );
    expect(merged.attributes.map((each) => each.attr.name)).toEqual(['Plan']);
  });

  it('keeps an attribute the row already carried, so a value just written is not dropped', () => {
    const merged = rowFromRecord(
      listRow({ attributes: [attr('City', '')] }),
      { id: 'c1', attributes: [attr('City', 'Berlin'), attr('Noise', 'x')] } as never,
      [],
    );
    expect(merged.attributes).toHaveLength(1);
    expect(attributeCell(attributeEntry(merged, 'City')).text).toBe('Berlin');
  });
});

// ---------------------------------------------------------------------------

const prefs = (over: Partial<ListPreferences> = {}): ListPreferences => ({
  ...DEFAULT_PREFERENCES,
  ...over,
});

describe('reading preferences', () => {
  it('shows the chosen order minus what is hidden', () => {
    const shown = shownColumns(DEFAULT_PREFERENCES);
    expect(shown).toEqual([...DEFAULT_COLUMNS]);
    expect(shown).not.toContain(FIXED_COLUMNS.note.key);
  });

  it('never lets the row lose its identity', () => {
    expect(toggleColumn(DEFAULT_PREFERENCES, PINNED_COLUMN)).toBe(DEFAULT_PREFERENCES);
    expect(shownColumns(prefs({ hidden: [...DEFAULT_PREFERENCES.order] }))).toEqual([PINNED_COLUMN]);
  });

  it('returns a hidden column to its place rather than to the end', () => {
    const hidden = toggleColumn(DEFAULT_PREFERENCES, FIXED_COLUMNS.phone.key);
    expect(shownColumns(hidden)).not.toContain(FIXED_COLUMNS.phone.key);
    const back = toggleColumn(hidden, FIXED_COLUMNS.phone.key);
    expect(shownColumns(back)).toEqual([...DEFAULT_COLUMNS]);
  });

  it('moves a column past its VISIBLE neighbour, not past a hidden one', () => {
    /* note is hidden and sits after lastActive in the order; moving lastActive
       down must land it after nothing, not swap it with something invisible. */
    const moved = moveColumn(DEFAULT_PREFERENCES, FIXED_COLUMNS.channel.key, -1);
    expect(shownColumns(moved)[0]).toBe(FIXED_COLUMNS.channel.key);
    expect(shownColumns(moved)[1]).toBe(PINNED_COLUMN);
  });

  it('refuses a move off either end', () => {
    expect(moveColumn(DEFAULT_PREFERENCES, PINNED_COLUMN, -1)).toBe(DEFAULT_PREFERENCES);
    const last = shownColumns(DEFAULT_PREFERENCES).at(-1) ?? '';
    expect(moveColumn(DEFAULT_PREFERENCES, last, 1)).toBe(DEFAULT_PREFERENCES);
    expect(moveColumn(DEFAULT_PREFERENCES, 'attr:nothing', 1)).toBe(DEFAULT_PREFERENCES);
  });

  it('drops a column at an index, which is what a drag hands back', () => {
    const dragged = reorderColumns(DEFAULT_PREFERENCES, FIXED_COLUMNS.lastActive.key, 0);
    expect(shownColumns(dragged)[0]).toBe(FIXED_COLUMNS.lastActive.key);
    expect(reorderColumns(DEFAULT_PREFERENCES, FIXED_COLUMNS.name.key, 0)).toBe(DEFAULT_PREFERENCES);
  });

  it('adds an attribute column visible, and forgets it completely on remove', () => {
    const added = addAttributeColumn(DEFAULT_PREFERENCES, 'city');
    expect(shownColumns(added)).toContain('attr:city');
    const sized = { ...added, widths: { 'attr:city': 200 } };
    const gone = removeAttributeColumn(sized, 'attr:city');
    expect(gone.order).not.toContain('attr:city');
    expect(gone.widths['attr:city']).toBeUndefined();
  });

  it('will not remove a fixed column, only hide one', () => {
    expect(removeAttributeColumn(DEFAULT_PREFERENCES, FIXED_COLUMNS.note.key)).toBe(DEFAULT_PREFERENCES);
  });

  it('un-hides an attribute already in the order instead of adding it twice', () => {
    const twice = addAttributeColumn(addAttributeColumn(DEFAULT_PREFERENCES, 'city'), 'city');
    expect(twice.order.filter((key) => key === 'attr:city')).toHaveLength(1);
  });
});

describe('columns handed over by the Fields surface', () => {
  it('reads the keys a link carries, spaces in a name and all', () => {
    expect(parseColumnParam('attr:Plan, attr:Home city ')).toEqual(['attr:Plan', 'attr:Home city']);
  });

  it('is empty for a link that carries nothing, rather than throwing', () => {
    expect(parseColumnParam(null)).toEqual([]);
    expect(parseColumnParam('')).toEqual([]);
    expect(parseColumnParam(',,  ,')).toEqual([]);
  });

  it('honours only attribute keys — a link may not hide a fixed column', () => {
    expect(parseColumnParam(`attr:Plan,${FIXED_COLUMNS.note.key},Plan,attr:`)).toEqual(['attr:Plan']);
  });

  it('never adds the same column twice, however the link repeats it', () => {
    expect(parseColumnParam('attr:Plan,attr:Plan')).toEqual(['attr:Plan']);
  });

  it('appends what is missing and leaves the chosen order alone', () => {
    const next = withParamColumns(DEFAULT_PREFERENCES, ['attr:Plan', 'attr:City']);
    expect(shownColumns(next).slice(0, DEFAULT_COLUMNS.length)).toEqual([...DEFAULT_COLUMNS]);
    expect(shownColumns(next).slice(-2)).toEqual(['attr:Plan', 'attr:City']);
  });

  it('un-hides a column that is already there but switched off', () => {
    const hidden = toggleColumn(addAttributeColumn(DEFAULT_PREFERENCES, 'Plan'), 'attr:Plan');
    expect(shownColumns(hidden)).not.toContain('attr:Plan');
    expect(shownColumns(withParamColumns(hidden, ['attr:Plan']))).toContain('attr:Plan');
  });

  it('returns the same object when there is nothing to do — the view folds this in an effect', () => {
    const already = withParamColumns(DEFAULT_PREFERENCES, ['attr:Plan']);
    expect(withParamColumns(already, ['attr:Plan'])).toBe(already);
    expect(withParamColumns(DEFAULT_PREFERENCES, [])).toBe(DEFAULT_PREFERENCES);
  });
});

describe('the saved-view payload', () => {
  it('round-trips through the shape a saved view stores', () => {
    const source = addAttributeColumn(DEFAULT_PREFERENCES, 'city');
    const withWidth = { ...source, widths: { 'fixed:name': 320 } };
    const stored = toColumnLayout(withWidth);
    expect(stored.columns).toEqual(withWidth.order);
    expect(applyColumnLayout(DEFAULT_PREFERENCES, stored)).toEqual(withWidth);
  });

  it('falls back silently on anything it cannot read', () => {
    expect(decodePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(decodePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
    expect(decodePreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(decodePreferences({ order: [] })).toEqual(DEFAULT_PREFERENCES);
    expect(decodePreferences({ order: ['made:up'] })).toEqual(DEFAULT_PREFERENCES);
  });

  it('puts the identity column back when a payload lost it', () => {
    const decoded = decodePreferences({ order: ['fixed:stage'], hidden: ['fixed:name'] });
    expect(decoded.order[0]).toBe(PINNED_COLUMN);
    expect(decoded.hidden).not.toContain(PINNED_COLUMN);
  });

  it('drops widths that are not usable numbers', () => {
    const decoded = decodePreferences({
      order: ['fixed:name', 'fixed:stage'],
      widths: { 'fixed:name': 0, 'fixed:stage': 'wide', 'attr:x': 120 },
    });
    expect(decoded.widths).toEqual({ 'attr:x': 120 });
  });

  it('leaves the table alone for a view that carries no columns at all', () => {
    const mine = addAttributeColumn(DEFAULT_PREFERENCES, 'city');
    expect(applyColumnLayout(mine, null)).toBe(mine);
    expect(applyColumnLayout(mine, undefined)).toBe(mine);
  });

  it('falls back to the default columns for a layout it cannot read', () => {
    expect(applyColumnLayout(DEFAULT_PREFERENCES, { columns: 'nope' })).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps an attribute column whose name has since left the catalog', () => {
    const decoded = decodePreferences({ order: ['fixed:name', 'attr:retired field'] });
    expect(decoded.order).toContain('attr:retired field');
  });
});

// ---------------------------------------------------------------------------

const catalog: CatalogLike = {
  entries: [
    { name: 'city', type: 'custom', dataType: AttributeDataType.String, usersCount: 7, defaultValue: null },
    { name: 'company', type: 'custom', dataType: AttributeDataType.String, usersCount: 4, defaultValue: null },
    { name: 'deal currency', type: 'custom', dataType: AttributeDataType.String, usersCount: 2, defaultValue: 'EUR' },
    { name: 'last seen', type: 'system', dataType: AttributeDataType.Datetime, usersCount: null, defaultValue: null },
  ],
};

describe('the column picker', () => {
  it('offers every fixed column first, then the catalog in its own order', () => {
    const entries = pickerEntries(DEFAULT_PREFERENCES, catalog);
    expect(entries.slice(0, 8).every((each) => each.kind === 'fixed')).toBe(true);
    expect(entries.filter((each) => each.kind === 'attribute').map((each) => each.label)).toEqual([
      'city',
      'company',
      'deal currency',
      'last seen',
    ]);
  });

  it('marks what is on screen and what cannot be hidden', () => {
    const entries = pickerEntries(DEFAULT_PREFERENCES, catalog);
    const name = entries.find((each) => each.key === PINNED_COLUMN);
    expect(name).toMatchObject({ shown: true, canHide: false, removable: false });
    expect(entries.find((each) => each.key === FIXED_COLUMNS.note.key)?.shown).toBe(false);
  });

  it('lists a chosen attribute the catalog no longer knows, so it can be removed', () => {
    const withGhost = addAttributeColumn(DEFAULT_PREFERENCES, 'retired');
    const entries = pickerEntries(withGhost, catalog);
    const ghost = entries.find((each) => each.label === 'retired');
    expect(ghost).toMatchObject({ shown: true, type: 'unknown', usersCount: null });
  });

  it('searches the label and the type', () => {
    const entries = pickerEntries(DEFAULT_PREFERENCES, catalog);
    expect(searchPicker(entries, 'comp').map((each) => each.label)).toEqual(['company']);
    expect(searchPicker(entries, '  ')).toHaveLength(entries.length);
    expect(searchPicker(entries, 'system').map((each) => each.label)).toEqual(['last seen']);
  });
});

describe('coverageNote', () => {
  const entries = pickerEntries(DEFAULT_PREFERENCES, catalog);
  const find = (label: string) => entries.find((each) => each.label === label)!;

  it('says nothing about a fixed column', () => {
    expect(coverageNote(find('Name'))).toBe('');
  });

  it('counts the contacts that carry the field', () => {
    expect(coverageNote(find('city'))).toBe('custom · string · 7 contacts');
    expect(coverageNote(find('company'))).toContain('4 contacts');
  });

  it('refuses to print a count a bot-wide default has made meaningless', () => {
    const note = coverageNote(find('deal currency'));
    expect(note).toContain('bot-wide default');
    expect(note).not.toContain('2 contacts');
  });

  it('never prints a null count as zero', () => {
    expect(coverageNote(find('last seen'))).toBe('system · datetime');
  });
});

describe('sorting', () => {
  const columns = [FIXED_COLUMNS.name, FIXED_COLUMNS.stage, attributeColumn('city', AttributeDataType.String)];

  it('marks the header the sort actually belongs to', () => {
    expect(sortStateFor({ name: 'city', direction: Sort.Desc }, columns)).toEqual({ key: 'attr:city', dir: 'desc' });
  });

  it('shows no arrow for a sort no column can carry, rather than the wrong arrow', () => {
    expect(sortStateFor({ name: 'renamed field', direction: Sort.Asc }, columns)).toBeNull();
    expect(sortStateFor(null, columns)).toBeNull();
  });

  it('turns a header click back into an attribute sort', () => {
    expect(sortFromState({ key: 'attr:city', dir: 'asc' }, columns)).toEqual({ name: 'city', direction: Sort.Asc });
  });

  it('clears the sort for a column the API cannot order by', () => {
    expect(sortFromState({ key: 'fixed:stage', dir: 'asc' }, columns)).toBeNull();
    expect(sortFromState({ key: 'nope', dir: 'asc' }, columns)).toBeNull();
    expect(sortFromState(null, columns)).toBeNull();
  });
});
