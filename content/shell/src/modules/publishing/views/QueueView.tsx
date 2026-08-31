import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionBar,
  Alert,
  Button,
  EmptyState,
  IconLayoutList,
  PageBody,
  SegmentedControl,
  Toolbar,
  openExternal,
  useToast,
  type MenuItem,
  type SortState,
} from '~ui';
import { usePostsQueue } from '../PublishingQueueContext';
import { QueueTable } from '../components/QueueTable';
import { RemovalDialog } from '../components/RemovalDialog';
import { RescheduleDialog } from '../components/RescheduleDialog';
import { errorMessage } from '../lib/errors';
import { NEW_POST } from '../lib/publishingParams';
import { countByStatus, selectByStatus, selectPosts } from '../lib/postsStore';
import { STATUS_EMPTY, STATUS_META, STATUS_ORDER, sortRows } from '../lib/queueColumns';
import {
  bulkActions,
  duplicateOf,
  removalConfirmLabel,
  removalPlan,
  reschedulePatch,
  retryPatch,
  rowActivation,
  scheduleVerb,
  type QueueActionId,
} from '../lib/queueRows';
import type { PostStatus, QueuedPost } from '../types';
import type { PublishingViewProps } from './types';

const ALL = 'all';

/** How often the relative times are recomputed. A minute is their resolution. */
const CLOCK_MS = 60_000;

interface Pending {
  action: 'reschedule' | 'removal';
  ids: string[];
}

/**
 * The queue: every post this app knows about, and the place a failure is read
 * and fixed.
 *
 * The rows come from the shared store rather than a fetch of this view's own —
 * the calendar draws the same posts and the two must never disagree — so this
 * file holds only what is genuinely local: the sort, the selection, the column
 * widths and whichever dialog is open.
 *
 * Every batch here is a sequential loop, not `Promise.all`, and that is not a
 * simplification. There is no bulk mutation on either store, and the local one
 * rewrites its whole document on each write: two of those in flight together
 * lose one of them.
 */
