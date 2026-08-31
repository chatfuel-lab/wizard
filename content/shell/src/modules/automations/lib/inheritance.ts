/**
 * Inheritance, as the UI states it.
 *
 * The API says two things about a setting: `inheritsFrom` (the automation it
 * currently follows, or null when the value is owned here) and
 * `canInheritFrom` (the parents it MAY follow — read off the setting, never
 * derived; guide rule 6). Everything a reader sees about inheritance is a
 * function of those two and the value:
 *
 * - `follows`   — the value comes from a parent (chip "Follows Default").
 * - `own`       — the value is owned here and there IS a parent it could
 *                 follow (chip "Customized" + "Revert to Default").
 * - `fixed`     — nothing to inherit from: the All base's settings and every
 *                 filter setting (triggers belong to the rule).
 *
 * `differsFromParent` is a separate question from ownership: an owned value
 * can equal the parent's, and a Compare popover should say so.
 */
import type { AutomationRecord, AutomationRef, SettingInfo, SettingTypename } from '../types';
import { sameValue, settingOf } from './settingValue';

export type InheritanceState = 'follows' | 'own' | 'fixed';

export function inheritanceState(setting: SettingInfo): InheritanceState {
  if (setting.inheritsFrom) return 'follows';
  return setting.canInheritFrom.length > 0 ? 'own' : 'fixed';
}

/** The parents this setting may switch to, other than the one it follows now. */
export function inheritanceOptions(setting: SettingInfo): AutomationRef[] {
  const current = setting.inheritsFrom?.id ?? null;
  return setting.canInheritFrom.filter((ref) => ref.id !== current);
}

/**
 * The parent whose value would apply if this setting were reverted: the
 * scope base for a custom rule, the All base for a scope base. Null for
 * `fixed`. When a rule may follow both, the nearer parent (its own scope's
 * base) is the revert target — that is what "Revert to Default" means on a
 * rule: back to what every rule of this source does.
 */
export function revertTarget(setting: SettingInfo, ownScope: string): AutomationRef | null {
  if (setting.canInheritFrom.length === 0) return null;
  const nearer = setting.canInheritFrom.find((ref) => ref.scope === ownScope && ref.isBase);
  return nearer ?? setting.canInheritFrom[0]!;
}

export interface SettingDiff {
  typename: SettingTypename;
  state: InheritanceState;
  /** True when the local resolved value is not the parent's resolved value. */
  differsFromParent: boolean;
  /**
   * Whether the parent's own setting was there to compare against. False makes
   * `differsFromParent` mean "not known" rather than "the same" — the two read
   * alike as a boolean and are opposite answers to "is this customized".
   */
  parentKnown: boolean;
  parent: AutomationRef | null;
}

/**
 * Per inheritable setting: how it stands against the automation it would
 * revert to. `parents` maps id → record from the store; a parent that is not
 * loaded yet reads as "not different", with `parentKnown` false beside it so a
 * caller can tell that from a parent that was read and matched.
 */
export function resolvedDiff(
  record: AutomationRecord,
  parents: ReadonlyMap<string, AutomationRecord> | Record<string, AutomationRecord>,
): SettingDiff[] {
  const lookup = (id: string): AutomationRecord | undefined =>
    parents instanceof Map ? parents.get(id) : (parents as Record<string, AutomationRecord>)[id];
  return record.settings
    .filter((setting) => setting.canInheritFrom.length > 0 || setting.inheritsFrom)
    .map((setting) => {
      const state = inheritanceState(setting);
      const parent = setting.inheritsFrom ?? revertTarget(setting, record.scope);
      const parentRecord = parent ? lookup(parent.id) : undefined;
      const parentSetting = parentRecord ? settingOf(parentRecord.settings, setting.__typename) : undefined;
      const differsFromParent =
        state === 'own' && parentSetting !== undefined ? !sameValue(setting, parentSetting) : false;
      return {
        typename: setting.__typename,
        state,
        differsFromParent,
        parentKnown: parentSetting !== undefined,
        parent,
      };
    });
}

/**
 * How many settings this automation owns that differ from what it would revert
 * to — the rail's badge, and the count of what the scope header will show as
 * changed. A setting owned locally but holding the parent's own value is not
 * counted: the header renders it "same as Default", and a badge that counted
 * it sent the reader to a screen with nothing on it.
 *
 * A parent that is not loaded is counted, because nothing has said the values
 * agree. The header says "not loaded" for the same setting rather than
 * claiming sameness, so the two still tell one story.
 */
export function customizedCount(
  record: AutomationRecord,
  parents: ReadonlyMap<string, AutomationRecord> | Record<string, AutomationRecord>,
): number {
  return resolvedDiff(record, parents).filter((d) => d.state === 'own' && (!d.parentKnown || d.differsFromParent))
    .length;
}
