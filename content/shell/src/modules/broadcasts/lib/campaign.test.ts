import { describe, expect, it } from 'vitest';
import { BroadcastRepeatType, BroadcastStatus, WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { campaignOf, canGoLive, isCampaignFlow, sortCampaigns } from './campaign';
import { sampleFlow, sampleTemplateConfig } from './samples';

const NOW = Date.parse('2026-09-07T12:00:00Z');
const FUTURE = '2030-01-06T07:00:00Z';
const PAST = '2020-01-01T00:00:00Z';

describe('what counts as a campaign', () => {
  it('is a flow with a one-time or scheduled entry point', () => {
    expect(isCampaignFlow(sampleFlow({ kind: 'now' }))).toBe(true);
    expect(isCampaignFlow(sampleFlow({ kind: 'scheduled' }))).toBe(true);
  });

  it('is not a chatbot flow', () => {
    const flow = sampleFlow();
    const chatbot = { ...flow, blocks: flow.blocks.filter((block) => block.__typename === 'WhatsAppTemplateBlock') };
    expect(isCampaignFlow(chatbot)).toBe(false);
    expect(campaignOf(chatbot, NOW)).toBeNull();
  });
});

describe('status, as the live API behaves', () => {
  it.each([
    ['one-time Draft', 'now', BroadcastStatus.Draft, true, 'draft'],
    ['one-time Live', 'now', BroadcastStatus.Live, true, 'sending'],
    ['one-time Finished', 'now', BroadcastStatus.Finished, true, 'sent'],
    ['scheduled Draft, disarmed', 'scheduled', BroadcastStatus.Draft, false, 'draft'],
    ['scheduled Live, armed', 'scheduled', BroadcastStatus.Live, true, 'scheduled'],
    ['scheduled Finished', 'scheduled', BroadcastStatus.Finished, false, 'sent'],
    ['scheduled disarmed after arming', 'scheduled', BroadcastStatus.Draft, false, 'draft'],
  ] as const)('%s → %s', (_label, kind, status, enabled, expected) => {
    const record = campaignOf(sampleFlow({ kind, enabled, settings: { status } }), NOW);
    expect(record?.status).toBe(expected);
  });

  it('calls an armed one-shot whose time has come "sending"', () => {
    const flow = sampleFlow({ enabled: true, settings: { status: BroadcastStatus.Live, firstSendTime: PAST } });
    expect(campaignOf(flow, NOW)?.status).toBe('sending');
  });

  it('never calls a one-time campaign paused', () => {
    expect(campaignOf(sampleFlow({ kind: 'now', settings: { status: BroadcastStatus.Paused } }), NOW)?.status).toBe(
      'draft',
    );
  });
});

describe('kind', () => {
  it('reads the repeat type', () => {
    expect(campaignOf(sampleFlow({ kind: 'now' }), NOW)?.kind).toBe('now');
    expect(campaignOf(sampleFlow(), NOW)?.kind).toBe('later');
    expect(
      campaignOf(sampleFlow({ settings: { repeatType: BroadcastRepeatType.Weekdays, repeatOnWeekdays: [] } }), NOW)
        ?.kind,
    ).toBe('recurring');
  });
});

describe('the payload block', () => {
  it('is the one the entry point connects to', () => {
    const record = campaignOf(sampleFlow(), NOW);
    expect(record?.payload?.blockId).toBe('blk-template');
    expect(record?.payload?.template?.name).toBe('spring_sale');
  });

  it('is missed, and said so, when the flow lost it', () => {
    const record = campaignOf(sampleFlow({ withoutPayload: true }), NOW);
    expect(record?.payload).toBeNull();
    expect(record?.problems.map((problem) => problem.code)).toContain('no_payload');
  });
});

describe('problems', () => {
  it('gathers both elements verdicts, with the parameter they name', () => {
    const flow = sampleFlow({
      settings: {
        errors: [{ __typename: 'ComponentValidationError', code: 'start_time_cannot_be_in_past', message: '' }],
      },
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
    const record = campaignOf(flow, NOW);
    expect(record?.problems).toEqual([
      { code: 'start_time_cannot_be_in_past', paramName: null, buttonId: null },
      { code: 'body_text_param_value_required', paramName: '1', buttonId: null },
    ]);
    expect(record ? canGoLive(record) : null).toBe(false);
  });

  it('flags a template that is no longer approved', () => {
    const flow = sampleFlow({
      template: { whatsAppTemplate: sampleTemplateConfig({ status: WhatsAppTemplateStatus.Paused }) },
    });
    expect(campaignOf(flow, NOW)?.problems.map((problem) => problem.code)).toContain('TemplateNotAllowedForProcessing');
  });

  it('is empty on a complete draft, which may go live', () => {
    const record = campaignOf(sampleFlow({ settings: { firstSendTime: FUTURE } }), NOW);
    expect(record?.problems).toEqual([]);
    expect(record ? canGoLive(record) : null).toBe(true);
  });
});

describe('the next run', () => {
  it('is the first send for an armed one-shot', () => {
    const record = campaignOf(
      sampleFlow({ enabled: true, settings: { status: BroadcastStatus.Live, firstSendTime: FUTURE } }),
      NOW,
    );
    expect(record?.nextRunAt).toBe(Date.parse(FUTURE));
  });

  it('is nothing for a draft or a sent campaign', () => {
    expect(campaignOf(sampleFlow(), NOW)?.nextRunAt).toBeNull();
    expect(
      campaignOf(sampleFlow({ kind: 'now', settings: { status: BroadcastStatus.Finished } }), NOW)?.nextRunAt,
    ).toBeNull();
  });
});

describe('the recipients count', () => {
  it('is read off a one-time element only', () => {
    const sent = campaignOf(
      sampleFlow({ kind: 'now', settings: { status: BroadcastStatus.Finished, sentToContactsCount: 403 } }),
      NOW,
    );
    expect(sent?.sentToContactsCount).toBe(403);
    expect(campaignOf(sampleFlow(), NOW)?.sentToContactsCount).toBeNull();
  });
});

describe('order', () => {
  it('reads newest first', () => {
    const older = campaignOf(sampleFlow({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }), NOW);
    const newer = campaignOf(sampleFlow({ id: 'b', createdAt: '2026-06-01T00:00:00Z' }), NOW);
    expect(sortCampaigns([older!, newer!]).map((record) => record.flowId)).toEqual(['b', 'a']);
  });
});
