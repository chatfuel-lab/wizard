/**
 * The "New booking" wizard as a pure reducer (livechat's `templateFillStore`
 * pattern): six steps, the state each one collects, what makes a step valid,
 * where a prefill lands, and the one input the create mutation gets at the
 * end. The components hold JSX and the calls; every rule that could be wrong
 * is here and pinned in `wizardStore.test.ts`.
 *
 * Time is kept as INSTANTS (`start`/`end` in ms) plus the bot-zone `dayKey`
 * availability was asked for. Slots arrive as bot-zone `HH:mm` on that day
 * (`slotToTime` turns one into instants), a custom time is typed in the
 * display zone (the component turns it into instants), and a prefilled span
 * from the grid already is instants — so the reducer never needs a zone, and
 * the confirm step formats the same two numbers in whichever zone it shows.
 *
 * "Anyone" is a real choice, not the absence of one: it means "the first
 * specialist free at the slot I pick" (`resolveSlotSpecialist`), which the
 * confirm step prints as "with Maria" so the operator knows who got it.
 *
 * The customer step keeps BOTH drafts — the picked existing contact and the
 * typed new one — so flipping the segmented control back and forth loses
 * nothing; `resolvedCustomer` says which one the booking gets.
 */
import type { BookingInput } from '~api/generated/bookings/graphql';
import type { ContactHit, SpecialistSchedule } from '../types';
import { WEEKDAYS, workingRanges } from './schedule';
import { slotInstant, type Slot } from './slots';
import { parseDayKey, toZoneIso, wallClock, weekdayOfKey } from './zone';

export type WizardStep = 'service' | 'specialist' | 'day' | 'time' | 'customer' | 'confirm';

export const WIZARD_STEPS: readonly WizardStep[] = ['service', 'specialist', 'day', 'time', 'customer', 'confirm'];

export const STEP_LABELS: Record<WizardStep, string> = {
  service: 'Service',
  specialist: 'Specialist',
  day: 'Day',
  time: 'Time',
  customer: 'Customer',
  confirm: 'Confirm',
};

export type ServiceChoice =
  { kind: 'unset' } | { kind: 'none' } | { kind: 'service'; id: string; durationMinutes: number };

export type SpecialistChoice = { kind: 'unset' } | { kind: 'anyone' } | { kind: 'one'; id: string };

export interface WizardTime {
  /** Instants, ms. */
  start: number;
  end: number;
  /** Who takes it: the chosen specialist, the slot's first free one for "anyone", or null (unassigned). */
  specialistId: string | null;
  source: 'slot' | 'custom' | 'prefill';
}

export interface ExistingContact {
  contactId: string;
  /** Null when only an id arrived (`?new=1&contact=`); the created record shows the name. */
  name: string | null;
  phone: string | null;
}

export interface NewCustomerDraft {
  name: string;
  phone: string;
  countryCode: string;
  note: string;
  /** "Also create a WhatsApp contact" — `BookingWhatsappContactCreate` first, then book with its id. */
  createContact: boolean;
}

export interface KnownInline {
  id: string;
  name: string;
  note: string | null;
}

/** The last `BookingInlineContactSearch` answer, keyed by the phone it was asked for. */
export interface InlineLookup {
  phone: string;
  status: 'looking' | 'found' | 'missing';
  known: KnownInline | null;
}

export type CustomerMode = 'existing' | 'new';

export type WizardCustomer =
  | { kind: 'none' }
  | { kind: 'skipped' }
  | { kind: 'existing'; contact: ExistingContact }
  | { kind: 'new'; draft: NewCustomerDraft };

export interface WizardState {
  step: WizardStep;
  service: ServiceChoice;
  specialist: SpecialistChoice;
  /** The bot-zone day availability is asked for; also the day a custom time is typed on. */
  dayKey: string | null;
  time: WizardTime | null;
  /** The "Custom time" escape hatch is open on the time step. */
  customTime: boolean;
  customerMode: CustomerMode;
  existing: ExistingContact | null;
  draft: NewCustomerDraft;
  lookup: InlineLookup | null;
  customerSkipped: boolean;
  submitting: boolean;
  /** Why the last create did not land; cleared by any edit. */
  error: string | null;
}

