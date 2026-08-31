import { describe, expect, it } from 'vitest';
import type { ContactHit } from '../types';
import { sampleSpecialist } from './samples';
import { zonedInstant } from './zone';
import {
  canAdoptKnownName,
  canGoTo,
  customerFields,
  draftProblem,
  emptyDraft,
  existingFromHit,
  firstIncompleteStep,
  isBookableHit,
  isOutsideSchedule,
  isWorkingDay,
  normalizePhone,
  openWizard,
  relevantLookup,
  resolveSlotSpecialist,
  resolvedCustomer,
  slotToTime,
  stepProblem,
  stepStatuses,
  stepValid,
  wantedSpecialistIds,
  wizardDuration,
  wizardInput,
  wizardReducer,
  WIZARD_STEPS,
  type WizardOpenInput,
  type WizardState,
} from './wizardStore';

const MX = 'America/Mexico_City';
const TODAY = '2026-08-17';

const open = (over: Partial<WizardOpenInput> = {}) =>
  openWizard({
    service: null,
    specialistId: null,
    span: null,
    contactId: null,
    todayKey: TODAY,
    countryCode: 'DE',
    ...over,
  });

const CONSULT = { id: 'svc-1', durationMinutes: 30 };

/** A state that has walked every step: service → Alex → tomorrow → 10:00 slot → new customer. */
function complete(): WizardState {
  let s = open();
  s = wizardReducer(s, { type: 'serviceChosen', choice: { kind: 'service', ...CONSULT } });
  s = wizardReducer(s, { type: 'specialistChosen', choice: { kind: 'one', id: 'sp-1' } });
  s = wizardReducer(s, { type: 'dayChosen', dayKey: '2026-08-18' });
  s = wizardReducer(s, {
    type: 'timeChosen',
    time: slotToTime('2026-08-18', { minute: 600, specialistIds: ['sp-1'] }, 30, MX, s.specialist),
  });
  s = wizardReducer(s, { type: 'customerModeSet', mode: 'new' });
  s = wizardReducer(s, { type: 'draftChanged', patch: { name: 'Dana Ray', phone: '+1 202 555 0100' } });
  return wizardReducer(s, { type: 'goTo', step: 'customer' });
}

describe('openWizard — where a prefill lands', () => {
  it('nothing → Service, everything unset', () => {
    const s = open();
    expect(s.step).toBe('service');
    expect(s.service.kind).toBe('unset');
    expect(s.specialist.kind).toBe('unset');
    expect(s.dayKey).toBeNull();
    expect(s.time).toBeNull();
    expect(s.draft.countryCode).toBe('DE');
  });

  it('a service alone → Time for today, with anyone', () => {
    const s = open({ service: CONSULT });
    expect(s.step).toBe('time');
    expect(s.dayKey).toBe(TODAY);
    expect(s.specialist).toEqual({ kind: 'anyone' });
  });

  it('a specialist alone → Service, with them pre-picked', () => {
    const s = open({ specialistId: 'sp-2' });
    expect(s.step).toBe('service');
    expect(s.specialist).toEqual({ kind: 'one', id: 'sp-2' });
  });

  it('a span (grid drag) → Customer, time editable, no service required', () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    const s = open({ span: { start, end: start + 45 * 60_000, dayKey: '2026-08-18' }, specialistId: 'sp-1' });
    expect(s.step).toBe('customer');
    expect(s.service).toEqual({ kind: 'none' });
    expect(s.time).toEqual({ start, end: start + 45 * 60_000, specialistId: 'sp-1', source: 'prefill' });
    expect(s.dayKey).toBe('2026-08-18');
    expect(canGoTo(s, 'confirm')).toBe(false); // no customer yet
  });

  it('a span with a contact → Confirm', () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    const s = open({ span: { start, end: start + 30 * 60_000, dayKey: '2026-08-18' }, contactId: 'wa_9' });
    expect(s.step).toBe('confirm');
    expect(resolvedCustomer(s)).toEqual({ kind: 'existing', contact: { contactId: 'wa_9', name: null, phone: null } });
  });

  it('a span keeps an unassigned booking unassigned', () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    const s = open({ span: { start, end: start + 30 * 60_000, dayKey: '2026-08-18' } });
    expect(s.time?.specialistId).toBeNull();
    expect(s.specialist).toEqual({ kind: 'anyone' });
  });
});

