import { ChatfuelGraphQLError } from '@chatfuel/api-client';

export class WizardError extends Error {
  readonly hint?: string;
  /* `cause` carries what the transport or the parser actually said. `run.ts`
     prints it under --verbose, so the sentence a person is shown can stay a
     sentence without the detail being lost. */
  constructor(message: string, hint?: string, cause?: unknown) {
    super(message);
    this.name = 'WizardError';
    this.hint = hint;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Wrap an api-client error, surfacing code + traceId for support reports. */
export class ApiWizardError extends WizardError {
  readonly code?: string;
  readonly traceId?: string;
  constructor(message: string, cause: unknown, hint?: string) {
    const gql = cause instanceof ChatfuelGraphQLError ? cause : undefined;
    const parts = [message];
    if (gql?.code) parts.push(`(${gql.code})`);
    super(parts.join(' '), hint ?? (gql?.traceId ? `traceId: ${gql.traceId}` : undefined));
    this.name = 'ApiWizardError';
    this.code = gql?.code;
    this.traceId = gql?.traceId;
    this.cause = cause;
  }
}
