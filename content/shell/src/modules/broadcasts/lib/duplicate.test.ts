import { describe, expect, it } from 'vitest';
import { BroadcastRepeatType, Weekday } from '~api/generated/broadcasts/graphql';
import type { SegmentRead } from '../types';
import { copyName, recurrenceReplay, replayPlan, segmentToInput } from './duplicate';
import { sampleSegment, sampleTemplateConfig } from './samples';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const attr = (name: string) => ({ name, type: 'custom' as never, dataType: 'String' as never });

const stored = (): SegmentRead =>
  sampleSegment({
    id: 'source-segment',
    name: 'Buyers',
    resultOperator: 'OR' as SegmentRead['resultOperator'],
    filters: [
      {
        id: 'source-filter-1',
        byAttribute: {
          attribute: attr('main_goal'),
          defaultStrategy: { operator: 'IS' as never, comparableValues: ['sales'] },
          dateStrategy: null,
        },
        byTag: null,
        byStoredSegment: null,
        byInFlightSegment: null,
      },
      {
        id: 'source-filter-2',
        byAttribute: null,
        byTag: { operator: 'IS' as never, tagNames: ['vip'] },
        byStoredSegment: null,
        byInFlightSegment: null,
      },
      {
        id: 'source-filter-3',
        byAttribute: {
          attribute: attr('signed up'),
          defaultStrategy: null,
          dateStrategy: { operator: 'GT' as never, comparableDate: '2026-01-01T00:00:00Z' },
        },
        byTag: null,
        byStoredSegment: null,
        byInFlightSegment: null,
      },
      {
        id: 'source-filter-4',
        byAttribute: null,
        byTag: null,
        byStoredSegment: null,
        byInFlightSegment: {
          id: 'source-nested',
          name: null,
          resultOperator: 'AND' as SegmentRead['resultOperator'],
          filters: [
            {
              id: 'source-nested-1',
              byAttribute: {
                attribute: attr('lng'),
                defaultStrategy: { operator: 'IS_NOT_EMPTY' as never, comparableValues: [] },
                dateStrategy: null,
              },
              byTag: null,
              byStoredSegment: null,
            },
          ],
        },
      },
    ],
  });

