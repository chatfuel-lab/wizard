import type { UploadFileType } from '~api';
import type { AttachmentKind } from '~ui';
import {
  MAX_FILES_PER_MESSAGE,
  classifyAttachment,
  type AttachmentRoute,
  type FileDescription,
  type UploadFailure,
} from './attachments';

/**
 * The composer's tray, as a pure store: what has been picked, what each file
 * became, and what a send would actually carry.
 *
 * A `File` never enters this state. The reducer holds a description of what was
 * picked and the hook keeps the bytes in a ref beside it — the same split
 * livechat's `uploadStore` makes, and for the same reason: vitest here is
 * node-only, and a reducer holding a `File` is a reducer no node test can build
 * a case for.
 *
 * The rules a file is judged by — types, sizes, routes — live in
 * `attachments.ts`; this file only applies them.
 */

/** What a picker hands over. `previewUrl` is the caller's object URL. */
export interface PickedFile extends FileDescription {
  id: string;
  previewUrl: string | null;
}

export interface StagedAttachment {
  /** Local, tray-scoped. NOT the message `clientID`. */
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  route: AttachmentRoute | null;
  uploadType: UploadFileType;
  previewUrl: string | null;
  status: 'uploading' | 'ready' | 'failed';
  /** The `FileID` a mutation references. Set only when status is 'ready'. */
  fileId: string | null;
  /** The upload itself failed. Retryable. */
  failure: UploadFailure | null;
  /** Refused before a byte left the browser. Nothing to retry. */
  refusal: string | null;
}

export interface TrayState {
  staged: StagedAttachment[];
  /**
   * One line about the pick itself rather than about any one file — today only
   * "that was more than fits in a message". It is not a toast: a toast about a
   * file you cannot see any more is a sentence with no subject.
   */
  notice: string | null;
}

export const EMPTY_TRAY: TrayState = { staged: [], notice: null };

export type TrayAction =
  | { type: 'staged'; files: readonly PickedFile[] }
  | { type: 'uploaded'; id: string; fileId: string }
  | { type: 'uploadFailed'; id: string; failure: UploadFailure }
  | { type: 'retried'; id: string }
  | { type: 'removed'; id: string }
  | { type: 'sent'; ids: readonly string[] }
  | { type: 'cleared' };

function stage(file: PickedFile): StagedAttachment {
  const classified = classifyAttachment(file);
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    kind: classified.kind,
    route: classified.route,
    uploadType: classified.uploadType,
    previewUrl: file.previewUrl,
    /* A refused file still enters the tray, failed, with its name on it. The
       alternative is dropping it on the floor, and a picker that appears to do
       nothing is the commonest way an operator concludes the button is
       broken. */
    status: classified.refusal === null ? 'uploading' : 'failed',
    fileId: null,
    failure: null,
    refusal: classified.refusal,
  };
}

const patch = (state: TrayState, id: string, next: (attachment: StagedAttachment) => StagedAttachment): TrayState => {
  const index = state.staged.findIndex((attachment) => attachment.id === id);
  if (index < 0) return state;
  const staged = [...state.staged];
  staged[index] = next(staged[index]!);
  return { ...state, staged };
};

export function trayReducer(state: TrayState, action: TrayAction): TrayState {
  switch (action.type) {
    case 'staged': {
      /* The cap counts against what is already there, not against the batch:
         three files picked five times is the same fifteen files as fifteen
         picked once, and only one of those two ways should be able to overflow.

         Voice notes are counted in too, though the API counts them separately —
         one audio file is one message of its own. Sharing one budget can only
         ever be stricter than the server, and a tray that holds twenty things
         and sends six messages is not a tray anybody can read. */
      const room = Math.max(0, MAX_FILES_PER_MESSAGE - state.staged.length);
      const accepted = action.files.slice(0, room);
      const dropped = action.files.length - accepted.length;
      const notice =
        dropped > 0
          ? `Only ${MAX_FILES_PER_MESSAGE} files fit in one message — ${dropped} ${
              dropped === 1 ? 'was' : 'were'
            } not added.`
          : null;
      if (accepted.length === 0) return notice === state.notice ? state : { ...state, notice };
      return { staged: [...state.staged, ...accepted.map(stage)], notice };
    }

    case 'uploaded':
      return patch(state, action.id, (attachment) => ({
        ...attachment,
        status: 'ready',
        fileId: action.fileId,
        failure: null,
        refusal: null,
      }));

    /* A refused file is never uploaded, so a failure arriving for one is a bug
       upstream — and overwriting the refusal would replace the true reason with
       a generic one. */
    case 'uploadFailed':
      return patch(state, action.id, (attachment) =>
        attachment.refusal === null
          ? { ...attachment, status: 'failed', fileId: null, failure: action.failure }
          : attachment,
      );

    case 'retried':
      return patch(state, action.id, (attachment) =>
        attachment.status === 'failed' && attachment.refusal === null
          ? { ...attachment, status: 'uploading', failure: null }
          : attachment,
      );

    case 'removed': {
      const staged = state.staged.filter((attachment) => attachment.id !== action.id);
      return staged.length === state.staged.length ? state : { staged, notice: null };
    }

    /* Only the ids that went. An upload that finished while the send was being
       assembled is still staged afterwards, which is correct: it was not part
       of that message and the operator has not been told otherwise. */
    case 'sent': {
      const sent = new Set(action.ids);
      const staged = state.staged.filter((attachment) => !sent.has(attachment.id));
      return staged.length === state.staged.length ? state : { staged, notice: null };
    }

    case 'cleared':
      return state.staged.length === 0 && state.notice === null ? state : EMPTY_TRAY;
  }
}

/**
 * The staged files that would actually go.
 *
 * A failed tile is not one of them, which is also what makes this the
 * composer's `attachmentCount`: with one refused file in the tray and nothing
 * typed there is nothing to send, and the button says so.
 */
export const selectSendable = (state: TrayState): StagedAttachment[] =>
  state.staged.filter(
    (attachment) => attachment.status === 'ready' && attachment.fileId !== null && attachment.route !== null,
  );

/**
 * An upload is still running.
 *
 * The composer's `sending`, not its `disabled` — the composer is fine and the
 * button is momentarily not. Letting the text go now and the picture in a
 * moment would put them in the thread in the wrong order.
 */
export const selectUploading = (state: TrayState): boolean =>
  state.staged.some((attachment) => attachment.status === 'uploading');

export interface SendPlan {
  /** One mutation each: `sendAudioMessage` takes exactly one file and no text. */
  voice: StagedAttachment[];
  /** One mutation for all of them, and it carries the text as a caption. */
  files: StagedAttachment[];
  /**
   * True when the typed text rides along with `files`. When there is nothing
   * on the attachment route the text is a plain message and goes the ordinary
   * way, through the thread's own optimistic send.
   */
  textRidesAlong: boolean;
}

/**
 * How a tray full of things becomes messages.
 *
 * Voice notes first. They are separate messages whatever happens, and a caption
 * that arrives before what it captions reads as a non sequitur — the same rule
 * livechat's composer follows for the same reason.
 */
export function sendPlan(sendable: readonly StagedAttachment[], hasText: boolean): SendPlan {
  const voice = sendable.filter((attachment) => attachment.route === 'voice');
  const files = sendable.filter((attachment) => attachment.route === 'attachment');
  return { voice, files, textRidesAlong: hasText && files.length > 0 };
}
