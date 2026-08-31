/**
 * Errors → the sentence a person reads.
 *
 * The one rule, in one place: an `Error` speaks through its own message, and
 * anything else is stringified rather than guessed at. Callers that need a
 * more specific reading — upload failures, template setters, send refusals —
 * layer their own classifiers on top (`classifyUploadFailure`,
 * `setterProblemText`, `sendFailureText`); this is the floor they all share.
 */
export const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));
