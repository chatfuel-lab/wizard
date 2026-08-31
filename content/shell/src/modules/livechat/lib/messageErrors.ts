import { ChatfuelGraphQLError, ChatfuelNetworkError } from '~api';
import type { MessageErrorCode } from '~api/generated/livechat/graphql';

/**
 * `Message.errors[]`, turned into a sentence an operator can act on.
 *
 * This is where every platform limit in the product surfaces. A send mutation
 * answers "accepted", not "delivered" — the WhatsApp 24-hour customer service
 * window, Instagram's messaging window, TikTok's 10-messages-per-48-hours cap,
 * a template that Meta paused overnight: all of them arrive later, on the
 * message, through `messageUpdated`. Nothing about a failed mutation is
 * involved, which is why a UI that only reports mutation errors shows a
 * perfectly normal-looking bubble for a message the contact will never receive.
 *
 * Before this, the bubble printed `error.originalErrMessage || error.code`, so
 * the good case was Meta's own English and the bad case was the literal string
 * `WhatsAppOutMoreThan24hPassed`. The order is now the other way round: our
 * sentence first, because it says what to DO, and the platform's text only when
 * there is no code we recognise.
 *
 * Typed `Record<MessageErrorCode, string>` against the generated enum, so a new
 * code in the schema is a compile error rather than a raw identifier leaking
 * into the thread.
 */
const ERROR_TEXT: Record<MessageErrorCode, string> = {
  // ── delivery windows: the common ones, and the only ones with a fix ────
  /* Not "the message failed" but "the message could not be sent yet, and here
     is the way to send it" — a template is the sanctioned way back into a
     closed WhatsApp window, and an operator who is not told that simply
     retries the same text until they give up. */
  WhatsAppOutMoreThan24hPassed:
    'Outside the 24-hour WhatsApp window — the contact has to write first, or send an approved template.',
  InstagramOutMessageOutsideAllowedWindow:
    'Outside the Instagram reply window — the contact has to write again before you can reply.',
  TikTokOutMessageOutsideAllowedWindow:
    'TikTok allows 10 messages every 48 hours before the contact replies, and that is used up.',

  // ── rate limits ───────────────────────────────────────────────────────
  WhatsAppOutRateLimitHit: 'WhatsApp rate limit reached — wait a moment and send again.',
  WhatsAppOutSpamRateLimitHit: 'WhatsApp is throttling this number for spam — slow down and send again later.',
  WhatsAppOutPairRateLimitHit: 'Too many messages to this contact too quickly — wait before sending again.',

  // ── account and policy ────────────────────────────────────────────────
  WhatsAppOutTemporaryBlockedForPoliciesViolations:
    'This WhatsApp number is temporarily blocked for policy violations.',
  WhatsAppOutRestrictedFromMessagingUsersInThisCountry:
    'This WhatsApp number is not allowed to message contacts in that country.',
  WhatsAppOutAccountHasBeenLocked: 'The WhatsApp business account is locked.',
  WhatsAppOutAccountInMaintenanceMode: 'The WhatsApp business account is in maintenance mode.',
  WhatsAppOutBusinessEligibilityPayment: 'WhatsApp rejected the message over billing on the business account.',
  WhatsAppOutNumberNeedsDisplayNameApproval: 'This WhatsApp number needs its display name approved before it can send.',
  TikTokOutMessageViolatesCommunityGuidelines:
    'TikTok blocked this message as a possible Community Guidelines violation.',
  TikTokOutProhibitedMediaStrategy: 'TikTok blocked messaging to this contact over its media-sending rules.',

  // ── templates ─────────────────────────────────────────────────────────
  WhatsAppOutTemplateIsPaused: 'That WhatsApp template is paused and cannot be sent.',
  WhatsAppOutTemplateDoesNotExist: 'That WhatsApp template no longer exists.',
  WhatsAppOutTemplateDisabled: 'That WhatsApp template is disabled.',
  WhatsAppOutTemplateFormatCharacterPoliceViolated:
    'That WhatsApp template breaks Meta’s formatting rules and was rejected.',
  WhatsAppOutTemplateVoiceCallButtonNotEnabledForCalling:
    'The template has a call button, and this WhatsApp number is not enabled for calling.',

  // ── the message itself ────────────────────────────────────────────────
  WhatsAppOutMessageUndeliverable: 'WhatsApp could not deliver this message.',
  WhatsAppOutMetaChooseNotToDeliver: 'Meta chose not to deliver this message.',
  WhatsAppOutRecipientCannotBeSender: 'That WhatsApp number cannot message itself.',
  WhatsAppOutMediaUploadError: 'WhatsApp could not accept the attached file.',
  WhatsAppOutUsersNumberIsNotPartOfAnExperiment: 'WhatsApp is not delivering to that number under its current rollout.',

  // ── ours, or Meta's, and nothing an operator can do ────────────────────
  WhatsAppOutParameterValueIsNotValid: 'WhatsApp rejected a value in this message.',
  WhatsAppOutRequiredParameterIsMissing: 'This message was sent without something WhatsApp needs.',
  WhatsAppOutServiceUnavailable: 'WhatsApp was unavailable — try again.',
  WhatsAppOutSomethingWentWrong: 'WhatsApp reported an unspecified failure.',
  WhatsAppOutGenericUserError: 'WhatsApp rejected this message.',
  WhatsAppOutAPIService: 'The WhatsApp API is having trouble — try again.',
  WhatsAppOutAPIUnknown: 'The WhatsApp API returned an unknown error.',
  MessageUnknownError: 'This message could not be delivered.',
};

