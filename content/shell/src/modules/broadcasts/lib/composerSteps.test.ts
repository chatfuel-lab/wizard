import { describe, expect, it } from 'vitest';
import { BroadcastRepeatType, Weekday, WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { campaignOf } from './campaign';
import {
  firstInvalidStep,
  isNamed,
  planScheduleWrites,
  scheduleDraftOf,
  stepStatus,
  stepValid,
  verdictsByStep,
} from './composerSteps';
import { sampleFlow, sampleTemplateConfig } from './samples';

const NOW = Date.parse('2026-09-07T12:00:00Z');

const record = (options: Parameters<typeof sampleFlow>[0] = {}) => campaignOf(sampleFlow(options), NOW)!;

describe('the first step that is not done', () => {
  it('is the name while the draft still carries the placeholder name', () => {
    expect(firstInvalidStep(record({ name: 'Untitled campaign' }), NOW)).toBe('name');
    expect(isNamed('  ')).toBe(false);
    expect(isNamed('Spring sale')).toBe(true);
  });

  it('is the message while no template is picked', () => {
    expect(
      firstInvalidStep(
        record({
          template: {
            whatsAppTemplate: null,
            errors: [{ __typename: 'ComponentValidationError', code: 'template_required', message: '' }],
          },
        }),
        NOW,
      ),
    ).toBe('message');
  });

  it('is the message while a parameter is empty', () => {
    const draft = record({
      template: {
        errors: [
          {
            __typename: 'WhatsAppTemplateParamValueRequiredError',
            code: 'body_text_param_value_required',
            message: '',
            paramName: '1',
          },
        ],
      },
    });
    expect(firstInvalidStep(draft, NOW)).toBe('message');
  });

  it('is the message when the picked template is no longer approved', () => {
    const draft = record({
      template: { whatsAppTemplate: sampleTemplateConfig({ status: WhatsAppTemplateStatus.Paused }) },
    });
    expect(stepValid(draft, 'message', NOW)).toBe(false);
    expect(firstInvalidStep(draft, NOW)).toBe('message');
  });

  it('is the audience while the segment has an error', () => {
    const draft = record({
      settings: {
        errors: [{ __typename: 'ComponentValidationError', code: 'segment_set_is_invalid', message: '' }],
        segmentErrors: [{ filterID: 'f1', code: 'attr_filter_attr_name_required' as never }],
      },
    });
    expect(firstInvalidStep(draft, NOW)).toBe('audience');
  });

  it('is the schedule when a one-shot first send has passed, even before the server says so', () => {
    const draft = record({ settings: { firstSendTime: '2026-09-07T11:00:00Z' } });
    expect(stepValid(draft, 'schedule', NOW)).toBe(false);
    expect(firstInvalidStep(draft, NOW)).toBe('schedule');
  });

  it('is the schedule while a repeat has no days', () => {
    const draft = record({
      settings: {
        repeatType: BroadcastRepeatType.Weekdays,
        errors: [{ __typename: 'ComponentValidationError', code: 'weekdays_are_empty', message: '' }],
      },
    });
    expect(firstInvalidStep(draft, NOW)).toBe('schedule');
  });

  it('skips the schedule for a one-time draft and lands on the review when all is done', () => {
    expect(stepValid(record({ kind: 'now' }), 'schedule', NOW)).toBe(true);
    expect(firstInvalidStep(record({ kind: 'now' }), NOW)).toBe('review');
    expect(firstInvalidStep(record(), NOW)).toBe('review');
  });
});

describe('the stepper marks', () => {
  it('shows the open step as current, done ones as complete, and a verdict as an error wherever it sits', () => {
    const draft = record({
      settings: { firstSendTime: '2026-09-07T11:00:00Z' },
      template: {
        errors: [
          {
            __typename: 'WhatsAppTemplateParamValueRequiredError',
            code: 'body_text_param_value_required',
            message: '',
            paramName: '1',
          },
        ],
      },
    });
    expect(stepStatus(draft, 'name', 'audience', NOW)).toBe('complete');
    expect(stepStatus(draft, 'message', 'audience', NOW)).toBe('error');
    expect(stepStatus(draft, 'audience', 'audience', NOW)).toBe('current');
    // A stale time is not a verdict yet — it is simply not done.
    expect(stepStatus(draft, 'schedule', 'audience', NOW)).toBe('upcoming');
    expect(stepStatus(draft, 'review', 'audience', NOW)).toBe('upcoming');
  });
});

describe('the review’s list of what is missing', () => {
  it('groups every verdict under the step that fixes it, the flow’s own last', () => {
    const draft = record({
      withoutPayload: true,
      settings: {
        errors: [{ __typename: 'ComponentValidationError', code: 'start_time_cannot_be_in_past', message: '' }],
      },
    });
    expect(verdictsByStep(draft)).toEqual([
      { step: 'schedule', sentences: ['The send time has passed'] },
      { step: null, sentences: ['The campaign has no message'] },
    ]);
  });

  it('is empty for a finished draft', () => {
    expect(verdictsByStep(record())).toEqual([]);
  });
});

describe('the schedule step’s writes', () => {
  const ZONE = 'Asia/Tokyo';
  // Stored: Tuesday 01:00 Tokyo = Monday 16:00 UTC, repeating on Tokyo's Tuesday (stored as UTC Monday).
  const stored = { repeat: 'weekdays' as const, at: Date.parse('2030-01-07T16:00:00Z'), weekdays: [Weekday.Mon] };

  it('opens the stored schedule in the display zone, weekdays as the person picked them', () => {
    expect(scheduleDraftOf(stored, ZONE)).toEqual({
      dayKey: '2030-01-08',
      minuteOfDay: 60,
      repeat: 'weekdays',
      weekdays: [Weekday.Tue],
      everyNDays: 1,
      dates: [],
    });
  });

  it('writes nothing when nothing changed', () => {
    expect(planScheduleWrites(stored, stored.weekdays, scheduleDraftOf(stored, ZONE), ZONE).writes).toEqual([]);
  });

  it('writes the repeat type, then its list, then the first send time last with the corrected days', () => {
    const draft = { ...scheduleDraftOf(stored, ZONE), minuteOfDay: 12 * 60, weekdays: [Weekday.Tue, Weekday.Fri] };
    const { at, writes } = planScheduleWrites(stored, stored.weekdays, draft, ZONE);
    // Noon Tokyo is 03:00 UTC the same day: no shift, the days go as picked.
    expect(new Date(at).toISOString()).toBe('2030-01-08T03:00:00.000Z');
    expect(writes).toEqual([
      { kind: 'weekdays', weekdays: [Weekday.Tue, Weekday.Fri] },
      {
        kind: 'firstSendTime',
        firstSendTime: '2030-01-08T03:00:00.000Z',
        correctedWeekdays: [Weekday.Tue, Weekday.Fri],
      },
    ]);
  });

  it('sends the stored list with a time change even when the repeat is not weekdays', () => {
    const once = { repeat: 'once' as const, at: stored.at };
    const draft = { ...scheduleDraftOf(once, ZONE), dayKey: '2030-01-09' };
    const { writes } = planScheduleWrites(once, [Weekday.Mon], draft, ZONE);
    expect(writes).toEqual([
      { kind: 'firstSendTime', firstSendTime: '2030-01-08T16:00:00.000Z', correctedWeekdays: [Weekday.Mon] },
    ]);
  });

  it('caps every N days and turns picked days into instants at the send time', () => {
    const once = { repeat: 'once' as const, at: stored.at };
    const every = planScheduleWrites(
      once,
      [],
      { ...scheduleDraftOf(once, ZONE), repeat: 'everyNDays', everyNDays: 9000 },
      ZONE,
    );
    expect(every.writes).toEqual([
      { kind: 'repeatType', repeatType: BroadcastRepeatType.EveryNDays },
      { kind: 'everyNDays', everyNDays: 365 },
    ]);
    const dates = planScheduleWrites(
      once,
      [],
      { ...scheduleDraftOf(once, ZONE), repeat: 'dates', dates: ['2030-02-02', '2030-02-01'] },
      ZONE,
    );
    expect(dates.writes).toEqual([
      { kind: 'repeatType', repeatType: BroadcastRepeatType.OnCertainDates },
      { kind: 'dates', dates: ['2030-01-31T16:00:00.000Z', '2030-02-01T16:00:00.000Z'] },
    ]);
  });
});
