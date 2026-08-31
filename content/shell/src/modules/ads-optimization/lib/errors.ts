/**
 * API errors → the sentence a person reads.
 *
 * The API wraps these codes one level down: the top-level message is generic
 * and the real code sits at
 * `errors[0].extensions.errors[0].extensions.code`. `nestedErrorCodes` looks
 * in both places — reading only the top level finds nothing at all. The codes
 * themselves, and what each one means to say, stay here: they are this
 * module's vocabulary, not the transport's.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';
import {
  MAX_ADS,
  MAX_AD_ID_LENGTH,
  MAX_EVENTS,
  MAX_KEYWORDS,
  MAX_KEYWORD_LENGTH,
  MAX_PROMPT,
  MAX_SETS,
} from './eventRules';

/** The per-bot edit lock. Retryable, so it is never shown on the first try. */
export const isEditLock = (err: unknown): boolean => nestedErrorCodes(err).includes('FuelyAutomationBeingEdited');

export const MESSAGES: Record<string, string> = {
  FuelyAutomationBeingEdited: 'Someone else is editing this bot right now — try again.',
  FuelyAutomationNotFound: 'This event set no longer exists — reload the page.',
  FuelyAutomationNotDeletable: 'The default set cannot be deleted.',
  FuelyAutomationNotRenamable: 'The default set cannot be renamed.',
  FuelyAutomationNameInvalid: 'The name must be 1-200 characters.',
  FuelyAutomationScopeLimitReached: `There are already ${MAX_SETS} event sets — delete one first.`,
  FuelySettingNotAllowedInScope: 'That setting does not exist on this set.',
  FuelyInheritFromInvalid: 'This setting cannot follow that set.',

  FuelyListOfAdsTooManyEntries: `At most ${MAX_ADS} ads fit in one set.`,
  FuelyAdIDTooLong: `An ad ID is over ${MAX_AD_ID_LENGTH} characters.`,

  FuelySendEventsToMetaTooManyEvents: `At most ${MAX_EVENTS} events fit in one set.`,
  FuelySendEventsToMetaEventNameInvalid: 'That conversion name is not one the API accepts.',
  FuelySendEventsToMetaCustomEventNameTooLong: 'A name of your own is over 50 characters.',
  FuelySendEventsToMetaCustomEventNameIsStandard: "That is one of Meta's own names — pick it from the list.",
  FuelySendEventsToMetaDuplicateEvent: 'This set already reports that conversion on that trigger.',
  FuelySendEventsToMetaConditionPromptEmpty: 'The condition cannot be blank.',
  FuelySendEventsToMetaConditionPromptTooLong: `A condition is over ${MAX_PROMPT} characters.`,
  FuelySendEventsToMetaKeywordsEmpty: 'Add at least one keyword.',
  FuelySendEventsToMetaSalesStagesEmpty: 'Pick at least one status.',
  FuelySendEventsToMetaSwitchToHumanFromEmpty: 'Pick at least one hand-off.',
  FuelySendEventsToMetaEventNotFound: 'One of these events was changed elsewhere — reload the page.',
  FuelySendEventsToMetaDuplicateEventID: 'One of these events was sent twice — reload the page.',
  FuelyKeywordsTooMany: `At most ${MAX_KEYWORDS} keywords are allowed.`,
  FuelyKeywordTooLong: `A keyword is over ${MAX_KEYWORD_LENGTH} characters.`,

  NotAllowedBySubscriptionFeatureSet: 'This plan cannot turn AI automations on.',
  NotEnoughPermissions: 'Your role cannot change these settings.',
  InternalServerError: 'The server could not handle that — check the values and try again.',
};

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  return errorMessageFor(err, MESSAGES, fallback);
}
