import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Progress, localTimeZone, openExternal, useBand, useHotkeys, useToast } from '~ui';
import { usePublishing } from '../../PublishingContext';
import { usePostsQueue } from '../../PublishingQueueContext';
import { useComposerSeed } from '../../hooks/useComposerSeed';
import { useMediaSources } from '../../hooks/useMediaSources';
import { usePublish } from '../../hooks/usePublish';
import { emptyDraft, KIND_LABELS, roomFor, toDraft, withMedia } from '../../lib/composerDraft';
import { footerControls } from '../../lib/footerControls';
import { NEW_POST } from '../../lib/publishingParams';
import { COMPOSER_BINDINGS, type ComposerShortcutId } from '../../lib/shortcuts';
import { errorMessage } from '../../lib/errors';
import { problemFor, validatePost, type PostProblem } from '../../lib/postValidation';
import type { Account, MediaItem, NewPost, PostStatus } from '../../types';
import { ComposerForm } from './ComposerForm';
import { LibraryPickerDialog } from './LibraryPickerDialog';
import { ScheduleButton } from './ScheduleButton';

export interface ComposerModalProps {
  /** `new`, the id of a post already in the queue, or null for closed. */
  target: string | null;
  /** The time a calendar slot handed over, for a post that has none yet. */
  at: string | null;
  /** Media already on the account to start a new post from — the library's "use this again". */
  from: string | null;
  account: Account;
  onClose: () => void;
}

type Intent = 'draft' | 'schedule' | 'publish';

/**
 * How wide the composer opens: one measure, everywhere.
 *
 * `--container-composer` is the column something is WRITTEN in, and the second
 * half of the `min()` is the window minus the gutter the scrim already carries,
 * so the card never runs off the edge of a small screen. There is no band in
 * this — a measure is a property of the writing, not of the room around it, and
 * at the one width where the room genuinely runs out the modal goes full-screen
 * instead of getting narrower.
 */
const WIDTH = 'min(var(--container-composer), calc(100vw - 2rem))';

/**
 * The tallest the card may get before its body starts scrolling under a header
 * and a footer that stay put. Short of it the card is as tall as the post.
 */
const MAX_HEIGHT = 'calc(100vh - 4rem)';

/**
 * The post composer.
 *
 * Everything about a post that is being written lives here for as long as it is
 * being written: the modal owns the draft, and the queue only hears about it
 * when somebody saves, schedules or publishes. That is deliberate — a composer
 * that wrote through to the store on every keystroke would make Escape mean
 * something different from what it looks like it means.
 *
 * A card floating in the middle of the screen, as tall as the post in it. It
 * used to be a full-height panel down one edge, which gave a two-line caption
 * and one thumbnail the same height as a spreadsheet and left the difference as
 * white space above a footer pinned to the bottom of the window. Nothing in
 * here stretches now, and there is no leftover height to stretch into: the card
 * grows as the post does and stops when the window runs out.
 *
 * ONE column, with air either side of it. The writing and the picture of the
 * writing are two ways of looking at the same post rather than two halves of a
 * screen, so they are two tabs and not two panes: side by side, each one is half
 * the width it wanted, and the preview — the thing whose whole job is to show
 * what a photograph will look like — is the half that suffers.
 *
 * Whose account this is goes in the header, next to the title, because every
 * format tile below leads to the same one and repeating it four times said
 * nothing four times.
 *
 * The three actions are three different things and not one with options. Saving
 * a draft asks nothing of the post, because a draft is work in progress and
 * refusing to store an unfinished one loses it. Scheduling and publishing both
 * check it against every rule the platform enforces, because both are about to
 * ask the platform, and an answer that arrives here arrives while what is wrong
 * is still on screen. Which of the two the primary button means is decided by
 * whether a time is set, so there is one button that does the obvious thing
 * rather than two, one of which is always wrong — and the time and the button
 * are joined into one control, because they are one decision.
 *
 * Publishing is not quick: a photo takes about ten seconds inside the mutation
 * and a Reel takes minutes. The form goes read-only for the duration and says so
 * by behaving like it — a progress bar that is honestly indeterminate, a button
 * that is spinning — rather than by looking finished and being unresponsive.
 */
