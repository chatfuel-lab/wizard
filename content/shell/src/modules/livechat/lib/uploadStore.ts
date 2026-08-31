import { ChatfuelHttpError, type UploadFileType } from '~api';
import type { AttachmentKind } from '~ui';
import type { Platform } from '~api/generated/livechat/graphql';
import { attachmentKindOf, attachmentRefusal, mimeRefusal, uploadTypeForMime } from './attachments';
import { messageOf } from './errors';

/**
 * The composer's tray as a pure reducer.
 *
 * An attachment outlives the text it was picked alongside. The upload starts
 * the moment the file is chosen, runs on its own clock, reports progress, can
 * fail for four different reasons and can be retried — none of which the
 * composer knows anything about, which is exactly why `~ui`'s Composer takes
 * the staged files as a NODE and owns none of it.
 *
 * All of that used to be the kind of thing that lives in a component as three
 * `useState` calls and a `for` loop. vitest here is node-only, so a component is
 * where logic goes to stop being checkable — hence this file, on the same
 * footing as `threadStore`, and hence a `File` never entering the state: the
 * reducer holds a DESCRIPTION of the file the operator picked, and the hook
 * keeps the bytes in a ref beside it. That is not squeamishness about types, it
 * is what lets the whole tray be exercised from node.
 *
 * The message ids are deliberately not here. A staged attachment gets its
 * `clientId` when it is SENT, from `newClientId()`, on exactly the path text
 * takes — an id minted at staging time would be burnt by every file the
 * operator picks and then removes, and the ids have to be unique across every
 * client writing to the account.
 */

/**
 * The upload's own failures, under the names the platform gives them.
 *
 * The first three come back from the REST endpoint inside the body of a non-2xx
 * response; `UploadFailed` is everything else, which in practice is the network.
 * Naming them matters more here than it usually does: "upload failed" and "that
 * file is 40 MB" call for completely different next moves from the operator,
 * and only one of them is worth a retry.
 */
export type UploadFailure = 'FileTooBig' | 'FileContentTypeNotSupported' | 'FileDoesNotExist' | 'UploadFailed';

const FAILURE_TEXT: Record<UploadFailure, string> = {
  FileTooBig: 'Too large for this channel.',
  FileContentTypeNotSupported: 'This file type is not supported.',
  FileDoesNotExist: 'The upload was lost before it finished.',
  UploadFailed: 'Upload failed.',
};

export const uploadFailureText = (failure: UploadFailure): string => FAILURE_TEXT[failure];

/**
 * An error from `uploadFile`, named.
 *
 * `ChatfuelHttpError` keeps the first 200 bytes of the response body on
 * `bodySnippet`, and the platform's code is in there as a bare identifier — so
 * the match is on that text rather than on a parsed field, because there is no
 * documented envelope to parse. It is read off the field and not off the
 * message: the message deliberately carries no body, since it is what this app
 * renders and logs and somebody else's error body is not ours to repeat.
 * Anything unrecognised is `UploadFailed` rather than a guess: an operator told
 * "too large" about a file that is not too large will spend the afternoon
 * shrinking it.
 */
export function classifyUploadFailure(err: unknown): UploadFailure {
  const text = err instanceof ChatfuelHttpError ? err.bodySnippet : messageOf(err);
  if (text.includes('FileTooBig')) return 'FileTooBig';
  if (text.includes('FileContentTypeNotSupported')) return 'FileContentTypeNotSupported';
  if (text.includes('FileDoesNotExist')) return 'FileDoesNotExist';
  return 'UploadFailed';
}

/**
 * How many files can wait in the tray at once.
 *
 * Every staged file becomes its own message, and every platform here throttles
 * outbound messages per contact. A folder dropped on the attach button is a
 * plausible accident and 400 messages is not a plausible intent.
 */
export const MAX_STAGED = 10;

/** What a file picker hands over. `previewUrl` is the caller's object URL. */
export interface PickedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  previewUrl: string | null;
}

export interface StagedAttachment {
  /** Local, tray-scoped. NOT the message `clientId`. */
  id: string;
  name: string;
  size: number;
  type: UploadFileType;
  kind: AttachmentKind;
  previewUrl: string | null;
  status: 'uploading' | 'ready' | 'failed';
  /**
   * 0–100, or null for an indeterminate bar.
   *
   * Null in practice, and the `progress` action below has no caller today.
   * `ModuleClient.uploadFile` is a promise and a promise has no progress
   * channel — the number would have to come from an `XMLHttpRequest` upload
   * event, and that is a `content/api-client` change rather than a module one.
   * The field and the action stay because the tray is the thing that would
   * carry it and an invented percentage is worse than an honest indeterminate
   * bar: a fake ramp that sits at 90% is how a stalled upload looks like a slow
   * one.
   */
  progress: number | null;
  /** The `FileID` the send mutation references. Set only when status is 'ready'. */
  fileId: string | null;
  /** Set with status 'failed' when the upload itself failed. Retryable. */
  failure: UploadFailure | null;
  /**
   * Set with status 'failed' when the channel refused the file before a byte
   * left the browser. Nothing to retry — the file is fine, the channel is not.
   */
  refusal: string | null;
}

