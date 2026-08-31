import { describe, expect, it } from 'vitest';
import {
  ABOUT_MAX,
  FIRST_NAME_MAX,
  draftName,
  sameSpecialistDraft,
  scheduleInputOf,
  specialistDraftOf,
  specialistFieldForCode,
  specialistInfoInputOf,
  toggleService,
  validateSpecialistDraft,
  type SpecialistDraft,
} from './specialistInput';
import type { SpecialistInfo } from '../types';

const day = {
  __typename: 'SpecialistDaySchedule',
  enabled: true,
  start: '09:00',
  end: '17:00',
  break: { __typename: 'SpecialistDayScheduleBreak', start: '12:00', end: '13:00' },
};

const specialist = (over: Record<string, unknown> = {}): SpecialistInfo =>
  ({
    id: 'spec-1',
    profile: {
      firstName: 'Mara',
      lastName: 'Feld',
      aboutInfo: 'Head roaster.',
      logo: { id: 'file-1', url: 'https://example.test/m.jpg' },
    },
    schedule: {
      __typename: 'SpecialistSchedule',
      enabled: true,
      sun: null,
      mon: day,
      tue: null,
      wed: null,
      thu: null,
      fri: null,
      sat: null,
    },
    services: [{ id: 'svc-1' }],
    ...over,
  }) as unknown as SpecialistInfo;

const draft = (over: Partial<SpecialistDraft> = {}): SpecialistDraft => ({
  firstName: 'Mara',
  lastName: 'Feld',
  aboutInfo: 'Head roaster.',
  logo: { id: 'file-1' },
  serviceIds: ['svc-1'],
  ...over,
});

describe('scheduleInputOf', () => {
  it('re-sends the stored week field by field, break included', () => {
    const input = scheduleInputOf(specialist().schedule);
    expect(input.enabled).toBe(true);
    expect(input.mon).toEqual({ enabled: true, start: '09:00', end: '17:00', break: { start: '12:00', end: '13:00' } });
    expect(input.tue).toBeNull();
  });

  it('never sends __typename, which the input type has no field for', () => {
    expect(JSON.stringify(scheduleInputOf(specialist().schedule))).not.toContain('__typename');
  });

  it('is a disabled week when the specialist has none', () => {
    expect(scheduleInputOf(null)).toEqual({ enabled: false });
  });
});

describe('specialistInfoInputOf', () => {
  it('carries the record schedule through an edit that never touched it', () => {
    const input = specialistInfoInputOf(draft({ aboutInfo: 'Runs the cuppings.' }), specialist());
    expect(input.schedule.mon).toEqual({
      enabled: true,
      start: '09:00',
      end: '17:00',
      break: { start: '12:00', end: '13:00' },
    });
    expect(input.profile.aboutInfo).toBe('Runs the cuppings.');
  });

  it('starts a new specialist with the week switched off', () => {
    expect(specialistInfoInputOf(draft(), null).schedule).toEqual({ enabled: false });
  });

  it('sends null rather than an empty string for a blank optional field', () => {
    const input = specialistInfoInputOf(draft({ lastName: '  ', aboutInfo: '', logo: null }), null);
    expect(input.profile.lastName).toBeNull();
    expect(input.profile.aboutInfo).toBeNull();
    expect(input.profile.logo).toBeNull();
  });

  it('sends the service ids as FileID-free plain ids', () => {
    expect(specialistInfoInputOf(draft({ serviceIds: ['a', 'b'] }), null).goodsServices).toEqual(['a', 'b']);
  });
});

describe('specialistDraftOf', () => {
  it('turns nulls into the empty strings a form edits', () => {
    const empty = specialistDraftOf(
      specialist({ profile: { firstName: 'Sol', lastName: null, aboutInfo: null, logo: null } }),
    );
    expect(empty).toEqual({ firstName: 'Sol', lastName: '', aboutInfo: '', logo: null, serviceIds: ['svc-1'] });
  });

  it('is blank for a new specialist', () => {
    expect(specialistDraftOf(null)).toEqual({ firstName: '', lastName: '', aboutInfo: '', logo: null, serviceIds: [] });
  });
});

describe('validateSpecialistDraft', () => {
  it('passes a good draft', () => {
    expect(validateSpecialistDraft(draft())).toEqual({});
  });

  it('needs a first name', () => {
    expect(validateSpecialistDraft(draft({ firstName: '   ' })).firstName).toBeTruthy();
  });

  it('caps the lengths the server caps', () => {
    expect(validateSpecialistDraft(draft({ firstName: 'x'.repeat(FIRST_NAME_MAX + 1) })).firstName).toBeTruthy();
    expect(validateSpecialistDraft(draft({ aboutInfo: 'x'.repeat(ABOUT_MAX + 1) })).aboutInfo).toBeTruthy();
  });
});

describe('sameSpecialistDraft', () => {
  it('notices every field, avatar and services included', () => {
    expect(sameSpecialistDraft(draft(), draft())).toBe(true);
    expect(sameSpecialistDraft(draft(), draft({ firstName: 'Other' }))).toBe(false);
    expect(sameSpecialistDraft(draft(), draft({ logo: null }))).toBe(false);
    expect(sameSpecialistDraft(draft(), draft({ serviceIds: [] }))).toBe(false);
  });
});

describe('toggleService', () => {
  it('adds at the end and removes without reordering the rest', () => {
    expect(toggleService(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleService(['a', 'b', 'c'], 'b', false)).toEqual(['a', 'c']);
  });

  it('does not duplicate an id already on', () => {
    expect(toggleService(['a'], 'a', true)).toEqual(['a']);
  });
});

describe('specialistFieldForCode', () => {
  it('puts a duplicate name under the first name, where the person is looking', () => {
    expect(specialistFieldForCode('SpecialistNameNotUnique')).toBe('firstName');
    expect(specialistFieldForCode('SpecialistLastNameTooLong')).toBe('lastName');
    expect(specialistFieldForCode('SpecialistAboutInfoTooLong')).toBe('aboutInfo');
    expect(specialistFieldForCode('FileTooBig')).toBe('logo');
    expect(specialistFieldForCode('SpecialistScheduleIsEmpty')).toBe('form');
  });
});

describe('draftName', () => {
  it('never renders blank while somebody is still typing', () => {
    expect(draftName(draft({ firstName: '', lastName: '' }))).toBe('New specialist');
    expect(draftName(draft({ lastName: '' }))).toBe('Mara');
  });
});