export type WizardAction =
  | { type: 'serviceChosen'; choice: Exclude<ServiceChoice, { kind: 'unset' }> }
  | { type: 'specialistChosen'; choice: Exclude<SpecialistChoice, { kind: 'unset' }> }
  | { type: 'dayChosen'; dayKey: string }
  | { type: 'timeChosen'; time: WizardTime }
  | { type: 'timeCleared' }
  | { type: 'customTimeToggled'; on: boolean }
  | { type: 'customerModeSet'; mode: CustomerMode }
  | { type: 'existingPicked'; contact: ExistingContact | null }
  | { type: 'draftChanged'; patch: Partial<NewCustomerDraft> }
  /** The bot's country arrived after the wizard opened (a deep link races the settings load); adopted only into a draft nobody typed in. */
  | { type: 'countryDefaulted'; countryCode: string }
  | { type: 'lookupStarted'; phone: string }
  | { type: 'lookupFound'; phone: string; known: KnownInline }
  | { type: 'lookupMissed'; phone: string }
  | { type: 'knownNameAdopted' }
  | { type: 'customerSkipped'; skipped: boolean }
  | { type: 'goTo'; step: WizardStep }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'submitStarted' }
  | { type: 'submitFailed'; message: string }
  | { type: 'submitDone' };

export const DEFAULT_COUNTRY = 'US';

export function emptyDraft(countryCode: string | null): NewCustomerDraft {
  return { name: '', phone: '', countryCode: countryCode ?? DEFAULT_COUNTRY, note: '', createContact: false };
}

// ---------------------------------------------------------------------------
// Opening — where a prefill lands
// ---------------------------------------------------------------------------

export interface WizardOpenInput {
  /** From `?service=` / the calendar's service filter, resolved against the catalog. */
  service: { id: string; durationMinutes: number } | null;
  specialistId: string | null;
  /** From a grid drag / `?new=1&start=&end=`: both instants and the bot-zone day of the start. */
  span: { start: number; end: number; dayKey: string } | null;
  contactId: string | null;
  todayKey: string;
  countryCode: string | null;
}

/**
 * The initial state for a prefill. A span (grid drag) lands on Customer with
 * the time editable; a service alone lands on Time for today; a specialist
 * alone lands on Service with them pre-picked; nothing lands on Service.
 * Concretely: the step is the first one that is not yet valid.
 */
export function openWizard(input: WizardOpenInput): WizardState {
  const service: ServiceChoice = input.service
    ? { kind: 'service', id: input.service.id, durationMinutes: input.service.durationMinutes }
    : input.span
      ? { kind: 'none' }
      : { kind: 'unset' };
  const specialist: SpecialistChoice = input.specialistId
    ? { kind: 'one', id: input.specialistId }
    : input.span || input.service
      ? { kind: 'anyone' }
      : { kind: 'unset' };
  const time: WizardTime | null = input.span
    ? { start: input.span.start, end: input.span.end, specialistId: input.specialistId, source: 'prefill' }
    : null;
  const state: WizardState = {
    step: 'service',
    service,
    specialist,
    dayKey: input.span ? input.span.dayKey : input.service ? input.todayKey : null,
    time,
    customTime: false,
    customerMode: 'existing',
    existing: input.contactId ? { contactId: input.contactId, name: null, phone: null } : null,
    draft: emptyDraft(input.countryCode),
    lookup: null,
    customerSkipped: false,
    submitting: false,
    error: null,
  };
  return { ...state, step: firstIncompleteStep(state) };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  const next = reduce(state, action);
  if (next === state) return state;
  // Any edit invalidates the last create error; the submit actions own it.
  if (action.type !== 'submitFailed' && action.type !== 'submitStarted' && next.error !== null)
    return { ...next, error: null };
  return next;
}

