/**
 * A specialist between the API record, the full-replace input and the
 * dialog's draft.
 *
 * The trap this file exists for: `SpecialistInfoInput` is a WHOLE replace and
 * its `schedule` is NON-NULL, so saving a changed about-line re-sends the
 * working hours too. The Team source does not edit hours — that is a booking
 * concern and belongs to the bookings module — which means the only correct
 * schedule to send is the one the API last returned, unchanged, field by
 * field. `KBSpecialistDay` in the module's operations exists purely so there
 * IS one to send: without it every rename here would silently clear a
 * specialist's week.
 *
 * A specialist created here starts with `enabled: false`, because
 * `SpecialistScheduleIsEmpty` is what an enabled schedule with no days gets,
 * and a name is a reasonable thing to add before an availability calendar.
 */
import type { SpecialistInfoInput, SpecialistScheduleInput } from '~api/generated/knowledge-base/graphql';
import type { SpecialistInfo } from '../types';
import type { ImageRef } from './images';

export interface SpecialistDraft {
  firstName: string;
  lastName: string;
  aboutInfo: string;
  /** The avatar, or null. One image, not a list. */
  logo: ImageRef | null;
  /** Ids of the services this person does. */
  serviceIds: string[];
}

export type SpecialistField = 'firstName' | 'lastName' | 'aboutInfo' | 'logo' | 'services' | 'form';
export type SpecialistErrors = Partial<Record<SpecialistField, string>>;

export const FIRST_NAME_MAX = 60;
export const LAST_NAME_MAX = 60;
export const ABOUT_MAX = 500;

type ScheduleRecord = SpecialistInfo['schedule'];
type DayRecord = NonNullable<ScheduleRecord>['mon'];

const dayInput = (day: DayRecord) =>
  day
    ? {
        enabled: day.enabled,
        start: day.start,
        end: day.end,
        break: day.break ? { start: day.break.start, end: day.break.end } : null,
      }
    : null;

/**
 * The record's own schedule as an input, mapped field by field. NOT a spread:
 * the read carries `__typename` on every level and the input type has no such
 * field, so a spread would send the server keys it rejects.
 */
export function scheduleInputOf(schedule: ScheduleRecord): SpecialistScheduleInput {
  if (!schedule) return { enabled: false };
  return {
    enabled: schedule.enabled,
    sun: dayInput(schedule.sun),
    mon: dayInput(schedule.mon),
    tue: dayInput(schedule.tue),
    wed: dayInput(schedule.wed),
    thu: dayInput(schedule.thu),
    fri: dayInput(schedule.fri),
    sat: dayInput(schedule.sat),
  };
}

export function specialistDraftOf(record: SpecialistInfo | null): SpecialistDraft {
  if (!record) return { firstName: '', lastName: '', aboutInfo: '', logo: null, serviceIds: [] };
  return {
    firstName: record.profile.firstName,
    lastName: record.profile.lastName ?? '',
    aboutInfo: record.profile.aboutInfo ?? '',
    logo: record.profile.logo ? { id: record.profile.logo.id, url: record.profile.logo.url || undefined } : null,
    serviceIds: record.services.map((service) => service.id),
  };
}

export function validateSpecialistDraft(draft: SpecialistDraft): SpecialistErrors {
  const errors: SpecialistErrors = {};
  const first = draft.firstName.trim();
  if (!first) errors.firstName = 'A first name is required.';
  else if (first.length > FIRST_NAME_MAX)
    errors.firstName = `The first name must be ${FIRST_NAME_MAX} characters or fewer.`;
  if (draft.lastName.trim().length > LAST_NAME_MAX)
    errors.lastName = `The last name must be ${LAST_NAME_MAX} characters or fewer.`;
  if (draft.aboutInfo.length > ABOUT_MAX) errors.aboutInfo = `The about line must be ${ABOUT_MAX} characters or fewer.`;
  return errors;
}

/**
 * The write. `record` is the specialist being edited — it is what carries the
 * schedule to re-send — and null for a new one.
 */
export function specialistInfoInputOf(draft: SpecialistDraft, record: SpecialistInfo | null): SpecialistInfoInput {
  const lastName = draft.lastName.trim();
  const aboutInfo = draft.aboutInfo.trim();
  return {
    profile: {
      firstName: draft.firstName.trim(),
      /* Blank is "no last name", not an empty string the AI would read. */
      lastName: lastName === '' ? null : lastName,
      aboutInfo: aboutInfo === '' ? null : aboutInfo,
      logo: draft.logo?.id ?? null,
    },
    schedule: scheduleInputOf(record?.schedule ?? null),
    goodsServices: [...draft.serviceIds],
  };
}

export const sameSpecialistDraft = (a: SpecialistDraft, b: SpecialistDraft): boolean =>
  a.firstName === b.firstName &&
  a.lastName === b.lastName &&
  a.aboutInfo === b.aboutInfo &&
  (a.logo?.id ?? null) === (b.logo?.id ?? null) &&
  a.serviceIds.length === b.serviceIds.length &&
  a.serviceIds.every((id, index) => id === b.serviceIds[index]);

/** Toggle one service on a draft, keeping the list in a stable order. */
export const toggleService = (serviceIds: readonly string[], id: string, on: boolean): string[] =>
  on ? (serviceIds.includes(id) ? [...serviceIds] : [...serviceIds, id]) : serviceIds.filter((known) => known !== id);

export function specialistFieldForCode(code: string | null): SpecialistField {
  if (!code) return 'form';
  if (
    code === 'SpecialistFirstNameRequired' ||
    code === 'SpecialistFirstNameTooLong' ||
    code === 'SpecialistNameNotUnique'
  )
    return 'firstName';
  if (code === 'SpecialistLastNameTooLong') return 'lastName';
  if (code === 'SpecialistAboutInfoTooLong') return 'aboutInfo';
  if (code === 'FileTooBig' || code === 'FileContentTypeNotSupported') return 'logo';
  return 'form';
}

/** The name on a row, with a fallback so a card is never blank while somebody types. */
export const draftName = (draft: SpecialistDraft): string =>
  [draft.firstName, draft.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ') || 'New specialist';
