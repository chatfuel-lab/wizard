import { describe, expect, it } from 'vitest';
import { APPROVAL } from './samples';
import { durationText, priceText, summarizeArguments, summarizeBatch, type ApprovalTool } from './approval';

/* The live batch, read straight out of the frozen demo data so the assertions
   below are about the shape a real bot actually sends. */
const TOOLS = APPROVAL.tools as unknown as ApprovalTool[];
const CREATE = TOOLS[0]!;
const LIST = TOOLS[1]!;

describe('summarizeArguments over the live batch', () => {
  it('reads the create_service payload as what will exist afterwards', () => {
    expect(summarizeArguments(CREATE.toolID, CREATE.arguments, 'en-US')).toBe(
      '45-min Colour Consultation · 45 min · €80.00',
    );
  });

  it('says so plainly when the bot id is the only argument', () => {
    expect(summarizeArguments(LIST.toolID, LIST.arguments)).toBe('No inputs beyond this bot');
  });
});

describe('summarizeArguments, generically', () => {
  it('finds the identifying leaf however deep it sits', () => {
    const args = { botId: 'b', payload: { inner: { name: 'Spring promo' } } };
    expect(summarizeArguments('chatfuel_gql-create_thing', args)).toBe('Spring promo');
  });

  it('prefers a title to a name, whichever is shallower', () => {
    const args = { name: 'Wrapper', item: { title: 'The real one' } };
    expect(summarizeArguments('chatfuel_gql-create_thing', args)).toBe('The real one');
  });

  it('adds duration and price from the object the headline came from', () => {
    const args = {
      booking: { title: 'Cut & colour', durationSeconds: 5400, price: { amount: '120', currency: 'USD' } },
    };
    expect(summarizeArguments('chatfuel_gql-create_booking', args, 'en-US')).toBe(
      'Cut & colour · 1 h 30 min · $120.00',
    );
  });

  it('counts a non-empty list when there is nothing else to say', () => {
    const args = { segment: { name: 'VIPs', contacts: ['a', 'b', 'c'] } };
    expect(summarizeArguments('chatfuel_gql-update_segment', args)).toBe('VIPs · 3 contacts');
  });

  it('never returns a blank line for a shape it does not recognise', () => {
    const args = { botId: 'b', startTime: '2026-08-20T10:00:00Z', serviceId: 'svc_3' };
    expect(summarizeArguments('chatfuel_gql-create_booking', args)).toBe(
      'Start time: 2026-08-20T10:00:00Z · Service ID: svc_3',
    );
  });

  it('clips a headline somebody pasted an essay into', () => {
    const args = { title: 'x'.repeat(200) };
    const line = summarizeArguments('chatfuel_gql-create_thing', args);
    expect(line.length).toBeLessThanOrEqual(64);
    expect(line.endsWith('…')).toBe(true);
  });

  it('says nothing rather than lying when there is nothing at all', () => {
    expect(summarizeArguments('chatfuel_gql-list_all', {})).toBe('No inputs');
  });

  it('ignores the bot id at the root but not a nested key that merely looks like one', () => {
    expect(summarizeArguments('chatfuel_gql-list_x', { botID: 'bot-1' })).toBe('No inputs beyond this bot');
  });
});

describe('durationText', () => {
  it('writes a duration the way a person says one', () => {
    expect(durationText(2700)).toBe('45 min');
    expect(durationText(3600)).toBe('1 h');
    expect(durationText(5400)).toBe('1 h 30 min');
    expect(durationText(45)).toBe('45 s');
    expect(durationText(0)).toBe('');
  });
});

describe('priceText', () => {
  it('formats through Intl, and survives a currency Intl has never heard of', () => {
    expect(priceText('80.00', 'EUR', 'en-US')).toBe('€80.00');
    expect(priceText(0, 'EUR', 'en-US')).toBe('Free');
    expect(priceText('12', 'XYZZY', 'en-US')).toBe('12 XYZZY');
    expect(priceText('not a number', 'EUR', 'en-US')).toBe('not a number EUR');
  });
});

describe('summarizeBatch', () => {
  it('counts what the header has to say', () => {
    expect(summarizeBatch(TOOLS)).toEqual({ total: 2, needsApproval: 1, writes: 1, destructive: false });
  });

  it('goes destructive on one destructive tool, wherever it sits', () => {
    const batch: ApprovalTool[] = [
      { toolID: 'chatfuel_gql-list_contacts', arguments: {}, needsManualApprove: false },
      { toolID: 'chatfuel_gql-delete_contact', arguments: { id: 'c1' }, needsManualApprove: true },
    ];
    expect(summarizeBatch(batch)).toEqual({ total: 2, needsApproval: 1, writes: 1, destructive: true });
  });
});