function reduce(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'serviceChosen': {
      const changed = !sameService(state.service, action.choice);
      let time = state.time;
      // A slot was sliced for the old duration — it no longer applies. A
      // custom or prefilled span keeps its start; its end follows the new
      // duration, or the booking goes to submit at the old length.
      if (changed && time) {
        if (time.source === 'slot') time = null;
        else if (action.choice.kind === 'service')
          time = { ...time, end: time.start + action.choice.durationMinutes * 60_000 };
      }
      return { ...state, service: action.choice, time };
    }
    case 'specialistChosen': {
      const changed = !sameSpecialist(state.specialist, action.choice);
      let time = state.time;
      if (changed && time) {
        // Availability differs per specialist; a picked slot is void. A custom
        // or prefilled span stays and is simply reassigned.
        time =
          time.source === 'slot'
            ? null
            : { ...time, specialistId: action.choice.kind === 'one' ? action.choice.id : null };
      }
      return { ...state, specialist: action.choice, time };
    }
    case 'dayChosen':
      if (state.dayKey === action.dayKey) return state;
      // The component re-issues a custom / prefilled span on the new day; a slot is void.
      return { ...state, dayKey: action.dayKey, time: state.time && state.time.source !== 'slot' ? state.time : null };
    case 'timeChosen':
      return { ...state, time: action.time, customTime: action.time.source === 'custom' ? true : state.customTime };
    case 'timeCleared':
      return state.time === null ? state : { ...state, time: null };
    case 'customTimeToggled':
      if (state.customTime === action.on) return state;
      return {
        ...state,
        customTime: action.on,
        time: !action.on && state.time?.source === 'custom' ? null : state.time,
      };
    case 'customerModeSet':
      return state.customerMode === action.mode
        ? state
        : { ...state, customerMode: action.mode, customerSkipped: false };
    case 'existingPicked':
      return { ...state, existing: action.contact, customerMode: 'existing', customerSkipped: false };
    case 'draftChanged':
      return { ...state, draft: { ...state.draft, ...action.patch }, customerMode: 'new', customerSkipped: false };
    case 'countryDefaulted':
      // Pristine means the country too: a country other than `DEFAULT_COUNTRY`
      // is one somebody chose — either the picker, or an earlier settings load —
      // and a late answer must not move it under them.
      if (
        state.draft.phone !== '' ||
        state.draft.name !== '' ||
        state.draft.countryCode !== DEFAULT_COUNTRY ||
        state.draft.countryCode === action.countryCode
      )
        return state;
      return { ...state, draft: { ...state.draft, countryCode: action.countryCode } };
    case 'lookupStarted':
      return { ...state, lookup: { phone: action.phone, status: 'looking', known: null } };
    case 'lookupFound': {
      const lookup: InlineLookup = { phone: action.phone, status: 'found', known: action.known };
      // Nothing typed yet → the known name is the name; otherwise it is offered.
      const adopt = state.draft.name.trim() === '';
      const draft = adopt ? adoptKnown(state.draft, action.known) : state.draft;
      return { ...state, lookup, draft };
    }
    case 'lookupMissed':
      return { ...state, lookup: { phone: action.phone, status: 'missing', known: null } };
    case 'knownNameAdopted': {
      const known = relevantLookup(state)?.known;
      if (!known) return state;
      return { ...state, draft: adoptKnown(state.draft, known) };
    }
    case 'customerSkipped':
      return state.customerSkipped === action.skipped ? state : { ...state, customerSkipped: action.skipped };
    case 'goTo':
      return canGoTo(state, action.step) && state.step !== action.step ? { ...state, step: action.step } : state;
    case 'next': {
      const after = nextStep(state.step);
      if (!after || !stepValid(state, state.step)) return state;
      return { ...state, step: after };
    }
    case 'back': {
      const before = prevStep(state.step);
      return before ? { ...state, step: before } : state;
    }
    case 'submitStarted':
      return { ...state, submitting: true, error: null };
    case 'submitFailed':
      return { ...state, submitting: false, error: action.message };
    case 'submitDone':
      return { ...state, submitting: false, error: null };
  }
}

function adoptKnown(draft: NewCustomerDraft, known: KnownInline): NewCustomerDraft {
  return { ...draft, name: known.name, note: draft.note.trim() === '' && known.note ? known.note : draft.note };
}

const sameService = (a: ServiceChoice, b: ServiceChoice) =>
  a.kind === b.kind && (a.kind !== 'service' || b.kind !== 'service' || a.id === b.id);
const sameSpecialist = (a: SpecialistChoice, b: SpecialistChoice) =>
  a.kind === b.kind && (a.kind !== 'one' || b.kind !== 'one' || a.id === b.id);

// ---------------------------------------------------------------------------
// Steps — order, validity, reachability
// ---------------------------------------------------------------------------

export function nextStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[WIZARD_STEPS.indexOf(step) + 1] ?? null;
}

export function prevStep(step: WizardStep): WizardStep | null {
  const at = WIZARD_STEPS.indexOf(step);
  return at > 0 ? WIZARD_STEPS[at - 1]! : null;
}

/** Why a step is not yet valid — the Next button's reason — or null when it is. */
export function stepProblem(state: WizardState, step: WizardStep): string | null {
  switch (step) {
    case 'service':
      return state.service.kind === 'unset' ? 'Pick a service.' : null;
    case 'specialist':
      return state.specialist.kind === 'unset' ? 'Pick a specialist, or anyone.' : null;
    case 'day':
      return state.dayKey && parseDayKey(state.dayKey) ? null : 'Pick a day.';
    case 'time':
      if (!state.time) return 'Pick a time.';
      return state.time.end > state.time.start ? null : 'The booking ends before it starts.';
    case 'customer': {
      const customer = resolvedCustomer(state);
      if (customer.kind === 'none') {
        return state.customerMode === 'new'
          ? draftProblem(state.draft)
          : 'Pick a customer, add a new one, or continue without.';
      }
      return null;
    }
    case 'confirm':
      for (const earlier of WIZARD_STEPS) {
        if (earlier === 'confirm') break;
        const problem = stepProblem(state, earlier);
        if (problem) return problem;
      }
      return null;
  }
}

