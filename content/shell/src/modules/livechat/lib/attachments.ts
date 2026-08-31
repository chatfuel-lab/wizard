import type { UploadFileType } from '~api';
import type { AttachmentKind } from '~ui';
import {
  FacebookSendMessageAttachmentType,
  InstagramSendMessageAttachmentType,
  Platform,
  TikTokSendMessageAttachmentType,
  WebWidgetAttachmentType,
  WhatsAppSendMessageAttachmentType,
} from '~api/generated/livechat/graphql';
import { PLATFORM_LABEL } from './platform';
import type { SendAttachmentVars } from './sendDocByPlatform';

/**
 * What a picked file IS, decided once and away from any JSX.
 *
 * Three different vocabularies describe the same file and none of them is the
 * browser's. The REST upload wants `UploadFileType` — capitalised, four members.
 * The send mutation wants the platform's own attachment enum, which is
 * lower-cased and a DIFFERENT subset per platform. `AttachmentTile` wants an
 * `AttachmentKind` for the glyph. A component picking its way between those
 * three from a MIME string is a component with four bugs in it, one per channel
 * whose subset somebody misremembered.
 */

/**
 * MIME type → what to upload it as.
 *
 * `Document` is the fallback rather than a refusal because it is the one
 * category with no shape requirement: a file the browser could not name a type
 * for still has bytes and a filename, and WhatsApp will take it. Every browser
 * reports `image/*` for the pictures an operator actually attaches, so the
 * fallback only ever catches the genuinely unusual.
 */
export function uploadTypeForMime(mimeType: string): UploadFileType {
  const type = mimeType.toLowerCase();
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';
  return 'Document';
}

/** The four picture formats every channel here renders. Same set as coworker's. */
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * Why this file cannot be sent whatever the channel is, or null.
 *
 * Asked of the MIME type rather than of the upload category, and asked BEFORE
 * the per-platform question, because the two refuse for unrelated reasons: the
 * platform one is about which of the four categories a channel carries, this
 * one is about a format inside a category.
 *
 * The category above is deliberately still `Image` for a refused picture — the
 * tray shows the picture glyph on it, exactly as coworker does. What must not
 * happen is the other repair: letting an unusual `image/*` fall through to
 * `Document`, which is the branch that opens a file by navigating to it.
 */
export function mimeRefusal(mimeType: string): string | null {
  const type = mimeType.toLowerCase().split(';')[0]!.trim();
  if (!type.startsWith('image/')) return null;
  return IMAGE_MIME.has(type) ? null : 'PNG, JPEG, WebP and GIF only.';
}

const KIND: Record<UploadFileType, AttachmentKind> = {
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
  Document: 'document',
};

export const attachmentKindOf = (type: UploadFileType): AttachmentKind => KIND[type];

/**
 * The value the `attachmentType` argument takes.
 *
 * All five platform enums spell their members with the same lower-case words,
 * so one table serves them all — the same reason `SEND_TEXT_BY_PLATFORM` can
 * hand five documents one variables shape. What differs between platforms is
 * WHICH of the four exist, and that is the map below rather than this one.
 */
const WIRE: Record<UploadFileType, string> = {
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
  Document: 'document',
};

export const attachmentWireType = (type: UploadFileType): string => WIRE[type];

/**
 * Which of the four each channel can carry, read off the generated enums
 * instead of transcribed from them.
 *
 * The subsets are not guessable and not alike: the web widget and TikTok take
 * images and nothing else, WhatsApp takes documents but no video, Instagram and
 * Facebook take video but no documents. Written out by hand this table would be
 * right on the day it was typed and silently wrong the first time the schema
 * grew a member — and the only symptom would be an operator being told a file
 * cannot be sent when it can.
 */
const SUPPORTED: Record<Platform, ReadonlySet<string>> = {
  [Platform.Widget]: new Set<string>(Object.values(WebWidgetAttachmentType)),
  [Platform.Whatsapp]: new Set<string>(Object.values(WhatsAppSendMessageAttachmentType)),
  [Platform.Instagram]: new Set<string>(Object.values(InstagramSendMessageAttachmentType)),
  [Platform.Facebook]: new Set<string>(Object.values(FacebookSendMessageAttachmentType)),
  [Platform.Tiktok]: new Set<string>(Object.values(TikTokSendMessageAttachmentType)),
};

const ALL_TYPES: readonly UploadFileType[] = ['Image', 'Video', 'Audio', 'Document'];

export const platformTakes = (platform: Platform, type: UploadFileType): boolean => SUPPORTED[platform].has(WIRE[type]);

export const typesFor = (platform: Platform): UploadFileType[] =>
  ALL_TYPES.filter((type) => platformTakes(platform, type));

const NOUN: Record<UploadFileType, string> = {
  Image: 'images',
  Video: 'videos',
  Audio: 'audio files',
  Document: 'documents',
};

/** "images", "images and videos", "images, videos and audio files". */
function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * `accept` for the file input, or nothing at all.
 *
 * A channel that takes documents takes any file, and `accept` then has no
 * honest value to hold: listing the three wildcards alongside it would hide
 * exactly the files the channel is happiest with. `accept` is a hint the
 * operator can override in every file dialog anyway, which is why the refusal
 * below exists as well and is the part that decides.
 */
export function acceptFor(platform: Platform): string | undefined {
  const types = typesFor(platform);
  if (types.includes('Document')) return undefined;
  const patterns = types.map((type) => `${WIRE[type]}/*`);
  return patterns.length === 0 ? undefined : patterns.join(',');
}

/**
 * Why this file cannot go to this channel, or null when it can.
 *
 * Answered before a byte is uploaded. The upload itself would succeed — the
 * REST endpoint knows nothing about the conversation — and the send would then
 * fail with a schema error about an enum value, which is a sentence about
 * GraphQL rather than about the file the operator just picked.
 */
export function attachmentRefusal(platform: Platform, type: UploadFileType): string | null {
  if (platformTakes(platform, type)) return null;
  const accepted = typesFor(platform).map((accepted) => NOUN[accepted]);
  const label = PLATFORM_LABEL[platform];
  return accepted.length === 0
    ? `${label} cannot take attachments.`
    : `${label} cannot send ${NOUN[type]} — only ${joinWords(accepted)}.`;
}

export interface AttachmentSendInput {
  /** The `FileID` the REST upload answered with. */
  fileId: string;
  type: UploadFileType;
  /** The original filename. WhatsApp shows it on a document. */
  name: string;
  /** Fresh per message, from `newClientId()` — the merge key. */
  clientId: string;
}

/**
 * The `message` variable for the attachment mutation, or null if the channel
 * cannot carry this file after all.
 *
 * `attachmentName` is set for WhatsApp documents and for nothing else, because
 * it exists on no other input: sending it to Instagram is not a harmless extra
 * key, it is a variable the server rejects for the whole mutation. The schema
 * comment on the field says "in practice it is only used when sending a
 * document", and a document with no name arrives as an unlabelled file.
 */
export function attachmentMessage(
  platform: Platform,
  input: AttachmentSendInput,
): SendAttachmentVars['message'] | null {
  if (!platformTakes(platform, input.type)) return null;
  const message: SendAttachmentVars['message'] = {
    attachment: input.fileId,
    attachmentType: WIRE[input.type],
    clientId: input.clientId,
  };
  if (platform === Platform.Whatsapp && input.type === 'Document') {
    message.attachmentName = input.name;
  }
  return message;
}
