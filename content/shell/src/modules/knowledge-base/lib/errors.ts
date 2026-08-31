/**
 * Chatfuel error codes → what to tell the person, and one flag the budget
 * meter needs: did this failure mean "the knowledge base is full"?
 *
 * The codes come from the SDL's per-mutation error lists
 * (`schema.graphql:625-641`) and from `FuelyErrorCode`; the guide keeps the
 * same table in prose.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';

export const LIMIT_CODES: readonly string[] = [
  'FuelyKnowledgeBaseLimitReached',
  'FuelyKnowledgeBaseLimitExceeded',
  'FuelyAdditionalInstructionsCharLimitExceeded',
];

const MESSAGES: Record<string, string> = {
  FuelyKnowledgeBaseLimitReached: 'The knowledge base is full — remove or shorten something before adding more.',
  FuelyKnowledgeBaseLimitExceeded: 'The knowledge base is full — remove or shorten something before adding more.',
  FuelyAdditionalInstructionsCharLimitExceeded:
    'This is too long. Move questions into the FAQ and priced things into the catalog.',
  GoodsItemsTooMuchForBot: 'This bot has reached its catalog limit.',
  GoodsItemNotFound: 'That item is already gone — refresh to see the current catalog.',
  GoodsItemTitleRequired: 'A title is required.',
  GoodsItemTitleNotUnique: 'Another item already has this title.',
  GoodsItemTitleTooShort: 'The title is too short.',
  GoodsItemTitleTooLong: 'The title is too long.',
  GoodsItemDescriptionTooLong: 'The description is too long.',
  GoodsItemPriceAmountWrongFormat: 'The price must look like 29 or 29.00.',
  GoodsItemPriceCurrencyRequired: 'Pick a currency for the price.',
  GoodsProductImagesTooMuch: 'Too many photos on this product.',
  GoodsServiceImagesTooMuch: 'Too many photos on this service.',
  ErrGoodsServiceDurationRequired: 'A service needs a duration.',
  SpecialistFirstNameRequired: 'A first name is required.',
  SpecialistFirstNameTooLong: 'The first name is too long.',
  SpecialistLastNameTooLong: 'The last name is too long.',
  SpecialistAboutInfoTooLong: 'The about line is too long.',
  SpecialistNameNotUnique: 'Another specialist already has this name.',
  /* The Team source never EDITS working hours - it re-sends the schedule the
     API last returned - so any of these three means the stored schedule is
     already broken, not that this save did something wrong. */
  SpecialistScheduleIsEmpty: 'This specialist has working hours switched on but no days set.',
  SpecialistScheduleInvalidTimeFormat: 'This specialist has working hours that are not valid times.',
  SpecialistScheduleInvalidTimeRange: 'This specialist has working hours that end before they start.',
  FileTooBig: 'That file is too large.',
  FileContentTypeNotSupported: 'That file type is not supported.',
  FuelyBusinessHoursScheduleInvalidTimeFormat: 'Times must look like 09:00.',
  FuelyBusinessHoursScheduleInvalidTimeRange: 'The closing time must be after the opening time.',
  FuelyBusinessHoursScheduleDuplicateDays: 'Each weekday can appear only once.',
  BotMigratedToNewFuelySettings: 'This setting moved to AI Automations on this bot.',
};

/** Every code in the map, so a caller can assert coverage. */
export const KNOWN_CODES: readonly string[] = Object.keys(MESSAGES);

/**
 * The first Chatfuel code on an error envelope, for a caller that maps codes
 * to FORM FIELDS rather than to copy — `messageFor` answers "what do I tell
 * them?", this answers "under which input?".
 */
export function errorCode(error: unknown): string | null {
  return nestedErrorCodes(error)[0] ?? null;
}

export function messageFor(error: unknown): string {
  return errorMessageFor(error, MESSAGES, 'Something went wrong. Try again.');
}

/**
 * True when the write failed because the knowledge base has no room left.
 *
 * `nestedErrorCodes` is duck-typed on the envelope rather than on a real error
 * instance: the tests hand back plain envelopes, and "is this the limit?" must
 * answer the same either way.
 */
export function isLimitError(error: unknown): boolean {
  return nestedErrorCodes(error).some((code) => LIMIT_CODES.includes(code));
}