describe('step gating', () => {
  it('next refuses while the step is invalid and advances when valid', () => {
    let s = open();
    expect(wizardReducer(s, { type: 'next' })).toBe(s);
    s = wizardReducer(s, { type: 'serviceChosen', choice: { kind: 'service', ...CONSULT } });
    s = wizardReducer(s, { type: 'next' });
    expect(s.step).toBe('specialist');
    expect(stepProblem(s, 'specialist')).toBe('Pick a specialist, or anyone.');
    s = wizardReducer(s, { type: 'specialistChosen', choice: { kind: 'anyone' } });
    s = wizardReducer(s, { type: 'next' });
    expect(s.step).toBe('day');
  });

  it('back walks one step, never past Service', () => {
    let s = open();
    expect(wizardReducer(s, { type: 'back' })).toBe(s);
    s = complete();
    s = wizardReducer(s, { type: 'goTo', step: 'confirm' });
    s = wizardReducer(s, { type: 'back' });
    expect(s.step).toBe('customer');
  });

  it('goTo reaches earlier steps always, later steps only through valid ones', () => {
    let s = open();
    s = wizardReducer(s, { type: 'serviceChosen', choice: { kind: 'service', ...CONSULT } });
    expect(canGoTo(s, 'specialist')).toBe(true);
    expect(canGoTo(s, 'day')).toBe(false); // specialist unset
    expect(wizardReducer(s, { type: 'goTo', step: 'day' })).toBe(s);
    s = wizardReducer(s, { type: 'goTo', step: 'specialist' });
    expect(s.step).toBe('specialist');
    expect(canGoTo(s, 'service')).toBe(true);
    const done = complete();
    expect(canGoTo(done, 'confirm')).toBe(true);
    expect(canGoTo(done, 'nowhere' as never)).toBe(false);
  });

  it('firstIncompleteStep and stepStatuses agree', () => {
    const s = complete();
    expect(firstIncompleteStep(s)).toBe('confirm');
    const statuses = stepStatuses(s);
    // Current step is customer; everything before is complete; confirm upcoming.
    expect(statuses.customer).toBe('current');
    expect(statuses.service).toBe('complete');
    expect(statuses.time).toBe('complete');
    expect(statuses.confirm).toBe('upcoming');
    // Going back to Service marks the valid later steps complete (clickable), the current one current.
    const back = wizardReducer(s, { type: 'goTo', step: 'service' });
    expect(stepStatuses(back).service).toBe('current');
    expect(stepStatuses(back).time).toBe('complete');
    expect(stepStatuses(back).customer).toBe('complete');
  });

  it('a step left invalid behind the current one draws as error', () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    let s = open({ span: { start, end: start + 30 * 60_000, dayKey: '2026-08-18' } });
    // Clear the time from the customer step: the time step behind us is now invalid.
    s = wizardReducer(s, { type: 'timeCleared' });
    expect(stepStatuses(s).time).toBe('error');
    expect(stepProblem(s, 'confirm')).toBe('Pick a time.');
    expect(WIZARD_STEPS).toHaveLength(6);
  });
});

