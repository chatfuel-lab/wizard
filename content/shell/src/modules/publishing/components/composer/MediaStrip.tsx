import { useRef } from 'react';
import { DragLayer, IconClose, IconGrip, IconPlay, useDragSession } from '~ui';
import { capacityOf, mediaLabel } from '../../lib/composerDraft';
import type { MediaItem, PostKind } from '../../types';

export interface MediaStripProps {
  kind: PostKind;
  media: readonly MediaItem[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}

/**
 * One square, and every tile in the strip is that square.
 *
 * Big enough to choose between two photographs and no bigger. The strip sits
 * directly under a caption of two or three lines inside a card that is as tall
 * as its contents, so a tile that wanted a filing-cabinet thumbnail on one side
 * and half a panel on the other has one honest size in the middle.
 */
const TILE = 'h-28 w-28';

/**
 * The pictures on the post, in a row, at a size somebody can actually judge
 * them at.
 *
 * A strip of squares and nothing else. Adding is not drawn here at all: the
 * three ways in are the three glyphs on the toolbar under the card, and a
 * dashed tile beside the photographs was a fourth control saying what one of
 * those three already says. With nothing attached there is no strip.
 *
 * Order is part of what a carousel means, so the tiles drag, and Alt with an
 * arrow key does the same from the keyboard. The whole tile is the drag handle
 * and the grip is only the keyboard's way in: the drag ghost is sized from the
 * element the gesture started on, and a ghost the size of a grip button is a
 * photograph squeezed into twelve pixels.
 */
export function MediaStrip({ kind, media, disabled = false, onRemove, onReorder }: MediaStripProps) {
  const trayRef = useRef<HTMLDivElement | null>(null);
  const reorderable = capacityOf(kind) > 1 && media.length > 1 && !disabled;

  const session = useDragSession<{ id: string }>({
    disabled: !reorderable,
    scrollRef: trayRef,
    onDrop: ({ id }, targetId) => {
      const from = media.findIndex((item) => item.id === id);
      const to = media.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return;
      onReorder(from, to);
    },
  });

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= media.length) return;
    onReorder(index, to);
  };

  if (media.length === 0) return null;

  return (
    <div ref={trayRef} className="flex items-start gap-3 overflow-x-auto">
      {media.map((item, index) => {
        const drag = session.draggableProps(item.id, { id: item.id });
        const drop = session.dropTargetProps(item.id, { disabled: !reorderable });
        const name = mediaLabel(item, index);
        return (
          <div
            key={item.id}
            ref={drop.ref}
            data-over={drop['data-over']}
            data-dragging={drag['data-dragging']}
            style={drag.style}
            onPointerDown={reorderable ? drag.onPointerDown : undefined}
            className={`relative shrink-0 overflow-hidden rounded-card border border-border bg-surface-sunken transition-opacity duration-fast ease-standard data-[dragging=true]:opacity-40 data-[over=true]:ring-2 data-[over=true]:ring-accent ${TILE}`}
          >
            <Thumbnail item={item} name={name} />

            {item.type === 'video' ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-inverse/70 text-text-inverse">
                  <IconPlay size={16} />
                </span>
              </span>
            ) : null}

            {disabled ? null : (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${name}`}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-inverse/70 text-text-inverse transition-colors duration-fast ease-standard hover:bg-surface-inverse focus-visible:focus-ring"
              >
                <IconClose size={12} />
              </button>
            )}

            {reorderable ? (
              <button
                type="button"
                onKeyDown={(event) => {
                  if (!event.altKey) return;
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    move(index, -1);
                  }
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    move(index, 1);
                  }
                }}
                aria-label={`Reorder ${name}`}
                className="absolute bottom-1.5 left-1.5 cursor-grab rounded-control bg-surface-inverse/70 p-1 text-text-inverse focus-visible:focus-ring"
              >
                <IconGrip size={12} />
              </button>
            ) : null}
          </div>
        );
      })}

      <DragLayer session={session}>
        {({ id }) => {
          const index = media.findIndex((item) => item.id === id);
          const item = media[index];
          if (!item) return null;
          return (
            <div className={`overflow-hidden rounded-card border border-border bg-surface-sunken ${TILE}`}>
              <Thumbnail item={item} name={mediaLabel(item, index)} />
            </div>
          );
        }}
      </DragLayer>
    </div>
  );
}

/**
 * What a tile shows.
 *
 * `previewUrl`, never `url`: the first is whatever this tab can draw right now,
 * including a local file that exists nowhere else, and the second is the public
 * address the platform will fetch. A `<video>` rather than an `<img>` with a
 * poster, for the same reason — an object URL for a video file is not an image
 * and an `<img>` pointed at one draws a broken frame.
 */
function Thumbnail({ item, name }: { item: MediaItem; name: string }) {
  const src = item.previewUrl ?? item.url;
  if (item.type === 'video') {
    return (
      <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" aria-label={name} />
    );
  }
  return <img src={src} alt={name} className="h-full w-full object-cover" />;
}
