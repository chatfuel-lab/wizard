import { describe, expect, it } from 'vitest';
import { ChatfuelGraphQLError } from '~api';
import { BookingStatus } from '~api/generated/bookings/graphql';
import {
  customerName,
  deleteResultPhrase,
  editResultPhrase,
  gestureAnnouncement,
  nameList,
  statusResultPhrase,
} from './announce';
import {
  UNASSIGNED,
  activeFilterCount,
  isFilterEmpty,
  matchesFilter,
  parseIdList,
  serviceKeyOf,
  specialistKeyOf,
} from './bookingsFilter';
import { EVENT_TONE_COUNT, specialistTone, toneForIndex } from './colors';
import { errorCode, errorMessage, isErrorCode, isNotFound } from './errors';
import { effectiveDensity, effectiveMode, masterDetail, panelHost, wizardHost } from './layout';
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, samePrefs, serializePrefs } from './prefs';
import { sampleBooking } from './samples';

describe('bookingsFilter', () => {
  it('keys and matches', () => {
    const a = sampleBooking();
    expect(specialistKeyOf(a)).toBe('sp-1');
    expect(specialistKeyOf({ specialist: null })).toBe(UNASSIGNED);
    expect(
      specialistKeyOf({
        specialist: { __typename: 'DeletedSpecialist', id: 'gone', profile: { firstName: 'X', lastName: null } },
      }),
    ).toBe('gone');
    expect(serviceKeyOf(a)).toBe('svc-1');
    expect(serviceKeyOf({ service: null })).toBeNull();
    const f = { specialists: ['sp-1'], services: [], statuses: [BookingStatus.Confirmed] };
    expect(matchesFilter(a, f)).toBe(true);
    expect(matchesFilter({ ...a, status: BookingStatus.Canceled }, f)).toBe(false);
    expect(matchesFilter(a, { ...f, specialists: [UNASSIGNED] })).toBe(false);
    expect(matchesFilter({ ...a, specialist: null }, { ...f, specialists: [UNASSIGNED] })).toBe(true);
    expect(matchesFilter({ ...a, service: null }, { specialists: [], services: ['svc-1'], statuses: [] })).toBe(false);
    expect(isFilterEmpty(f)).toBe(false);
    expect(activeFilterCount(f)).toBe(2);
    expect(parseIdList(' a, b ,a,')).toEqual(['a', 'b']);
  });
});

describe('errors', () => {
  const nested = new ChatfuelGraphQLError([
    {
      message: 'The upstream service rejected the request.',
      extensions: { errors: [{ message: 'service error', extensions: { code: 'BookingInlineContactDoesNotExist' } }] },
    } as never,
  ]);
  const flat = new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'WhatsappPhoneInvalid' } } as never]);
  it('finds the code top-level or nested', () => {
    expect(errorCode(nested)).toBe('BookingInlineContactDoesNotExist');
    expect(errorCode(flat)).toBe('WhatsappPhoneInvalid');
    expect(errorCode(new Error('x'))).toBeNull();
    expect(isErrorCode(flat, 'WhatsappPhoneInvalid')).toBe(true);
  });
  it('speaks', () => {
    expect(errorMessage(flat)).toBe('That phone number does not look valid.');
    expect(errorMessage(nested)).toBe('No customer with that phone number yet.');
    expect(
      errorMessage(
        new ChatfuelGraphQLError([
          {
            message: 'The upstream service rejected the request.',
            extensions: { code: 'UpstreamServiceError' },
          } as never,
        ]),
      ),
    ).toMatch(/malformed phone/);
    expect(
      errorMessage(
        new ChatfuelGraphQLError([{ message: 'ise', extensions: { code: 'InternalServerError' } } as never]),
      ),
    ).toMatch(/Pending/);
    expect(errorMessage('weird', 'fallback')).toBe('weird');
    expect(errorMessage(null, 'fallback')).toBe('fallback');
    expect(
      isNotFound(new ChatfuelGraphQLError([{ message: 'x', extensions: { code: 'BookingDoesNotExist' } } as never])),
    ).toBe(true);
    expect(isNotFound(flat)).toBe(false);
  });
});

