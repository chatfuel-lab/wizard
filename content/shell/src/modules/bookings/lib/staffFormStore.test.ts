import { describe, expect, it } from 'vitest';
import type { WeekHours } from '~ui';
import { sampleSpecialist } from './samples';
import { specialistInputOf } from './schedule';
import {
  canSave,
  dayErrors,
  defaultHours,
  fieldError,
  formError,
  hasErrors,
  initialStaffForm,
  isDirty,
  sameStaffDraft,
  scheduleOf,
  specialistInputOfDraft,
  staffDraftOf,
  staffFieldForCode,
  staffFormReducer,
  validateStaffDraft,
  weekHoursOf,
  type StaffFormState,
} from './staffFormStore';

const reduce = (state: StaffFormState, ...actions: Parameters<typeof staffFormReducer>[1][]) =>
  actions.reduce(staffFormReducer, state);

describe('schedule ↔ editor conversion', () => {
  it('maps named days to numeric weekdays (0 = Sunday)', () => {
    const hours = weekHoursOf(sampleSpecialist().schedule);
    expect(hours[0].enabled).toBe(false);
    expect(hours[1]).toEqual({ enabled: true, start: '09:00', end: '18:00', break: { start: '13:00', end: '14:00' } });
    expect(hours[6].enabled).toBe(false);
  });
  it('round-trips hours → schedule → hours', () => {
    const hours: WeekHours = {
      ...defaultHours(),
      3: { enabled: true, start: '10:00', end: '16:30', break: { start: '12:00', end: '12:30' } },
    };
    expect(weekHoursOf(scheduleOf(true, hours))).toEqual(hours);
  });
  it('round-trips schedule → hours → schedule (typenames aside)', () => {
    const schedule = sampleSpecialist().schedule!;
    expect(scheduleOf(true, weekHoursOf(schedule))).toEqual(schedule);
  });
  it('starts from Mon–Fri when the record has no days at all', () => {
    expect(weekHoursOf(null)).toEqual(defaultHours());
    expect(
      weekHoursOf({ enabled: false, sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null }),
    ).toEqual(defaultHours());
  });
  it('fills a single missing day as off, keeps the others', () => {
    const schedule = { ...sampleSpecialist().schedule!, wed: null };
    const hours = weekHoursOf(schedule);
    expect(hours[3]).toEqual({ enabled: false, start: '09:00', end: '18:00', break: null });
    expect(hours[1].enabled).toBe(true);
  });
});

describe('staffDraftOf / specialistInputOfDraft', () => {
  it('a new draft is empty with the schedule off', () => {
    const draft = staffDraftOf(null);
    expect(draft.firstName).toBe('');
    expect(draft.scheduleEnabled).toBe(false);
    expect(draft.serviceIds).toEqual([]);
    expect(draft.hours[1].enabled).toBe(true);
  });
  it('reads the record, and the input round-trips against specialistInputOf', () => {
    const record = sampleSpecialist({
      profile: {
        firstName: 'Alex',
        lastName: 'Kim',
        aboutInfo: 'Hi',
        logo: { id: 'f1', url: 'u', type: 'Image' as never, status: 'Downloaded' as never, size: 1 },
      },
    });
    const draft = staffDraftOf(record);
    expect(draft.logo).toEqual({ id: 'f1', url: 'u' });
    expect(draft.serviceIds).toEqual(['svc-1']);
    expect(specialistInputOfDraft(draft)).toEqual(specialistInputOf(record));
  });
  it('trims and nulls empty optionals', () => {
    const input = specialistInputOfDraft({ ...staffDraftOf(null), firstName: ' Sam ', lastName: '  ', aboutInfo: ' ' });
    expect(input.profile).toEqual({ firstName: 'Sam', lastName: null, aboutInfo: null, logo: null });
    expect(input.schedule.enabled).toBe(false);
    // The days ride along even when the schedule is off — a full replace keeps what it knows.
    expect(input.schedule.mon?.enabled).toBe(true);
  });
});