export interface UploadState {
  staged: StagedAttachment[];
}

export type UploadAction =
  | { type: 'staged'; platform: Platform; files: readonly PickedFile[] }
  | { type: 'progress'; id: string; progress: number }
  | { type: 'uploaded'; id: string; fileId: string }
  | { type: 'uploadFailed'; id: string; failure: UploadFailure }
  | { type: 'retried'; id: string }
  | { type: 'removed'; id: string }
  | { type: 'sent'; ids: readonly string[] }
  | { type: 'cleared' };

export const EMPTY_UPLOAD_STATE: UploadState = { staged: [] };

/** One picked file, classified. Refusals are staged too — see `stage`. */
function stage(platform: Platform, file: PickedFile): StagedAttachment {
  const type = uploadTypeForMime(file.mimeType);
  /* The format first, the channel second: a file no channel renders is refused
     for what it is, and naming the platform there would say the wrong thing. */
  const refusal = mimeRefusal(file.mimeType) ?? attachmentRefusal(platform, type);
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type,
    kind: attachmentKindOf(type),
    previewUrl: file.previewUrl,
    /* A refused file still enters the tray, failed, with its name on it. The
       alternative is dropping it on the floor, and a file picker that appears
       to do nothing is the single most common way an operator concludes the
       attach button is broken. */
    status: refusal === null ? 'uploading' : 'failed',
    progress: refusal === null ? null : 0,
    fileId: null,
    failure: null,
    refusal,
  };
}

const patch = (
  state: UploadState,
  id: string,
  next: (attachment: StagedAttachment) => StagedAttachment,
): UploadState => {
  const index = state.staged.findIndex((attachment) => attachment.id === id);
  if (index < 0) return state;
  const staged = [...state.staged];
  staged[index] = next(staged[index]!);
  return { staged };
};

export function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'staged': {
      /* The cap is counted against what is ALREADY there, not against the
         batch: three files picked twice is the same six files as six picked
         once, and only one of those two ways should be allowed to overflow. */
      const room = Math.max(0, MAX_STAGED - state.staged.length);
      const accepted = action.files.slice(0, room);
      if (accepted.length === 0) return state;
      return { staged: [...state.staged, ...accepted.map((file) => stage(action.platform, file))] };
    }

    /* Progress is only ever news while the upload is running. A late tick from
       an upload that has already answered would otherwise reopen a finished
       tile and take its fileId's meaning with it. */
    case 'progress':
      return patch(state, action.id, (attachment) =>
        attachment.status === 'uploading'
          ? { ...attachment, progress: Math.min(100, Math.max(0, action.progress)) }
          : attachment,
      );

    case 'uploaded':
      return patch(state, action.id, (attachment) => ({
        ...attachment,
        status: 'ready',
        progress: 100,
        fileId: action.fileId,
        failure: null,
        refusal: null,
      }));

    /* A refused file is never uploaded, so a failure arriving for one is a bug
       somewhere upstream — and overwriting the refusal would replace the true
       reason with a generic one. */
    case 'uploadFailed':
      return patch(state, action.id, (attachment) =>
        attachment.refusal === null
          ? { ...attachment, status: 'failed', progress: null, fileId: null, failure: action.failure }
          : attachment,
      );

    case 'retried':
      return patch(state, action.id, (attachment) =>
        attachment.status === 'failed' && attachment.refusal === null
          ? { ...attachment, status: 'uploading', progress: null, failure: null }
          : attachment,
      );

    case 'removed': {
      const staged = state.staged.filter((attachment) => attachment.id !== action.id);
      return staged.length === state.staged.length ? state : { staged };
    }

    /* Only the ids that were sent. An upload that finished while the send was
       being assembled is still staged afterwards, which is correct: it was not
       part of that message and the operator has not been told otherwise. */
    case 'sent': {
      const sent = new Set(action.ids);
      const staged = state.staged.filter((attachment) => !sent.has(attachment.id));
      return staged.length === state.staged.length ? state : { staged };
    }

    case 'cleared':
      return state.staged.length === 0 ? state : EMPTY_UPLOAD_STATE;
  }
}

/**
 * The staged files that would actually be sent.
 *
 * A failed tile is not one of them, which is what makes it the composer's
 * `attachmentCount` as well: with a single failed file in the tray and nothing
 * typed there is nothing to send, and the button says so.
 */
export const selectSendable = (state: UploadState): StagedAttachment[] =>
  state.staged.filter((attachment) => attachment.status === 'ready' && attachment.fileId !== null);

/**
 * An upload is still running.
 *
 * This is the composer's `sending`, not its `disabled`: the composer is fine
 * and the button is momentarily not. Sending the text now and the picture in a
 * moment would reorder them in the thread, which is worse than a button that
 * greys for a second.
 */
export const selectUploading = (state: UploadState): boolean =>
  state.staged.some((attachment) => attachment.status === 'uploading');

/** Every object URL the tray is holding — the caller revokes them. */
export const selectPreviewUrls = (state: UploadState): string[] =>
  state.staged.map((attachment) => attachment.previewUrl).filter((url): url is string => url !== null);
