import { useId, useRef, useState, type DragEvent } from 'react';
import { Button, Card, IconImage, IconLayoutGrid, IconLink, Input, Popover, Textarea, Tooltip } from '~ui';
import {
  acceptAttribute,
  canAddMore,
  capacityOf,
  hasCaption,
  parseMediaLink,
  reorderMedia,
  withoutMedia,
} from '../../lib/composerDraft';
import { captionMeters, type MeterTone } from '../../lib/composerMeters';
import { problemFor, type PostProblem } from '../../lib/postValidation';
import type { MediaSources } from '../../hooks/useMediaSources';
import type { MediaItem, NewPost } from '../../types';
import { MediaStrip } from './MediaStrip';

export interface PostCardProps {
  draft: NewPost;
  onDraft: (next: NewPost) => void;
  /**
   * Separate from `onDraft` because media arrives late: an upload resolves
   * seconds after it was dropped, and applying it to the draft this render
   * closed over would throw away whatever was typed while it was in flight.
   */
  onAddMedia: (items: MediaItem[]) => void;
  /** Already filtered — nothing is red until somebody has tried to do something. */
  problems: readonly PostProblem[];
  sources: MediaSources;
  disabled?: boolean;
  onPickLibrary: () => void;
}

const METER_TONE: Record<MeterTone, string> = {
  quiet: 'border-border text-text-faint',
  warning: 'border-warning/40 text-warning',
  danger: 'border-danger/40 text-danger',
};

/**
 * The post itself: what it says, what it shows, and the strip of controls under
 * both.
 *
 * One card and three regions, in the order a post is MADE in: the pictures, the
 * three ways to add one, and then the words. A published post is a picture with
 * a caption under it, and a composer that asks for the caption first asks for
 * the part nobody can write until they have seen the part above it.
 *
 * The caption carries no label. A box under the word "New post" is already
 * unmistakably where the words go, and a `Caption` heading over it is a form
 * pretending to be a composer.
 *
 * The card is exactly as tall as those three things and nothing here stretches.
 * A caption box opened at a fixed six lines is a void with a placeholder in the
 * top corner of it, and a strip floating in the middle of a card that was
 * stretched to fill a panel is a wireframe. Two lines to start and it grows
 * with what is typed. Where the post is short, so is the card.
 *
 * A Story has no caption region at all — `InstagramPublishStoryInput` has
 * nowhere to put one — so the card is the pictures and the strip, and the strip
 * loses the rule under it that would have separated it from nothing.
 *
 * Every source of media that cannot currently take anything is ABSENT, not
 * disabled: a full carousel loses all three, and a deployment with no upload
 * path never had the first. What is left is what will work.
 *
 * The two figures on the right are bare numbers on purpose, and neither comes
 * from the text box's own counter. The platform counts a caption in CODEPOINTS
 * — 2200 emoji are accepted and 2201 are refused — while `maxLength` and
 * `showCount` count UTF-16 units, which read those same 2200 emoji as 4400.
 * Wiring the box's own ceiling to the platform's would truncate half of every
 * caption written with emoji, silently, mid-word. So the box has no ceiling of
 * its own, the figures are computed from `captionMeters`, and the refusal that
 * actually stops a publish arrives from validation onto the same strip.
 */