describe('validateStaffDraft', () => {
  const ok = staffDraftOf(sampleSpecialist());
  it('passes a record as it came', () => {
    expect(validateStaffDraft(ok)).toEqual({});
    expect(hasErrors(validateStaffDraft(ok))).toBe(false);
  });
  it('requires a first name and caps lengths', () => {
    expect(validateStaffDraft({ ...ok, firstName: '  ' }).firstName).toMatch(/required/);
    expect(validateStaffDraft({ ...ok, firstName: 'x'.repeat(61) }).firstName).toMatch(/60/);
    expect(validateStaffDraft({ ...ok, lastName: 'x'.repeat(61) }).lastName).toMatch(/60/);
    expect(validateStaffDraft({ ...ok, aboutInfo: 'x'.repeat(1001) }).aboutInfo).toMatch(/1000/);
    // The length that counts is the trimmed one — that is what gets sent.
    expect(validateStaffDraft({ ...ok, aboutInfo: `${'x'.repeat(1000)}\n\n  ` }).aboutInfo).toBeUndefined();
  });
  it('checks the schedule per day when it is on, and not at all when off', () => {
    const bad: WeekHours = { ...ok.hours, 2: { enabled: true, start: '18:00', end: '09:00', break: null } };
    const errors = validateStaffDraft({ ...ok, hours: bad });
    expect(errors.days?.[2]).toMatch(/after start/);
    expect(errors.days?.[1]).toBeUndefined();
    expect(validateStaffDraft({ ...ok, hours: bad, scheduleEnabled: false })).toEqual({});
  });
  it('flags a schedule that is on with no day', () => {
    const none = Object.fromEntries(
      Object.entries(ok.hours).map(([k, v]) => [k, { ...v, enabled: false }]),
    ) as WeekHours;
    expect(validateStaffDraft({ ...ok, hours: none }).schedule).toMatch(/at least one day/);
  });
});

describe('sameStaffDraft', () => {
  const a = staffDraftOf(sampleSpecialist());
  it('ignores the hours of a disabled schedule', () => {
    const off = { ...a, scheduleEnabled: false };
    expect(sameStaffDraft(off, { ...off, hours: { ...off.hours, 1: { ...off.hours[1], start: '07:00' } } })).toBe(true);
    expect(sameStaffDraft(a, { ...a, hours: { ...a.hours, 1: { ...a.hours[1], start: '07:00' } } })).toBe(false);
  });
  it('sees a service reorder — the API keeps the list in the order it is sent', () => {
    const two = { ...a, serviceIds: ['svc-1', 'svc-2'] };
    expect(sameStaffDraft(two, { ...two, serviceIds: ['svc-1', 'svc-2'] })).toBe(true);
    expect(sameStaffDraft(two, { ...two, serviceIds: ['svc-2', 'svc-1'] })).toBe(false);
  });
  it('sees every other change', () => {
    expect(sameStaffDraft(a, { ...a, firstName: 'B' })).toBe(false);
    expect(sameStaffDraft(a, { ...a, logo: { id: 'x' } })).toBe(false);
    expect(sameStaffDraft(a, { ...a, serviceIds: [] })).toBe(false);
    expect(sameStaffDraft(a, { ...a, scheduleEnabled: false })).toBe(false);
  });
});

