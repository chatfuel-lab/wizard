import { describe, expect, it } from 'vitest';
import { serializeStoredList } from '~ui';
import {
  MAX_CANNED_BODY_LENGTH,
  MAX_CANNED_RESPONSES,
  MAX_CANNED_TITLE_LENGTH,
  parseCannedResponses,
  searchCannedResponses,
  type CannedResponse,
} from './cannedResponses';

/** How the hook serializes — the shared list serializer under this module's cap. */
const serializeCannedResponses = (responses: readonly CannedResponse[]): string =>
  serializeStoredList(responses, MAX_CANNED_RESPONSES);

const NOW = Date.UTC(2026, 7, 13, 12, 0);

const response = (id: string, title: string, body = `${title} body`): CannedResponse => ({
  id,
  title,
  body,
  savedAt: NOW,
});

describe('parseCannedResponses', () => {
  it('round-trips what it serialized', () => {
    const list = [response('a', 'Shipping'), response('b', 'Refund')];
    expect(parseCannedResponses(serializeCannedResponses(list), NOW)).toEqual(list);
  });

  /* Everything read back is whatever some past version of this app wrote, and
     a menu that crashes the inbox is worse than a menu that is empty. */
  it('answers with an empty list for anything it cannot make sense of', () => {
    expect(parseCannedResponses(null)).toEqual([]);
    expect(parseCannedResponses('')).toEqual([]);
    expect(parseCannedResponses('{ not json')).toEqual([]);
    expect(parseCannedResponses('"a string"')).toEqual([]);
    expect(parseCannedResponses('42')).toEqual([]);
  });

  /* A response with no body puts nothing in the composer, which is
     indistinguishable from the menu being broken. */
  it('drops entries with nothing to insert', () => {
    const raw = JSON.stringify([{ id: 'a', title: 'Empty', body: '   ' }, response('b', 'Real')]);
    expect(parseCannedResponses(raw, NOW).map((entry) => entry.id)).toEqual(['b']);
  });

  it('names an untitled response after its own opening words', () => {
    const raw = JSON.stringify([{ id: 'a', body: 'We ship EU-wide within three days.' }]);
    expect(parseCannedResponses(raw, NOW)[0]!.title).toBe('We ship EU-wide within three days.');
  });

  it('truncates rather than trusting the stored lengths', () => {
    const raw = JSON.stringify([{ id: 'a', title: 'T'.repeat(500), body: 'B'.repeat(MAX_CANNED_BODY_LENGTH + 100) }]);
    const parsed = parseCannedResponses(raw, NOW)[0]!;
    expect(parsed.title).toHaveLength(MAX_CANNED_TITLE_LENGTH);
    expect(parsed.body).toHaveLength(MAX_CANNED_BODY_LENGTH);
  });

  it('drops duplicate ids and caps the list', () => {
    const raw = JSON.stringify([
      response('a', 'One'),
      response('a', 'One again'),
      ...Array.from({ length: MAX_CANNED_RESPONSES + 5 }, (_, i) => response(`x${i}`, `X${i}`)),
    ]);
    const parsed = parseCannedResponses(raw, NOW);
    expect(parsed).toHaveLength(MAX_CANNED_RESPONSES);
    expect(parsed.filter((entry) => entry.id === 'a')).toHaveLength(1);
  });

  it('supplies a savedAt the caller passed rather than reading the clock', () => {
    const raw = JSON.stringify([{ id: 'a', body: 'Hello' }]);
    expect(parseCannedResponses(raw, NOW)[0]!.savedAt).toBe(NOW);
  });
});

describe('searchCannedResponses', () => {
  const list = [
    response('a', 'Shipping', 'We ship EU-wide within three days.'),
    response('b', 'Refund', 'Your refund is on its way.'),
  ];

  it('matches the name', () => {
    expect(searchCannedResponses(list, 'refu').map((entry) => entry.id)).toEqual(['b']);
  });

  /* Typing the opening words of a reply has to find it as readily as typing
     its name — an operator remembers what they wrote, not what they filed it
     under. */
  it('matches the body too', () => {
    expect(searchCannedResponses(list, 'EU-wide').map((entry) => entry.id)).toEqual(['a']);
  });

  it('answers with everything for an empty query', () => {
    expect(searchCannedResponses(list, '')).toHaveLength(2);
  });
});
