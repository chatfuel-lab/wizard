/**
 * The specialist form: a draft over a copy of the record, a reducer, and the
 * two conversions the editor needs.
 *
 * Why a form and not save-on-blur: `specialistUpdate` is a FULL replace of
 * profile + schedule + services in one input, so a half-edited schedule saved
 * on blur would round-trip seven days to change one. The person edits a copy,
 * sees what is dirty, and presses Save once; the write is
 * `specialistInputOfDraft(draft)`, built from the same record it started as.
 *
 * Two shapes meet here: the API's `SpecialistSchedule` (seven NAMED days,
 * `mon`…`sun`) and `~ui`'s `WeekHours` (seven NUMERIC days, `Date#getDay`,
 * 0 = Sunday). `weekHoursOf` / `scheduleOf` map between them; `WEEKDAYS[i]`
 * in `lib/schedule.ts` is the name for index `i`, and that is the one place
 * the pairing lives.
 *
 * Errors come from two directions: `validateStaffDraft` before the round trip
 * (first name required, `validateSchedule` per day) and the API's code after
 * it (`SpecialistNameNotUnique` under the name, `SpecialistSchedule*` under
 * the hours). A server error sticks to its field until that field is edited
 * again; the draft is never thrown away on failure.
 */
import type { DayHours, WeekHours, Weekday } from '~ui';
import type { SpecialistInfoInput } from '~api/generated/bookings/graphql';
import type { SpecialistDayHours, SpecialistRecord, SpecialistSchedule } from '../types';
import { WEEKDAYS, scheduleInputOf, validateSchedule, type Weekday as WeekdayName } from './schedule';
import type { ImageRef } from './serviceInput';

export type { ImageRef };

export interface StaffDraft {
  firstName: string;
  lastName: string;
  aboutInfo: string;
  logo: ImageRef | null;
  /** Service ids, in the order they were checked (the API keeps a list). */
  serviceIds: string[];
  scheduleEnabled: boolean;
  hours: WeekHours;
}

export type StaffField = 'firstName' | 'lastName' | 'aboutInfo' | 'logo' | 'services' | 'schedule' | 'form';

export interface StaffErrors {
  firstName?: string;
  lastName?: string;
  aboutInfo?: string;
  logo?: string;
  services?: string;
  /** The schedule as a whole ("enable at least one day"). */
  schedule?: string;
  /** Per weekday, for `WeekHoursEditor`'s `errors`. */
  days?: Partial<Record<Weekday, string>>;
  form?: string;
}

export interface StaffFormState {
  original: StaffDraft;
  draft: StaffDraft;
  /** Client-side, recomputed on every edit. Shown per field once touched, or all after a save attempt. */
  errors: StaffErrors;
  /** From the last failed save; each entry clears when its field is edited. */
  serverErrors: StaffErrors;
  touched: Partial<Record<StaffField, true>>;
  /** Set by a save attempt; every client error shows from then on. */
  attempted: boolean;
  saving: boolean;
}

export type StaffFormAction =
  | { type: 'reset'; draft: StaffDraft }
  | { type: 'setText'; field: 'firstName' | 'lastName' | 'aboutInfo'; value: string }
  | { type: 'setLogo'; logo: ImageRef | null }
  | { type: 'toggleService'; id: string; on: boolean }
  | { type: 'setScheduleEnabled'; enabled: boolean }
  | { type: 'setHours'; hours: WeekHours }
  | { type: 'revert' }
  | { type: 'attempted' }
  | { type: 'saveStarted' }
  | { type: 'saveFailed'; code: string | null; message: string }
  | { type: 'saveSucceeded'; draft: StaffDraft };

export const FIRST_NAME_MAX = 60;
export const LAST_NAME_MAX = 60;
export const ABOUT_MAX = 1000;

const OFF_DAY: DayHours = { enabled: false, start: '09:00', end: '18:00', break: null };
const ON_DAY: DayHours = { enabled: true, start: '09:00', end: '18:00', break: null };

/** Mon–Fri 09:00–18:00 — the same starting point `lib/schedule.ts` `defaultSchedule` uses. */
export function defaultHours(): WeekHours {
  return {
    0: { ...OFF_DAY },
    1: { ...ON_DAY },
    2: { ...ON_DAY },
    3: { ...ON_DAY },
    4: { ...ON_DAY },
    5: { ...ON_DAY },
    6: { ...OFF_DAY },
  };
}

const dayHoursOf = (hours: SpecialistDayHours | null | undefined): DayHours | null =>
  hours
    ? {
        enabled: hours.enabled,
        start: hours.start,
        end: hours.end,
        break: hours.break ? { start: hours.break.start, end: hours.break.end } : null,
      }
    : null;

