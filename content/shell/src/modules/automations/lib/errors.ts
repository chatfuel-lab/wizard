/**
 * API errors → the sentence a person reads.
 *
 * The API sometimes wraps its codes one level down: the real code sits at
 * `errors[0].extensions.errors[0].extensions.code` (for example
 * `FuelySettingNotAllowedInScope`, `FuelyLikeContactCommentNotAllowed`,
 * `InternalServerError`) under a generic outer message. The api client's
 * `nestedErrorCodes` walks both places, nested first — a client that reads only
 * the top level never actually sees the real code. What stays here is the
 * vocabulary: which codes this module knows and what each one is worth saying.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';

/** The per-bot edit lock — retryable, never shown on the first try. */
export const isEditLock = (err: unknown): boolean => nestedErrorCodes(err).includes('FuelyAutomationBeingEdited');

/** Error-code → user message for the automations surfaces (guide.md list). */
export const MESSAGES: Record<string, string> = {
  FuelyAutomationBeingEdited: 'Someone else is editing this automation — try again.',
  FuelyAutomationNotFound: 'This automation no longer exists — reload the page.',
  FuelyAutomationNotDeletable: 'Base automations cannot be deleted.',
  FuelyAutomationNotRenamable: 'Base automations cannot be renamed.',
  FuelyAutomationNameInvalid: 'The name must be 1–200 characters.',
  FuelyAutomationScopeInvalid: 'This channel does not accept custom automations.',
  FuelyAutomationScopeLimitReached: 'This channel already has 30 custom automations — delete one first.',
  FuelySettingNotAllowedInScope: 'This setting is not available in this channel.',
  FuelyInheritFromInvalid: 'This setting cannot inherit from that automation.',
  FuelyIncomingMessagesMessagePromptEmpty: 'The reply prompt is required.',
  FuelyIncomingMessagesMessagePromptTooLong: 'The reply prompt is over 5000 characters.',
  FuelyIncomingMessagesHowToReplyNotAllowed: 'Only comment channels can reply another way than with AI.',
  FuelyFollowUpsMessagePromptEmpty: 'The follow-up prompt is required.',
  FuelyFollowUpsMessagePromptTooLong: 'The follow-up prompt is over 3000 characters.',
  FuelySwitchToHumanTooManyRules: 'At most 20 switching rules are allowed.',
  FuelySwitchToHumanSwitchingConditionsEmpty: 'Every rule needs switching conditions.',
  FuelySwitchToHumanSwitchingConditionsTooLong: 'Switching conditions are over 3000 characters.',
  FuelySwitchToHumanMessagePromptEmpty: 'Every rule needs a message prompt.',
  FuelySwitchToHumanMessagePromptTooLong: 'A rule message prompt is over 3000 characters.',
  FuelyCollectContactInfoTooManyEntries: 'At most 40 captures are allowed.',
  FuelyCollectContactInfoDescriptionTooLong: 'A capture description is over 450 characters.',
  FuelyCatalogImagesCountOutOfRange: 'Images per catalog item must be between 0 and 10.',
  FuelyReplyExactTextEmpty: 'The exact reply text is required.',
  FuelyReplyExactTextTooLong: 'The exact reply text is over 1000 characters.',
  FuelyReplyMessagePromptEmpty: 'The reply prompt is required.',
  FuelyReplyMessagePromptTooLong: 'The reply prompt is over 3000 characters.',
  FuelyLikeContactCommentNotAllowed: 'Liking comments is only available on Facebook.',
  FuelyKeywordsTooMany: 'At most 50 keywords are allowed.',
  FuelyKeywordTooLong: 'A keyword is over 50 characters.',
  FuelyListOfPostsTooManyEntries: 'At most 50 posts are allowed.',
  FuelyPostIDTooLong: 'A post ID is over 60 characters.',
  FuelyPostMediaNotFound: 'That Instagram post was not found.',
  FuelyPostMediaWrongType: 'That ID is a story — pick a post, reel or ad instead.',
  FuelyListOfPostsNoConnectedAccount: 'Connect an Instagram account to pick posts.',
  FuelyListOfPostsScopeNotImplemented: 'Post lists are not available in this channel.',
  FuelyListOfStoriesTooManyEntries: 'At most 50 stories are allowed.',
  FuelyStoryIDTooLong: 'A story ID is over 60 characters.',
  FuelyStoryMediaNotFound: 'That Instagram story was not found.',
  FuelyStoryMediaWrongType: 'That ID is not a story.',
  FuelyListOfStoriesNoConnectedAccount: 'Connect an Instagram account to pick stories.',
  FuelyListOfAdsTooManyEntries: 'At most 50 ads are allowed.',
  FuelyAdIDTooLong: 'An ad ID is over 60 characters.',
  FuelyRefLinksTooMany: 'At most 20 ref links are allowed.',
  FuelyRefLinkTooLong: 'A ref link is over 100 characters.',
  InstagramDoesNotConnected: 'Instagram is not connected to this bot.',
  PreviewResponsesFuelyAutomationScopeNotPreviewable:
    'Default cannot be tested on its own — pick a source; its Default rules apply there.',
  PreviewResponsesFuelyAutomationDoesNotExist: 'This automation no longer exists — reload the page.',
  InternalServerError: 'The server could not handle that — check the value and try again.',
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong.'): string =>
  errorMessageFor(err, MESSAGES, fallback);