describe('a stored segment as the input the server takes', () => {
  it('names the attribute, keeps the default strategy and the operator, and nests one level', () => {
    const input = segmentToInput(stored(), 'broadcasts/flow-2');
    expect(input.name).toBe('Buyers');
    expect(input.resultOperator).toBe('OR');
    expect(input.filters).toHaveLength(2);
    expect(input.filters[0]?.byAttribute).toEqual({
      name: 'main_goal',
      defaultStrategy: { operator: 'IS', comparableValues: ['sales'] },
    });
    expect(input.filters[1]?.byInFlightSegment?.filters[0]?.byAttribute).toEqual({
      name: 'lng',
      defaultStrategy: { operator: 'IS_NOT_EMPTY', comparableValues: [] },
    });
  });

  it('drops tag, stored-segment and date-strategy filters — they fail on the wire', () => {
    const input = segmentToInput(stored(), 'broadcasts/flow-2');
    const kinds = input.filters.map((filter) =>
      Object.keys(filter)
        .filter((key) => key !== 'id')
        .join(),
    );
    expect(kinds).toEqual(['byAttribute', 'byInFlightSegment']);
  });

  it('mints fresh UUIDs that are stable for one scope and never the source ids', () => {
    const first = segmentToInput(stored(), 'broadcasts/flow-2');
    const again = segmentToInput(stored(), 'broadcasts/flow-2');
    const other = segmentToInput(stored(), 'broadcasts/flow-3');
    expect(first).toEqual(again);
    expect(first.id).not.toBe(other.id);
    const ids = [first.id, ...first.filters.map((filter) => filter.id), first.filters[1]!.byInFlightSegment!.id];
    for (const id of ids) {
      expect(id).toMatch(UUID);
      expect(id.startsWith('source')).toBe(false);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('turns the default segment into an empty filter list, which needs no write', () => {
    expect(segmentToInput(sampleSegment(), 'broadcasts/flow-2').filters).toEqual([]);
  });
});

describe('the message replay', () => {
  it('lists every filled value as its setter, attribute references as {{name}}', () => {
    const config = sampleTemplateConfig({
      body: {
        text: [
          {
            __typename: 'WhatsAppTemplateComponentTextPartParam',
            name: '1',
            value: {
              parts: [
                { __typename: 'TemplateStrText', text: 'Hi ', errCode: '' },
                { __typename: 'TemplateStrAttribute', attribute: attr('whatsapp user name'), errCode: '' },
              ],
            },
          },
        ],
      },
      buttons: [
        {
          __typename: 'WhatsAppTemplateURLButton',
          id: 'btn-1',
          text: 'Shop',
          url: [
            { __typename: 'WhatsAppTemplateComponentTextPartText', text: 'https://example.com/' },
            {
              __typename: 'WhatsAppTemplateComponentTextPartParam',
              name: '1',
              value: { parts: [{ __typename: 'TemplateStrText', text: 'sale', errCode: '' }] },
            },
          ],
        },
        {
          __typename: 'WhatsAppTemplateCopyCodeButton',
          id: 'btn-2',
          text: 'Copy',
          code: { parts: [] },
        },
      ],
    });
    expect(replayPlan(config)).toEqual([
      { kind: 'text', component: 'Body', name: '1', value: 'Hi {{whatsapp user name}}' },
      { kind: 'urlParam', buttonId: 'btn-1', name: '1', value: 'sale' },
    ]);
  });

  it('replays a header file by its id', () => {
    const config = sampleTemplateConfig({
      header: {
        __typename: 'WhatsAppTemplateComponentImage',
        image: { id: 'file-9', url: 'https://cdn/x.png', type: 'Image' as never, status: 'Ready' as never, size: 12 },
      },
    });
    expect(replayPlan(config)[0]).toEqual({ kind: 'media', fileKind: 'image', fileId: 'file-9', fileName: null });
  });
});

describe('the recurrence replay', () => {
  const ZONE = 'Asia/Tokyo';

  it('is nothing for a one-shot', () => {
    expect(recurrenceReplay({ repeat: 'once', at: 0 }, 0, ZONE)).toBeNull();
    expect(recurrenceReplay(null, 0, ZONE)).toBeNull();
  });

  it('moves the weekday list by the copy’s day shift rather than the source’s', () => {
    // Source first send: 01:00 Tokyo on Tuesday = Monday 16:00 UTC → stored one day left.
    const sourceAt = Date.parse('2030-01-07T16:00:00Z');
    // Copy first send: 12:00 Tokyo = 03:00 UTC the same day → no shift.
    const copyAt = Date.parse('2030-01-08T03:00:00Z');
    const replay = recurrenceReplay({ repeat: 'weekdays', at: sourceAt, weekdays: [Weekday.Mon] }, copyAt, ZONE);
    expect(replay).toEqual({ repeatType: BroadcastRepeatType.Weekdays, weekdays: [Weekday.Tue] });
  });

  it('carries every N days and the dates as they are', () => {
    expect(recurrenceReplay({ repeat: 'everyNDays', at: 0, everyNDays: 3 }, 0, ZONE)).toEqual({
      repeatType: BroadcastRepeatType.EveryNDays,
      everyNDays: 3,
    });
    const at = Date.parse('2030-02-01T09:00:00Z');
    expect(recurrenceReplay({ repeat: 'dates', at, dates: [at] }, 0, ZONE)).toEqual({
      repeatType: BroadcastRepeatType.OnCertainDates,
      dates: ['2030-02-01T09:00:00.000Z'],
    });
  });
});

describe('the copy’s name', () => {
  it('says copy, and calls a nameless source a campaign', () => {
    expect(copyName('Spring sale')).toBe('Spring sale copy');
    expect(copyName('  ')).toBe('Campaign copy');
  });
});
