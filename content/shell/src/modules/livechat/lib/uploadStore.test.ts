import { describe, expect, it } from 'vitest';
import { ChatfuelHttpError } from '~api';
import { Platform } from '~api/generated/livechat/graphql';
import {
  classifyUploadFailure,
  EMPTY_UPLOAD_STATE,
  MAX_STAGED,
  selectPreviewUrls,
  selectSendable,
  selectUploading,
  uploadFailureText,
  uploadReducer,
  type PickedFile,
  type UploadAction,
  type UploadState,
} from './uploadStore';

const picked = (id: string, over: Partial<PickedFile> = {}): PickedFile => ({
  id,
  name: `${id}.png`,
  size: 1024,
  mimeType: 'image/png',
  previewUrl: null,
  ...over,
});

const run = (state: UploadState, ...actions: UploadAction[]): UploadState => actions.reduce(uploadReducer, state);

const staged = (platform: Platform, ...files: PickedFile[]): UploadState =>
  run(EMPTY_UPLOAD_STATE, { type: 'staged', platform, files });

describe('staging', () => {
  it('classifies a picked file once, away from any component', () => {
    const state = staged(Platform.Whatsapp, picked('a', { mimeType: 'audio/ogg', name: 'note.ogg' }));
    expect(state.staged[0]).toMatchObject({
      id: 'a',
      name: 'note.ogg',
      type: 'Audio',
      kind: 'audio',
      status: 'uploading',
      fileId: null,
      failure: null,
      refusal: null,
    });
  });

  /* Dropping a file the channel cannot take is how an operator concludes the
     attach button is broken. It enters the tray failed, with its reason. */
  it('stages a refused file rather than swallowing it', () => {
    const state = staged(Platform.Tiktok, picked('a', { mimeType: 'application/pdf' }));
    expect(state.staged).toHaveLength(1);
    expect(state.staged[0]!.status).toBe('failed');
    expect(state.staged[0]!.refusal).toContain('TikTok');
    expect(state.staged[0]!.failure).toBeNull();
  });

  it('counts the cap against the tray, not against the batch', () => {
    const many = Array.from({ length: MAX_STAGED }, (_, i) => picked(`a${i}`));
    const state = run(
      EMPTY_UPLOAD_STATE,
      { type: 'staged', platform: Platform.Widget, files: many },
      { type: 'staged', platform: Platform.Widget, files: [picked('overflow')] },
    );
    expect(state.staged).toHaveLength(MAX_STAGED);
    expect(state.staged.some((entry) => entry.id === 'overflow')).toBe(false);
  });

  it('is a no-op when there is no room left', () => {
    const full = staged(Platform.Widget, ...Array.from({ length: MAX_STAGED }, (_, i) => picked(`a${i}`)));
    expect(uploadReducer(full, { type: 'staged', platform: Platform.Widget, files: [picked('x')] })).toBe(full);
  });
});

describe('the upload', () => {
  it('holds the FileID the send mutation references', () => {
    const state = run(staged(Platform.Widget, picked('a')), {
      type: 'uploaded',
      id: 'a',
      fileId: 'file-9',
    });
    expect(state.staged[0]).toMatchObject({ status: 'ready', fileId: 'file-9', progress: 100 });
  });

  it('names the failure the way the API names it', () => {
    const state = run(staged(Platform.Widget, picked('a')), {
      type: 'uploadFailed',
      id: 'a',
      failure: 'FileTooBig',
    });
    expect(state.staged[0]).toMatchObject({ status: 'failed', failure: 'FileTooBig', fileId: null });
  });

  /* A refused file is never uploaded, so a failure arriving for one would
     replace the true reason with a generic one. */
  it('leaves a refusal alone', () => {
    const refused = staged(Platform.Tiktok, picked('a', { mimeType: 'application/pdf' }));
    const state = run(refused, { type: 'uploadFailed', id: 'a', failure: 'UploadFailed' });
    expect(state.staged[0]!.failure).toBeNull();
    expect(state.staged[0]!.refusal).not.toBeNull();
  });

  it('reopens a failed upload on retry, and only a failed one', () => {
    const failed = run(staged(Platform.Widget, picked('a')), {
      type: 'uploadFailed',
      id: 'a',
      failure: 'UploadFailed',
    });
    expect(run(failed, { type: 'retried', id: 'a' }).staged[0]).toMatchObject({
      status: 'uploading',
      failure: null,
    });

    const refused = staged(Platform.Tiktok, picked('a', { mimeType: 'application/pdf' }));
    expect(uploadReducer(refused, { type: 'retried', id: 'a' }).staged[0]!.status).toBe('failed');
  });

  /* A late tick from an upload that has already answered would otherwise
     reopen a finished tile and take its fileId's meaning with it. */
  it('ignores progress once the upload has answered', () => {
    const done = run(staged(Platform.Widget, picked('a')), {
      type: 'uploaded',
      id: 'a',
      fileId: 'file-1',
    });
    expect(uploadReducer(done, { type: 'progress', id: 'a', progress: 40 }).staged[0]!.progress).toBe(100);
  });

  it('clamps progress into 0–100', () => {
    const state = run(staged(Platform.Widget, picked('a')), {
      type: 'progress',
      id: 'a',
      progress: 140,
    });
    expect(state.staged[0]!.progress).toBe(100);
  });

  it('ignores an id that is not in the tray', () => {
    const state = staged(Platform.Widget, picked('a'));
    expect(uploadReducer(state, { type: 'uploaded', id: 'gone', fileId: 'x' })).toBe(state);
    expect(uploadReducer(state, { type: 'removed', id: 'gone' })).toBe(state);
  });
});

