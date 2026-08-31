/**
 * Form rules for the auth screens. Pure, node-testable, no React: a screen
 * calls these on submit (and again on every edit of a field that already
 * failed), and renders the returned string under the control via
 * `FormField error`.
 *
 * `null` means valid. Every function returns the sentence a person reads, not
 * a code — these are CLIENT-side rules and never travel. The server's refusals
 * arrive as `AuthErrorCode` and go through lib/copy.ts instead.
 */

/** Supabase's own floor. Anything shorter comes back as weak_password. */
export const MIN_PASSWORD_LENGTH = 8;
/** cf_profiles.full_name is free text; the form keeps it to one line. */
export const MAX_NAME_LENGTH = 60;

/* Deliberately loose. A form is not the authority on what an address is — the
   mail server is — and every "clever" pattern in this position has rejected
   somebody's real address. Something, an @, something with a dot, no spaces. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/* A domain for the allow-list: dot-separated labels of letters, digits and
   inner hyphens, at least two of them. */

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email === '') return 'Enter your email address';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(value: string): string | null {
  if (value === '') return 'Enter a password';
  if (value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
}

export function passwordsMatch(password: string, confirmation: string): string | null {
  if (confirmation === '') return 'Repeat the password';
  if (password !== confirmation) return 'The two passwords do not match';
  return null;
}

/** An invite may be open to anyone, so an empty address is valid here. */
export function validateInviteEmail(value: string): string | null {
  return value.trim() === '' ? null : validateEmail(value);
}

/** The name is optional everywhere it appears, so only its length is a rule. */
export function validateName(value: string): string | null {
  if (value.trim().length > MAX_NAME_LENGTH) return `Keep the name under ${MAX_NAME_LENGTH} characters`;
  return null;
}

/**
 * cf_invite_preview never returns the invited address — only the mask
 * cf_mask_email builds: first character, '***@', domain. So "is the person
 * signed in the person invited?" is answered by masking their address the same
 * way and comparing the two strings. Same rule, same shape, nothing disclosed.
 */
export const maskEmail = (email: string | null | undefined): string | null => {
  const value = email?.trim().toLowerCase() ?? '';
  const at = value.indexOf('@');
  if (at <= 0 || at === value.length - 1) return null;
  return `${value.slice(0, 1)}***@${value.slice(at + 1)}`;
};

/** True when `email` could be the address behind `hint`; an unrestricted invite matches anyone. */
export function matchesMaskedEmail(email: string | null | undefined, hint: string | null): boolean {
  if (!hint) return true;
  const masked = maskEmail(email);
  return masked !== null && masked === hint.trim().toLowerCase();
}
