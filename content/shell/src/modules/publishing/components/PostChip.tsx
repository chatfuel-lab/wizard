import type { ReactNode } from 'react';
import {
  EVENT_TONE_CLASSES,
  IconCheck,
  IconClock,
  IconHourglass,
  IconImage,
  IconLayoutGrid,
  IconPlay,
  IconStory,
  IconWarning,
  Tag,
} from '~ui';
import { blockLayout, postLook, postTitle, thumbnailOf } from '../lib/calendarPlacement';
import type { PostMark } from '../lib/calendarPlacement';
import type { PostKind, QueuedPost } from '../types';

export type PostChipVariant = 'chip' | 'block' | 'row';

export interface PostChipProps {
  post: QueuedPost;
  /** `chip` is a month cell, `block` a week slot, `row` a line in the list. */
  variant: PostChipVariant;
  /** The post's own time, already read in the viewer's zone. */
  timeLabel: string;
  /** The rendered height of a `block`, from the grid — it picks what still fits. */
  heightPx?: number;
  className?: string;
}

/* What kind of thing this is, as a glyph. The kind is in the chip's spoken
   label too, so nothing here has to be read to be understood. */
const KIND_ICON: Record<PostKind, ReactNode> = {
  post: <IconImage size={12} />,
  reel: <IconPlay size={12} />,
  story: <IconStory size={12} />,
  carousel: <IconLayoutGrid size={12} />,
};

/* How it is going, as a glyph. `calendarPlacement` picks which one; this only
   knows how to draw them, which is what keeps the choice testable. */
const MARK_ICON: Record<PostMark, ReactNode> = {
  none: null,
  clock: <IconClock size={12} />,
  hourglass: <IconHourglass size={12} />,
  check: <IconCheck size={12} />,
  warning: <IconWarning size={12} />,
};

/**
 * The post's first picture, or null when it has none — a caption written
 * before any file was attached. A plain function rather than a component so
 * the caller can tell "no picture" from "an element that renders nothing".
 */
