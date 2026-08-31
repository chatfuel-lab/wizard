import { describe, expect, it } from 'vitest';
import { Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import { ALL_PLATFORMS, EMPTY_FILTER, type ContactsFilter } from './contactsFilter';
import {
  WINDOW_PRESETS,
  describeChannels,
  describeConditions,
  describeDays,
  describeFilterCount,
  describeStages,
  describeWindow,
  matchWindowPreset,
  dateInputToValue,
  dateValueToInput,
  windowSince,
} from './filterLabels';

const NOW = Date.parse('2026-08-18T12:00:00.000Z');

describe('the last-message window', () => {
  it('says "Any time" when there is none', () => {
    expect(describeWindow(EMPTY_FILTER, NOW)).toBe('Any time');
  });

  it('names the preset it came from', () => {
    for (const preset of WINDOW_PRESETS) {
      const filter: ContactsFilter = { ...EMPTY_FILTER, since: windowSince(preset, NOW) };
      expect(matchWindowPreset(filter, NOW)?.id).toBe(preset.id);
      expect(describeWindow(filter, NOW)).toBe(preset.label);
    }
  });

  it('does not claim a preset for a hand-picked date', () => {
    const filter: ContactsFilter = { ...EMPTY_FILTER, since: '2026-01-02T00:00:00.000Z' };
    expect(matchWindowPreset(filter, NOW)).toBeNull();
    expect(describeWindow(filter, NOW)).toBe('Since Jan 2');
  });

  it('reads a closed range and a one-sided end', () => {
    expect(describeWindow({ ...EMPTY_FILTER, until: '2026-01-02T00:00:00.000Z' }, NOW)).toBe('Before Jan 2');
    expect(
      describeWindow({ ...EMPTY_FILTER, since: '2026-01-01T00:00:00.000Z', until: '2026-01-31T00:00:00.000Z' }, NOW),
    ).toBe('Jan 1 – Jan 31');
  });

  it('never claims a preset for a closed range', () => {
    const preset = WINDOW_PRESETS[1];
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      since: windowSince(preset, NOW),
      until: new Date(NOW).toISOString(),
    };
    expect(matchWindowPreset(filter, NOW)).toBeNull();
  });
});

describe('stages and channels', () => {
  it('reads an empty list as everything, the way the API does', () => {
    expect(describeStages([])).toBe('All stages');
    expect(describeChannels([])).toBe('All channels');
    expect(describeChannels([...ALL_PLATFORMS])).toBe('All channels');
  });

  it('names one and counts more', () => {
    expect(describeStages([SalesStageV2.WorkingOn])).toBe('Working on');
    expect(describeStages([SalesStageV2.Ready, SalesStageV2.Won])).toBe('2 stages');
    expect(describeChannels([Platform.Whatsapp])).toBe('WhatsApp');
    expect(describeChannels([Platform.Whatsapp, Platform.Widget])).toBe('2 channels');
  });
});

describe('days', () => {
  it('does not print "1 days"', () => {
    expect(describeDays(1)).toBe('1 day');
    expect(describeDays(7)).toBe('7 days');
  });
});

describe('the two counts the bar prints', () => {
  it('tells you what the empty builder does rather than counting nothing', () => {
    expect(describeConditions(0)).toBe('Add filter');
  });

  it('never says "Fields", which is a surface in this module, not a filter', () => {
    for (const count of [0, 1, 2, 20]) expect(describeConditions(count)).not.toMatch(/field/i);
  });

  it('does not print "1 conditions"', () => {
    expect(describeConditions(1)).toBe('1 condition');
    expect(describeConditions(3)).toBe('3 conditions');
  });

  it('prints no filter pill at all when nothing is filtered', () => {
    expect(describeFilterCount(0)).toBeNull();
  });

  it('does not print "1 filters"', () => {
    expect(describeFilterCount(1)).toBe('1 filter');
    expect(describeFilterCount(4)).toBe('4 filters');
  });
});

describe('the date editor', () => {
  it('reads both wire forms and writes only the millisecond one', () => {
    const at = Date.parse('2026-08-18T00:00:00.000Z');
    expect(dateValueToInput(String(at))).toBe(dateValueToInput('2026-08-18T00:00:00.000Z'));
    expect(dateInputToValue('2026-08-18')).toBe(String(at));
  });

  it('round-trips a date without drifting a day', () => {
    const input = '2026-03-01';
    expect(dateValueToInput(dateInputToValue(input))).toBe(input);
  });

  it('never renders NaN for a value that is not a date', () => {
    expect(dateValueToInput('soon')).toBe('');
    expect(dateValueToInput('   ')).toBe('');
    expect(dateInputToValue(null)).toBe('');
    expect(dateInputToValue('not a date')).toBe('');
  });
});
