import { describe, expect, it } from 'vitest';
import type { PostStatus, QueuedPost } from '../types';
import {
  bulkActions,
  duplicateOf,
  removalConfirmLabel,
  removalDetail,
  removalPlan,
  removalTitle,
  removalVerb,
  reschedulePatch,
  retryPatch,
  rowActionLabel,
  rowActions,
  rowActivation,
  scheduleFields,
  scheduleInstant,
  scheduleVerb,
} from './queueRows';

const SCHEDULING = { canSchedule: true };
const LOCAL = { canSchedule: false };

const post = (over: Partial<QueuedPost> = {}): QueuedPost => ({
  id: 'p1',
  kind: 'post',
  caption: 'Bags landed this morning.',
  media: [{ id: 'm1', type: 'image', url: 'https://example.com/a.jpg', source: 'link' }],
  scheduledAt: null,
  status: 'draft',
  attempts: 0,
  mediaId: null,
  permalink: null,
  error: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...over,
});

const at = (status: PostStatus, over: Partial<QueuedPost> = {}): QueuedPost => post({ id: status, status, ...over });

describe('rowActions', () => {
  it('offers a draft the composer, a copy, a time and a real delete', () => {
    expect(rowActions(at('draft'), SCHEDULING)).toEqual(['open', 'duplicate', 'reschedule', 'delete']);
  });

  it('offers a failed post a retry, ahead of everything else that can move it', () => {
    expect(rowActions(at('failed'), SCHEDULING)).toEqual(['open', 'duplicate', 'retry', 'reschedule', 'delete']);
  });

  it('never offers to delete a published post from Instagram', () => {
    // There is no delete mutation in this API. Removing the row is all this app
    // can honestly promise, and `delete` must not appear anywhere near it.
    const actions = rowActions(at('published', { permalink: 'https://example.com/p/1/' }), SCHEDULING);
    expect(actions).toContain('remove');
    expect(actions).not.toContain('delete');
    expect(actions).toEqual(['permalink', 'duplicate', 'remove']);
  });

  it('leaves a publish that is in flight alone', () => {
    // Everything else would race the request that is already out.
    expect(rowActions(at('publishing'), SCHEDULING)).toEqual(['duplicate']);
  });

  it('withholds every timed action from a store nothing runs beside', () => {
    // A time nobody will act on is a lie; the way back for a failure is the composer.
    expect(rowActions(at('failed'), LOCAL)).toEqual(['open', 'duplicate', 'delete']);
    expect(rowActions(at('scheduled'), LOCAL)).toEqual(['open', 'duplicate', 'delete']);
  });
});

describe('rowActivation', () => {
  it('opens the composer on anything still being worked on', () => {
    expect(rowActivation(at('draft'))).toEqual({ kind: 'compose', id: 'draft' });
    expect(rowActivation(at('failed'))).toEqual({ kind: 'compose', id: 'failed' });
  });

  it('opens Instagram on a published post', () => {
    const url = 'https://www.instagram.com/p/abc/';
    expect(rowActivation(at('published', { permalink: url }))).toEqual({ kind: 'permalink', url });
  });

  it('opens nothing when the platform gave back no link', () => {
    // `permalink` comes back as an empty string often enough to have its own
    // line in the operations document.
    expect(rowActivation(at('published', { permalink: '' })).kind).toBe('none');
    expect(rowActivation(at('published', { permalink: '   ' })).kind).toBe('none');
    expect(rowActivation(at('published', { permalink: null })).kind).toBe('none');
  });

  it('opens nothing while a post is going out', () => {
    expect(rowActivation(at('publishing')).kind).toBe('none');
  });
});

describe('scheduleVerb', () => {
  const timed = at('scheduled', { scheduledAt: '2026-08-22T09:00:00.000Z' });

  it('only calls it rescheduling when every post already has a time to move', () => {
    expect(scheduleVerb([timed])).toBe('Reschedule');
    expect(scheduleVerb([timed, at('draft')])).toBe('Schedule');
    expect(scheduleVerb([at('draft')])).toBe('Schedule');
  });

  it('says Schedule for nothing at all, so a title is never blank', () => {
    expect(scheduleVerb([])).toBe('Schedule');
  });
});

