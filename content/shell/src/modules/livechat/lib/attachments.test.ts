import { describe, expect, it } from 'vitest';
import { Platform } from '~api/generated/livechat/graphql';
import {
  acceptFor,
  attachmentKindOf,
  attachmentMessage,
  attachmentRefusal,
  attachmentWireType,
  mimeRefusal,
  platformTakes,
  typesFor,
  uploadTypeForMime,
} from './attachments';

describe('uploadTypeForMime', () => {
  it('reads the family off the MIME type', () => {
    expect(uploadTypeForMime('image/png')).toBe('Image');
    expect(uploadTypeForMime('video/mp4')).toBe('Video');
    expect(uploadTypeForMime('audio/ogg; codecs=opus')).toBe('Audio');
    expect(uploadTypeForMime('application/pdf')).toBe('Document');
  });

  it('is case-insensitive — browsers are not consistent about it', () => {
    expect(uploadTypeForMime('IMAGE/JPEG')).toBe('Image');
  });

  /* A file the browser could name no type for still has bytes and a filename,
     and Document is the one category with no shape requirement. */
  it('calls an unknown type a document rather than refusing it', () => {
    expect(uploadTypeForMime('')).toBe('Document');
    expect(uploadTypeForMime('application/x-made-up')).toBe('Document');
  });
});

describe('mimeRefusal', () => {
  it('takes the four formats every channel renders', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(mimeRefusal(mime)).toBeNull();
    }
    expect(mimeRefusal('IMAGE/PNG')).toBeNull();
    expect(mimeRefusal('image/jpeg; charset=binary')).toBeNull();
  });

  /* The same policy coworker states, and for the same reason: an image format
     nobody asked for is refused rather than sent as a document, because the
     document branch opens a file by navigating to it. */
  it('refuses an image format outside the four, SVG included', () => {
    expect(mimeRefusal('image/svg+xml')).toBe('PNG, JPEG, WebP and GIF only.');
    expect(mimeRefusal('image/tiff')).toBe('PNG, JPEG, WebP and GIF only.');
    expect(uploadTypeForMime('image/svg+xml')).toBe('Image');
  });

  it('has nothing to say about anything that is not a picture', () => {
    expect(mimeRefusal('application/pdf')).toBeNull();
    expect(mimeRefusal('video/mp4')).toBeNull();
    expect(mimeRefusal('')).toBeNull();
  });
});

describe('attachmentKindOf', () => {
  it('maps every upload type onto a tile glyph', () => {
    expect(attachmentKindOf('Image')).toBe('image');
    expect(attachmentKindOf('Video')).toBe('video');
    expect(attachmentKindOf('Audio')).toBe('audio');
    expect(attachmentKindOf('Document')).toBe('document');
  });
});

describe('platformTakes', () => {
  /* The four subsets, none of which is guessable from the others. Read off the
     generated enums, so this test is what says the reading is right. */
  it('knows the web widget takes images and nothing else', () => {
    expect(platformTakes(Platform.Widget, 'Image')).toBe(true);
    expect(platformTakes(Platform.Widget, 'Video')).toBe(false);
    expect(platformTakes(Platform.Widget, 'Audio')).toBe(false);
    expect(platformTakes(Platform.Widget, 'Document')).toBe(false);
  });

  it('knows WhatsApp takes documents but not video', () => {
    expect(typesFor(Platform.Whatsapp)).toEqual(['Image', 'Audio', 'Document']);
  });

  it('knows Instagram and Facebook take video but not documents', () => {
    expect(typesFor(Platform.Instagram)).toEqual(['Image', 'Video', 'Audio']);
    expect(typesFor(Platform.Facebook)).toEqual(['Image', 'Video', 'Audio']);
  });

  it('knows TikTok takes images only', () => {
    expect(typesFor(Platform.Tiktok)).toEqual(['Image']);
  });
});

describe('acceptFor', () => {
  it('lists the wildcards a picture-only channel wants', () => {
    expect(acceptFor(Platform.Widget)).toBe('image/*');
    expect(acceptFor(Platform.Instagram)).toBe('image/*,video/*,audio/*');
  });

  /* A channel that takes documents takes any file, and listing the three
     wildcards beside that would hide exactly the files it is happiest with. */
  it('says nothing at all for a channel that takes documents', () => {
    expect(acceptFor(Platform.Whatsapp)).toBeUndefined();
  });
});

describe('attachmentRefusal', () => {
  it('is silent when the channel can carry the file', () => {
    expect(attachmentRefusal(Platform.Whatsapp, 'Document')).toBeNull();
    expect(attachmentRefusal(Platform.Tiktok, 'Image')).toBeNull();
  });

  it('names the channel and what it does take', () => {
    expect(attachmentRefusal(Platform.Whatsapp, 'Video')).toBe(
      'WhatsApp cannot send videos — only images, audio files and documents.',
    );
    expect(attachmentRefusal(Platform.Widget, 'Document')).toBe('Web widget cannot send documents — only images.');
  });
});

describe('attachmentMessage', () => {
  const input = { fileId: 'file-1', name: 'invoice.pdf', clientId: 'uuid-1' } as const;

  it('carries the FileID, the platform enum value and the clientId', () => {
    expect(attachmentMessage(Platform.Widget, { ...input, type: 'Image', name: 'cat.png' })).toEqual({
      attachment: 'file-1',
      attachmentType: 'image',
      clientId: 'uuid-1',
    });
  });

  /* attachmentName exists on WhatsApp's input and on no other. Sent elsewhere
     it is not a harmless extra key — the server rejects the whole mutation. */
  it('names a WhatsApp document and only a WhatsApp document', () => {
    expect(attachmentMessage(Platform.Whatsapp, { ...input, type: 'Document' })).toEqual({
      attachment: 'file-1',
      attachmentType: 'document',
      clientId: 'uuid-1',
      attachmentName: 'invoice.pdf',
    });
    expect(attachmentMessage(Platform.Whatsapp, { ...input, type: 'Image', name: 'cat.png' })).not.toHaveProperty(
      'attachmentName',
    );
  });

  it('answers null rather than building a message the channel cannot take', () => {
    expect(attachmentMessage(Platform.Instagram, { ...input, type: 'Document' })).toBeNull();
  });
});

describe('attachmentWireType', () => {
  it('lower-cases the four words the five enums agree on', () => {
    expect(attachmentWireType('Image')).toBe('image');
    expect(attachmentWireType('Document')).toBe('document');
  });
});