export function stepValid(state: WizardState, step: WizardStep): boolean {
  return stepProblem(state, step) === null;
}

/** A step is reachable when every step before it is valid (the current one always is). */
export function canGoTo(state: WizardState, step: WizardStep): boolean {
  const target = WIZARD_STEPS.indexOf(step);
  if (target < 0) return false;
  if (target <= WIZARD_STEPS.indexOf(state.step)) return true;
  return WIZARD_STEPS.slice(0, target).every((earlier) => stepValid(state, earlier));
}

export function firstIncompleteStep(state: WizardState): WizardStep {
  return WIZARD_STEPS.find((step) => !stepValid(state, step)) ?? 'confirm';
}

export type WizardStepStatus = 'complete' | 'current' | 'upcoming' | 'error';

/** What the Stepper draws: valid earlier steps complete, invalid ones in error, the rest upcoming. */
export function stepStatuses(state: WizardState): Record<WizardStep, WizardStepStatus> {
  const currentAt = WIZARD_STEPS.indexOf(state.step);
  const out = {} as Record<WizardStep, WizardStepStatus>;
  WIZARD_STEPS.forEach((step, index) => {
    if (index === currentAt) out[step] = 'current';
    else if (index < currentAt) out[step] = stepValid(state, step) ? 'complete' : 'error';
    else out[step] = stepValid(state, step) && step !== 'confirm' ? 'complete' : 'upcoming';
  });
  return out;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

/** Digits with an optional leading `+`, or null when it is not a phone number. Spaces, dashes and parentheses are dropped. */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}

export function draftProblem(draft: NewCustomerDraft): string | null {
  if (draft.phone.trim() === '' && draft.name.trim() === '') return 'Enter the customer’s name and phone number.';
  if (!normalizePhone(draft.phone)) return 'Enter a phone number with the country code, like +1 202 555 0102.';
  if (draft.name.trim() === '') return 'A name is required with a phone number.';
  return null;
}

export function draftValid(draft: NewCustomerDraft): boolean {
  return draftProblem(draft) === null;
}

/** The lookup answer for the phone currently typed, or null when the phone moved on. */
export function relevantLookup(state: Pick<WizardState, 'draft' | 'lookup'>): InlineLookup | null {
  if (!state.lookup) return null;
  const typed = normalizePhone(state.draft.phone);
  return typed !== null && typed === normalizePhone(state.lookup.phone) ? state.lookup : null;
}

/** True when a known inline name is available and differs from what is typed — the "Use this name" offer. */
export function canAdoptKnownName(state: Pick<WizardState, 'draft' | 'lookup'>): boolean {
  const known = relevantLookup(state)?.known;
  return Boolean(known) && known!.name.trim() !== state.draft.name.trim();
}

export function resolvedCustomer(
  state: Pick<WizardState, 'customerMode' | 'existing' | 'draft' | 'customerSkipped'>,
): WizardCustomer {
  if (state.customerSkipped) return { kind: 'skipped' };
  if (state.customerMode === 'existing')
    return state.existing ? { kind: 'existing', contact: state.existing } : { kind: 'none' };
  return draftValid(state.draft) ? { kind: 'new', draft: state.draft } : { kind: 'none' };
}

/** A search hit as the wizard keeps it; null for a contact that cannot be booked (not WhatsApp). */
export function existingFromHit(hit: ContactHit): ExistingContact | null {
  if (hit.__typename !== 'WhatsappContact') return null;
  return { contactId: hit.id, name: hit.name, phone: hit.phone };
}