describe('rowActionLabel', () => {
  it('calls it scheduling when there is no time to move', () => {
    expect(rowActionLabel('reschedule', at('draft'))).toBe('Schedule');
    expect(rowActionLabel('reschedule', at('scheduled', { scheduledAt: '2026-08-22T09:00:00.000Z' }))).toBe(
      'Reschedule',
    );
  });

  it('says what removing a published post really does', () => {
    expect(rowActionLabel('remove', at('published'))).toBe('Remove from list');
    expect(rowActionLabel('delete', at('draft'))).toBe('Delete');
  });
});

describe('bulkActions over a mixed selection', () => {
  const find = (actions: ReturnType<typeof bulkActions>, id: string) => actions.find((action) => action.id === id);

  it('counts what it will touch, not what is selected', () => {
    // Seven rows selected, three of them failed: the bar says "Retry 3".
    const selection = [
      at('failed', { id: 'f1' }),
      at('failed', { id: 'f2' }),
      at('failed', { id: 'f3' }),
      at('draft', { id: 'd1' }),
      at('scheduled', { id: 's1' }),
      at('published', { id: 'x1' }),
      at('publishing', { id: 'g1' }),
    ];
    const retry = find(bulkActions(selection, SCHEDULING), 'retry');
    expect(retry?.label).toBe('Retry 3');
    expect(retry?.ids).toEqual(['f1', 'f2', 'f3']);
  });

  it('drops an action no selected row can take, rather than disabling it', () => {
    const actions = bulkActions([at('published'), at('publishing')], SCHEDULING);
    expect(find(actions, 'retry')).toBeUndefined();
    expect(find(actions, 'reschedule')).toBeUndefined();
  });

  it('duplicates everything, including a publish in flight', () => {
    const actions = bulkActions([at('published'), at('publishing'), at('draft')], SCHEDULING);
    expect(find(actions, 'duplicate')?.label).toBe('Duplicate 3');
  });

  it('calls it Delete only when nothing in the selection has been published', () => {
    const actions = bulkActions([at('draft', { id: 'd1' }), at('failed', { id: 'f1' })], SCHEDULING);
    const destructive = find(actions, 'delete');
    expect(destructive?.label).toBe('Delete 2');
    expect(destructive?.tone).toBe('danger');
  });

  it('drops to the weaker verb the moment one published post joins the selection', () => {
    // "Delete 3" would promise something this API cannot do to the published one.
    const actions = bulkActions(
      [at('draft', { id: 'd1' }), at('failed', { id: 'f1' }), at('published', { id: 'x1' })],
      SCHEDULING,
    );
    expect(find(actions, 'delete')).toBeUndefined();
    expect(find(actions, 'remove')?.label).toBe('Remove 3');
    expect(find(actions, 'remove')?.ids).toEqual(['d1', 'f1', 'x1']);
  });

  it('keeps a publish in flight out of the destructive batch', () => {
    const actions = bulkActions([at('draft', { id: 'd1' }), at('publishing', { id: 'g1' })], SCHEDULING);
    expect(find(actions, 'delete')?.ids).toEqual(['d1']);
  });

  it('says Schedule when any of the targets has no time yet', () => {
    const timed = at('scheduled', { id: 's1', scheduledAt: '2026-08-22T09:00:00.000Z' });
    expect(find(bulkActions([timed], SCHEDULING), 'reschedule')?.label).toBe('Reschedule 1');
    expect(find(bulkActions([timed, at('draft', { id: 'd1' })], SCHEDULING), 'reschedule')?.label).toBe('Schedule 2');
  });

  it('offers only a copy and a removal where nothing can be scheduled', () => {
    const actions = bulkActions([at('failed'), at('published')], LOCAL);
    expect(actions.map((action) => action.id)).toEqual(['duplicate', 'remove']);
  });

  it('has nothing to offer for an empty selection', () => {
    expect(bulkActions([], SCHEDULING)).toEqual([]);
  });
});

