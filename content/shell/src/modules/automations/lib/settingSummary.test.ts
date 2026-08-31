import { describe, expect, it } from 'vitest';
import {
  FuelyCollectContactInfoEntryValidationErrorCode,
  FuelySettingCollectContactInfoHowToCollect,
  FuelySettingIncomingMessagesHowToReply,
  FuelySettingKeywordsReactTo,
  FuelySettingPublicReplyHowToReply,
} from '~api/generated/automations/graphql';
import {
  BOOKING_RULES_OPTIONS,
  CATALOG_IMAGES_OPTIONS,
  COLLECT_INFO_OPTIONS,
  count,
  FOLLOW_UPS_OPTIONS,
  HOW_TO_REPLY_OPTIONS,
  KEYWORDS_OPTIONS,
  PRIVATE_REPLY_OPTIONS,
  PUBLIC_REPLY_OPTIONS,
  SETTING_DESCRIPTIONS,
  SETTING_LABELS,
  SETTING_TITLES,
  summarizeSchedule,
  summarizeSetting,
  SWITCH_TO_HUMAN_OPTIONS,
  WHEN_AI_REPLIES_OPTIONS,
} from './settingSummary';

describe('SETTING_LABELS', () => {
  it('covers all 16 setting types', () => {
    expect(Object.keys(SETTING_LABELS)).toHaveLength(16);
  });
});

describe('count', () => {
  it('pluralizes, with an irregular override', () => {
    expect(count(1, 'rule')).toBe('1 rule');
    expect(count(2, 'rule')).toBe('2 rules');
    expect(count(2, 'story', 'stories')).toBe('2 stories');
  });
});

