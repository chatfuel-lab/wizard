import { describe, expect, it } from 'vitest';
import { Platform, type InboxFlowsListQuery } from '~api/generated/livechat/graphql';
import { flowOptions } from './flowPicker';

const flow = (id: string, name: string, platform: Platform) => ({
  __typename: 'RegularFlow' as const,
  id,
  name,
  platform,
});

const DATA: InboxFlowsListQuery = {
  bot: {
    id: 'bot-1',
    flowsWithoutGroup: [
      flow('f-wa-hello', 'Welcome', Platform.Whatsapp),
      flow('f-ig-hello', 'Welcome', Platform.Instagram),
    ],
    flowGroups: [
      {
        id: 'g-support',
        name: 'Support',
        flows: [flow('f-wa-faq', 'FAQ', Platform.Whatsapp), flow('f-widget-faq', 'FAQ', Platform.Widget)],
      },
      { id: 'g-empty', name: 'Archive', flows: [] },
      { id: 'g-sales', name: 'Sales', flows: [flow('f-wa-offer', 'Offer', Platform.Whatsapp)] },
    ],
  },
};

describe('flowOptions', () => {
  it('offers only the flows that run on the conversation platform', () => {
    // The fragment comment says why: an Instagram flow handed a WhatsApp
    // conversation is a refusal from the server after the confirmation.
    expect(flowOptions(DATA, Platform.Whatsapp).map((option) => option.id)).toEqual([
      'f-wa-hello',
      'f-wa-faq',
      'f-wa-offer',
    ]);
    expect(flowOptions(DATA, Platform.Widget).map((option) => option.id)).toEqual(['f-widget-faq']);
    expect(flowOptions(DATA, Platform.Tiktok)).toEqual([]);
  });

  it('flattens both buckets, ungrouped first, and keeps the group as the description', () => {
    expect(flowOptions(DATA, Platform.Whatsapp)).toEqual([
      { id: 'f-wa-hello', name: 'Welcome', group: null },
      { id: 'f-wa-faq', name: 'FAQ', group: 'Support' },
      { id: 'f-wa-offer', name: 'Offer', group: 'Sales' },
    ]);
  });

  it('is empty before the list has loaded', () => {
    expect(flowOptions(null, Platform.Whatsapp)).toEqual([]);
  });
});