export function isBookableHit(hit: Pick<ContactHit, '__typename'>): boolean {
  return hit.__typename === 'WhatsappContact';
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** "Anyone" resolves to the first specialist free at the slot; a chosen one is kept. */
export function resolveSlotSpecialist(choice: SpecialistChoice, slot: Pick<Slot, 'specialistIds'>): string | null {
  if (choice.kind === 'one') return choice.id;
  return slot.specialistIds[0] ?? null;
}

/** The instants a slot means for `durationMinutes` (bot-zone `HH:mm` on `dayKey`). */
export function slotToTime(
  dayKey: string,
  slot: Pick<Slot, 'minute' | 'specialistIds'>,
  durationMinutes: number,
  botZone: string,
  choice: SpecialistChoice,
): WizardTime {
  const start = slotInstant(dayKey, slot.minute, botZone);
  return {
    start,
    end: start + durationMinutes * 60_000,
    specialistId: resolveSlotSpecialist(choice, slot),
    source: 'slot',
  };
}

/** The duration the wizard would book: the picked span's, else the service's, else null. */
export function wizardDuration(state: Pick<WizardState, 'time' | 'service'>): number | null {
  if (state.time) return Math.round((state.time.end - state.time.start) / 60_000);
  return state.service.kind === 'service' ? state.service.durationMinutes : null;
}

/** The specialist ids whose availability the time step reads: the chosen one, or everyone offering the service. */
export function wantedSpecialistIds(choice: SpecialistChoice, offering: readonly string[]): string[] | null {
  if (choice.kind === 'one') return [choice.id];
  return offering.length > 0 ? [...offering] : null;
}

/**
 * True when `[start, end)` falls (even partly) outside the specialist's
 * working hours on that bot-zone day — the custom-time warning. A specialist
 * with no schedule, or a day off, is "outside" too. Null schedule → true.
 */
export function isOutsideSchedule(
  schedule: SpecialistSchedule | null | undefined,
  start: number,
  end: number,
  botZone: string,
): boolean {
  const s = wallClock(start, botZone);
  const e = wallClock(end, botZone);
  if (s.dayKey !== e.dayKey && !(e.dayKey > s.dayKey && e.minuteOfDay === 0)) return true;
  const ranges = workingRanges(schedule, WEEKDAYS[s.weekday]!);
  const endMinute = e.dayKey === s.dayKey ? e.minuteOfDay : 24 * 60;
  return !ranges.some((r) => r.start <= s.minuteOfDay && endMinute <= r.end);
}

/** A working day for at least one of the schedules — the day step's marker. */
export function isWorkingDay(schedules: readonly (SpecialistSchedule | null | undefined)[], dayKey: string): boolean {
  const weekday = WEEKDAYS[weekdayOfKey(dayKey)]!;
  return schedules.some((schedule) => workingRanges(schedule, weekday).length > 0);
}

// ---------------------------------------------------------------------------
// The create input
// ---------------------------------------------------------------------------

/**
 * `BookingCreate`'s input from a complete state. Instants are formatted with
 * the bot's offset (UTC when the bot has none). A `contactId` override is
 * what the component passes after "Also create a WhatsApp contact" minted one.
 *
 * Throws only for a missing time — the one piece with nothing sensible to send.
 * A half-typed customer does not throw: `resolvedCustomer` reads it as `none`
 * and the booking goes out with no customer at all, the same shape "Skip" makes.
 * The Create button is disabled before either can happen (`stepValid`).
 */
export function wizardInput(
  state: WizardState,
  botZone: string | null,
  override: { contactId?: string } = {},
): BookingInput {
  if (!state.time) throw new Error('wizardInput: no time chosen');
  const wire = botZone ?? 'UTC';
  const customer = resolvedCustomer(state);
  const input: BookingInput = {
    startTime: toZoneIso(state.time.start, wire),
    endTime: toZoneIso(state.time.end, wire),
    serviceID: state.service.kind === 'service' ? state.service.id : null,
    specialistID: state.time.specialistId,
    contactID: null,
    inlineContact: null,
  };
  if (override.contactId) input.contactID = override.contactId;
  else if (customer.kind === 'existing') input.contactID = customer.contact.contactId;
  else if (customer.kind === 'new') input.inlineContact = customerFields(customer.draft);
  return input;
}

/**
 * The customer fields a write carries, from a draft `draftValid` has passed:
 * `BookingCreate`'s `inlineContact` verbatim, and `WhatsappContactCreate`'s
 * `data` once `useContactCreate` adds its `source`. One builder, so the
 * customer on a booking and the contact minted for the same booking cannot drift.
 *
 * The phone is the normalized one — `draftValid` IS `normalizePhone`, so a
 * caller that checked it (both do) has one, and a caller that did not has no
 * business writing a customer at all.
 */
export function customerFields(draft: NewCustomerDraft): {
  name: string;
  phoneNumber: string;
  countryCode: string | null;
  note: string | null;
} {
  return {
    name: draft.name.trim(),
    phoneNumber: normalizePhone(draft.phone)!,
    countryCode: draft.countryCode || null,
    note: draft.note.trim() === '' ? null : draft.note.trim(),
  };
}