describe('service / specialist / day changes and what they void', () => {
  it('a new service voids a slot but keeps a prefilled span, whose end follows the duration', () => {
    const s = complete();
    const changed = wizardReducer(s, {
      type: 'serviceChosen',
      choice: { kind: 'service', id: 'svc-2', durationMinutes: 60 },
    });
    expect(changed.time).toBeNull();
    // Same service again → nothing voided.
    expect(wizardReducer(s, { type: 'serviceChosen', choice: { kind: 'service', ...CONSULT } }).time).toEqual(s.time);
    const start = zonedInstant('2026-08-18', 600, MX);
    const pre = open({ span: { start, end: start + 45 * 60_000, dayKey: '2026-08-18' } });
    const withService = wizardReducer(pre, {
      type: 'serviceChosen',
      choice: { kind: 'service', id: 'svc-2', durationMinutes: 90 },
    });
    expect(withService.time).toMatchObject({ start, end: start + 90 * 60_000, source: 'prefill' });
  });

  it("a custom span's end follows the new duration too", () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    let s = complete();
    s = wizardReducer(s, {
      type: 'timeChosen',
      time: { start, end: start + 30 * 60_000, specialistId: 'sp-1', source: 'custom' },
    });
    const changed = wizardReducer(s, {
      type: 'serviceChosen',
      choice: { kind: 'service', id: 'svc-2', durationMinutes: 90 },
    });
    expect(changed.time).toMatchObject({ start, end: start + 90 * 60_000, source: 'custom' });
  });

  it('a new specialist voids a slot; a custom span is reassigned', () => {
    const s = complete();
    expect(wizardReducer(s, { type: 'specialistChosen', choice: { kind: 'anyone' } }).time).toBeNull();
    const custom = wizardReducer(s, {
      type: 'timeChosen',
      time: { start: 1, end: 2, specialistId: 'sp-1', source: 'custom' },
    });
    expect(custom.customTime).toBe(true);
    const re = wizardReducer(custom, { type: 'specialistChosen', choice: { kind: 'one', id: 'sp-2' } });
    expect(re.time).toMatchObject({ start: 1, end: 2, specialistId: 'sp-2', source: 'custom' });
    const anyone = wizardReducer(custom, { type: 'specialistChosen', choice: { kind: 'anyone' } });
    expect(anyone.time?.specialistId).toBeNull();
  });

  it('a new day voids a slot and keeps a custom span for the component to re-issue', () => {
    const s = complete();
    expect(wizardReducer(s, { type: 'dayChosen', dayKey: '2026-08-19' }).time).toBeNull();
    expect(wizardReducer(s, { type: 'dayChosen', dayKey: '2026-08-18' })).toBe(s);
    const custom = wizardReducer(s, {
      type: 'timeChosen',
      time: { start: 1, end: 2, specialistId: 'sp-1', source: 'custom' },
    });
    expect(wizardReducer(custom, { type: 'dayChosen', dayKey: '2026-08-19' }).time).toEqual(custom.time);
  });

  it('closing the custom hatch drops a custom time, not a slot', () => {
    const s = complete();
    const custom = wizardReducer(s, {
      type: 'timeChosen',
      time: { start: 1, end: 2, specialistId: 'sp-1', source: 'custom' },
    });
    expect(wizardReducer(custom, { type: 'customTimeToggled', on: false }).time).toBeNull();
    const opened = wizardReducer(s, { type: 'customTimeToggled', on: true });
    expect(opened.time).toEqual(s.time);
    expect(wizardReducer(opened, { type: 'customTimeToggled', on: false }).time).toEqual(s.time);
  });
});

