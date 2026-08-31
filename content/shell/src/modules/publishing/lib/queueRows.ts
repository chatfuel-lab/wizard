/**
 * What a row in the queue may be done to, and what that is honestly called.
 *
 * Three rules live here, and each of them is a bug in a table that decides such
 * things inline:
 *
 * 1. **A published post cannot be un-published.** There is no delete mutation
 *    anywhere in this API — `instagramAccountPublish*` is one-way. So a
 *    published row offers `remove`, which takes it out of this list and leaves
 *    Instagram alone, and never `delete`, which would promise something nothing
 *    here can do. The two are separate ids precisely so the wording cannot
 *    drift back together.
 *
 * 2. **A time nothing will act on is not offered.** `reschedule` and `retry`
 *    both mean "the app will publish this later", and only a queue with
 *    something running beside it can do that. On the browser-only store both
 *    are absent — absent, not present and inert — and the way back for a failed
 *    post is the composer.
 *
 * 3. **A bulk action names what it will actually touch.** A selection can span
 *    every status, and an action almost never applies to all of it. Rather than
 *    refusing the whole selection (which makes somebody filter first) or acting
 *    silently on part of it (which is how work disappears), each bulk action
 *    carries the count of rows it will change: seven selected, "Retry 3".
 */
import type { NewPost, PostStatus, QueuedPost } from '../types';

export type QueueActionId = 'open' | 'permalink' | 'duplicate' | 'reschedule' | 'retry' | 'delete' | 'remove';

export interface QueueCapabilities {
  /** False on a store only this browser reads: nothing will publish while nobody looks. */
  canSchedule: boolean;
}

/** Statuses whose post has never reached Instagram, so removing it really does delete it. */
const UNPUBLISHED: readonly PostStatus[] = ['draft', 'scheduled', 'failed'];

const isUnpublished = (status: PostStatus): boolean => UNPUBLISHED.includes(status);

/**
 * Which actions one row offers, in the order they are shown.
 *
 * `publishing` is deliberately almost empty: the post is going out right now,
 * and every editing action would race the request that is in flight. Duplicating
 * it is harmless and stays.
 */
export function rowActions(post: QueuedPost, caps: QueueCapabilities): QueueActionId[] {
  const actions: QueueActionId[] = [];
  const activation = rowActivation(post);
  if (activation.kind === 'permalink') actions.push('permalink');
  else if (activation.kind === 'compose') actions.push('open');

  actions.push('duplicate');
  if (post.status === 'publishing') return actions;

  if (post.status === 'failed' && caps.canSchedule) actions.push('retry');
  if (isUnpublished(post.status) && caps.canSchedule) actions.push('reschedule');
  actions.push(isUnpublished(post.status) ? 'delete' : 'remove');
  return actions;
}

export type RowActivation = { kind: 'compose'; id: string } | { kind: 'permalink'; url: string } | { kind: 'none' };

/**
 * What clicking the row itself does.
 *
 * A published post has nothing left to edit, so its row opens the post on
 * Instagram — except that `permalink` comes back an empty string often enough
 * that it has its own line in the operations document, and a link to nowhere is
 * worse than no link. A post that is being published right now opens nothing:
 * the composer would be a form whose save races the publish.
 */
export function rowActivation(post: QueuedPost): RowActivation {
  if (post.status === 'publishing') return { kind: 'none' };
  if (post.status === 'published') {
    const url = post.permalink?.trim() ?? '';
    return url ? { kind: 'permalink', url } : { kind: 'none' };
  }
  return { kind: 'compose', id: post.id };
}

const ROW_LABEL: Record<QueueActionId, string> = {
  open: 'Open',
  permalink: 'View on Instagram',
  duplicate: 'Duplicate',
  reschedule: 'Reschedule',
  retry: 'Retry',
  delete: 'Delete',
  remove: 'Remove from list',
};

/** Verb only, for the bulk bar — the count is appended to it. */
const BULK_LABEL: Partial<Record<QueueActionId, string>> = {
  duplicate: 'Duplicate',
  reschedule: 'Reschedule',
  retry: 'Retry',
  delete: 'Delete',
  remove: 'Remove',
};

/**
 * "Reschedule" moves a time that already exists. A draft has none, so anything
 * covering one is scheduling rather than rescheduling — and a batch that holds
 * even one untimed post is scheduling too, because that is the verb true of all
 * of them. One function, so the row menu, the bulk bar and the dialog's own
 * title cannot drift apart.
 */
export function scheduleVerb(posts: readonly QueuedPost[]): 'Schedule' | 'Reschedule' {
  return posts.length > 0 && posts.every((post) => post.scheduledAt !== null) ? 'Reschedule' : 'Schedule';
}

export function rowActionLabel(action: QueueActionId, post: QueuedPost): string {
  if (action === 'reschedule') return scheduleVerb([post]);
  return ROW_LABEL[action];
}

export const isDestructive = (action: QueueActionId): boolean => action === 'delete' || action === 'remove';

export interface BulkAction {
  id: QueueActionId;
  label: string;
  /** Exactly the rows this will change — never the whole selection. */
  ids: string[];
  tone?: 'danger';
}

/**
 * What a selection may be done to, however many statuses it spans.
 *
 * An action with no applicable row is not in the list at all. A disabled button
 * with a reason beside it teaches people to read the bar instead of the table;
 * an absent one teaches them what the selection is.
 *
 * The destructive entry is the interesting one. Delete and remove are different
 * promises, and a selection holding both a draft and a published post can only
 * honestly be offered the weaker of the two — the drafts still go for good, and
 * the confirmation is where that is said, once, at the moment it happens.
 */
