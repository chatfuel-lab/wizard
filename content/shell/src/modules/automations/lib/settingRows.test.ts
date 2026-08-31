import { describe, expect, it } from 'vitest';
import { AUTOMATIONS } from './samples';
import type { AutomationRecord } from '../types';
import {
  collapsedSummary,
  followsLabel,
  inheritanceChip,
  parentShortLabel,
  settingRow,
  settingRowGroups,
  settingRowsOf,
} from './settingRows';

const record = (id: string): AutomationRecord => structuredClone(AUTOMATIONS.get(id)!) as unknown as AutomationRecord;
const find = (r: AutomationRecord, typename: string) => r.settings.find((s) => s.__typename === typename)!;

describe('inheritanceChip / followsLabel', () => {
  it('says "Follows Default" for a scope base following the All base', () => {
    const chip = inheritanceChip(find(record('auto-InstagramPostComments-base'), 'FuelySettingBookingRules'));
    expect(chip).toEqual({ label: 'Follows Default', tone: 'accent' });
  });
  it('names the source when a rule follows its scope base', () => {
    const chip = inheritanceChip(find(record('rule-spring-posts'), 'FuelySettingPublicReply'));
    expect(chip).toEqual({ label: 'Follows Instagram · Post comments default', tone: 'accent' });
  });
  it('is "Customized" for an owned inheritable value and nothing for a fixed one', () => {
    expect(inheritanceChip(find(record('rule-spring-posts'), 'FuelySettingIncomingMessages'))).toEqual({
      label: 'Customized',
      tone: 'neutral',
    });
    expect(inheritanceChip(find(record('rule-spring-posts'), 'FuelySettingKeywords'))).toBeNull();
    expect(inheritanceChip(find(record('auto-all-base'), 'FuelySettingIncomingMessages'))).toBeNull();
  });
  it('labels a parent in the product words', () => {
    expect(followsLabel({ id: 'x', scope: 'All', isBase: true, name: null, enabled: true } as never)).toBe(
      'Follows Default',
    );
    expect(
      parentShortLabel({ id: 'x', scope: 'WhatsAppDirectMessages', isBase: true, name: null, enabled: true } as never),
    ).toBe('WhatsApp · Direct messages default');
  });
});

describe('settingRow', () => {
  it('carries the key, the title, the description, the one-liner and the state', () => {
    const row = settingRow(find(record('auto-all-base'), 'FuelySettingIncomingMessages'));
    expect(row.key).toBe('incomingMessages');
    expect(row.title).toBe('AI instructions');
    expect(row.description).toContain('AI');
    expect(row.summary).toMatch(/^Reply with AI · prompt \d+\/5000$/);
    expect(row.state).toBe('fixed');
    expect(row.chip).toBeNull();
  });
  it('gives an unknown typename a row with no key and the "managed" summary', () => {
    const row = settingRow(find(record('auto-WhatsAppDirectMessages-base'), 'FuelySettingSendEventsToMeta'));
    expect(row.key).toBeNull();
    expect(row.title).toBe('Send events to Meta');
    expect(collapsedSummary(row.setting)).toBe('Managed in the Chatfuel dashboard');
  });
});

describe('settingRowGroups', () => {
  it('groups a base by behaviour in BEHAVIOR_GROUPS order, without a Triggers group', () => {
    const groups = settingRowGroups(record('auto-all-base'));
    expect(groups.map((g) => g.group.id)).toEqual(['replying', 'sales', 'people']);
    expect(groups[0]!.rows.map((r) => r.typename)).toEqual([
      'FuelySettingIncomingMessages',
      'FuelySettingWhenAIReplies',
      'FuelySettingMessageDelays',
    ]);
  });
  it('puts a rule’s triggers first and its comment replies in their own group', () => {
    const groups = settingRowGroups(record('rule-spring-posts'));
    expect(groups.map((g) => g.group.id)).toEqual(['triggers', 'replying', 'comments', 'sales', 'people']);
    expect(groups[0]!.rows.map((r) => r.typename)).toEqual(['FuelySettingKeywords', 'FuelySettingListOfPosts']);
    expect(groups[2]!.rows.map((r) => r.typename)).toEqual(['FuelySettingPublicReply', 'FuelySettingPrivateReply']);
  });
  it('lands the unknown typename in an "Other" group, last', () => {
    const groups = settingRowGroups(record('auto-WhatsAppDirectMessages-base'));
    const last = groups[groups.length - 1]!;
    expect(last.group.label).toBe('Other');
    expect(last.rows.map((r) => r.typename)).toEqual(['FuelySettingSendEventsToMeta']);
  });
  it('flattens to every setting exactly once', () => {
    const r = record('rule-spring-posts');
    expect(
      settingRowsOf(r)
        .map((row) => row.typename)
        .sort(),
    ).toEqual(r.settings.map((s) => s.__typename).sort());
  });
});
