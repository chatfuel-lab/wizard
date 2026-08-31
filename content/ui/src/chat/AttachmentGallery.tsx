import { useState } from 'react';
import { AttachmentTile, type AttachmentKind } from './AttachmentTile';
import { Dialog } from '../overlay/Dialog';

export interface GalleryItem {
  id: string;
  kind: AttachmentKind;
  /** Where the full-size file lives. Also the thumbnail for an image. */
  url: string;
  /** Filename or caption; also the alt text. Defaults to the kind. */
  name?: string;
  /** Preformatted size or duration — "1.2 MB", "0:14". */
  meta?: string;
  /**
   * The file is gone — expired, deleted, refused. It renders as a failed tile
   * whatever its kind, because a broken-image glyph says less than a row that
   * keeps the name and says what happened.
   */
  gone?: boolean;
  goneReason?: string;
}

export interface AttachmentGalleryProps {
  items: readonly GalleryItem[];
  /** More than this many images fold into a "+N" on the last tile. Default 4. */
  limit?: number;
  /** Opens a non-image. Omit and the tile is not clickable. */
  onOpen?: (item: GalleryItem) => void;
  /** Title of the lightbox. Default 'Image'. */
  lightboxTitle?: string;
  className?: string;
}

const DEFAULT_LIMIT = 4;

const label = (item: GalleryItem): string => item.name ?? item.kind[0]!.toUpperCase() + item.kind.slice(1);

/**
 * A set of files: pictures as pictures, everything else as a tile.
 *
 * The split matters because the two are read differently. A document, a voice
 * note or a video is a *thing you will open later* — its name, its size and its
 * type are the whole content, and a tile says all three in one line. A picture
 * is content already: shrinking it into a 40px thumbnail beside the words
 * "Image · 128 KB" hides the only part of it anybody wanted.
 *
 * So images render at the width they are given, one big when there is one, a
 * two-column grid when there are several, and past the limit they fold into a
 * "+N" on the last tile rather than turning an answer into a scroll of
 * photographs. Clicking any of them opens it full size.
 *
 * ⚠ **This is for files whose URL the app itself chose** — an upload it made, or
 * a location the API answered with. It is not for a URL that arrived inside
 * generated text: loading one of those hands an unknown host a request from
 * inside the operator's session, which is why `Markdown` renders an image as
 * its alt text and fetches nothing.
 */
export function AttachmentGallery({
  items,
  limit = DEFAULT_LIMIT,
  onOpen,
  lightboxTitle = 'Image',
  className = '',
}: AttachmentGalleryProps) {
  const [open, setOpen] = useState<GalleryItem | null>(null);
  /* A URL that 404s. A file can expire server-side, but a copy can also simply
     fail to load — and a grid of broken-image glyphs is worse than the tile,
     which at least says what the thing was. */
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());

  if (items.length === 0) return null;

  const images = items.filter((item) => item.kind === 'image' && !item.gone && !broken.has(item.id));
  const rest = items.filter((item) => !images.includes(item));

  const shown = images.slice(0, Math.max(1, limit));
  const hidden = images.length - shown.length;

  return (
    <div className={className}>
      {shown.length > 0 ? (
        <div className={`grid gap-1.5 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {shown.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpen(item)}
              aria-label={`Open ${label(item)}`}
              className="relative overflow-hidden rounded-card border border-border bg-surface-sunken focus-visible:focus-ring"
            >
              <img
                src={item.url}
                alt={item.name ?? ''}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setBroken((previous) => new Set(previous).add(item.id))}
                /* One picture keeps its own shape up to a height that still
                   leaves the rest of the surface on screen; several are cropped
                   to a grid, because a row of different aspect ratios is a
                   ransom note. */
                className={shown.length === 1 ? 'max-h-80 w-full object-contain' : 'aspect-square w-full object-cover'}
              />
              {index === shown.length - 1 && hidden > 0 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-scrim text-heading font-medium text-text-inverse">
                  +{hidden}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className={`flex flex-wrap gap-1.5 ${shown.length > 0 ? 'mt-1.5' : ''}`}>
          {rest.map((item) => (
            <AttachmentTile
              key={item.id}
              kind={item.kind}
              name={label(item)}
              meta={item.meta}
              state={item.gone ? 'failed' : 'ready'}
              error={item.gone ? (item.goneReason ?? 'No longer available') : undefined}
              onOpen={item.gone || !onOpen ? undefined : () => onOpen(item)}
            />
          ))}
        </div>
      ) : null}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={lightboxTitle} size="xl">
        {open ? (
          <img
            src={open.url}
            alt={open.name ?? ''}
            referrerPolicy="no-referrer"
            className="mx-auto max-h-[70vh] w-auto rounded-card"
          />
        ) : null}
      </Dialog>
    </div>
  );
}