describe('time helpers', () => {
  it('slotToTime builds instants in the bot zone for the duration', () => {
    const t = slotToTime('2026-08-18', { minute: 600, specialistIds: ['sp-2', 'sp-1'] }, 30, MX, { kind: 'anyone' });
    expect(t.start).toBe(zonedInstant('2026-08-18', 600, MX));
    expect(t.end - t.start).toBe(30 * 60_000);
    expect(t.specialistId).toBe('sp-2');
    expect(t.source).toBe('slot');
  });

  it('anyone resolves to the first free specialist; a chosen one is kept', () => {
    expect(resolveSlotSpecialist({ kind: 'anyone' }, { specialistIds: ['sp-2', 'sp-1'] })).toBe('sp-2');
    expect(resolveSlotSpecialist({ kind: 'one', id: 'sp-1' }, { specialistIds: ['sp-2', 'sp-1'] })).toBe('sp-1');
    expect(resolveSlotSpecialist({ kind: 'anyone' }, { specialistIds: [] })).toBeNull();
    expect(resolveSlotSpecialist({ kind: 'unset' }, { specialistIds: ['sp-3'] })).toBe('sp-3');
  });

  it('wantedSpecialistIds narrows to the chosen one or everyone offering', () => {
    expect(wantedSpecialistIds({ kind: 'one', id: 'sp-1' }, ['sp-1', 'sp-2'])).toEqual(['sp-1']);
    expect(wantedSpecialistIds({ kind: 'anyone' }, ['sp-1', 'sp-2'])).toEqual(['sp-1', 'sp-2']);
    expect(wantedSpecialistIds({ kind: 'anyone' }, [])).toBeNull();
  });

  it('wizardDuration prefers the picked span, then the service', () => {
    expect(wizardDuration(complete())).toBe(30);
    expect(wizardDuration({ time: null, service: { kind: 'service', id: 'x', durationMinutes: 45 } })).toBe(45);
    expect(wizardDuration({ time: null, service: { kind: 'none' } })).toBeNull();
  });

  it('isOutsideSchedule reads the bot-zone weekday and the break', () => {
    const sp = sampleSpecialist(); // Mon–Fri 09–18, Monday break 13–14 (bot zone)
    const mon = (h: number, m = 0) => zonedInstant('2026-08-17', h * 60 + m, MX);
    expect(isOutsideSchedule(sp.schedule, mon(10), mon(10, 30), MX)).toBe(false);
    expect(isOutsideSchedule(sp.schedule, mon(8, 30), mon(9), MX)).toBe(true);
    expect(isOutsideSchedule(sp.schedule, mon(12, 45), mon(13, 15), MX)).toBe(true); // into the break
    expect(isOutsideSchedule(sp.schedule, mon(17, 30), mon(18), MX)).toBe(false);
    expect(isOutsideSchedule(sp.schedule, mon(17, 45), mon(18, 15), MX)).toBe(true);
    const sun = zonedInstant('2026-08-16', 600, MX);
    expect(isOutsideSchedule(sp.schedule, sun, sun + 1_800_000, MX)).toBe(true);
    expect(isOutsideSchedule(null, mon(10), mon(11), MX)).toBe(true);
    // Crossing midnight is outside any day's hours.
    expect(isOutsideSchedule(sp.schedule, mon(23), mon(23) + 2 * 3_600_000, MX)).toBe(true);
  });

  it('isWorkingDay marks a day when any schedule works it', () => {
    const alex = sampleSpecialist().schedule;
    const sam = null;
    expect(isWorkingDay([alex, sam], '2026-08-17')).toBe(true); // Monday
    expect(isWorkingDay([alex, sam], '2026-08-16')).toBe(false); // Sunday
    expect(isWorkingDay([sam], '2026-08-17')).toBe(false);
  });
});

