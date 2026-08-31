export { createChatfuelClient, DEFAULT_URL } from './client';
export type {
  ChatfuelClient,
  ChatfuelClientOptions,
  RequestOptions,
  SubscriptionObserver,
  TokenGetter,
} from './client';

export {
  ChatfuelApiError,
  ChatfuelAuthError,
  ChatfuelGraphQLError,
  ChatfuelHttpError,
  ChatfuelNetworkError,
  ChatfuelSessionError,
  SESSION_ERROR_CODES,
  errorMessageFor,
  hasErrorCode,
  isSessionError,
  nestedErrorCodes,
  toApiError,
} from './errors';
export type { ExecutionEnvelope, GraphQLErrorEntry, SessionErrorCode } from './errors';

export type { ModuleClient, TypedDoc } from './module-client';
export { uploadFile } from './upload';
export type { UploadedFile, UploadFileFn, UploadFileOptions, UploadFileType } from './upload';

export { closedGates, fetchRoleGates } from './roles';
export type { RoleGateClient, RoleGateRequirement, RoleGateSpec, RoleGates } from './roles';
export { createUserStorage } from './userStorage';
export type { UserStorageClient, UserTextStore } from './userStorage';
export { UUID_RE, isUuid, stableUuid } from './stableUuid';

export { stripTypename } from './strip-typename';
export { backoffDelay } from './backoff';
export type { BackoffOptions } from './backoff';
export { createThrottle, BATCH_THROTTLE } from './throttle';
export type { Throttle, ThrottleOptions } from './throttle';
export { removeBy, sortByDesc, upsertBy } from './merge';
export { isInvalidCursorError, paginate } from './pagination';
export type { ConnectionLike } from './pagination';
export { assertCredentialSafeUrl, credentialOrigin, isLoopbackHost } from './urlGuard';
export { getDocMeta } from './transport/http';
export { resolveWsUrl, shouldRetryWsError, wsErrorToApiError } from './transport/ws';

/** Fresh UUID per outgoing message — must be unique across ALL clients of the account (gotcha #3). */
export const newClientId = (): string => crypto.randomUUID();
