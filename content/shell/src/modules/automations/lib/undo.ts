/**
 * What "undo" can mean here.
 *
 * Undo is a COMPENSATING FORWARD MUTATION, never a revert: the previous value
 * written back (`applySettingUpdate`), the previous parent followed again
 * (`applySettingInherit`), the previous `enabled` / `name` set again, or — for
 * a delete — the rule re-created by name with the settings it owned (a NEW id;
 * the toast says so). One entry, not a stack: a deep history would promise an
 * ordering the server does not keep. Pure; the caller supplies the clock.
 */
import type { FuelyAutomationScope } from '~api/generated/automations/graphql';
import type { KnownSettingTypename, SettingUpdate } from '../types';

/** Enough to re-create a custom rule as it was: name, scope, enabled and what it owned. */
export interface AutomationSnapshot {
  id: string;
  scope: FuelyAutomationScope;
  name: string;
  enabled: boolean;
  /** Settings the rule OWNED (write shape) — inherited ones are re-inherited by the runner. */
  owned: SettingUpdate[];
  /** typename → parent id for the settings that followed a parent. */
  inherited: { typename: KnownSettingTypename; parentId: string }[];
}

export type UndoEntry =
  | { kind: 'enabled'; ids: string[]; from: Record<string, boolean>; to: boolean; at: number }
  | { kind: 'rename'; id: string; from: string; at: number }
  | {
      kind: 'setting';
      id: string;
      typename: KnownSettingTypename;
      /** What was there before: an owned value, or the parent it followed. */
      before: { update: SettingUpdate } | { inheritFrom: string };
      /** For the label. */
      what: 'edit' | 'revert' | 'inherit';
      at: number;
    }
  | { kind: 'delete'; snapshots: AutomationSnapshot[]; at: number }
  | { kind: 'create'; ids: string[]; what: 'duplicate' | 'template' | 'new'; at: number };

/** How long an entry stays offered. Past this the toast is gone anyway. */
export const UNDO_TTL_MS = 60_000;

export function undoLabel(entry: UndoEntry | null): string | null {
  if (!entry) return null;
  switch (entry.kind) {
    case 'enabled':
      return entry.ids.length === 1
        ? entry.to
          ? 'Undo turn on'
          : 'Undo turn off'
        : `Undo for ${entry.ids.length} rules`;
    case 'rename':
      return 'Undo rename';
    case 'setting':
      return entry.what === 'revert' ? 'Undo revert' : entry.what === 'inherit' ? 'Undo follow' : 'Undo change';
    case 'delete':
      return entry.snapshots.length === 1 ? 'Restore rule' : `Restore ${entry.snapshots.length} rules`;
    case 'create':
      return entry.what === 'duplicate' ? 'Undo duplicate' : entry.what === 'template' ? 'Undo create' : 'Undo create';
  }
}