describe('customer', () => {
  it('normalizePhone drops formatting and keeps the plus', () => {
    expect(normalizePhone('+1 (202) 555-0102')).toBe('+12025550102');
    expect(normalizePhone('12025550102')).toBe('12025550102');
    expect(normalizePhone('+1 202')).toBeNull();
    expect(normalizePhone('call me')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('draftProblem asks for both, then a valid phone, then a name', () => {
    expect(draftProblem(emptyDraft('DE'))).toMatch(/name and phone/);
    expect(draftProblem({ ...emptyDraft('DE'), phone: '12' })).toMatch(/phone number/);
    expect(draftProblem({ ...emptyDraft('DE'), phone: '+12025550102' })).toMatch(/name is required/);
    expect(draftProblem({ ...emptyDraft('DE'), phone: '+12025550102', name: 'Joe' })).toBeNull();
  });

  it('both drafts survive flipping the mode; the resolved customer follows the mode', () => {
    let s = complete();
    expect(resolvedCustomer(s).kind).toBe('new');
    s = wizardReducer(s, {
      type: 'existingPicked',
      contact: { contactId: 'wa_1', name: 'Maria Demo', phone: '12025550120' },
    });
    expect(s.customerMode).toBe('existing');
    expect(resolvedCustomer(s)).toEqual({
      kind: 'existing',
      contact: { contactId: 'wa_1', name: 'Maria Demo', phone: '12025550120' },
    });
    s = wizardReducer(s, { type: 'customerModeSet', mode: 'new' });
    expect(resolvedCustomer(s).kind).toBe('new');
    expect(s.draft.name).toBe('Dana Ray');
    s = wizardReducer(s, { type: 'customerModeSet', mode: 'existing' });
    expect(s.existing?.contactId).toBe('wa_1');
    s = wizardReducer(s, { type: 'existingPicked', contact: null });
    expect(resolvedCustomer(s).kind).toBe('none');
    expect(stepValid(s, 'customer')).toBe(false);
    s = wizardReducer(s, { type: 'customerSkipped', skipped: true });
    expect(resolvedCustomer(s)).toEqual({ kind: 'skipped' });
    expect(stepValid(s, 'customer')).toBe(true);
    // Touching either draft un-skips.
    s = wizardReducer(s, { type: 'draftChanged', patch: { note: 'x' } });
    expect(s.customerSkipped).toBe(false);
  });

  it('adopts a known inline name into an empty draft and offers it over a typed one', () => {
    let s = open();
    s = wizardReducer(s, { type: 'customerModeSet', mode: 'new' });
    s = wizardReducer(s, { type: 'draftChanged', patch: { phone: '+12025550102' } });
    s = wizardReducer(s, { type: 'lookupStarted', phone: '+12025550102' });
    expect(relevantLookup(s)?.status).toBe('looking');
    s = wizardReducer(s, {
      type: 'lookupFound',
      phone: '+12025550102',
      known: { id: 'i-1', name: 'Walk-in Joe', note: 'Pays cash.' },
    });
    expect(s.draft.name).toBe('Walk-in Joe');
    expect(s.draft.note).toBe('Pays cash.');
    expect(canAdoptKnownName(s)).toBe(false);
    // Typed name differs → offered, not forced.
    s = wizardReducer(s, { type: 'draftChanged', patch: { name: 'Joseph' } });
    expect(canAdoptKnownName(s)).toBe(true);
    s = wizardReducer(s, { type: 'knownNameAdopted' });
    expect(s.draft.name).toBe('Walk-in Joe');
    // A different phone makes the answer irrelevant.
    s = wizardReducer(s, { type: 'draftChanged', patch: { phone: '+12025550103' } });
    expect(relevantLookup(s)).toBeNull();
    expect(canAdoptKnownName(s)).toBe(false);
    expect(wizardReducer(s, { type: 'knownNameAdopted' })).toBe(s);
    s = wizardReducer(s, { type: 'lookupMissed', phone: '+12025550103' });
    expect(relevantLookup(s)?.status).toBe('missing');
  });

  it('countryDefaulted fills a pristine draft only', () => {
    let s = open({ countryCode: null });
    expect(s.draft.countryCode).toBe('US');
    s = wizardReducer(s, { type: 'countryDefaulted', countryCode: 'DE' });
    expect(s.draft.countryCode).toBe('DE');
    expect(s.customerMode).toBe('existing'); // untouched
    const typed = wizardReducer(s, { type: 'draftChanged', patch: { phone: '+1' } });
    expect(wizardReducer(typed, { type: 'countryDefaulted', countryCode: 'MX' }).draft.countryCode).toBe('DE');
  });

  it('customerFields is the one customer payload, trimmed and normalized', () => {
    const draft = {
      name: ' Dana Ray ',
      phone: '+1 (202) 555-0100',
      countryCode: 'US',
      note: '   ',
      createContact: true,
    };
    expect(customerFields(draft)).toEqual({
      name: 'Dana Ray',
      phoneNumber: '+12025550100',
      countryCode: 'US',
      note: null,
    });
    // `wizardInput`'s inline customer and the contact `useContactCreate` mints
    // are the same fields — the booking and its contact cannot disagree.
    const s = complete();
    expect(wizardInput(s, MX).inlineContact).toEqual(customerFields(s.draft));
  });

  it('a hand-picked country is not overwritten by a late settings load', () => {
    let s = open({ countryCode: null });
    s = wizardReducer(s, { type: 'draftChanged', patch: { countryCode: 'DE' } });
    expect(wizardReducer(s, { type: 'countryDefaulted', countryCode: 'MX' }).draft.countryCode).toBe('DE');
  });

  it('a typed name is not overwritten by a found one', () => {
    let s = open();
    s = wizardReducer(s, { type: 'draftChanged', patch: { name: 'Jo', phone: '+12025550102' } });
    s = wizardReducer(s, {
      type: 'lookupFound',
      phone: '+12025550102',
      known: { id: 'i', name: 'Walk-in Joe', note: null },
    });
    expect(s.draft.name).toBe('Jo');
    expect(canAdoptKnownName(s)).toBe(true);
  });

  it('only WhatsApp hits are bookable', () => {
    const wa = {
      __typename: 'WhatsappContact',
      id: 'wa_1',
      name: 'Maria',
      phone: '1202',
      profilePictureUrl: null,
      note: null,
      conversation: null,
    } as ContactHit;
    const ig = {
      __typename: 'InstagramContact',
      id: 'ig_1',
      name: 'olivia',
      profilePictureUrl: null,
      note: null,
      conversation: null,
    } as ContactHit;
    expect(isBookableHit(wa)).toBe(true);
    expect(isBookableHit(ig)).toBe(false);
    expect(existingFromHit(wa)).toEqual({ contactId: 'wa_1', name: 'Maria', phone: '1202' });
    expect(existingFromHit(ig)).toBeNull();
  });
});

describe('wizardInput and submit', () => {
  it('formats instants in the bot offset and carries the inline customer', () => {
    const s = complete();
    const input = wizardInput(s, MX);
    expect(input.startTime).toBe('2026-08-18T10:00:00-06:00');
    expect(input.endTime).toBe('2026-08-18T10:30:00-06:00');
    expect(input.serviceID).toBe('svc-1');
    expect(input.specialistID).toBe('sp-1');
    expect(input.contactID).toBeNull();
    expect(input.inlineContact).toEqual({
      name: 'Dana Ray',
      phoneNumber: '+12025550100',
      countryCode: 'DE',
      note: null,
    });
  });

  it('an existing contact goes as contactID; a minted one overrides; skipped sends neither', () => {
    let s = complete();
    s = wizardReducer(s, { type: 'existingPicked', contact: { contactId: 'wa_1', name: 'Maria', phone: null } });
    expect(wizardInput(s, MX)).toMatchObject({ contactID: 'wa_1', inlineContact: null });
    expect(wizardInput(s, MX, { contactId: 'wa_new' }).contactID).toBe('wa_new');
    s = wizardReducer(s, { type: 'customerSkipped', skipped: true });
    expect(wizardInput(s, MX)).toMatchObject({ contactID: null, inlineContact: null });
  });

  it('no bot zone → UTC framing, never Z; no service → null', () => {
    const start = zonedInstant('2026-08-18', 600, MX);
    const s = open({ span: { start, end: start + 30 * 60_000, dayKey: '2026-08-18' }, contactId: 'wa_1' });
    const input = wizardInput(s, null);
    expect(input.startTime).toBe('2026-08-18T16:00:00+00:00');
    expect(input.serviceID).toBeNull();
    expect(input.specialistID).toBeNull();
  });

  it('throws without a time', () => {
    expect(() => wizardInput(open(), MX)).toThrow();
  });

  it('submit lifecycle: error survives until an edit', () => {
    let s = complete();
    s = wizardReducer(s, { type: 'submitStarted' });
    expect(s.submitting).toBe(true);
    s = wizardReducer(s, { type: 'submitFailed', message: 'nope' });
    expect(s).toMatchObject({ submitting: false, error: 'nope' });
    s = wizardReducer(s, { type: 'goTo', step: 'confirm' });
    expect(s.error).toBeNull();
    s = wizardReducer(s, { type: 'submitStarted' });
    s = wizardReducer(s, { type: 'submitDone' });
    expect(s).toMatchObject({ submitting: false, error: null });
  });
});
