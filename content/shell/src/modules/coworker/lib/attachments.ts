import type { UploadFileType } from '~api';
import { formatFileSize, type AttachmentKind } from '~ui';

/**
 * What the assistant will accept, decided before a byte leaves the browser.
 *
 * Every limit here is the API's own (guide.md, "Attachments"): at most 15 files
 * per message, at most 50 MB each, images png/jpeg/webp/gif and documents
 * pdf/office/text — video and audio are refused. They are restated and checked
 * client-side because of what the server does when one is broken. A refused
 * attachment does not come back as a failed send: it becomes a
 * `CoworkerUserMessageRejected` **pending action** on the conversation, and a
 * pending action blocks that thread until somebody resolves it. In livechat a
 * bad file costs one red bubble; here it jams the assistant. Checking first is
 * not politeness, it is the difference between a tile that says why and a
 * conversation that has to be un-stuck.
 *
 * **Audio is not an attachment.** `coworkerConversationSendMessageWithAttachments`
 * rejects it outright; `coworkerConversationSendAudioMessage` takes exactly one
 * uploaded audio file and no text at all. So a picked file carries a *route* as
 * well as a type, one tray can hold both kinds at once, and a send is then two
 * mutations rather than one — which is why `sendPlan` (in `trayStore.ts`, with
 * the rest of the tray's state) is a pure function with tests instead of an
 * `if` inside the composer. Video has no route at all.
 */

/* --- the API's limits ----------------------------------------------------- */

/** Per message, on the attachment route. Voice notes are one file per message. */
export const MAX_FILES_PER_MESSAGE = 15;

/**
 * 50 MB, decimal — the unit every file dialog and every "max 50 MB" in the
 * platform's own documentation means. A tile reading 47.7 MiB beside a rule
 * about 50 MB invites exactly the wrong conclusion.
 */
export const MAX_FILE_BYTES = 50_000_000;

/* --- what a picked file is ------------------------------------------------ */

/** Which mutation carries this file. `null` — nothing does; see `refusal`. */
export type AttachmentRoute = 'attachment' | 'voice';

export interface FileDescription {
  name: string;
  size: number;
  /** The browser's guess. Empty often enough that the extension is a fallback. */
  mimeType: string;
}

export interface Classification {
  /** The tile's glyph, set even for a refused file — it is still a picture. */
  kind: AttachmentKind;
  /** How it would be sent, or null when nothing sends it. */
  route: AttachmentRoute | null;
  /** What the REST upload is told to store it as. */
  uploadType: UploadFileType;
  /** Why it cannot be sent, in the words the tile has room for. */
  refusal: string | null;
}

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/rtf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]);

/**
 * The extension is consulted only when the browser said nothing.
 *
 * It says nothing more often than one would like — a `.csv` dragged out of a
 * mail client, anything at all on some Linux desktops — and the file is then
 * refused for having no type, which is a sentence about the browser rather than
 * about the document the operator just picked.
 */
const EXTENSION_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  rtf: 'application/rtf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'text/plain',
  log: 'text/plain',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
};

/** `image/jpg` is not a real type and is what a surprising number of files say. */
const MIME_ALIAS: Record<string, string> = { 'image/jpg': 'image/jpeg' };

export function normalizeMime(file: FileDescription): string {
  const declared = file.mimeType.trim().toLowerCase().split(';')[0] ?? '';
  const resolved = declared !== '' ? declared : extensionMime(file.name);
  return MIME_ALIAS[resolved] ?? resolved;
}

function extensionMime(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return EXTENSION_MIME[name.slice(dot + 1).toLowerCase()] ?? '';
}

/**
 * One picked file, judged.
 *
 * The order matters: type before size. A video is refused at any size, and
 * telling somebody their 60 MB clip is too large invites them to spend an hour
 * compressing it into a file the assistant still will not take.
 */
