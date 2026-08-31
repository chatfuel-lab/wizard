/**
 * One sentence per `AuthErrorCode` — the whole user-facing vocabulary of the
 * auth module in one file, so the wording can be reviewed (and translated)
 * without reading a screen.
 *
 * The table is a `Record<AuthErrorCode, string>`: adding a code to types.ts
 * and forgetting the copy is a type error, not a screen that prints
 * "BootstrapEmailMismatch" at somebody.
 *
 * Rules the wording follows: say what happened and what to do next; never
 * blame; never disclose whether an account exists (sign-in and password reset
 * are deliberately vague); never mention Supabase, PostgREST, JWTs or RPCs.
 */
import type { AuthErrorCode } from '../types';
import { AuthAdapterError } from '../types';

const MESSAGES: Record<AuthErrorCode, string> = {
  // ---- Supabase Auth
  InvalidCredentials: 'That email and password do not match an account.',
  EmailNotConfirmed: 'Confirm your email address first — check your inbox for the link.',
  UserExists: 'An account with this email already exists.',
  WeakPassword: 'That password is too weak. Use at least 8 characters.',
  RateLimited: 'Too many attempts. Wait a minute and try again.',
  SessionRequired: 'Your session has expired. Sign in again.',

  // ---- tenant
  TenantNotFound: 'This workspace is not set up yet. Ask the person who installed the app.',

  // ---- invites
  InviteInvalid: 'This invite link is not valid.',
  InviteExpired: 'This link has expired. Ask for a new one.',
  InviteRevoked: 'This invite was revoked. Ask an admin for a new one.',
  InviteUsed: 'This invite has already been used.',
  InviteEmailMismatch: 'This invite is for a different email address.',

  // ---- provisioning
  WorkspaceFull: 'This app cannot take another bot. Ask whoever installed it.',
  ProvisionUnavailable: 'This app cannot create bots right now. Ask whoever installed it.',

  // ---- bots
  BotNotFound: 'That bot is not in this workspace any more.',
  BadBotName: 'Give the bot a name of up to 80 characters.',
  BotRenameFailed: 'The bot could not be renamed. Try again.',
  BotDeleteFailed: 'The bot could not be deleted. Try again.',
  LastBot: 'This is the last bot in this app. Create another one before deleting it.',
  BotLimitReached:
    'No more bots can be added here. Delete one you no longer use, or ask whoever installed the app to raise the limit.',

  // ---- team management
  NotAllowed: 'You do not have permission to do that.',
  NotOwner: 'Only the workspace owner can do that.',
  MemberNotFound: 'That person is no longer a member of this workspace.',
  IsOwner: "The owner's role changes only by transferring ownership.",
  OwnerCannotLeave: 'Transfer ownership before you leave the workspace.',
  SelfTarget: 'You cannot do that to your own account.',
  BadRole: 'Pick either Admin or Member.',
  BadExpiry: 'Pick an expiry between one hour and 30 days.',

  // ---- transport
  Network: 'Could not reach the server. Check your connection and try again.',
  Unknown: 'Something went wrong. Try again.',
};

/** Every code, as data — the test walks it, and so can a translation check. */
export const AUTH_ERROR_CODES = Object.keys(MESSAGES) as AuthErrorCode[];

export function messageFor(code: AuthErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.Unknown;
}

/**
 * What a screen actually calls in a `catch`: anything at all in, one sentence
 * out. An `AuthAdapterError` answers by code; everything else is a bug or a
 * transport failure the adapter did not classify, and gets the generic line —
 * never `String(err)`, which is how "TypeError: Cannot read properties of
 * undefined" ends up under an email field.
 */
export function messageForError(error: unknown): string {
  if (error instanceof AuthAdapterError) return messageFor(error.code);
  return MESSAGES.Unknown;
}

/**
 * A sign-out the server did not confirm.
 *
 * Not an `AuthErrorCode`: the session in this tab is gone either way — the
 * adapter clears it whatever the call answers — so the code that came back
 * describes the request, not what the person is looking at. What they need to
 * know is the one thing that may still be true: the session may be alive
 * somewhere else.
 */
export const SIGN_OUT_UNCONFIRMED =
  'You are signed out on this device, but the server did not confirm it. On a shared computer, sign in and out again once the connection is back.';

/** The code, when a screen has to branch on it (offer "Sign in" after UserExists). */
export const codeOfError = (error: unknown): AuthErrorCode | null =>
  error instanceof AuthAdapterError ? error.code : null;