function thumbnail(post: QueuedPost, classes: string): ReactNode | null {
  const src = thumbnailOf(post);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-chip border border-border bg-surface-sunken object-cover ${classes}`}
    />
  );
}

/**
 * One queued post, as the month, the week and the list draw it.
 *
 * Presentational only: the surface owns position, click and drag, and this owns
 * what a post looks like. Three things are always on it — the picture, the
 * time, and what kind of post it is — because those are the three questions a
 * calendar of posts is asked, and none of them needs a word.
 *
 * ## A post is a card, not a coloured bar
 *
 * The week block is a small card on the page's own raised surface: a hairline
 * border, a control radius, and inside it a header line, the caption beside its
 * picture, and a wordless pill. Colour is a glyph and a pill on white, not a
 * wash across the whole block — a column of saturated bars reads as a chart of
 * something, and this is a list of things somebody wrote.
 *
 * ## Status is colour plus shape, never a sentence
 *
 * A draft is dashed and a publish in flight is dashed — both are "written, not
 * settled". A FAILURE is ringed in the danger colour and carries a warning
 * glyph, which survives both the eight-tone palette and colour blindness, and
 * is why failure is not merely another tone. The word itself is there for a
 * screen reader, and printed only on the list, where there is room for a label
 * and no colour carrying it.
 *
 * ## What gets dropped when the block is short
 *
 * `blockLayout` decides, from the height the grid measured. A block is normally
 * a whole hour tall and holds everything; one clipped by midnight does not, and
 * gives up the pill, then the picture, then the second line of caption — in
 * that order, because that is the order of what a person loses least by losing.
 */
export function PostChip({ post, variant, timeLabel, heightPx, className = '' }: PostChipProps) {
  const look = postLook(post.status);
  const tone = EVENT_TONE_CLASSES[look.tone];
  const title = postTitle(post);
  const kindGlyph = KIND_ICON[post.kind];
  const markGlyph = MARK_ICON[look.mark];
  const spoken = <span className="sr-only">{`${look.label} ${post.kind}`}</span>;

  if (variant === 'row') {
    return (
      <span
        className={`flex min-w-0 items-center gap-3 px-3 py-2 hover:bg-row-hover ${
          look.alert ? 'ring-1 ring-danger ring-inset' : ''
        } ${className}`}
      >
        <span
          aria-hidden
          className={`h-8 w-1 shrink-0 rounded-full ${tone.bar} ${look.chipStatus === 'tentative' ? 'opacity-50' : ''}`}
        />
        <span className="w-16 shrink-0 text-meta tabular-nums text-text-muted">{timeLabel}</span>
        {thumbnail(post, 'h-8 w-8')}
        <span className="min-w-0 flex-1 truncate text-body text-text">{title}</span>
        <span aria-hidden className={`shrink-0 ${look.alert ? 'text-danger' : 'text-text-faint'}`}>
          {look.alert ? markGlyph : kindGlyph}
        </span>
        <Tag tone={look.tagTone}>{look.label}</Tag>
      </span>
    );
  }

  if (variant === 'chip') {
    return (
      <span
        className={`flex h-5 min-w-0 items-center gap-1 overflow-hidden rounded-chip border bg-surface-raised pr-1 ${
          look.chipStatus === 'tentative' ? `border-dashed ${tone.border}` : 'border-border'
        } ${look.alert ? 'ring-1 ring-danger ring-inset' : ''} ${className}`}
      >
        {spoken}
        {/* The 2px edge in the status tone: the one place colour is allowed to
            be a block on a chip this small, and it reads at a glance across a
            month of them. */}
        <span aria-hidden className={`w-0.5 shrink-0 self-stretch ${tone.bar}`} />
        {/* The picture is the leading glyph, and the kind glyph is what stands
            in for it — a caption written before any file was attached still has
            something to be recognised by. */}
        {thumbnail(post, 'ml-0.5 h-4 w-4') ?? (
          <span aria-hidden className={`ml-0.5 shrink-0 ${look.alert ? 'text-danger' : tone.fg}`}>
            {look.alert ? markGlyph : kindGlyph}
          </span>
        )}
        <span className="shrink-0 text-micro font-medium tabular-nums text-text-muted">{timeLabel}</span>
        <span className="min-w-0 flex-1 truncate text-micro text-text">{title}</span>
      </span>
    );
  }

  const layout = blockLayout(heightPx);
  const picture = layout.thumbnail ? thumbnail(post, 'h-10 w-10') : null;

  return (
    /* The 2px of side padding is the card's gutter inside its column. The grid
       positions the block, so the padding lives here rather than there: the
       whole block stays the drag target while only the card is drawn. */
    <span className={`flex h-full w-full min-w-0 px-0.5 ${className}`}>
      <span
        className={`flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-control border bg-surface-raised shadow-raised ${
          layout.dense ? 'p-1' : 'p-2'
        } ${
          look.chipStatus === 'tentative' ? `border-dashed ${tone.border}` : 'border-border'
        } ${look.alert ? 'ring-1 ring-danger ring-inset' : ''}`}
      >
        {spoken}
        <span className="flex min-w-0 items-center gap-1">
          <span aria-hidden className={`shrink-0 ${tone.fg}`}>
            {kindGlyph}
          </span>
          <span className="min-w-0 truncate text-micro font-medium tabular-nums text-text">{timeLabel}</span>
          {markGlyph ? (
            <span aria-hidden className={`ml-auto shrink-0 ${look.alert ? 'text-danger' : 'text-text-faint'}`}>
              {markGlyph}
            </span>
          ) : null}
        </span>
        {layout.captionLines > 0 ? (
          /* Flex rather than a real float: `line-clamp-*` is a display value of
             its own and a float beside it is not honoured, and the clamp is the
             half that matters. At two lines the two lay out identically. */
          <span className="flex min-w-0 items-start gap-1.5">
            <span
              className={`min-w-0 flex-1 text-meta text-text ${
                layout.captionLines === 2 ? 'line-clamp-2' : 'truncate'
              }`}
            >
              {title}
            </span>
            {picture}
          </span>
        ) : null}
        {layout.pill ? <span aria-hidden className={`mt-auto h-1 w-4 shrink-0 rounded-full ${tone.bar}`} /> : null}
      </span>
    </span>
  );
}
