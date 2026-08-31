import { describe, expect, it } from 'vitest';
import { FuelyAutomationScope } from '~api/generated/automations/graphql';
import { undoLabel, type AutomationSnapshot, type UndoEntry } from './undo';

const snapshot = (id: string): AutomationSnapshot => ({
  id,
  scope: FuelyAutomationScope.InstagramDirectMessages,
  name: `Rule ${id}`,
  enabled: true,
  owned: [],
  inherited: [],
});

const setting = (what: 'edit' | 'revert' | 'inherit'): UndoEntry => ({
  kind: 'setting',
  id: 'a1',
  typename: 'FuelySettingKeywords',
  before: { inheritFrom: 'base1' },
  what,
  at: 0,
});

describe('undoLabel', () => {
  it('is null without an entry', () => {
    expect(undoLabel(null)).toBeNull();
  });

  it('names the direction of an enabled toggle, counts a bulk one', () => {
    expect(undoLabel({ kind: 'enabled', ids: ['a1'], from: { a1: false }, to: true, at: 0 })).toBe('Undo turn on');
    expect(undoLabel({ kind: 'enabled', ids: ['a1'], from: { a1: true }, to: false, at: 0 })).toBe('Undo turn off');
    expect(undoLabel({ kind: 'enabled', ids: ['a1', 'a2', 'a3'], from: {}, to: true, at: 0 })).toBe('Undo for 3 rules');
  });

  it('labels a rename', () => {
    expect(undoLabel({ kind: 'rename', id: 'a1', from: 'Old name', at: 0 })).toBe('Undo rename');
  });

  it('labels a setting entry by what happened', () => {
    expect(undoLabel(setting('edit'))).toBe('Undo change');
    expect(undoLabel(setting('revert'))).toBe('Undo revert');
    expect(undoLabel(setting('inherit'))).toBe('Undo follow');
  });

  it('offers restore for a delete, counting the rules', () => {
    expect(undoLabel({ kind: 'delete', snapshots: [snapshot('a1')], at: 0 })).toBe('Restore rule');
    expect(undoLabel({ kind: 'delete', snapshots: [snapshot('a1'), snapshot('a2')], at: 0 })).toBe('Restore 2 rules');
  });

  it('labels a create by how the rule was made', () => {
    expect(undoLabel({ kind: 'create', ids: ['a1'], what: 'duplicate', at: 0 })).toBe('Undo duplicate');
    expect(undoLabel({ kind: 'create', ids: ['a1'], what: 'template', at: 0 })).toBe('Undo create');
    expect(undoLabel({ kind: 'create', ids: ['a1'], what: 'new', at: 0 })).toBe('Undo create');
  });
});