/** The shape the thread actually holds — `MessageCommon` selects exactly this. */
export interface MessageErrorLike {
  code: MessageErrorCode;
  originalErrMessage?: string | null;
}

/**
 * One line for the bubble footer, or nothing at all.
 *
 * Deduplicated: `messageUpdated` re-delivers the whole `errors` array on every
 * transition, and a message that failed twice for the same reason arrives
 * carrying the same sentence twice. Joined with a middle dot rather than a
 * semicolon so a two-error footer reads as two facts and not as one run-on.
 */
export function messageErrorText(errors: readonly MessageErrorLike[] | null | undefined): string | undefined {
  if (!errors?.length) return undefined;
  const seen = new Set<string>();
  for (const error of errors) {
    /* Our sentence, then the platform's own words, then — only if the server
       sent a code this build has never seen — the code itself, because a raw
       identifier still beats a bubble that says nothing went wrong. */
    const text = ERROR_TEXT[error.code] ?? error.originalErrMessage?.trim() ?? String(error.code);
    if (text) seen.add(text);
  }
  return seen.size === 0 ? undefined : [...seen].join(' · ');
}

/**
 * The red line under an optimistic row whose mutation was refused.
 *
 * One sentence for every failure — "check your connection, and that you still
 * have the Inbox: Edit permission" — is advice about permissions on a server
 * fault, which sends the operator to the wrong place. So: the permission
 * sentence only for a permission-shaped code, the connection sentence only for
 * a transport failure, and otherwise the server's own code with its trace id,
 * which is what support will ask for.
 */
export function sendFailureText(err: unknown): string {
  if (err instanceof ChatfuelGraphQLError) {
    const code = err.code;
    if (err.isPermissionDenied || code === 'Forbidden' || code === 'Unauthorized') {
      return 'Not sent — you no longer have the Inbox: Edit permission on this bot.';
    }
    const trace = err.traceId ? ` (trace ${err.traceId})` : '';
    return code
      ? `Not sent — the server answered ${code}${trace}. Try again.`
      : `Not sent — the server refused the message${trace}. Try again.`;
  }
  if (err instanceof ChatfuelNetworkError) {
    return 'Not sent — no connection. Check your network and try again.';
  }
  return 'Not sent. Check your connection, and that you still have the Inbox: Edit permission.';
}
