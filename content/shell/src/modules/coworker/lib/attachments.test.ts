import { describe, expect, it } from 'vitest';
import { ATTACHMENT_ACCEPT, classifyAttachment, classifyUploadFailure, normalizeMime } from './attachments';

describe('normalizeMime', () => {
  it('falls back to the extension when the browser said nothing', () => {
    expect(normalizeMime({ name: 'prices.csv', size: 1, mimeType: '' })).toBe('text/csv');
    expect(normalizeMime({ name: 'deck.pptx', size: 1, mimeType: '' })).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  });

  it('prefers what the browser said, lower-cased and stripped of parameters', () => {
    expect(normalizeMime({ name: 'notes.bin', size: 1, mimeType: 'Text/Plain; charset=utf-8' })).toBe('text/plain');
  });

  it('maps the image/jpg that is not a real type', () => {
    expect(normalizeMime({ name: 'p.jpg', size: 1, mimeType: 'image/jpg' })).toBe('image/jpeg');
  });

  it('gives up on a file with neither a type nor a known extension', () => {
    expect(normalizeMime({ name: 'archive', size: 1, mimeType: '' })).toBe('');
  });
});

describe('classifyAttachment', () => {
  it('routes the four image types the API takes', () => {
    for (const mimeType of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(classifyAttachment({ name: 'p', size: 10, mimeType })).toMatchObject({
        kind: 'image',
        route: 'attachment',
        uploadType: 'Image',
        refusal: null,
      });
    }
  });

  it('refuses the image types it does not, by name', () => {
    const svg = classifyAttachment({ name: 'logo.svg', size: 10, mimeType: 'image/svg+xml' });
    expect(svg.route).toBeNull();
    expect(svg.kind).toBe('image');
    expect(svg.refusal).toContain('PNG, JPEG, WebP and GIF');
  });

  it('takes pdf, office and text as documents', () => {
    for (const mimeType of [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/markdown',
    ]) {
      expect(classifyAttachment({ name: 'd', size: 10, mimeType })).toMatchObject({
        route: 'attachment',
        uploadType: 'Document',
        refusal: null,
      });
    }
  });

  it('sends audio down the voice route, which is the only one that takes it', () => {
    expect(classifyAttachment({ name: 'note.m4a', size: 10, mimeType: 'audio/mp4' })).toMatchObject({
      kind: 'audio',
      route: 'voice',
      uploadType: 'Audio',
      refusal: null,
    });
  });

  it('refuses video outright — there is no route for it', () => {
    const clip = classifyAttachment({ name: 'clip.mp4', size: 10, mimeType: 'video/mp4' });
    expect(clip.route).toBeNull();
    expect(clip.kind).toBe('video');
  });

  /* Type before size: a 60 MB video is refused for being a video. Telling
     somebody to compress it invites an hour spent producing a file the
     assistant still will not take. */
  it('names the type, not the size, when both are wrong', () => {
    const huge = classifyAttachment({ name: 'clip.mp4', size: 60_000_000, mimeType: 'video/mp4' });
    expect(huge.refusal).toContain('video');
  });

  it('refuses anything over 50 MB and says how large it was', () => {
    const big = classifyAttachment({ name: 'scan.pdf', size: 60_000_000, mimeType: 'application/pdf' });
    expect(big.route).toBeNull();
    expect(big.refusal).toBe('60 MB — the limit is 50 MB.');
  });

  it('takes a file of exactly the limit', () => {
    expect(classifyAttachment({ name: 'scan.pdf', size: 50_000_000, mimeType: 'application/pdf' }).route).toBe(
      'attachment',
    );
  });

  it('refuses an unknown type rather than guessing it is a document', () => {
    const zip = classifyAttachment({ name: 'bundle.zip', size: 10, mimeType: 'application/zip' });
    expect(zip.route).toBeNull();
  });

  it('offers the browser the types it will accept', () => {
    expect(ATTACHMENT_ACCEPT).toContain('image/png');
    expect(ATTACHMENT_ACCEPT).toContain('application/pdf');
    expect(ATTACHMENT_ACCEPT).not.toContain('audio/');
    expect(ATTACHMENT_ACCEPT).not.toContain('video/');
  });
});

describe('classifyUploadFailure', () => {
  it('reads the platform code out of the body snippet', () => {
    expect(classifyUploadFailure(new Error('HTTP 400: {"code":"FileTooBig"}'))).toBe('FileTooBig');
    expect(classifyUploadFailure(new Error('FileContentTypeNotSupported'))).toBe('FileContentTypeNotSupported');
  });

  it('calls anything unrecognised a plain failure', () => {
    expect(classifyUploadFailure(new Error('socket hang up'))).toBe('UploadFailed');
    expect(classifyUploadFailure('nope')).toBe('UploadFailed');
  });
});