export function QueueView({ band, address, patch, onCompose, onBusy }: PublishingViewProps) {
  const queue = usePostsQueue();
  const toast = useToast();

  const [sort, setSort] = useState<SortState | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => window.clearInterval(id);
  }, []);

  const caps = useMemo(() => ({ canSchedule: queue.canSchedule }), [queue.canSchedule]);
  const counts = useMemo(() => countByStatus(queue.state), [queue.state]);
  const total = useMemo(() => selectPosts(queue.state).length, [queue.state]);

  const rows = useMemo(
    () => sortRows(selectByStatus(queue.state, address.status), sort),
    [queue.state, address.status, sort],
  );

  const byId = queue.state.byId;
  const postsFor = useCallback(
    (ids: readonly string[]): QueuedPost[] =>
      ids.map((id) => byId[id]).filter((post): post is QueuedPost => Boolean(post)),
    [byId],
  );

  /* One rule covers both halves of the problem: a row that has been deleted and
     a row the filter has hidden are equally unactionable, and a bulk bar
     counting either is a bar that acts on what is not on screen. */
  const visibleIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  useEffect(() => {
    setSelection((prev) => {
      const kept = prev.filter((id) => visibleIds.has(id));
      return kept.length === prev.length ? prev : kept;
    });
  }, [visibleIds]);

  useEffect(() => onBusy(queue.state.loading || working), [onBusy, queue.state.loading, working]);

  /* ── running a batch ───────────────────────────────────────────────────── */

  const runBatch = useCallback(
    async (ids: readonly string[], label: string, work: (post: QueuedPost) => Promise<unknown>) => {
      const targets = postsFor(ids);
      if (targets.length === 0) return;
      setWorking(true);
      let done = 0;
      let failure: string | null = null;
      for (const post of targets) {
        try {
          await work(post);
          done += 1;
        } catch (err) {
          /* The first refusal is the one worth showing; the rest are almost
             always the same one repeated. */
          failure ??= errorMessage(err);
        }
      }
      setWorking(false);
      setSelection([]);
      if (failure !== null) {
        toast.show({
          tone: 'danger',
          title:
            targets.length === 1
              ? 'That did not go through'
              : `${targets.length - done} of ${targets.length} did not go through`,
          description: failure,
        });
        return;
      }
      toast.show({ tone: 'success', title: `${label} ${done}` });
    },
    [postsFor, toast],
  );

  const duplicate = useCallback(
    (ids: readonly string[]) => runBatch(ids, 'Duplicated', (post) => queue.save(duplicateOf(post))),
    [runBatch, queue],
  );

  const retry = useCallback(
    (ids: readonly string[]) => {
      const stamp = new Date().toISOString();
      return runBatch(ids, 'Queued', (post) => queue.patch(post.id, retryPatch(post, stamp)));
    },
    [runBatch, queue],
  );

  const remove = useCallback(
    (ids: readonly string[]) => {
      const plan = removalPlan(postsFor(ids));
      const label = removalConfirmLabel(plan) === 'Delete' ? 'Deleted' : 'Removed';
      return runBatch(ids, label, (post) => queue.remove(post.id));
    },
    [runBatch, queue, postsFor],
  );

  const reschedule = useCallback(
    (ids: readonly string[], at: string) =>
      runBatch(ids, 'Scheduled', (post) => queue.patch(post.id, reschedulePatch(at))),
    [runBatch, queue],
  );

  /* ── what a row and a selection can do ─────────────────────────────────── */

  const activate = useCallback(
    (post: QueuedPost) => {
      const next = rowActivation(post);
      if (next.kind === 'compose') onCompose(next.id);
      else if (next.kind === 'permalink') openExternal(next.url);
    },
    [onCompose],
  );

  const onAction = useCallback(
    (action: QueueActionId, post: QueuedPost) => {
      switch (action) {
        case 'open':
        case 'permalink':
          activate(post);
          return;
        case 'duplicate':
          void duplicate([post.id]);
          return;
        case 'retry':
          void retry([post.id]);
          return;
        case 'reschedule':
          setPending({ action: 'reschedule', ids: [post.id] });
          return;
        default:
          setPending({ action: 'removal', ids: [post.id] });
      }
    },
    [activate, duplicate, retry],
  );

  const selected = useMemo(() => postsFor(selection), [postsFor, selection]);

  const barActions = useMemo<MenuItem[]>(
    () =>
      bulkActions(selected, caps).map((action) => ({
        id: action.id,
        label: action.label,
        ...(action.tone ? { tone: action.tone } : {}),
        onSelect: () => {
          if (action.id === 'duplicate') void duplicate(action.ids);
          else if (action.id === 'retry') void retry(action.ids);
          else if (action.id === 'reschedule') setPending({ action: 'reschedule', ids: action.ids });
          else setPending({ action: 'removal', ids: action.ids });
        },
      })),
    [selected, caps, duplicate, retry],
  );

  const statusOptions = useMemo(
    () => [
      { value: ALL, label: `All ${total}` },
      ...STATUS_ORDER.map((status) => ({
        value: status,
        label: `${STATUS_META[status].label} ${counts[status]}`,
      })),
    ],
    [counts, total],
  );

  const pendingPosts = pending ? postsFor(pending.ids) : [];

  return (
    /* `relative` is load-bearing: ActionBar is absolutely positioned and is
       deliberately not portalled, so an embed's bulk bar stays inside the
       module rather than stretching across the host's page. */
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Toolbar>
        {/* Scrolls rather than wraps: the pill this control slides is measured
            from the buttons, and options reflowed onto a second line leave it
            sitting under the wrong one.

            `data-publishing-filter` is the contract the `/` shortcut reaches
            this view's filter through — one attribute rather than a prop every
            view would have to thread up to the workspace and back. */}
        <div className="min-w-0 flex-1 overflow-x-auto" data-publishing-filter>
          <SegmentedControl
            aria-label="Status"
            size="sm"
            value={address.status ?? ALL}
            onChange={(next) => patch({ status: next === ALL ? null : (next as PostStatus) })}
            options={statusOptions}
          />
        </div>
      </Toolbar>

      {queue.state.error ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={queue.refresh}>
                Retry
              </Button>
            }
          >
            {queue.state.error}
          </Alert>
        </div>
      ) : null}

      <PageBody padded={false}>
        <QueueTable
          rows={rows}
          band={band}
          loading={queue.state.loading}
          now={now}
          caps={caps}
          sort={sort}
          onSortChange={setSort}
          selectedIds={selection}
          onSelectionChange={setSelection}
          onActivate={activate}
          onAction={onAction}
          widths={widths}
          onWidthsChange={setWidths}
          empty={
            address.status ? (
              <EmptyState
                icon={<IconLayoutList />}
                title={STATUS_EMPTY[address.status]}
                action={
                  <Button variant="secondary" onClick={() => patch({ status: null })}>
                    Show every post
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<IconLayoutList />}
                title="No posts yet"
                action={
                  <Button variant="primary" onClick={() => onCompose(NEW_POST)}>
                    New post
                  </Button>
                }
              />
            )
          }
        />
      </PageBody>

      <ActionBar
        count={selection.length}
        noun={{ one: 'post', many: 'posts' }}
        actions={barActions}
        onClear={() => setSelection([])}
      />

      <RescheduleDialog
        open={pending?.action === 'reschedule'}
        verb={scheduleVerb(pendingPosts)}
        count={pendingPosts.length}
        from={pendingPosts[0]?.scheduledAt ?? null}
        busy={working}
        onClose={() => setPending(null)}
        onConfirm={(at) => {
          void reschedule(pending?.ids ?? [], at).then(() => setPending(null));
        }}
      />

      <RemovalDialog
        open={pending?.action === 'removal'}
        posts={pendingPosts}
        busy={working}
        onClose={() => setPending(null)}
        onConfirm={() => {
          void remove(pending?.ids ?? []).then(() => setPending(null));
        }}
      />
    </div>
  );
}