/**
 * The record's schedule as the editor's `WeekHours`. A day the API left null
 * is an off day with default times; a schedule with NO days at all (a new
 * specialist, or one whose schedule was never enabled) starts from Mon–Fri
 * 09–18 so flipping the switch on shows something sensible.
 */
export function weekHoursOf(schedule: SpecialistSchedule | null | undefined): WeekHours {
  if (!schedule) return defaultHours();
  const anyDay = WEEKDAYS.some((name) => schedule[name]);
  if (!anyDay) return defaultHours();
  const out = {} as WeekHours;
  for (let i = 0; i < 7; i += 1) {
    const day = i as Weekday;
    out[day] = dayHoursOf(schedule[WEEKDAYS[i]!]) ?? { ...OFF_DAY };
  }
  return out;
}

/** The editor's state as the API's schedule shape (no `__typename`s; the input builder ignores them). */
export function scheduleOf(enabled: boolean, hours: WeekHours): SpecialistSchedule {
  const day = (i: number): SpecialistDayHours => {
    const h = hours[i as Weekday];
    return {
      enabled: h.enabled,
      start: h.start,
      end: h.end,
      break: h.break ? { start: h.break.start, end: h.break.end } : null,
    };
  };
  return { enabled, sun: day(0), mon: day(1), tue: day(2), wed: day(3), thu: day(4), fri: day(5), sat: day(6) };
}

/** A draft for editing `record`, or a fresh one for "New specialist". */
export function staffDraftOf(record: SpecialistRecord | null): StaffDraft {
  if (!record)
    return {
      firstName: '',
      lastName: '',
      aboutInfo: '',
      logo: null,
      serviceIds: [],
      scheduleEnabled: false,
      hours: defaultHours(),
    };
  return {
    firstName: record.profile.firstName,
    lastName: record.profile.lastName ?? '',
    aboutInfo: record.profile.aboutInfo ?? '',
    logo: record.profile.logo ? { id: record.profile.logo.id, url: record.profile.logo.url || undefined } : null,
    serviceIds: record.services.map((s) => s.id),
    scheduleEnabled: Boolean(record.schedule?.enabled),
    hours: weekHoursOf(record.schedule),
  };
}

/** The full-replace input for a draft. */
export function specialistInputOfDraft(draft: StaffDraft): SpecialistInfoInput {
  return {
    profile: {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim() || null,
      aboutInfo: draft.aboutInfo.trim() || null,
      logo: draft.logo?.id ?? null,
    },
    schedule: scheduleInputOf(scheduleOf(draft.scheduleEnabled, draft.hours)),
    goodsServices: [...draft.serviceIds],
  };
}

const sameDay = (a: DayHours, b: DayHours) =>
  a.enabled === b.enabled &&
  a.start === b.start &&
  a.end === b.end &&
  (a.break?.start ?? null) === (b.break?.start ?? null) &&
  (a.break?.end ?? null) === (b.break?.end ?? null);

export function sameHours(a: WeekHours, b: WeekHours): boolean {
  for (let i = 0; i < 7; i += 1) if (!sameDay(a[i as Weekday], b[i as Weekday])) return false;
  return true;
}

export function sameStaffDraft(a: StaffDraft, b: StaffDraft): boolean {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.aboutInfo === b.aboutInfo &&
    (a.logo?.id ?? null) === (b.logo?.id ?? null) &&
    // Index-wise, not as a set: the API keeps `goodsServices` as a list and
    // `staffInputOf` sends it in draft order, so a reorder is a real edit. A
    // set comparison would call the form clean and lose it on navigate-away.
    a.serviceIds.length === b.serviceIds.length &&
    a.serviceIds.every((id, i) => id === b.serviceIds[i]) &&
    a.scheduleEnabled === b.scheduleEnabled &&
    // Hours only matter while the schedule is on; edits to a disabled week are still sent, but they are not "dirty" until it is.
    (a.scheduleEnabled ? sameHours(a.hours, b.hours) : true)
  );
}

/** What the server would reject, before the round trip. */
export function validateStaffDraft(draft: StaffDraft): StaffErrors {
  const errors: StaffErrors = {};
  const first = draft.firstName.trim();
  if (!first) errors.firstName = 'A first name is required.';
  else if (first.length > FIRST_NAME_MAX)
    errors.firstName = `The first name must be ${FIRST_NAME_MAX} characters or fewer.`;
  if (draft.lastName.trim().length > LAST_NAME_MAX)
    errors.lastName = `The last name must be ${LAST_NAME_MAX} characters or fewer.`;
  // Measured trimmed, because `staffInputOf` sends it trimmed — a bio that
  // fits after its trailing newline goes is a bio that fits.
  if (draft.aboutInfo.trim().length > ABOUT_MAX)
    errors.aboutInfo = `The description must be ${ABOUT_MAX} characters or fewer.`;
  if (draft.scheduleEnabled) {
    const problems = validateSchedule(scheduleOf(true, draft.hours));
    for (const problem of problems) {
      if (problem.day === null) errors.schedule = problem.message;
      else {
        const index = WEEKDAYS.indexOf(problem.day as WeekdayName) as Weekday;
        errors.days ??= {};
        // The first problem per day wins; the editor shows one line per row.
        errors.days[index] ??= problem.message;
      }
    }
  }
  return errors;
}

