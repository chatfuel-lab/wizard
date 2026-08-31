import { describe, expect, it } from 'vitest';
import { MAX_FILES_PER_MESSAGE } from './attachments';
import {
  EMPTY_TRAY,
  selectSendable,
  selectUploading,
  sendPlan,
  trayReducer,
  type PickedFile,
  type StagedAttachment,
  type TrayState,
} from './trayStore';

const picked = (over: Partial<PickedFile> = {}): PickedFile => ({
  id: 'a1',
  name: 'photo.png',
  size: 1_000,
  mimeType: 'image/png',
  previewUrl: null,
  ...over,
});

const stageAll = (files: PickedFile[]): TrayState => trayReducer(EMPTY_TRAY, { type: 'staged', files });

describe('trayReducer', () => {
  it('stages a refused file failed, with its name and its reason', () => {
    const state = stageAll([picked({ name: 'clip.mp4', mimeType: 'video/mp4' })]);
    expect(state.staged).toHaveLength(1);
    expect(state.staged[0]).toMatchObject({ name: 'clip.mp4', status: 'failed', route: null });
    expect(state.staged[0]!.refusal).not.toBeNull();
  });

  it('counts the cap against the tray, not against the batch', () => {
    const batch = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => picked({ id: `f${from + i}` }));
    let state = stageAll(batch(0, 10));
    state = trayReducer(state, { type: 'staged', files: batch(10, 10) });
    expect(state.staged).toHaveLength(MAX_FILES_PER_MESSAGE);
    expect(state.notice).toBe('Only 15 files fit in one message — 5 were not added.');
  });

  it('says so in the singular when exactly one did not fit', () => {
    const batch = Array.from({ length: 16 }, (_, i) => picked({ id: `f${i}` }));
    expect(stageAll(batch).notice).toContain('1 was not added');
  });

  it('clears the notice on the next thing the operator does', () => {
    const full = stageAll(Array.from({ length: 16 }, (_, i) => picked({ id: `f${i}` })));
    expect(trayReducer(full, { type: 'removed', id: 'f0' }).notice).toBeNull();
  });

  it('carries an upload through to ready', () => {
    let state = stageAll([picked()]);
    expect(selectUploading(state)).toBe(true);
    state = trayReducer(state, { type: 'uploaded', id: 'a1', fileId: 'file-9' });
    expect(selectUploading(state)).toBe(false);
    expect(selectSendable(state)).toHaveLength(1);
    expect(selectSendable(state)[0]!.fileId).toBe('file-9');
  });

  it('does not overwrite a refusal with a generic upload failure', () => {
    let state = stageAll([picked({ name: 'clip.mp4', mimeType: 'video/mp4' })]);
    const before = state.staged[0]!.refusal;
    state = trayReducer(state, { type: 'uploadFailed', id: 'a1', failure: 'UploadFailed' });
    expect(state.staged[0]!.refusal).toBe(before);
    expect(state.staged[0]!.failure).toBeNull();
  });

  it('retries an upload failure and refuses to retry a refusal', () => {
    let failed = trayReducer(stageAll([picked()]), {
      type: 'uploadFailed',
      id: 'a1',
      failure: 'UploadFailed',
    });
    failed = trayReducer(failed, { type: 'retried', id: 'a1' });
    expect(failed.staged[0]!.status).toBe('uploading');

    const refused = stageAll([picked({ name: 'clip.mp4', mimeType: 'video/mp4' })]);
    expect(trayReducer(refused, { type: 'retried', id: 'a1' }).staged[0]!.status).toBe('failed');
  });

  it('removes only what was sent, so a late upload stays staged', () => {
    let state = stageAll([picked({ id: 'a1' }), picked({ id: 'a2' })]);
    state = trayReducer(state, { type: 'uploaded', id: 'a1', fileId: 'f1' });
    state = trayReducer(state, { type: 'sent', ids: ['a1'] });
    expect(state.staged.map((attachment) => attachment.id)).toEqual(['a2']);
  });

  it('is identity when nothing changes, so React does not re-render', () => {
    const state = stageAll([picked()]);
    expect(trayReducer(state, { type: 'removed', id: 'nope' })).toBe(state);
    expect(trayReducer(state, { type: 'uploaded', id: 'nope', fileId: 'x' })).toBe(state);
    expect(trayReducer(EMPTY_TRAY, { type: 'cleared' })).toBe(EMPTY_TRAY);
  });

  it('keeps nothing across a conversation switch', () => {
    expect(trayReducer(stageAll([picked()]), { type: 'cleared' })).toEqual(EMPTY_TRAY);
  });
});

describe('sendPlan', () => {
  const ready = (id: string, route: 'attachment' | 'voice'): StagedAttachment => ({
    id,
    name: id,
    size: 10,
    kind: route === 'voice' ? 'audio' : 'image',
    route,
    uploadType: route === 'voice' ? 'Audio' : 'Image',
    previewUrl: null,
    status: 'ready',
    fileId: `file-${id}`,
    failure: null,
    refusal: null,
  });

  it('splits the two routes', () => {
    const plan = sendPlan([ready('a', 'attachment'), ready('v', 'voice')], false);
    expect(plan.files.map((f) => f.id)).toEqual(['a']);
    expect(plan.voice.map((f) => f.id)).toEqual(['v']);
  });

  it('lets the text ride along as a caption when there are attachments', () => {
    expect(sendPlan([ready('a', 'attachment')], true).textRidesAlong).toBe(true);
  });

  /* The audio mutation takes one file and NO text. A voice note plus a typed
     line is two messages, and the text goes the ordinary way — which is also
     the only way it gets an optimistic bubble. */
  it('does not hand the text to a voice note', () => {
    expect(sendPlan([ready('v', 'voice')], true).textRidesAlong).toBe(false);
  });

  it('leaves the text alone when the tray is empty', () => {
    expect(sendPlan([], true)).toEqual({ voice: [], files: [], textRidesAlong: false });
  });
});