export function bulkActions(posts: readonly QueuedPost[], caps: QueueCapabilities): BulkAction[] {
  const applicable = (action: QueueActionId): QueuedPost[] =>
    posts.filter((post) => rowActions(post, caps).includes(action));

  const out: BulkAction[] = [];
  for (const action of ['duplicate', 'retry', 'reschedule'] as const) {
    const targets = applicable(action);
    if (targets.length === 0) continue;
    const verb = action === 'reschedule' ? scheduleVerb(targets) : BULK_LABEL[action]!;
    out.push({ id: action, label: `${verb} ${targets.length}`, ids: targets.map((post) => post.id) });
  }

  const plan = removalPlan(posts.filter((post) => post.status !== 'publishing'));
  const total = plan.deleted.length + plan.removed.length;
  if (total > 0) {
    const deleting = removalVerb(plan) === 'delete';
    out.push({
      id: deleting ? 'delete' : 'remove',
      label: `${deleting ? BULK_LABEL.delete! : BULK_LABEL.remove!} ${total}`,
      ids: [...plan.deleted, ...plan.removed],
      tone: 'danger',
    });
  }
  return out;
}

export interface RemovalPlan {
  /** Never published: taking these off the list is the end of them. */
  deleted: string[];
  /** Already on Instagram: only this list forgets them. */
  removed: string[];
}

export function removalPlan(posts: readonly QueuedPost[]): RemovalPlan {
  return {
    deleted: posts.filter((post) => isUnpublished(post.status)).map((post) => post.id),
    removed: posts.filter((post) => !isUnpublished(post.status)).map((post) => post.id),
  };
}

/**
 * The one verb that is true of every post in the plan.
 *
 * Only a batch with nothing published in it can be called a delete. The moment
 * one published post joins it the batch stops being a delete for that post, and
 * the weaker verb is the only one that does not overpromise.
 */
export function removalVerb(plan: RemovalPlan): 'delete' | 'remove' {
  return plan.removed.length === 0 && plan.deleted.length > 0 ? 'delete' : 'remove';
}

/** The confirmation's title. It has to name which of the two things is happening. */
export function removalTitle(plan: RemovalPlan): string {
  const total = plan.deleted.length + plan.removed.length;
  if (removalVerb(plan) === 'delete') {
    return total === 1 ? 'Delete this post?' : `Delete ${total} posts?`;
  }
  return total === 1 ? 'Remove this post from the list?' : `Remove ${total} posts from the list?`;
}

/**
 * The one line under it, and only when the title cannot carry the whole truth.
 *
 * A mixed selection is removed from the list, but the part of it that never
 * went out is gone for good — nobody can be expected to work that out from a
 * title, and there is no undo behind this.
 */
export function removalDetail(plan: RemovalPlan): string | null {
  if (plan.deleted.length === 0 || plan.removed.length === 0) return null;
  const n = plan.deleted.length;
  return n === 1
    ? 'One of them has not been published and will be deleted.'
    : `${n} of them have not been published and will be deleted.`;
}

/** The confirmation's own button. Same verb as the title. */
export const removalConfirmLabel = (plan: RemovalPlan): string =>
  removalVerb(plan) === 'delete' ? 'Delete' : 'Remove';

/* -------------------------------------------------------------------------- */
/* What each action writes                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A copy is a draft, never a second post at the same instant.
 *
 * Duplicating a scheduled post and keeping its time would queue two publishes
 * for the same minute, which Instagram accepts and nobody means.
 */
export function duplicateOf(post: QueuedPost): NewPost {
  return {
    kind: post.kind,
    caption: post.caption,
    media: post.media.map((item) => ({ ...item })),
    ...(post.reel ? { reel: { ...post.reel } } : {}),
    scheduledAt: null,
  };
}

/**
 * Hand a failure back to the queue.
 *
 * The time is left alone when it has one — a past time means "as soon as
 * possible", which is what a retry is — and set to now when it does not, so the
 * post is something the queue can act on rather than a draft again. `attempts`
 * is not reset: it counts what actually happened.
 *
 * Neither this nor `reschedulePatch` writes `updatedAt` — both stores stamp it
 * themselves, and a client clock arguing with a server one is a race with a
 * winner nobody chose.
 */
export function retryPatch(post: QueuedPost, now: string): Partial<QueuedPost> {
  return { status: 'scheduled', scheduledAt: post.scheduledAt ?? now, error: null };
}

export function reschedulePatch(at: string): Partial<QueuedPost> {
  return { status: 'scheduled', scheduledAt: at, error: null };
}

/**
 * A day and a wall-clock time, as the instant the operator meant.
 *
 * Local, not UTC: somebody choosing 09:00 means nine in the morning where they
 * are. `Date` reads a date-time with no zone on it as local, which is the one
 * place that default is what is wanted.
 */
export function scheduleInstant(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const at = new Date(`${day}T${time}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** The day and time controls' starting values, from whatever the post already has. */
export function scheduleFields(iso: string | null, fallback: number): { day: string; time: string } {
  const at = iso === null ? Number.NaN : Date.parse(iso);
  const date = new Date(Number.isFinite(at) ? at : fallback);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return {
    day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}