describe('summarizeSetting', () => {
  it('summarizes incoming messages with mode and prompt budget', () => {
    const summary = summarizeSetting({
      __typename: 'FuelySettingIncomingMessages',
      howToReply: FuelySettingIncomingMessagesHowToReply.UsingAi,
      messagePrompt: 'Hi!',
      inheritsFrom: null,
      canInheritFrom: [],
    });
    expect(summary.label).toBe('AI instructions');
    expect(summary.rows).toEqual(['Reply with AI', 'prompt 3/5000']);
  });

  it('summarizes message delays as on/off', () => {
    expect(
      summarizeSetting({
        __typename: 'FuelySettingMessageDelays',
        enabled: false,
        inheritsFrom: null,
        canInheritFrom: [],
      }).rows,
    ).toEqual(['Humanlike delays off']);
  });

  it('counts keywords next to the match mode', () => {
    const summary = summarizeSetting({
      __typename: 'FuelySettingKeywords',
      reactTo: FuelySettingKeywordsReactTo.CommentThatContains,
      keywords: ['drop', 'size'],
      inheritsFrom: null,
      canInheritFrom: [],
    });
    expect(summary.rows).toEqual(['Comment that contains…', '2 keywords']);
  });

  it('flags captures with validation warnings', () => {
    const summary = summarizeSetting({
      __typename: 'FuelySettingCollectContactInfo',
      howToCollect: FuelySettingCollectContactInfoHowToCollect.CollectInfo,
      captures: [
        { description: 'Name', validationErrors: [], attribute: null },
        {
          description: 'Email',
          validationErrors: [FuelyCollectContactInfoEntryValidationErrorCode.InvalidAttribute],
          attribute: null,
        },
      ],
      inheritsFrom: null,
      canInheritFrom: [],
    });
    expect(summary.rows).toEqual(['Collect info', '2 captures', '1 warning']);
  });

  it('mentions comment-liking on public reply only when on', () => {
    const setting = {
      __typename: 'FuelySettingPublicReply' as const,
      publicReplyHowToReply: FuelySettingPublicReplyHowToReply.ExactText,
      exactTextReply: 'Answered in DM!',
      messagePrompt: 'Short public reply.',
      likeContactComment: true,
      inheritsFrom: null,
      canInheritFrom: [],
    };
    expect(summarizeSetting(setting).rows).toEqual(['Reply with exact text', 'likes comments']);
    expect(summarizeSetting({ ...setting, likeContactComment: false }).rows).toEqual(['Reply with exact text']);
  });

  it('uses the irregular plural for stories', () => {
    expect(
      summarizeSetting({
        __typename: 'FuelySettingListOfStories',
        stories: [
          { storyID: 's1', contactScopeID: 'cs1' },
          { storyID: 's2', contactScopeID: 'cs2' },
        ],
        inheritsFrom: null,
        canInheritFrom: [],
      }).rows,
    ).toEqual(['2 stories']);
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

describe('SETTING_TITLES / SETTING_DESCRIPTIONS', () => {
  it('cover the same 16 typenames as SETTING_LABELS, in the product vocabulary', () => {
    expect(Object.keys(SETTING_TITLES).sort()).toEqual(Object.keys(SETTING_LABELS).sort());
    expect(Object.keys(SETTING_DESCRIPTIONS).sort()).toEqual(Object.keys(SETTING_LABELS).sort());
    expect(SETTING_TITLES.FuelySettingIncomingMessages).toBe('AI instructions');
    expect(SETTING_TITLES.FuelySettingCollectContactInfo).toBe('Lead qualification');
    expect(SETTING_TITLES.FuelySettingSendEventsToMeta).toBe('Send events to Meta');
  });
});

describe('enum option arrays', () => {
  it('list every enum member exactly once', () => {
    const values = (options: readonly { value: string }[]) => options.map((o) => o.value).sort();
    expect(values(HOW_TO_REPLY_OPTIONS)).toEqual(Object.values(FuelySettingIncomingMessagesHowToReply).sort());
    expect(values(KEYWORDS_OPTIONS)).toEqual(Object.values(FuelySettingKeywordsReactTo).sort());
    expect(values(PUBLIC_REPLY_OPTIONS)).toEqual(Object.values(FuelySettingPublicReplyHowToReply).sort());
    expect(values(COLLECT_INFO_OPTIONS)).toEqual(Object.values(FuelySettingCollectContactInfoHowToCollect).sort());
    expect(WHEN_AI_REPLIES_OPTIONS).toHaveLength(2);
    expect(CATALOG_IMAGES_OPTIONS).toHaveLength(3);
    expect(BOOKING_RULES_OPTIONS).toHaveLength(5);
    expect(SWITCH_TO_HUMAN_OPTIONS).toHaveLength(2);
    expect(FOLLOW_UPS_OPTIONS).toHaveLength(2);
    expect(PRIVATE_REPLY_OPTIONS).toHaveLength(3);
  });
  it('booking levels run least to most autonomous, then off, each with a description', () => {
    expect(BOOKING_RULES_OPTIONS.map((o) => o.value)).toEqual([
      'CollectIntents',
      'BookWithTeammatesApproval',
      'BookWithTeammatesReview',
      'BookWithFullAutonomy',
      'DontBook',
    ]);
    for (const option of BOOKING_RULES_OPTIONS) expect(option.description).toBeTruthy();
    for (const option of WHEN_AI_REPLIES_OPTIONS) expect(option.description).toBeTruthy();
  });
});

describe('summarizeSchedule', () => {
  const day = (d: string, enabled = true, start = '10:00', end = '19:00') => ({ day: d, enabled, start, end });
  it('collapses consecutive days with the same hours, Monday first', () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => day(d, d !== 'Sun'));
    expect(summarizeSchedule(days)).toBe('Mon–Sat 10:00–19:00');
  });
  it('splits runs when the hours change or a day is off', () => {
    const days = [
      day('Mon', true, '09:00', '18:00'),
      day('Tue', true, '09:00', '18:00'),
      day('Wed', false),
      day('Thu', true, '09:00', '18:00'),
      day('Sat', true, '10:00', '14:00'),
    ];
    expect(summarizeSchedule(days)).toBe('Mon–Tue 09:00–18:00, Thu 09:00–18:00, Sat 10:00–14:00');
  });
  it('is null when nothing is enabled or nothing is known', () => {
    expect(summarizeSchedule([day('Mon', false)])).toBeNull();
    expect(summarizeSchedule([])).toBeNull();
    expect(summarizeSchedule(null)).toBeNull();
  });
});