export function PostCard({
  draft,
  onDraft,
  onAddMedia,
  problems,
  sources,
  disabled = false,
  onPickLibrary,
}: PostCardProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  /* The toolbar's glyph is the only way to a file picker, so the input lives
     here — hidden, and never the thing anybody looks at. */
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  const writes = hasCaption(draft.kind);
  const canAdd = canAddMore(draft);
  const meters = writes ? captionMeters(draft.caption) : [];

  /* One line, and the newest thing to have gone wrong wins it: a link somebody
     just pasted and an upload that just failed both answer an action taken a
     second ago, where the validation problems have been true since the post
     was opened. */
  const captionProblem = problemFor(problems, 'caption');
  const message = linkError ?? sources.error ?? problemFor(problems, 'media') ?? captionProblem;
  const overLong = meters.some((meter) => meter.tone === 'danger');
  /* The frame reddens for anything wrong with the post; the BOX only for what
     is wrong with the writing. A caption marked invalid because a photo is the
     wrong format tells a screen reader something untrue. */
  const invalid = Boolean(message) || overLong;
  const accepts = sources.canUpload && canAdd && !disabled;
  const captionInvalid = Boolean(captionProblem) || overLong;

  const takeFiles = (files: File[]) => {
    setLinkError(null);
    void sources.add(files, draft.kind).then((items) => {
      if (items.length > 0) onAddMedia(items);
    });
  };

  const takeLink = () => {
    const item = parseMediaLink(link, draft.kind);
    if (!item) {
      setLinkError('Enter a full http or https link.');
      return;
    }
    setLinkError(null);
    setLink('');
    setLinkOpen(false);
    onAddMedia([item]);
  };

  const takeDrop = (event: DragEvent<HTMLDivElement>) => {
    setOver(false);
    if (!accepts) return;
    const files = [...event.dataTransfer.files];
    if (files.length === 0) return;
    event.preventDefault();
    takeFiles(files);
  };

  return (
    /* The whole card takes a dropped file, and nothing draws a target for it:
       the glyph on the toolbar is the affordance, and a dashed slab beside the
       pictures was a second control saying what that one already says. The ring
       appears only while a file is actually over the card. */
    <div
      onDragOver={
        accepts
          ? (event) => {
              event.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={() => setOver(false)}
      onDrop={takeDrop}
    >
      <Card
        padded={false}
        tone={invalid ? 'danger' : 'default'}
        className={`transition-colors duration-fast ease-standard ${over ? 'ring-2 ring-accent' : ''}`}
      >
        <div className={draft.media.length === 0 ? 'hidden' : 'px-4 pt-4 pb-3'}>
          <MediaStrip
            kind={draft.kind}
            media={draft.media}
            disabled={disabled}
            onRemove={(itemId) => onDraft(withoutMedia(draft, itemId))}
            onReorder={(from, to) => onDraft(reorderMedia(draft, from, to))}
          />
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 ${writes ? 'border-b border-border' : ''}`}>
          <div className="flex shrink-0 items-center gap-1">
            {sources.canUpload && canAdd ? (
              <Tooltip label="Upload a file">
                <Button
                  iconOnly
                  variant="ghost"
                  aria-label="Upload a file"
                  loading={sources.busy}
                  disabled={disabled}
                  onClick={() => fileRef.current?.click()}
                >
                  <IconImage />
                </Button>
              </Tooltip>
            ) : null}

            {canAdd ? (
              <Popover
                open={linkOpen}
                onOpenChange={setLinkOpen}
                placement="bottom-start"
                aria-label="Add a link"
                trigger={(props) => (
                  <Tooltip label="Paste a link">
                    <Button {...props} iconOnly variant="ghost" aria-label="Paste a link" disabled={disabled}>
                      <IconLink />
                    </Button>
                  </Tooltip>
                )}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      takeLink();
                    }}
                    placeholder="https://"
                    aria-label="Media link"
                    disabled={disabled}
                    invalid={Boolean(linkError)}
                    autoFocus
                    className="h-field-sm w-56 min-w-0 text-label"
                  />
                  <Button variant="primary" size="sm" onClick={takeLink} disabled={disabled || !link.trim()}>
                    Add
                  </Button>
                </div>
              </Popover>
            ) : null}

            {canAdd ? (
              <Tooltip label="Media on the account">
                <Button
                  iconOnly
                  variant="ghost"
                  aria-label="Media on the account"
                  onClick={onPickLibrary}
                  disabled={disabled}
                >
                  <IconLayoutGrid />
                </Button>
              </Tooltip>
            ) : null}
          </div>

          <span id={messageId} className="min-w-0 flex-1 truncate text-micro text-danger">
            {message}
          </span>

          <input
            ref={fileRef}
            type="file"
            hidden
            accept={acceptAttribute(draft.kind)}
            multiple={capacityOf(draft.kind) > 1}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              /* Cleared before the upload runs, so picking the same file twice in
               a row still fires a change. */
              event.target.value = '';
              if (files.length > 0) takeFiles(files);
            }}
          />

          {meters.map((meter) => (
            <span
              key={meter.id}
              data-meter={meter.id}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-micro tabular-nums ${METER_TONE[meter.tone]}`}
            >
              {meter.text}
            </span>
          ))}
        </div>

        {writes ? (
          <Textarea
            bare
            autoGrow
            rows={2}
            id={id}
            value={draft.caption}
            onChange={(event) => onDraft({ ...draft, caption: event.target.value })}
            disabled={disabled}
            invalid={captionInvalid}
            aria-label="Caption"
            /* Only when the line on the strip is the caption's own. */
            aria-describedby={captionProblem && message === captionProblem ? messageId : undefined}
            className="min-h-20 w-full px-4 py-3 text-body leading-relaxed"
            placeholder="Write a caption"
          />
        ) : null}
      </Card>
    </div>
  );
}
