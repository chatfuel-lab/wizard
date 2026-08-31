import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AgendaList,
  Alert,
  Button,
  EmptyState,
  IconInstagram,
  IconPlus,
  MonthGrid,
  TimeGrid,
  addMonths,
  dateOfDayKey,
  formatMinuteOfDay,
  localTimeZone,
  monthBounds,
  monthKeyOf,
  openExternal,
  shiftDayKey,
  useHotkeys,
  useToast,
  usesHour12,
  wallClockIn,
  weekStartsOnFor,
  type DayKey,
  type MonthKey,
  type TimeGridColumn,
  type TimeGridEvent,
} from '~ui';
import { usePostsQueue } from '../PublishingQueueContext';
import { CalendarSkeleton } from '../components/CalendarSkeleton';
import { CalendarToolbar } from '../components/CalendarToolbar';
import { PostChip } from '../components/PostChip';
import {
  DEFAULT_SLOT_MINUTE,
  HOUR_LABEL_STEP_MIN,
  blockSpans,
  SNAP_MIN,
  WEEK_DENSITY,
  bucketByDay,
  canReschedule,
  chipAction,
  comparePosts,
  effectiveMode,
  initialScrollMinute,
  monthCellLimit,
  movedToDay,
  postDayKey,
  postLook,
  postMinute,
  postTitle,
  postsInDays,
  slotIso,
  todayKeyIn,
  windowDays,
} from '../lib/calendarPlacement';
import { errorMessage } from '../lib/errors';
import { NEW_POST } from '../lib/publishingParams';
import { CALENDAR_BINDINGS, type CalendarShortcutId } from '../lib/shortcuts';
import { selectDated } from '../lib/postsStore';
import type { QueuedPost } from '../types';
import type { PublishingViewProps } from './types';

/** A post as the week grid sees it: a column, a minute, and the post itself. */
interface WeekEvent extends TimeGridEvent {
  post: QueuedPost;
}

const MODE_NOUN = { month: 'Month', week: 'Week', list: 'List' } as const;

/**
 * The calendar — the module's front door, and the answer to "what is going out,
 * and when".
 *
 * ## What can be on it
 *
 * Only posts this app queued. `InstagramPost`, `InstagramReel` and
 * `InstagramStory` carry no timestamp in this API, so media that went out any
 * other way cannot be placed on a day at all; the library is where that lives.
 * The rows here come from the shared queue store rather than a fetch of their
 * own, so the calendar and the queue can never disagree about a post.
 *
 * ## Three shapes of the same list
 *
 * Month, week and list are `?mode=`, and which one is DRAWN is not always the
 * one asked for: a month grid needs seven readable columns and a narrow embed
 * has not got them, so it falls back to the list while the address keeps saying
 * month. Widening the container brings the month back with no click.
 *
 * ## Moving a post
 *
 * A drag writes `scheduledAt` optimistically and puts the chip back if the
 * store refuses, with the refusal said once, in a toast, at the moment it
 * happens. A published post cannot be moved — it is already on Instagram and
 * this API has no un-publish — and neither can one that is publishing right
 * now, whose request is already in flight.
 *
 * Whether a time will actually FIRE is the queue backend's question, not this
 * surface's: where nothing can schedule, nothing ever gets a time, and the
 * calendar is simply empty rather than lying about a future.
 *
 * `refreshToken` is deliberately unused. The queue is a provider shared with
 * the other views and the header's refresh button already re-lists it; a
 * refetch here would be a second request for the same rows.
 */