describe('announce', () => {
  it('names', () => {
    expect(nameList([])).toBe('');
    expect(nameList(['A'])).toBe('A');
    expect(nameList(['A', 'B'])).toBe('A and B');
    expect(nameList(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more');
    expect(customerName(sampleBooking())).toBe('Dana Ray');
    expect(customerName({ contact: null, inlineContact: null })).toBe('Walk-in');
  });
  it('phrases', () => {
    expect(statusResultPhrase([], [], BookingStatus.Attended)).toBe('');
    expect(statusResultPhrase(['A'], [], BookingStatus.Attended)).toBe('A marked Attended.');
    expect(statusResultPhrase(['A', 'B'], [], BookingStatus.NoShow)).toBe('2 bookings marked No-show.');
    expect(statusResultPhrase([], ['A'], BookingStatus.Attended)).toBe('A could not be changed.');
    expect(statusResultPhrase(['A'], ['B'], BookingStatus.Attended)).toBe('1 of 2 marked Attended; B unchanged.');
    expect(editResultPhrase('A', 'move', true, 'Tue 10:00')).toBe('A moved to Tue 10:00.');
    expect(editResultPhrase('A', 'resize', false)).toBe('A could not be resized and stayed put.');
    expect(deleteResultPhrase(['A'], ['B'])).toBe('1 of 2 deleted; B kept.');
  });
  it('gesture announcements: grab, move, drop, cancel', () => {
    const say = (over: object, ctx = { bySpecialist: false, snapMin: 15 }) =>
      gestureAnnouncement(
        {
          via: 'keyboard',
          event: { record: sampleBooking() },
          columnLabel: 'Tuesday',
          range: '10:00 – 10:30',
          ...over,
        } as unknown as Parameters<typeof gestureAnnouncement>[0],
        ctx,
      );
    expect(say({ phase: 'grab', state: { kind: 'move' } })).toBe(
      'Grabbed Dana Ray, 10:00 – 10:30, Tuesday. Arrows move 15 minutes, Shift 60; Left and Right change day; Alt with Up or Down resizes; Enter drops; Escape cancels.',
    );
    expect(say({ phase: 'grab', state: { kind: 'move' } }, { bySpecialist: true, snapMin: 15 })).toContain(
      'Left and Right change specialist',
    );
    expect(say({ phase: 'grab', state: { kind: 'create' }, event: null })).toBe(
      'Creating a booking in Tuesday from 10:00 – 10:30. Arrows adjust, Enter opens the wizard, Escape cancels.',
    );
    expect(say({ phase: 'move', state: { kind: 'move' } })).toBe('10:00 – 10:30, Tuesday.');
    expect(say({ phase: 'drop', state: { kind: 'move' } })).toBe('Dana Ray moved to 10:00 – 10:30, Tuesday.');
    expect(say({ phase: 'drop', state: { kind: 'resize-end' } })).toBe('Dana Ray resized to 10:00 – 10:30, Tuesday.');
    expect(say({ phase: 'drop', state: { kind: 'create' }, event: null })).toBe('New booking 10:00 – 10:30, Tuesday.');
    expect(say({ phase: 'cancel', state: { kind: 'move' } })).toBe('Cancelled.');
  });
});

describe('prefs', () => {
  it('parses defensively and round-trips', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('[]')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"zoneSource":"local","weekStartsOn":9,"mode":"year","by":"specialist"}')).toEqual({
      ...DEFAULT_PREFS,
      zoneSource: 'local',
      by: 'specialist',
    });
    const p = { ...DEFAULT_PREFS, weekStartsOn: 0 as const, color: 'status' as const };
    expect(parsePrefs(serializePrefs(p))).toEqual(p);
    expect(samePrefs(p, parsePrefs(serializePrefs(p)))).toBe(true);
    expect(PREFS_KEY).toMatch(/\.v1$/);
  });
});

describe('colors + layout', () => {
  it('tones wrap and unassigned is neutral', () => {
    expect(toneForIndex(0)).toBe(1);
    expect(toneForIndex(EVENT_TONE_COUNT)).toBe(1);
    expect(toneForIndex(-1)).toBe(0);
    expect(specialistTone('b', ['a', 'b'])).toBe(2);
    expect(specialistTone(UNASSIGNED, ['a'])).toBe(0);
    expect(specialistTone('ghost', ['a'])).toBe(0);
  });
  it('band policies', () => {
    expect(effectiveMode('compact', 'week')).toBe('day');
    expect(effectiveMode('narrow', 'week')).toBe('week');
    expect(effectiveDensity('narrow', 'comfortable')).toBe('compact');
    expect(effectiveDensity('wide', 'comfortable')).toBe('comfortable');
    expect(panelHost('inline')).toBe('inline');
    expect(panelHost('wide')).toBe('drawer');
    expect(masterDetail('wide')).toBe('split');
    expect(masterDetail('narrow')).toBe('stacked');
    expect(wizardHost('compact')).toBe('fullscreen');
    expect(wizardHost('narrow')).toBe('dialog');
  });
});
