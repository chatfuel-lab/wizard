import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealsTableRow } from '../types';
import { BOARD_BINDINGS } from './shortcuts';
import { stageForKey } from './stageKeys';
import { STAGES } from './stages';
import {
  TABLE_ROW_BINDINGS,
  actionTargets,
  dealLink,
  groupUndoMoves,
  isRestrictedRow,
  movableRows,
  pruneSelection,
  rowsFor,
  stageShortcutKey,
  undoableMoves,
  type StageChange,
} from './tableSelection';
import { undoEntryFor } from './undo';

const row = (id: string, stage: SalesStageV2 | null = SalesStageV2.New, typename = 'WidgetContact'): DealsTableRow =>
  ({ __typename: typename, id, name: id, salesStageV2: stage }) as DealsTableRow;

const index = (rows: DealsTableRow[]): Record<string, DealsTableRow> =>
  Object.fromEntries(rows.map((each) => [each.id, each]));

const ROWS = [
  row('a'),
  row('b', SalesStageV2.Won),
  row('locked', SalesStageV2.New, 'UnavailableContact'),
  row('c', null),
];
const BY_ID = index(ROWS);

describe('selectable rows', () => {
  it('recognises the locked placeholder a restricted contact renders as', () => {
    expect(isRestrictedRow(BY_ID.locked)).toBe(true);
    expect(isRestrictedRow(BY_ID.a)).toBe(false);
    expect(isRestrictedRow(undefined)).toBe(false);
  });

  it('prunes ids the table no longer holds, and restricted ones with them', () => {
    expect(pruneSelection(['a', 'gone', 'locked', 'b'], BY_ID)).toEqual(['a', 'b']);
  });

  it('keeps the order it was given, so display order survives', () => {
    expect(pruneSelection(['b', 'a'], BY_ID)).toEqual(['b', 'a']);
  });
});

describe('actionTargets', () => {
  it('acts on the whole selection when the row is part of it', () => {
    expect(actionTargets('a', ['a', 'b'], BY_ID)).toEqual(['a', 'b']);
  });

  it('acts on that row alone when it is outside the selection', () => {
    expect(actionTargets('c', ['a', 'b'], BY_ID)).toEqual(['c']);
  });

  it('drops a retired id out of the selection it returns', () => {
    expect(actionTargets('a', ['a', 'gone'], BY_ID)).toEqual(['a']);
  });

  it('refuses a restricted row and one the table does not hold', () => {
    expect(actionTargets('locked', ['locked'], BY_ID)).toEqual([]);
    expect(actionTargets('gone', [], BY_ID)).toEqual([]);
  });
});

describe('movableRows', () => {
  it('skips a row already in the target stage — the move would only re-stamp its age', () => {
    expect(movableRows(['a', 'b'], BY_ID, SalesStageV2.Won).map((each) => each.id)).toEqual(['a']);
  });

  it('moves a row that has no stage at all: the mutation sets one', () => {
    expect(movableRows(['c'], BY_ID, SalesStageV2.Won).map((each) => each.id)).toEqual(['c']);
  });

  it('never moves a restricted contact', () => {
    expect(movableRows(['locked'], BY_ID, SalesStageV2.Won)).toEqual([]);
    expect(rowsFor(['locked', 'a'], BY_ID).map((each) => each.id)).toEqual(['a']);
  });
});

describe('undo', () => {
  const moved: StageChange[] = [
    { row: row('a'), from: SalesStageV2.New },
    { row: row('c'), from: null },
    { row: row('d'), from: SalesStageV2.Sorting },
  ];

  it('leaves out a row that had no stage — there is no mutation that unsets one', () => {
    expect(undoableMoves(moved)).toEqual([
      { id: 'a', from: SalesStageV2.New },
      { id: 'd', from: SalesStageV2.Sorting },
    ]);
  });

  it('groups the way back by destination, because one call carries one stage', () => {
    const entry = undoEntryFor(undoableMoves(moved), SalesStageV2.Won, 0);
    expect(groupUndoMoves(entry!)).toEqual([
      { to: SalesStageV2.New, ids: ['a'] },
      { to: SalesStageV2.Sorting, ids: ['d'] },
    ]);
  });

  it('puts every row that came from one stage into one call', () => {
    const entry = undoEntryFor(
      [
        { id: 'a', from: SalesStageV2.New },
        { id: 'b', from: SalesStageV2.New },
      ],
      SalesStageV2.Won,
      0,
    );
    expect(groupUndoMoves(entry!)).toEqual([{ to: SalesStageV2.New, ids: ['a', 'b'] }]);
  });
});

describe('dealLink', () => {
  it('adds the module’s own deal key and leaves the rest of the URL alone', () => {
    expect(dealLink('https://app.example.com/deals?tab=x', 'c-1')).toBe('https://app.example.com/deals?tab=x&deal=c-1');
  });

  it('replaces a deal already in the link rather than stacking a second', () => {
    expect(dealLink('https://app.example.com/?deal=old', 'new')).toBe('https://app.example.com/?deal=new');
  });

  it('writes into the route the shell actually uses', () => {
    expect(dealLink('https://app.example.com/deals', 'c-1')).toBe('https://app.example.com/deals?deal=c-1');
    expect(dealLink('https://app.example.com/deals?deal=old', 'new')).toBe('https://app.example.com/deals?deal=new');
  });

  /* The view is a path segment, and a link to a deal opens the deal — the
     surface it was copied from is still the one behind it. */
  it('keeps the view segment it was copied from', () => {
    expect(dealLink('https://app.example.com/deals/table', 'c-1')).toBe('https://app.example.com/deals/table?deal=c-1');
  });

  it('leaves the host page’s own query string alone in an embed', () => {
    expect(dealLink('https://host.example.com/crm?tenant=7', 'c-1')).toBe(
      'https://host.example.com/crm?tenant=7&deal=c-1',
    );
  });
});

describe('row shortcuts', () => {
  it('takes its keys from BOARD_BINDINGS, so the ? sheet documents both views', () => {
    const boardKeys = new Map(BOARD_BINDINGS.map((binding) => [binding.id, binding.keys]));
    for (const binding of TABLE_ROW_BINDINGS) {
      expect(boardKeys.get(binding.id)).toBe(binding.keys);
    }
  });

  it('binds the six stage keys, both step keys and escape — and nothing else', () => {
    expect(TABLE_ROW_BINDINGS.map((binding) => binding.id)).toEqual([
      'stage1',
      'stage2',
      'stage3',
      'stage4',
      'stage5',
      'stage6',
      'stagePrev',
      'stageNext',
      'clear',
    ]);
  });

  it('leaves the movement and selection keys to DataTable’s rowNavigation', () => {
    const bound = new Set(TABLE_ROW_BINDINGS.map((binding) => binding.id));
    for (const id of ['focusUp', 'focusDown', 'open', 'toggleSelect', 'selectColumn']) {
      expect(bound.has(id as never)).toBe(false);
    }
  });

  it('hints exactly the key that sets that stage', () => {
    STAGES.forEach((stage, at) => {
      const key = stageShortcutKey(at);
      expect(key).not.toBeNull();
      expect(stageForKey(key as string, null)).toBe(stage);
    });
    expect(stageShortcutKey(STAGES.length)).toBeNull();
  });
});