export function hasErrors(errors: StaffErrors): boolean {
  return Boolean(
    errors.firstName ||
    errors.lastName ||
    errors.aboutInfo ||
    errors.logo ||
    errors.services ||
    errors.schedule ||
    errors.form ||
    (errors.days && Object.keys(errors.days).length > 0),
  );
}

/** Which field an API error code lands under. */
export function staffFieldForCode(code: string | null): StaffField {
  if (!code) return 'form';
  if (code === 'SpecialistNameNotUnique' || code.startsWith('SpecialistFirstName')) return 'firstName';
  if (code.startsWith('SpecialistLastName')) return 'lastName';
  if (code.startsWith('SpecialistAboutInfo')) return 'aboutInfo';
  if (code.startsWith('SpecialistSchedule')) return 'schedule';
  return 'form';
}

export function initialStaffForm(draft: StaffDraft): StaffFormState {
  return {
    original: draft,
    draft,
    errors: validateStaffDraft(draft),
    serverErrors: {},
    touched: {},
    attempted: false,
    saving: false,
  };
}

/** Client errors re-derived, the touched field's server error dropped, the form-level one dropped on any edit. */
function edited(state: StaffFormState, draft: StaffDraft, field: StaffField): StaffFormState {
  const serverErrors: StaffErrors = { ...state.serverErrors };
  delete serverErrors[field];
  if (field === 'schedule') delete serverErrors.days;
  delete serverErrors.form;
  return {
    ...state,
    draft,
    errors: validateStaffDraft(draft),
    serverErrors,
    touched: { ...state.touched, [field]: true },
  };
}

export function staffFormReducer(state: StaffFormState, action: StaffFormAction): StaffFormState {
  switch (action.type) {
    case 'reset':
      return initialStaffForm(action.draft);
    case 'setText':
      return edited(state, { ...state.draft, [action.field]: action.value }, action.field);
    case 'setLogo':
      return edited(state, { ...state.draft, logo: action.logo }, 'logo');
    case 'toggleService': {
      const has = state.draft.serviceIds.includes(action.id);
      if (has === action.on) return state;
      const serviceIds = action.on
        ? [...state.draft.serviceIds, action.id]
        : state.draft.serviceIds.filter((id) => id !== action.id);
      return edited(state, { ...state.draft, serviceIds }, 'services');
    }
    case 'setScheduleEnabled':
      return edited(state, { ...state.draft, scheduleEnabled: action.enabled }, 'schedule');
    case 'setHours':
      return edited(state, { ...state.draft, hours: action.hours }, 'schedule');
    case 'revert':
      return { ...initialStaffForm(state.original), saving: state.saving };
    case 'attempted':
      return state.attempted ? state : { ...state, attempted: true };
    case 'saveStarted':
      return { ...state, saving: true, attempted: true, serverErrors: {} };
    case 'saveFailed': {
      const field = staffFieldForCode(action.code);
      return { ...state, saving: false, serverErrors: { [field]: action.message } };
    }
    case 'saveSucceeded':
      return initialStaffForm(action.draft);
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function isDirty(state: Pick<StaffFormState, 'original' | 'draft'>): boolean {
  return !sameStaffDraft(state.original, state.draft);
}

/** Save is offered when something changed and nothing is in flight; validity is checked on press. */
export function canSave(state: StaffFormState): boolean {
  return !state.saving && isDirty(state);
}

/** The message to show under a field right now: the server's, else the client's once touched / attempted. */
export function fieldError(state: StaffFormState, field: Exclude<StaffField, 'form'>): string | null {
  const server = state.serverErrors[field];
  if (server) return server;
  if (!state.attempted && !state.touched[field]) return null;
  return state.errors[field] ?? null;
}

/** Per-day messages for `WeekHoursEditor`: the server's if any, else the client's once shown. */
export function dayErrors(state: StaffFormState): Partial<Record<Weekday, string>> {
  if (state.serverErrors.days) return state.serverErrors.days;
  if (!state.attempted && !state.touched.schedule) return {};
  return state.errors.days ?? {};
}

export function formError(state: StaffFormState): string | null {
  return state.serverErrors.form ?? null;
}