export function classifyAttachment(file: FileDescription): Classification {
  const mime = normalizeMime(file);

  if (mime.startsWith('video/')) {
    return {
      kind: 'video',
      route: null,
      uploadType: 'Video',
      refusal: 'The assistant cannot read video.',
    };
  }

  if (mime.startsWith('audio/')) {
    return oversize(file)
      ? { kind: 'audio', route: null, uploadType: 'Audio', refusal: tooLarge(file) }
      : { kind: 'audio', route: 'voice', uploadType: 'Audio', refusal: null };
  }

  if (mime.startsWith('image/')) {
    if (!IMAGE_MIME.has(mime)) {
      return {
        kind: 'image',
        route: null,
        uploadType: 'Image',
        refusal: 'PNG, JPEG, WebP and GIF only.',
      };
    }
    return oversize(file)
      ? { kind: 'image', route: null, uploadType: 'Image', refusal: tooLarge(file) }
      : { kind: 'image', route: 'attachment', uploadType: 'Image', refusal: null };
  }

  if (DOCUMENT_MIME.has(mime) || mime.startsWith('text/')) {
    return oversize(file)
      ? { kind: 'document', route: null, uploadType: 'Document', refusal: tooLarge(file) }
      : { kind: 'document', route: 'attachment', uploadType: 'Document', refusal: null };
  }

  /* Not a guess. livechat can fall back to Document because its channels take
     any bytes with a filename; this API has a list, and a file off the list
     comes back as a pending rejection rather than as a failed send. */
  return {
    kind: 'document',
    route: null,
    uploadType: 'Document',
    refusal: 'The assistant cannot read this kind of file.',
  };
}

const oversize = (file: FileDescription): boolean => file.size > MAX_FILE_BYTES;

const tooLarge = (file: FileDescription): string => `${formatFileSize(file.size)} — the limit is 50 MB.`;

/**
 * `accept` for the file input.
 *
 * A hint and nothing more — every file dialog offers "All files" beside it —
 * which is why `classifyAttachment` exists and is the half that decides. Audio
 * is deliberately absent: the paperclip sends the attachment message, and audio
 * on that route is refused by the server. The voice control has its own accept.
 */
export const ATTACHMENT_ACCEPT = [
  ...IMAGE_MIME,
  ...DOCUMENT_MIME,
  'text/plain',
  'text/csv',
  /* Extensions as well as types for the plain-text family: macOS and Windows
     both map `.md` to no MIME at all in the file dialog, so a list of types
     alone greys out exactly the files this assistant is happiest reading. */
  '.txt',
  '.md',
  '.csv',
].join(',');

export const VOICE_ACCEPT = 'audio/*';

/* --- the upload's own failures -------------------------------------------- */

/**
 * The REST endpoint's codes, under its own names.
 *
 * The first three arrive inside the body of a non-2xx response; `UploadFailed`
 * is everything else, which in practice is the network. Naming them is what
 * makes the retry button honest: only one of the four is worth pressing twice.
 */
export type UploadFailure = 'FileTooBig' | 'FileContentTypeNotSupported' | 'FileDoesNotExist' | 'UploadFailed';

const FAILURE_TEXT: Record<UploadFailure, string> = {
  FileTooBig: 'The server called it too large.',
  FileContentTypeNotSupported: 'The server will not store this type.',
  FileDoesNotExist: 'The upload was lost before it finished.',
  UploadFailed: 'Upload failed.',
};

export const uploadFailureText = (failure: UploadFailure): string => FAILURE_TEXT[failure];

/**
 * `ChatfuelHttpError` puts the first 200 bytes of the response body into its
 * message and the platform's code sits in there as a bare identifier, so the
 * match is on text: there is no documented envelope to parse. Anything
 * unrecognised is `UploadFailed` rather than a guess — an operator told "too
 * large" about a file that is not too large will spend the afternoon shrinking
 * it.
 */
export function classifyUploadFailure(err: unknown): UploadFailure {
  const text = err instanceof Error ? err.message : String(err);
  if (text.includes('FileTooBig')) return 'FileTooBig';
  if (text.includes('FileContentTypeNotSupported')) return 'FileContentTypeNotSupported';
  if (text.includes('FileDoesNotExist')) return 'FileDoesNotExist';
  return 'UploadFailed';
}