describe('emptying the tray', () => {
  const twoReady = () =>
    run(
      staged(Platform.Widget, picked('a'), picked('b')),
      { type: 'uploaded', id: 'a', fileId: 'file-a' },
      { type: 'uploaded', id: 'b', fileId: 'file-b' },
    );

  /* An upload that finished while the send was being assembled was not part of
     that message, and the operator has not been told otherwise. */
  it('removes exactly what was sent', () => {
    const state = run(twoReady(), { type: 'sent', ids: ['a'] });
    expect(state.staged.map((entry) => entry.id)).toEqual(['b']);
  });

  it('clears everything on a conversation switch', () => {
    expect(run(twoReady(), { type: 'cleared' })).toEqual(EMPTY_UPLOAD_STATE);
  });

  it('keeps its identity when there is nothing to clear', () => {
    expect(uploadReducer(EMPTY_UPLOAD_STATE, { type: 'cleared' })).toBe(EMPTY_UPLOAD_STATE);
  });
});

describe('selectors', () => {
  it('offers only the files that would actually go out', () => {
    const state = run(
      staged(Platform.Widget, picked('a'), picked('b'), picked('c')),
      { type: 'uploaded', id: 'a', fileId: 'file-a' },
      { type: 'uploadFailed', id: 'b', failure: 'FileTooBig' },
    );
    expect(selectSendable(state).map((entry) => entry.id)).toEqual(['a']);
    /* c is still going up, which is the composer's `sending` — a failed tile is
       not, or the button would never come back. */
    expect(selectUploading(state)).toBe(true);
    expect(selectUploading(run(state, { type: 'removed', id: 'c' }))).toBe(false);
  });

  it('hands back every object URL so the caller can revoke it', () => {
    const state = staged(Platform.Widget, picked('a', { previewUrl: 'blob:one' }), picked('b', { previewUrl: null }));
    expect(selectPreviewUrls(state)).toEqual(['blob:one']);
  });
});

describe('classifyUploadFailure', () => {
  /* ChatfuelHttpError keeps the first 200 bytes of the body on `bodySnippet`
     — off the message, which is what this app renders — and the platform's
     code is in there as a bare identifier. */
  it('finds the platform code inside the HTTP error body', () => {
    expect(classifyUploadFailure(new ChatfuelHttpError(413, '{"error":"FileTooBig"}'))).toBe('FileTooBig');
    expect(classifyUploadFailure(new ChatfuelHttpError(415, '{"error":"FileContentTypeNotSupported"}'))).toBe(
      'FileContentTypeNotSupported',
    );
    expect(classifyUploadFailure(new ChatfuelHttpError(404, 'FileDoesNotExist'))).toBe('FileDoesNotExist');
  });

  /* An operator told "too large" about a file that is not too large spends the
     afternoon shrinking it. */
  it('guesses nothing about anything else', () => {
    expect(classifyUploadFailure(new Error('network down'))).toBe('UploadFailed');
    expect(classifyUploadFailure('nonsense')).toBe('UploadFailed');
  });
});

describe('uploadFailureText', () => {
  it('has a sentence for every named failure', () => {
    for (const failure of ['FileTooBig', 'FileContentTypeNotSupported', 'FileDoesNotExist', 'UploadFailed'] as const) {
      expect(uploadFailureText(failure)).not.toBe('');
    }
  });
});