export function CalendarView({ band, address, patch, onCompose, onBusy, rootRef }: PublishingViewProps) {
  const queue = usePostsQueue();
  const toast = useToast();
  const zone = useMemo(() => localTimeZone(), []);
  const hour12 = useMemo(() => usesHour12(), []);
  const weekStartsOn = useMemo(() => weekStartsOnFor(), []);
  const [nowMs, setNowMs] = useState(() => Date.now());
  /* The day inside the month the address names. The address carries a month and
     no day, so the week's anchor lives here — and is discarded the moment the
     address moves to a month it does not belong to. */
  const [pickedDay, setPickedDay] = useState<DayKey | null>(null);

  /* The now-line and "today" both move on their own. A minute is the finest
     thing either of them shows. */
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayKey = useMemo(() => todayKeyIn(zone, nowMs), [zone, nowMs]);
  const thisMonth = monthKeyOf(todayKey);
  const month = address.month ?? thisMonth;
  const anchor =
    pickedDay && monthKeyOf(pickedDay) === month
      ? pickedDay
      : month === thisMonth
        ? todayKey
        : (monthBounds(month)?.first ?? todayKey);
  const mode = effectiveMode(address.mode, band);

  const { state } = queue;
  const dated = useMemo(() => selectDated(state), [state]);
  const days = useMemo(() => windowDays(mode, anchor, month, weekStartsOn), [mode, anchor, month, weekStartsOn]);
  const placed = useMemo(() => postsInDays(dated, days, zone), [dated, days, zone]);
  const filledDays = useMemo(() => new Set(bucketByDay(dated, zone).keys()), [dated, zone]);

  useEffect(() => {
    onBusy(state.loading);
  }, [state.loading, onBusy]);

  // ---------------------------------------------------------------------
  // Where in time we are
  // ---------------------------------------------------------------------
  const goMonth = useCallback(
    (next: MonthKey) => patch({ month: next === thisMonth ? null : next }),
    [patch, thisMonth],
  );

  const goDay = useCallback(
    (day: DayKey) => {
      setPickedDay(day);
      goMonth(monthKeyOf(day));
    },
    [goMonth],
  );

  const step = useCallback(
    (delta: -1 | 1) => {
      if (mode === 'week') {
        goDay(shiftDayKey(anchor, delta * 7));
        return;
      }
      setPickedDay(null);
      goMonth(addMonths(month, delta));
    },
    [mode, anchor, month, goDay, goMonth],
  );

  const goToday = useCallback(() => {
    setPickedDay(null);
    patch({ month: null });
  }, [patch]);

  /**
   * A month cell's "+N more", and a day header in the list: open that day.
   *
   * One patch, not `goDay` followed by a mode patch: `patch` merges into the
   * address this render was given, so a second call would be written from the
   * pre-first-call address and undo it.
   */
  const openDay = useCallback(
    (day: DayKey) => {
      setPickedDay(day);
      patch({ mode: 'week', month: monthKeyOf(day) === thisMonth ? null : monthKeyOf(day) });
    },
    [patch, thisMonth],
  );

  /**
   * The calendar's own keys, armed only while the calendar is the view on
   * screen — which is exactly as long as this component is mounted.
   *
   * They are installed here rather than in the workspace because stepping a
   * period needs `anchor`, and `anchor` is this component's state: the address
   * carries a month and no day, so the day a week is drawn around lives here and
   * nowhere else. The workspace could set `?mode=` from up there, but it could
   * not answer `]` or Today, and splitting one row of the toolbar across two
   * files by which key happens to be pure is a worse rule than "the surface owns
   * its own keyboard".
   *
   * Scoped to the module root, not to the calendar: `useHotkeys` counts "focus
   * on nothing" as in scope for whichever root it is given, and the module root
   * is the boundary that keeps these keys out of a host app.
   */
  const onShortcut = useCallback(
    (id: CalendarShortcutId) => {
      /* The list runs from the first post to the last, so it has no period to
         step and nowhere to go home to — the same reason the toolbar draws
         neither control there. A key that is a no-op beside a button that is
         absent is the pair agreeing. */
      const paged = mode !== 'list';
      switch (id) {
        case 'today':
          return paged ? goToday() : undefined;
        case 'prevPeriod':
          return paged ? step(-1) : undefined;
        case 'nextPeriod':
          return paged ? step(1) : undefined;
        case 'modeMonth':
          return patch({ mode: 'month' });
        case 'modeWeek':
          return patch({ mode: 'week' });
        case 'modeList':
          return patch({ mode: 'list' });
      }
    },
    [mode, goToday, step, patch],
  );

  useHotkeys(CALENDAR_BINDINGS, onShortcut, { rootRef });

  // ---------------------------------------------------------------------
  // What a click and a drag do
  // ---------------------------------------------------------------------
  const timeLabelOf = useCallback(
    (post: QueuedPost) => formatMinuteOfDay(postMinute(post, zone), { hour12, short: true }),
    [zone, hour12],
  );

  const openPost = useCallback(
    (post: QueuedPost) => {
      const action = chipAction(post);
      if (action.kind === 'open') openExternal(action.url);
      else onCompose(action.id);
    },
    [onCompose],
  );

  const composeAt = useCallback(
    (day: DayKey, minute: number) => onCompose(NEW_POST, slotIso(day, minute, zone) || null),
    [onCompose, zone],
  );

  /**
   * Move a post, optimistically.
   *
   * The chip lands where it was dropped before the store has answered, because
   * a grid that waits for a round trip reads as a broken grid. What optimism is
   * not allowed to be is a lie: a refusal puts the post back exactly as it was
   * and says so once, where it happened.
   */
  const move = useCallback(
    (post: QueuedPost, at: string) => {
      if (!at || at === post.scheduledAt || !canReschedule(post)) return;
      queue.dispatch({ type: 'upserted', post: { ...post, scheduledAt: at } });
      void queue.patch(post.id, { scheduledAt: at }).catch((err: unknown) => {
        queue.dispatch({ type: 'upserted', post });
        toast.show({ tone: 'danger', title: 'That post could not be moved', description: errorMessage(err) });
      });
    },
    [queue, toast],
  );

  const chipLabel = useCallback(
    (post: QueuedPost) => `${postTitle(post)}, ${timeLabelOf(post)}, ${postLook(post.status).label}`,
    [timeLabelOf],
  );

  // ---------------------------------------------------------------------
  // The week grid's columns and events
  // ---------------------------------------------------------------------
  const columns = useMemo<TimeGridColumn[]>(() => {
    if (mode !== 'week') return [];
    const short = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const full = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
    const spoken = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    return days.map((day) => {
      const date = dateOfDayKey(day);
      const today = day === todayKey;
      /* One line, weekday then number — the shape a date is written in. Today
         is the accent colour AND spelled out in full: two signals, so the day
         you are on is found without reading, and without a badge or a pill
         around the number to find it by. */
      const weekday = date ? (today ? full : short).format(date) : day;
      return {
        id: day,
        label: date ? spoken.format(date) : day,
        header: (
          <span className={`flex min-w-0 items-baseline justify-center gap-1 ${today ? 'text-accent' : ''}`}>
            <span className={`truncate text-label ${today ? 'font-semibold' : 'font-medium text-text-muted'}`}>
              {weekday}
            </span>
            <span className={`shrink-0 text-label tabular-nums ${today ? 'font-semibold' : 'text-text'}`}>
              {Number(day.slice(8))}
            </span>
          </span>
        ),
      };
    });
  }, [mode, days, todayKey]);

  const weekEvents = useMemo<WeekEvent[]>(() => {
    if (mode !== 'week') return [];
    /* Per day, not per week: how tall a block is drawn depends on what comes
       next in its own column, and Tuesday's next post is nothing to Monday. */
    const byDay = new Map<string, { post: QueuedPost; minute: number }[]>();
    for (const post of placed) {
      const day = postDayKey(post, zone);
      const list = byDay.get(day) ?? [];
      list.push({ post, minute: postMinute(post, zone) });
      byDay.set(day, list);
    }
    const events: WeekEvent[] = [];
    for (const [day, list] of byDay) {
      const posts = new Map(list.map((entry) => [entry.post.id, entry.post]));
      for (const span of blockSpans(list.map((entry) => ({ id: entry.post.id, minute: entry.minute })))) {
        const post = posts.get(span.id);
        if (post) events.push({ id: span.id, post, columnId: day, start: span.start, end: span.end });
      }
    }
    return events;
  }, [mode, placed, zone]);

  const eventsById = useMemo(() => new Map(weekEvents.map((event) => [event.id, event])), [weekEvents]);

  // ---------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------
  const periodLabel = useMemo(() => {
    if (mode === 'week') {
      const from = dateOfDayKey(days[0] ?? anchor);
      const to = dateOfDayKey(days[6] ?? anchor);
      if (!from || !to) return anchor;
      const sameMonth = monthKeyOf(days[0] ?? '') === monthKeyOf(days[6] ?? '');
      const start = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(from);
      const end = new Intl.DateTimeFormat(
        undefined,
        sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' },
      ).format(to);
      return `${start} – ${end}`;
    }
    const first = dateOfDayKey(monthBounds(month)?.first ?? anchor);
    return first ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first) : month;
  }, [mode, days, anchor, month]);

  const ariaLabel = mode === 'list' ? 'Scheduled posts' : `${MODE_NOUN[mode]}: ${periodLabel}`;

  // ---------------------------------------------------------------------
  // The surface
  // ---------------------------------------------------------------------
  const emptyState = (
    <EmptyState
      icon={<IconInstagram />}
      title="Nothing scheduled"
      action={
        <Button variant="primary" size="sm" onClick={() => onCompose(NEW_POST)}>
          <IconPlus />
          New post
        </Button>
      }
    />
  );

  let surface: ReactNode;
  if (state.loading && dated.length === 0) {
    surface = <CalendarSkeleton mode={mode} />;
  } else if (dated.length === 0) {
    surface = <div className="flex min-h-0 flex-1 items-center justify-center">{emptyState}</div>;
  } else if (mode === 'month') {
    surface = (
      <MonthGrid<QueuedPost>
        month={month}
        weekStartsOn={weekStartsOn}
        events={placed}
        dayOf={(post) => postDayKey(post, zone)}
        compare={comparePosts}
        maxPerDay={monthCellLimit(band)}
        todayKey={todayKey}
        selectedDayKey={pickedDay}
        renderEvent={(post) => <PostChip post={post} variant="chip" timeLabel={timeLabelOf(post)} />}
        onDayClick={(day) => composeAt(day, DEFAULT_SLOT_MINUTE)}
        onMoreClick={openDay}
        onEventClick={openPost}
        onEventDrop={(post, day) => move(post, movedToDay(post, day, zone))}
        canDrag={canReschedule}
        aria-label={ariaLabel}
        className="min-h-0 flex-1"
      />
    );
  } else if (mode === 'week') {
    surface = (
      <TimeGrid<WeekEvent>
        /* Remount when the zone-dependent geometry changes, so the grid
           re-scrolls to where the posts are instead of keeping a scroll
           position that now points at a different hour. */
        key={`${anchor}-${zone}`}
        columns={columns}
        events={weekEvents}
        density={WEEK_DENSITY}
        hourLabelStep={HOUR_LABEL_STEP_MIN}
        snap={SNAP_MIN}
        hour12={hour12}
        now={{ minute: wallClockIn(nowMs, zone).minuteOfDay, columnId: todayKey }}
        initialScrollMinute={initialScrollMinute(placed, zone)}
        eventLabel={(event) => chipLabel(event.post)}
        renderEvent={(event, context) => (
          <PostChip post={event.post} variant="block" timeLabel={timeLabelOf(event.post)} heightPx={context.heightPx} />
        )}
        onEventClick={(event) => openPost(event.post)}
        onSlotClick={composeAt}
        /* Move only. A post is an instant — the block's height is a size, not a
           duration — so there is no edge to drag and no resize handler. */
        onEventMove={(change) => {
          const event = eventsById.get(change.id);
          if (event) move(event.post, slotIso(change.columnId, change.start, zone));
        }}
        canDrag={(event) => canReschedule(event.post)}
        aria-label={ariaLabel}
        className="min-h-0 flex-1"
      />
    );
  } else {
    surface = (
      <AgendaList<QueuedPost>
        items={dated}
        dayOf={(post) => postDayKey(post, zone)}
        compare={comparePosts}
        keyOf={(post) => post.id}
        todayKey={todayKey}
        compactMaxPerDay={4}
        onDayClick={band === 'compact' ? undefined : openDay}
        renderItem={(post) => (
          <div
            role="button"
            tabIndex={0}
            aria-label={chipLabel(post)}
            onClick={() => openPost(post)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              openPost(post);
            }}
            className="cursor-pointer outline-none focus-visible:focus-ring"
          >
            <PostChip post={post} variant="row" timeLabel={timeLabelOf(post)} />
          </div>
        )}
        emptyState={emptyState}
        aria-label={ariaLabel}
        className="min-h-0 flex-1 rounded-card border border-border bg-surface-raised"
      />
    );
  }

  return (
    <>
      <CalendarToolbar
        band={band}
        requestedMode={address.mode}
        mode={mode}
        onMode={(next) => patch({ mode: next })}
        label={periodLabel}
        month={month}
        anchor={anchor}
        todayKey={todayKey}
        weekStartsOn={weekStartsOn}
        filledDays={filledDays}
        onStep={step}
        onToday={goToday}
        onPickDay={goDay}
      />
      {state.error ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            title="The queue could not be read"
            onDismiss={() => queue.dispatch({ type: 'errorCleared' })}
            action={
              <Button variant="outline" size="sm" onClick={queue.refresh}>
                Try again
              </Button>
            }
          >
            {state.error}
          </Alert>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col px-gutter pb-gutter pt-3">{surface}</div>
    </>
  );
}
