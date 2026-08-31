import type { ReactNode } from 'react';
import { IconImage, IconLayoutGrid, IconPlay, IconStory, useRovingFocus } from '~ui';
import { KIND_LABELS } from '../../lib/composerDraft';
import { POST_KINDS, type MediaItem, type PostKind } from '../../types';

export interface FormatTilesProps {
  value: PostKind;
  onChange: (kind: PostKind) => void;
  /** The draft's first picture, cropped into each tile — null before there is one. */
  preview: MediaItem | null;
  disabled?: boolean;
}

const GLYPHS: Record<PostKind, ReactNode> = {
  post: <IconImage size={14} />,
  reel: <IconPlay size={14} />,
  story: <IconStory size={14} />,
  carousel: <IconLayoutGrid size={14} />,
};

/**
 * The four things this account can be asked to publish, as four tiles.
 *
 * Four squares of one size. Once the draft carries a picture that picture fills
 * every one of them, so the row becomes four answers to "what would this go out
 * as" rather than four abstractions.
 *
 * They were once drawn each at its own aspect ratio — a Reel a tall sliver, a
 * carousel slide a square. True, and it read as a row that had gone wrong. What
 * is being chosen is the format, and the format has a name under the tile.
 *
 * It used to wear the account's own avatar four times. Every one of the four
 * goes to the same account, so that said one true and useless thing four times
 * — and on an account with no picture it said it as four identical letters,
 * which is a row carrying no information at all.
 *
 * The ring around the chosen one is the whole selected state — the others are
 * dimmed and come back up under the pointer. No fill, no border, no pill: a
 * tile that has been picked is the one you can see properly.
 *
 * One Tab stop and arrow keys inside it, which is what a radio group is. The
 * name under each tile is a name and not a caption, and it is the only thing
 * that tells a Reel from a Story.
 */
export function FormatTiles({ value, onChange, preview, disabled = false }: FormatTilesProps) {
  const roving = useRovingFocus(POST_KINDS.length, {
    orientation: 'horizontal',
    labels: POST_KINDS.map((kind) => KIND_LABELS[kind]),
  });

  return (
    <div
      role="radiogroup"
      aria-label="What to publish"
      onKeyDown={roving.onKeyDown}
      className="flex flex-wrap items-start gap-3"
    >
      {POST_KINDS.map((kind, index) => {
        const selected = kind === value;
        const { tabIndex, ref } = roving.itemProps(index);
        return (
          <button
            key={kind}
            ref={ref}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabIndex}
            disabled={disabled}
            onClick={() => onChange(kind)}
            className={`flex flex-col items-center gap-1.5 rounded-card transition-opacity duration-fast ease-standard focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${
              selected ? '' : 'opacity-50 hover:opacity-100'
            }`}
          >
            {/* The ring is the whole selected state — no fill, no border, no
                pill. The hair of padding keeps it outside the picture, so the
                row does not shift by two pixels when the choice moves. */}
            <span className={`rounded-card p-0.5 ${selected ? 'ring-2 ring-accent' : ''}`}>
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-sunken text-text-muted">
                {preview ? <Crop item={preview} /> : GLYPHS[kind]}
              </span>
            </span>
            <span className={`text-micro font-medium ${selected ? 'text-text' : 'text-text-muted'}`}>
              {KIND_LABELS[kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The draft's picture, cropped to one tile.
 *
 * Decorative: the same picture appears in all four, and the tile's own name is
 * what a radio announces. Four readings of "Photo 1" would say nothing about
 * which of the four is being offered.
 *
 * `previewUrl` first, for the same reason the strip does it: an upload that has
 * not landed yet exists only as a local address in this tab. A `<video>` and
 * not an `<img>` with a poster, because an object URL for a video file is not
 * an image and an `<img>` pointed at one draws a broken frame.
 */
function Crop({ item }: { item: MediaItem }) {
  const src = item.previewUrl ?? item.url;
  if (item.type === 'video') {
    return <video src={src} aria-hidden className="h-full w-full object-cover" muted playsInline preload="metadata" />;
  }
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}
