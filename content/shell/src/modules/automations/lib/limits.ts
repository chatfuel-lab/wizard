/**
 * The live limits, enforced BEFORE a save. The server rejects the same things
 * with a hard error code, and one of them (a non-Any keywords mode with an
 * empty list) with a bare InternalServerError; a draft that would fail is
 * blocked here with a sentence instead.
 *
 * Pure: `validateSettingUpdate` takes the write shape and the scope and
 * returns the first problem or null. The draft editors put it INSIDE the
 * draft's `write`, so ⌘S / Save-all and the section's own Save button both
 * go through it; the immediate editors call the field-level helpers.
 */
import {
  FuelySettingIncomingMessagesHowToReply,
  FuelySettingKeywordsReactTo,
  type FuelyAutomationScope,
  type FuelySettingCollectContactInfoUpdateInput,
  type FuelySettingIncomingMessagesUpdateInput,
  type FuelySettingPrivateReplyUpdateInput,
  type FuelySettingPublicReplyUpdateInput,
  type FuelySettingSwitchToHumanUpdateInput,
} from '~api/generated/automations/graphql';
import { isCommentReplyScope, isFacebookScope } from './scopes';
import type { SettingUpdate } from '../types';

export const LIMITS = {
  /** AI instructions prompt. */
  prompt: 5000,
  /** Follow-ups, reply prompts, hand-off rule texts. */
  replyPrompt: 3000,
  exactText: 1000,
  ruleText: 3000,
  rules: 20,
  captures: 40,
  captureDescription: 450,
  keywords: 50,
  keyword: 50,
  refs: 20,
  ref: 100,
  /** Posts, stories, ads — one ceiling. */
  media: 50,
  mediaId: 60,
  imagesMin: 0,
  imagesMax: 10,
} as const;

/** The sentence for the production 500 — the client's job to prevent. */
export const KEYWORDS_EMPTY_MESSAGE = 'Add at least one keyword or switch to Any comment';

/** Length as a person counts it — one per code point (the server counts characters the same way). */
export const textLength = (text: string): number => Array.from(text).length;

/** Required, then at most `max` characters. */
export function requiredText(value: string, max: number, what: string): string | null {
  if (value.trim().length === 0) return `${what} is required`;
  if (textLength(value) > max)
    return `${what} is over ${max.toLocaleString()} characters (${textLength(value).toLocaleString()})`;
  return null;
}

/** A whole number in [min, max]; the message names the range. */
export function integerInRange(raw: string | number, min: number, max: number): string | null {
  const text = String(raw).trim();
  if (!/^-?\d+$/.test(text)) return `Enter a whole number between ${min} and ${max}`;
  const n = Number(text);
  if (n < min || n > max) return `Enter a whole number between ${min} and ${max}`;
  return null;
}

/** A list of at most `maxItems`, each at most `maxLength` characters, none blank. */
export function listWithin(
  items: readonly string[],
  maxItems: number,
  maxLength: number,
  noun: string,
  plural = `${noun}s`,
): string | null {
  if (items.length > maxItems) return `At most ${maxItems} ${plural} (${items.length} now)`;
  const long = items.find((item) => textLength(item) > maxLength);
  if (long !== undefined)
    return `Each ${noun} must be at most ${maxLength} characters — “${long.length > 24 ? `${long.slice(0, 24)}…` : long}” is longer`;
  return null;
}

export function validateIncomingMessages(
  update: FuelySettingIncomingMessagesUpdateInput,
  scope: FuelyAutomationScope,
): string | null {
  if (update.howToReply !== FuelySettingIncomingMessagesHowToReply.UsingAi && !isCommentReplyScope(scope)) {
    return 'Only comment sources can be set to not reply';
  }
  return requiredText(update.messagePrompt, LIMITS.prompt, 'The AI instructions prompt');
}

export function validateSwitchToHuman(update: FuelySettingSwitchToHumanUpdateInput): string | null {
  if (update.rules.length > LIMITS.rules) return `At most ${LIMITS.rules} rules (${update.rules.length} now)`;
  for (const [index, rule] of update.rules.entries()) {
    const at = `Rule ${index + 1}`;
    const conditions = requiredText(rule.switchingConditions, LIMITS.ruleText, `${at}: the “When…” text`);
    if (conditions) return conditions;
    const prompt = requiredText(rule.messagePrompt, LIMITS.ruleText, `${at}: the hand-off instructions`);
    if (prompt) return prompt;
  }
  return null;
}

