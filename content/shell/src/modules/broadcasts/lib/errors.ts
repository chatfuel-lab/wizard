/**
 * What the server says, in the words a screen has room for.
 *
 * Two channels, two vocabularies. A THROWN error carries a code at
 * `errors[0].extensions.code`, one level down through the router — the
 * shared `nestedErrorCodes` reads both places. A VALIDATION verdict is data:
 * `blockElements[].errors[].code`, snake_case, recomputed on every write, and
 * a campaign cannot go live while one stands. `errorMessage` speaks the first
 * kind; `problemText` the second.
 */
import { errorMessageFor, nestedErrorCodes } from '~api';

export function errorCode(err: unknown): string | null {
  return nestedErrorCodes(err)[0] ?? null;
}

export function isErrorCode(err: unknown, code: string): boolean {
  return errorCode(err) === code;
}

const MESSAGES: Record<string, string> = {
  ScopeNotConnectedToBot: 'No WhatsApp number is connected to this bot, so nothing can be sent.',
  ComponentHasValidationErrors: 'The campaign is not complete yet — check the message, the audience and the schedule.',
  WhatsAppOneTimeBroadcastAlreadyStarted: 'This campaign has already been sent.',
  FlowGroupCanNotBeDeleted: 'This folder cannot be deleted.',
  FileContentTypeNotSupported: 'This file type is not supported here.',
  FileTooBig: 'Too large for a template header.',
  FileNameTooLong: 'The file name is too long.',
  FileNameFormatNotSupported: 'The file name has characters WhatsApp refuses.',
  NotEnoughPermissions: 'Your role cannot change campaigns on this bot.',
  Unauthorized: 'Your session token was rejected — rotate it and reload.',
};

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const code = errorCode(err);
  if (code === 'InternalServerError') return 'Chatfuel could not complete that. Try again in a moment.';
  if (code && MESSAGES[code]) return MESSAGES[code];
  return errorMessageFor(err, MESSAGES, fallback);
}

/** The one refusal that means the work is already done. */
export const isAlreadySent = (err: unknown): boolean => isErrorCode(err, 'WhatsAppOneTimeBroadcastAlreadyStarted');

// ---------------------------------------------------------------------------
// Validation verdicts
// ---------------------------------------------------------------------------

/** Where a verdict belongs — which step of the composer prints it. */
export type ProblemArea = 'message' | 'audience' | 'schedule' | 'campaign';

const PROBLEM_AREAS: Record<string, ProblemArea> = {
  template_required: 'message',
  TemplateNotAllowedForProcessing: 'message',
  segment_set_is_invalid: 'audience',
  start_time_cannot_be_in_past: 'schedule',
  weekdays_are_empty: 'schedule',
  every_n_days_is_empty: 'schedule',
  certain_dates_are_empty: 'schedule',
  connection_required: 'campaign',
  no_payload: 'campaign',
};

export function problemArea(code: string): ProblemArea {
  if (code in PROBLEM_AREAS) return PROBLEM_AREAS[code] as ProblemArea;
  // Every parameter and header verdict names the message.
  if (/param_value_required|header_|copy_code|url_button/.test(code)) return 'message';
  return 'campaign';
}

const PROBLEM_TEXTS: Record<string, string> = {
  template_required: 'Pick a template',
  TemplateNotAllowedForProcessing: 'This template is no longer approved',
  segment_set_is_invalid: 'The audience filter is not valid',
  start_time_cannot_be_in_past: 'The send time has passed',
  weekdays_are_empty: 'Pick at least one weekday',
  every_n_days_is_empty: 'Say every how many days',
  certain_dates_are_empty: 'Pick at least one date',
  connection_required: 'The message is not connected to the schedule',
  no_payload: 'The campaign has no message',
  header_image_required: 'The header image is missing',
  header_video_required: 'The header video is missing',
  header_document_required: 'The header document is missing',
  header_image_format_not_supported: 'The header image format is not supported',
  header_image_size_too_large: 'The header image is too large',
  quick_reply_button_connection_required: 'A quick-reply button needs a flow to continue in',
  copy_code_button_code_value_required: 'The copy code is missing',
  copy_code_button_code_value_too_long: 'The copy code is too long',
};

/** A validation code as a sentence. Unknown codes are shown as they came — a gate nobody can see is worse. */
export function problemText(code: string, paramName?: string | null): string {
  if (code in PROBLEM_TEXTS) return PROBLEM_TEXTS[code] as string;
  if (/text_param_value_required$/.test(code)) return paramName ? `Fill in {{${paramName}}}` : 'A parameter is empty';
  if (/url_button_.*param_value_required|url_param_value_required/.test(code))
    return paramName ? `Fill in the link's {{${paramName}}}` : 'A link parameter is empty';
  return code.replaceAll('_', ' ');
}