describe('staffFormReducer', () => {
  const start = () => initialStaffForm(staffDraftOf(sampleSpecialist()));

  it('starts clean, not dirty, nothing shown', () => {
    const s = start();
    expect(isDirty(s)).toBe(false);
    expect(canSave(s)).toBe(false);
    expect(fieldError(s, 'firstName')).toBeNull();
  });
  it('tracks dirty through edits and back through revert', () => {
    let s = reduce(start(), { type: 'setText', field: 'firstName', value: 'Alexa' });
    expect(isDirty(s)).toBe(true);
    expect(canSave(s)).toBe(true);
    s = staffFormReducer(s, { type: 'setText', field: 'firstName', value: 'Alex' });
    expect(isDirty(s)).toBe(false);
    s = reduce(s, { type: 'toggleService', id: 'svc-2', on: true }, { type: 'revert' });
    expect(isDirty(s)).toBe(false);
    expect(s.draft.serviceIds).toEqual(['svc-1']);
  });
  it('shows a client error only once the field is touched, or after an attempt', () => {
    let s = reduce(start(), { type: 'setText', field: 'firstName', value: '' });
    expect(fieldError(s, 'firstName')).toMatch(/required/);
    expect(fieldError(s, 'lastName')).toBeNull();
    s = initialStaffForm({ ...staffDraftOf(null) });
    expect(fieldError(s, 'firstName')).toBeNull();
    s = staffFormReducer(s, { type: 'attempted' });
    expect(fieldError(s, 'firstName')).toMatch(/required/);
  });
  it('toggling a service is idempotent', () => {
    const s0 = start();
    expect(staffFormReducer(s0, { type: 'toggleService', id: 'svc-1', on: true })).toBe(s0);
    const s1 = staffFormReducer(s0, { type: 'toggleService', id: 'svc-1', on: false });
    expect(s1.draft.serviceIds).toEqual([]);
    expect(s1.touched.services).toBe(true);
  });
  it('schedule edits validate per day and clear on the next edit', () => {
    const s0 = start();
    const bad: WeekHours = {
      ...s0.draft.hours,
      4: { enabled: true, start: '09:00', end: '18:00', break: { start: '19:00', end: '20:00' } },
    };
    let s = staffFormReducer(s0, { type: 'setHours', hours: bad });
    expect(dayErrors(s)[4]).toMatch(/inside/);
    expect(canSave(s)).toBe(true); // validity is checked on press, not before
    s = staffFormReducer(s, { type: 'setHours', hours: s0.draft.hours });
    expect(dayErrors(s)).toEqual({});
    s = staffFormReducer(s, { type: 'setScheduleEnabled', enabled: false });
    expect(dayErrors(s)).toEqual({});
    expect(isDirty(s)).toBe(true);
  });
  it('maps a server error to its field, keeps the draft, and clears it on the next edit of that field', () => {
    let s = reduce(start(), { type: 'setText', field: 'firstName', value: 'Dana' }, { type: 'saveStarted' });
    expect(s.saving).toBe(true);
    expect(s.attempted).toBe(true);
    s = staffFormReducer(s, {
      type: 'saveFailed',
      code: 'SpecialistNameNotUnique',
      message: 'A specialist with this name already exists.',
    });
    expect(s.saving).toBe(false);
    expect(s.draft.firstName).toBe('Dana');
    expect(fieldError(s, 'firstName')).toMatch(/already exists/);
    expect(formError(s)).toBeNull();
    s = staffFormReducer(s, { type: 'setText', field: 'lastName', value: 'R' });
    expect(fieldError(s, 'firstName')).toMatch(/already exists/); // another field's edit does not clear it
    s = staffFormReducer(s, { type: 'setText', field: 'firstName', value: 'Dana R' });
    expect(fieldError(s, 'firstName')).toBeNull();
  });
  it('a schedule code lands on the schedule and clears with any hours edit', () => {
    let s = reduce(
      start(),
      { type: 'saveStarted' },
      { type: 'saveFailed', code: 'SpecialistScheduleInvalidTimeRange', message: 'Bad hours.' },
    );
    expect(fieldError(s, 'schedule')).toBe('Bad hours.');
    s = staffFormReducer(s, { type: 'setHours', hours: s.draft.hours });
    expect(fieldError(s, 'schedule')).toBeNull();
  });
  it('an unknown code is a form-level error that any edit clears', () => {
    let s = reduce(
      start(),
      { type: 'saveStarted' },
      { type: 'saveFailed', code: 'SpecialistMaxCountReached', message: 'Limit.' },
    );
    expect(formError(s)).toBe('Limit.');
    s = staffFormReducer(s, { type: 'setText', field: 'aboutInfo', value: 'x' });
    expect(formError(s)).toBeNull();
  });
  it('a successful save resets original and draft to the saved record', () => {
    const saved = staffDraftOf(
      sampleSpecialist({ profile: { firstName: 'Alexa', lastName: 'Kim', aboutInfo: null, logo: null } }),
    );
    const s = reduce(
      start(),
      { type: 'setText', field: 'firstName', value: 'Alexa' },
      { type: 'saveStarted' },
      { type: 'saveSucceeded', draft: saved },
    );
    expect(s.saving).toBe(false);
    expect(isDirty(s)).toBe(false);
    expect(s.original.firstName).toBe('Alexa');
    expect(s.touched).toEqual({});
  });
  it('reset replaces everything (a different specialist was selected)', () => {
    const s = reduce(
      start(),
      { type: 'setText', field: 'firstName', value: 'Zed' },
      { type: 'reset', draft: staffDraftOf(null) },
    );
    expect(s.draft.firstName).toBe('');
    expect(isDirty(s)).toBe(false);
  });
});

describe('staffFieldForCode', () => {
  it('routes codes', () => {
    expect(staffFieldForCode('SpecialistNameNotUnique')).toBe('firstName');
    expect(staffFieldForCode('SpecialistFirstNameRequired')).toBe('firstName');
    expect(staffFieldForCode('SpecialistLastNameTooLong')).toBe('lastName');
    expect(staffFieldForCode('SpecialistAboutInfoTooLong')).toBe('aboutInfo');
    expect(staffFieldForCode('SpecialistScheduleIsEmpty')).toBe('schedule');
    expect(staffFieldForCode('SpecialistMaxCountReached')).toBe('form');
    expect(staffFieldForCode(null)).toBe('form');
  });
});