export function validateCollectContactInfo(update: FuelySettingCollectContactInfoUpdateInput): string | null {
  if (update.captures.length > LIMITS.captures)
    return `At most ${LIMITS.captures} captures (${update.captures.length} now)`;
  for (const [index, capture] of update.captures.entries()) {
    const at = `Capture ${index + 1}`;
    if (capture.name.trim().length === 0) return `${at}: pick or type an attribute`;
    const description = requiredText(capture.description, LIMITS.captureDescription, `${at}: the description`);
    if (description) return description;
  }
  const seen = new Set<string>();
  for (const capture of update.captures) {
    const key = capture.name.trim().toLocaleLowerCase();
    if (seen.has(key)) return `“${capture.name}” is captured twice — one attribute, one capture`;
    seen.add(key);
  }
  return null;
}

/**
 * Both texts are required whatever the mode (the API validates them
 * independently of the mode flag — live) — the editor keeps the hidden one
 * untouched, so this only bites when the visible one is empty or too long.
 */
export function validatePublicReply(
  update: FuelySettingPublicReplyUpdateInput,
  scope: FuelyAutomationScope,
): string | null {
  if (update.likeContactComment && !isFacebookScope(scope)) return 'Liking the comment is only available on Facebook';
  return (
    requiredText(update.exactTextReply, LIMITS.exactText, 'The exact reply text') ??
    requiredText(update.messagePrompt, LIMITS.replyPrompt, 'The reply prompt')
  );
}

export function validatePrivateReply(update: FuelySettingPrivateReplyUpdateInput): string | null {
  return (
    requiredText(update.exactTextReply, LIMITS.exactText, 'The exact reply text') ??
    requiredText(update.messagePrompt, LIMITS.replyPrompt, 'The reply prompt')
  );
}

/** Every write the editors make, checked against the live limits; null when it may go. */
export function validateSettingUpdate(update: SettingUpdate, scope: FuelyAutomationScope): string | null {
  switch (update.type) {
    case 'FuelySettingIncomingMessages':
      return validateIncomingMessages(update.update, scope);
    case 'FuelySettingWhenAIReplies':
    case 'FuelySettingMessageDelays':
    case 'FuelySettingBookingRules':
      return null;
    case 'FuelySettingCatalogImages':
      return integerInRange(update.update.imagesPerCatalogItem, LIMITS.imagesMin, LIMITS.imagesMax);
    case 'FuelySettingSwitchToHuman':
      return validateSwitchToHuman(update.update);
    case 'FuelySettingFollowUps':
      return requiredText(update.update.messagePrompt, LIMITS.replyPrompt, 'The follow-up prompt');
    case 'FuelySettingCollectContactInfo':
      return validateCollectContactInfo(update.update);
    case 'FuelySettingPrivateReply':
      return validatePrivateReply(update.update);
    case 'FuelySettingPublicReply':
      return validatePublicReply(update.update, scope);
    case 'FuelySettingKeywords':
      if (update.update.reactTo !== FuelySettingKeywordsReactTo.AnyComment && update.update.keywords.length === 0)
        return KEYWORDS_EMPTY_MESSAGE;
      return listWithin(update.update.keywords, LIMITS.keywords, LIMITS.keyword, 'keyword');
    case 'FuelySettingListOfPosts':
      return listWithin(update.update.postIDs, LIMITS.media, LIMITS.mediaId, 'post id');
    case 'FuelySettingListOfStories':
      return listWithin(update.update.storyIDs, LIMITS.media, LIMITS.mediaId, 'story id');
    case 'FuelySettingListOfAds':
      return listWithin(update.update.adIDs, LIMITS.media, LIMITS.mediaId, 'ad id');
    case 'FuelySettingRefLinks':
      return listWithin(update.update.refs, LIMITS.refs, LIMITS.ref, 'ref');
  }
}

/** The three keywords the empty state offers. */
export const STARTER_KEYWORDS: readonly string[] = ['price', 'book', 'size'];

/** The 3-line skeleton prompt "Insert a starter" fills into an empty AI-instructions draft. */
export const STARTER_PROMPT = [
  'You are the assistant of <business name>. Answer in the language the person writes in, in two short paragraphs at most.',
  'Answer questions about <what you offer>: prices, availability, what to expect. Offer to book when it fits.',
  'If someone is upset or asks for a person, say a teammate will reply and hand the conversation over.',
].join('\n');