describe('the removal confirmation', () => {
  const plan = (...posts: QueuedPost[]) => removalPlan(posts);

  it('names a delete a delete', () => {
    const one = plan(at('draft'));
    expect(removalVerb(one)).toBe('delete');
    expect(removalTitle(one)).toBe('Delete this post?');
    expect(removalConfirmLabel(one)).toBe('Delete');
    expect(removalDetail(one)).toBeNull();
    expect(removalTitle(plan(at('draft', { id: 'a' }), at('failed', { id: 'b' })))).toBe('Delete 2 posts?');
  });

  it('says out loud that a published post only leaves this list', () => {
    const one = plan(at('published'));
    expect(removalVerb(one)).toBe('remove');
    expect(removalTitle(one)).toBe('Remove this post from the list?');
    expect(removalConfirmLabel(one)).toBe('Remove');
    // The title carries it; there is nothing left to add underneath.
    expect(removalDetail(one)).toBeNull();
  });

  it('spells out the half of a mixed batch that is not coming back', () => {
    const mixed = plan(at('draft', { id: 'd1' }), at('failed', { id: 'f1' }), at('published', { id: 'x1' }));
    expect(removalTitle(mixed)).toBe('Remove 3 posts from the list?');
    expect(removalDetail(mixed)).toBe('2 of them have not been published and will be deleted.');
    expect(removalConfirmLabel(mixed)).toBe('Remove');
  });

  it('counts one the way a person would', () => {
    const mixed = plan(at('draft', { id: 'd1' }), at('published', { id: 'x1' }));
    expect(removalDetail(mixed)).toBe('One of them has not been published and will be deleted.');
  });
});

describe('what the actions write', () => {
  it('makes a copy a draft, never a second publish at the same instant', () => {
    const source = at('scheduled', { scheduledAt: '2026-08-22T09:00:00.000Z', kind: 'reel' });
    const copy = duplicateOf(source);
    expect(copy.scheduledAt).toBeNull();
    expect(copy.kind).toBe('reel');
    expect(copy.caption).toBe(source.caption);
  });

  it('copies the media rather than sharing it with the original', () => {
    const source = at('draft');
    const copy = duplicateOf(source);
    expect(copy.media).toEqual(source.media);
    expect(copy.media[0]).not.toBe(source.media[0]);
  });

  it('carries reel settings over, and leaves the key off when there are none', () => {
    expect(duplicateOf(at('draft', { reel: { shareToFeed: true } })).reel).toEqual({ shareToFeed: true });
    expect('reel' in duplicateOf(at('draft'))).toBe(false);
  });

  it('retries at the time it already had, and now when it had none', () => {
    const now = '2026-08-21T12:00:00.000Z';
    expect(retryPatch(at('failed', { scheduledAt: '2026-08-20T09:00:00.000Z' }), now)).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-08-20T09:00:00.000Z',
      error: null,
    });
    expect(retryPatch(at('failed'), now).scheduledAt).toBe(now);
  });

  it('never resets the attempt count — it records what happened', () => {
    expect(retryPatch(at('failed', { attempts: 4 }), '2026-08-21T12:00:00.000Z')).not.toHaveProperty('attempts');
  });

  it('clears the error when a time is set, so a stale failure does not follow the row', () => {
    expect(reschedulePatch('2026-08-22T09:00:00.000Z')).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-08-22T09:00:00.000Z',
      error: null,
    });
  });
});

describe('the schedule controls', () => {
  it('reads a day and a wall-clock time as local, which is what was meant', () => {
    const iso = scheduleInstant('2026-08-24', '09:30');
    expect(iso).not.toBeNull();
    const back = new Date(iso!);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(7);
    expect(back.getDate()).toBe(24);
    expect(back.getHours()).toBe(9);
    expect(back.getMinutes()).toBe(30);
  });

  it('refuses anything that is not a day and a time', () => {
    expect(scheduleInstant('', '09:30')).toBeNull();
    expect(scheduleInstant('2026-08-24', '')).toBeNull();
    expect(scheduleInstant('24/08/2026', '09:30')).toBeNull();
    expect(scheduleInstant('2026-13-40', '09:30')).toBeNull();
  });

  it('round-trips the time a post already has back into the two controls', () => {
    const iso = scheduleInstant('2026-08-24', '09:30')!;
    expect(scheduleFields(iso, 0)).toEqual({ day: '2026-08-24', time: '09:30' });
  });

  it('falls back to the given instant for a post that has no time', () => {
    const fallback = new Date(2026, 7, 24, 9, 30).getTime();
    expect(scheduleFields(null, fallback)).toEqual({ day: '2026-08-24', time: '09:30' });
    expect(scheduleFields('nonsense', fallback).day).toBe('2026-08-24');
  });
});
