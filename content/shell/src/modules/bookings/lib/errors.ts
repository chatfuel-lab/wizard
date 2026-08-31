/**
 * API errors → the sentence a person reads.
 *
 * The API sometimes wraps its codes one level down: the real code sits at
 * `errors[0].extensions.errors[0].extensions.code` (e.g.
 * `BookingInlineContactDoesNotExist`, `InternalServerError`) under a generic
 * outer message. The shared `nestedErrorCodes` walks both places, nested first,
 * so a code check works either way.
 *
 * Messages are keyed by code so a caller can add its own; the fallback is the
 * server's own text, which is at least honest.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';

/** The first defined error code, top-level or nested, or null. */
export function errorCode(err: unknown): string | null {
  return nestedErrorCodes(err)[0] ?? null;
}

export function isErrorCode(err: unknown, code: string): boolean {
  return errorCode(err) === code;
}

const MESSAGES: Record<string, string> = {
  // bookings
  BookingDoesNotExist: 'This booking no longer exists.',
  BookingStartTimeRequired: 'A start time is required.',
  BookingEndTimeRequired: 'An end time is required.',
  BookingEndTimeBeforeStartTime: 'The booking ends before it starts — check the time and duration.',
  BookingInvalidDuration: 'That duration is not allowed — it is too long, or the end comes before the start.',
  BookingContactPlatformNotAllowed: 'Only WhatsApp contacts can be booked.',
  BookingInlineContactNoteTooLong: 'The note is too long.',
  BookingInlineContactDoesNotExist: 'No customer with that phone number yet.',
  WhatsappPhoneInvalid: 'That phone number does not look valid.',
  ContactNameRequired: 'A customer name is required with a phone number.',
  ContactNameTooLong: 'The customer name is too long.',
  // specialists
  SpecialistDoesNotExist: 'This specialist no longer exists.',
  SpecialistNameNotUnique: 'A specialist with this name already exists.',
  SpecialistFirstNameRequired: 'A first name is required.',
  SpecialistFirstNameTooLong: 'The first name is too long.',
  SpecialistLastNameTooLong: 'The last name is too long.',
  SpecialistAboutInfoTooLong: 'The description is too long.',
  SpecialistMaxCountReached: 'This bot has reached its limit of specialists.',
  SpecialistScheduleIsEmpty: 'Enable at least one working day, or turn the schedule off.',
  SpecialistScheduleInvalidTimeFormat: 'Working hours must be HH:mm.',
  SpecialistScheduleInvalidTimeRange: 'Working hours must end after they start, and a break must fall inside them.',
  SpecialistGoogleCalendarLinkDoesNotExist: 'That connection link no longer exists.',
  SpecialistNotEnoughGooglePermissions: 'Google did not grant calendar access — the specialist needs to allow it.',
  // services
  GoodsItemNotFound: 'This service no longer exists.',
  GoodsItemsTooMuchForBot: 'This bot has reached its limit of catalog items.',
  GoodsItemTitleRequired: 'A title is required.',
  GoodsItemTitleTooShort: 'The title is too short.',
  GoodsItemTitleTooLong: 'The title is too long.',
  GoodsItemTitleNotUnique: 'A service with this title already exists.',
  GoodsItemDescriptionTooLong: 'The description is too long.',
  GoodsItemPriceAmountWrongFormat: 'The price must be a number like 25 or 25.50.',
  GoodsItemPriceCurrencyRequired: 'Pick a currency for the price.',
  GoodsServiceImagesTooMuch: 'Too many images for one service.',
  GoodsServiceDurationRequired: 'A duration is required.',
  // The schema declares the bare spelling only; the `Err`-prefixed one is kept
  // because `serviceFieldForCode` routes it too (`code.includes('Duration')`)
  // and a routed code with no message would read as a generic failure.
  ErrGoodsServiceDurationRequired: 'A duration is required.',
  // google calendar
  GoogleCalendarSyncAlreadyInProgress: 'A sync is already running for this specialist.',
  GoogleCalendarNotConnected: 'No Google Calendar is connected for this specialist yet.',
  GoogleCalendarSyncRateLimited: 'Google Calendar sync was started too recently — try again in a bit.',
  GoogleCalendarDoesNotExists: 'That Google Calendar no longer exists.',
  // settings
  BotInvalidTimezone: 'That is not a valid time zone.',
  BookingNotificationChannelNotAllowed: 'That notification channel is not available on this bot.',
  // generic
  NotEnoughPermissions: 'Your role cannot do that on this bot.',
  Unauthorized: 'Your session token was rejected — rotate it and reload.',
};

/** What a toast or an inline error says for `err`. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const code = errorCode(err);
  if (code === 'InternalServerError')
    return 'The booking service refused this — it usually means the request is not allowed (for example, a booking cannot go back to Pending).';
  if (code && MESSAGES[code]) return MESSAGES[code]!;
  // A bare upstream failure carries no code of its own; a malformed phone number
  // is the usual cause. The proxy tags it `UpstreamServiceError`.
  if (code === 'UpstreamServiceError')
    return 'The booking service rejected the request — a malformed phone number is the usual cause.';
  return errorMessageFor(err, MESSAGES, fallback);
}

/** True when the error means "gone" for a booking read. */
export function isNotFound(err: unknown): boolean {
  const code = errorCode(err);
  return code === 'BookingDoesNotExist' || code === 'GoodsItemNotFound' || code === 'SpecialistDoesNotExist';
}