export function ComposerModal({ target, at, from, account, onClose }: ComposerModalProps) {
  const { client, botId } = usePublishing();
  const queue = usePostsQueue();
  const band = useBand();
  const toast = useToast();
  const sources = useMediaSources(client, botId);
  const publisher = usePublish(account.id);
  const seed = useComposerSeed(client, botId, target === NEW_POST ? from : null, at);

  const [draft, setDraft] = useState<NewPost>(() => emptyDraft(at));
  const [zone, setZone] = useState<string>(() => localTimeZone());
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<Intent | null>(null);
  const [failure, setFailure] = useState<PostProblem | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  /* Which post the draft was seeded from. A deep link can arrive before the
     queue has loaded, so seeding waits for the post rather than opening blank. */
  const seeded = useRef<string | null>(null);

  const existing = target && target !== NEW_POST ? (queue.state.byId[target] ?? null) : null;
  /* A new post started from a library tile is a different starting point from a
     blank one, so it is a different thing to have been seeded from. */
  const seedKey = target === NEW_POST && from ? `${target}:${from}` : target;

  useEffect(() => {
    if (!target) {
      seeded.current = null;
      return;
    }
    if (seeded.current === seedKey) return;
    if (target === NEW_POST) {
      /* Wait for the media rather than opening blank and filling in later:
         a form that rewrites itself under somebody is worse than one that
         takes a moment to appear. */
      if (from && seed.loading) return;
      seeded.current = seedKey;
      setDraft(seed.draft ?? emptyDraft(at));
      if (seed.error) {
        toast.show({ title: 'That post could not be read', description: seed.error, tone: 'danger' });
      }
    } else {
      if (!existing) return;
      seeded.current = seedKey;
      setDraft(toDraft(existing));
    }
    setTouched(false);
    setFailure(null);
    setBusy(null);
  }, [target, seedKey, at, from, existing, seed.loading, seed.draft, seed.error, toast]);

  const canSchedule = queue.canSchedule;
  const scheduling = draft.scheduledAt !== null;

  /**
   * A time nothing can honour is dropped as soon as that is known.
   *
   * A draft can carry one from either direction — the calendar seeds a new post
   * from the slot that was clicked, and an existing post may have been written
   * on a deployment that still had a scheduler — and where the control is absent
   * there is nothing on screen to clear it with. Waiting for `backend` matters:
   * `canSchedule` is false while the store is still being chosen, and acting on
   * that would throw away a time the deployment can perfectly well keep.
   */
  useEffect(() => {
    if (canSchedule || !queue.backend) return;
    setDraft((current) => (current.scheduledAt === null ? current : { ...current, scheduledAt: null }));
  }, [canSchedule, queue.backend]);

  const problems = useMemo(
    () => validatePost(draft, scheduling ? { canSchedule, now: Date.now(), requireDurableMedia: true } : {}),
    [draft, scheduling, canSchedule],
  );

  const shown = useMemo<PostProblem[]>(() => {
    const list = touched ? [...problems] : [];
    if (failure) list.push(failure);
    return list;
  }, [touched, problems, failure]);

  const edit = useCallback((next: NewPost) => {
    setDraft(next);
    setFailure(null);
  }, []);

  /**
   * Media, applied to whatever the draft is when it arrives rather than to what
   * it was when the file was dropped. An upload takes seconds and somebody
   * writes a caption while it runs; applying it to a captured draft would put
   * the caption back to what it was.
   */
  const addMedia = useCallback((items: MediaItem[]) => {
    setDraft((current) => withMedia(current, items));
    setFailure(null);
  }, []);

  const run = async (intent: Intent): Promise<void> => {
    setTouched(true);
    setFailure(null);

    if (intent === 'schedule' && !draft.scheduledAt) {
      setFailure({ field: 'schedule', message: 'Pick a date and a time.' });
      return;
    }
    if (intent !== 'draft' && problems.length > 0) return;

    const body: NewPost =
      intent === 'draft'
        ? { ...draft, scheduledAt: null }
        : intent === 'publish'
          ? { ...draft, scheduledAt: draft.scheduledAt ?? new Date().toISOString() }
          : draft;

    setBusy(intent);
    try {
      const status: PostStatus =
        intent === 'draft' ? 'draft' : intent === 'schedule' ? 'scheduled' : (existing?.status ?? 'draft');
      const saved = existing ? await queue.patch(existing.id, { ...body, status }) : await queue.save(body);

      if (intent !== 'publish') {
        toast.show({
          title: intent === 'draft' ? 'Draft saved' : 'Scheduled',
          tone: 'success',
          duration: 3000,
        });
        onClose();
        return;
      }

      const result = await publisher.publish(saved);
      if (result.ok) {
        toast.show({
          title: `${KIND_LABELS[saved.kind]} published`,
          tone: 'success',
          duration: 6000,
          action: result.permalink ? { label: 'Open', onClick: () => openExternal(result.permalink) } : undefined,
        });
        onClose();
        return;
      }
      toast.show({ title: 'The post did not go out', description: result.message, tone: 'danger' });
    } catch (err) {
      /* The queue itself refused the write. It belongs to no control on the
         form, so it is said once, where the rest of this module says things
         that went wrong. */
      toast.show({ title: 'That could not be saved', description: errorMessage(err), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const publishing = busy === 'publish';
  const disabled = busy !== null;
  const controls = footerControls({ scheduledAt: draft.scheduledAt, canSchedule, publishing, band });

  /**
   * The two keys that do what the two footer buttons do, and nothing else.
   *
   * Both are held with ⌘/Ctrl and both are `scope: 'always'`, because the hand
   * that presses them is in the caption box — a binding that stood down while
   * typing would never fire here at all.
   *
   * No `rootRef`, and that is the one place in this module where there is none.
   * The panel is portalled to the document, so the module root does not contain
   * it and scoping to the root would switch these off exactly when they are
   * wanted; the panel itself is not an element this file holds. What makes a
   * window listener correct instead of sloppy is that the dialog is modal: it
   * traps focus and makes the background inert, so while it is open there is
   * nowhere else a keystroke can have come from. `enabled` says the rest — off
   * while the composer is closed, and off while the library picker is open on
   * top of it, whose keystrokes belong to the picker.
   *
   * Escape is absent on purpose. The dialog already closes on it, and its
   * `onClose` is the one guarded against closing over a post that is going out.
   */
  useHotkeys<ComposerShortcutId>(
    COMPOSER_BINDINGS,
    (id) => {
      /* Inline rather than a `useCallback`: `useHotkeys` calls through a ref it
         refreshes every render, so this closure is never the stale one — and
         `run` reads the draft, which changes on every keystroke. */
      if (disabled) return;
      void run(id === 'composerDraft' ? 'draft' : controls.intent);
    },
    { enabled: target !== null && !libraryOpen },
  );

  /* The one problem with no control of its own on screen: the time lives in the
     footer, so its refusal does too. */
  const scheduleProblem = problemFor(shown, 'schedule');

  return (
    <>
      <Dialog
        open={target !== null}
        onClose={disabled ? () => undefined : onClose}
        title={existing ? `Edit ${KIND_LABELS[existing.kind].toLowerCase()}` : 'New post'}
        width={WIDTH}
        maxHeight={MAX_HEIGHT}
        /* The one band where a card with a gutter around it is a card with no
           room left in it. Everywhere else it floats. */
        fullScreen={band === 'compact'}
        padded={false}
        footer={
          <div className="flex w-full flex-col gap-2">
            {scheduleProblem ? <p className="text-micro text-danger">{scheduleProblem}</p> : null}
            {publishing ? <Progress label="Publishing" size="sm" /> : null}
            {/* `mr-auto` on the one control that leaves, rather than a spacer
                element: a spacer takes a whole row of its own the moment the
                strip wraps, and `justify-end` then keeps the rest together on
                the right instead of stranding the primary on the left. */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {controls.cancel ? (
                <Button variant="ghost" onClick={onClose} disabled={disabled} className="mr-auto">
                  Cancel
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => void run('draft')} loading={busy === 'draft'} disabled={disabled}>
                Save draft
              </Button>
              {/* The time and the action it changes, drawn as one object. Where
                  nothing can honour a time there is no left half, and the
                  primary keeps both its corners rather than sitting there with
                  a flat edge against nothing. */}
              <div className="flex items-center">
                {controls.split ? (
                  <ScheduleButton
                    value={draft.scheduledAt}
                    zone={zone}
                    onChange={(scheduledAt) => edit({ ...draft, scheduledAt })}
                    onZone={setZone}
                    disabled={disabled}
                    invalid={Boolean(scheduleProblem)}
                    className="rounded-r-none"
                  />
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => void run(controls.intent)}
                  loading={publishing || busy === 'schedule'}
                  disabled={disabled}
                  className={controls.split ? '-ml-px rounded-l-none' : ''}
                >
                  {controls.primaryLabel}
                </Button>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-4">
          <ComposerForm
            draft={draft}
            onDraft={edit}
            onAddMedia={addMedia}
            problems={shown}
            sources={sources}
            disabled={disabled}
            onPickLibrary={() => setLibraryOpen(true)}
          />
        </div>
      </Dialog>

      <LibraryPickerDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        kind={draft.kind}
        room={Math.max(1, roomFor(draft))}
        onPick={addMedia}
      />
    </>
  );
}
