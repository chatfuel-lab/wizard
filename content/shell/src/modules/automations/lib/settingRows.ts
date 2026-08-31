/**
 * What a card shows for its settings — pure, so the Default card and the rule
 * card render the same rows the same way and a test can say so without a DOM.
 *
 * A card is a list of behaviour groups (`BEHAVIOR_GROUPS` order, Triggers
 * first for a rule); a group is a list of rows; a row is one setting with its
 * `?setting=` key, its title, its collapsed one-liner and its inheritance
 * chip. Whether a row is EDITABLE here (`editorFor` in the registry) is the
 * DOM's question, not this file's — an unknown typename still gets a row,
 * with the summary the API-side default arm gives it.
 */
import { settingKeyOf, type SettingKey } from './automationsParams';
import { inheritanceState, type InheritanceState } from './inheritance';
import { groupSettings, scopeLabel, type BehaviorGroup } from './scopes';
import { SETTING_DESCRIPTIONS, SETTING_TITLES, summarizeSetting } from './settingSummary';
import { settingOf } from './settingValue';
import type { AutomationRecord, AutomationRef, SettingInfo, SettingTypename } from '../types';

export interface InheritanceChip {
  /** "Follows Default" · "Follows Instagram · Post comments default" · "Customized". */
  label: string;
  tone: 'accent' | 'neutral';
}

/**
 * The chip beside a setting title. `follows` names the parent in the
 * product's words ("Default" for the All base, "<source> default" for a scope
 * base); `own` is "Customized"; `fixed` (the All base's own settings, every
 * filter setting) has nothing to say.
 */
export function inheritanceChip(setting: SettingInfo): InheritanceChip | null {
  const state = inheritanceState(setting);
  if (state === 'follows' && setting.inheritsFrom) return { label: followsLabel(setting.inheritsFrom), tone: 'accent' };
  if (state === 'own') return { label: 'Customized', tone: 'neutral' };
  return null;
}

/** "Follows Default" / "Follows Instagram · Post comments default". */
export function followsLabel(parent: AutomationRef): string {
  return parent.scope === 'All' ? 'Follows Default' : `Follows ${scopeLabel(parent.scope)} default`;
}

/** The short name of a parent as a revert target: "Default" / "Instagram · Post comments default". */
export function parentShortLabel(parent: AutomationRef): string {
  return parent.scope === 'All' ? 'Default' : `${scopeLabel(parent.scope)} default`;
}

export interface SettingRow {
  setting: SettingInfo;
  typename: SettingTypename;
  /** `?setting=` key, or null for a typename the module does not edit. */
  key: SettingKey | null;
  title: string;
  description: string;
  /** The collapsed one-liner: `summarizeSetting(setting).rows.join(' · ')`. */
  summary: string;
  state: InheritanceState;
  chip: InheritanceChip | null;
}

export interface SettingRowGroup {
  group: BehaviorGroup;
  rows: SettingRow[];
}

/** One-line collapsed summary of a setting. */
export const collapsedSummary = (setting: SettingInfo): string => summarizeSetting(setting).rows.join(' · ');

export function settingRow(setting: SettingInfo): SettingRow {
  return {
    setting,
    typename: setting.__typename,
    key: settingKeyOf(setting.__typename),
    title: SETTING_TITLES[setting.__typename],
    description: SETTING_DESCRIPTIONS[setting.__typename],
    summary: collapsedSummary(setting),
    state: inheritanceState(setting),
    chip: inheritanceChip(setting),
  };
}

/** The card's rows, grouped by behaviour (`groupSettings`); an unknown typename lands in "Other", last. */
export function settingRowGroups(record: Pick<AutomationRecord, 'settings'>): SettingRowGroup[] {
  return groupSettings(record.settings).map(({ group, settings }) => ({
    group,
    rows: settings
      .map((typename) => settingOf(record.settings, typename))
      .filter((setting): setting is SettingInfo => setting !== undefined)
      .map(settingRow),
  }));
}

/** Every row flat, card order — what the compare popover iterates. */
export function settingRowsOf(record: Pick<AutomationRecord, 'settings'>): SettingRow[] {
  return settingRowGroups(record).flatMap((g) => g.rows);
}
