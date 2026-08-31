import { useEffect, useRef, type ReactNode } from 'react';
import { IconImage } from '../icons';
import { Spinner } from '../primitives/Spinner';

export type MediaAspect = 'square' | 'portrait' | 'landscape';

export interface MediaGridItem {
  id: string;
  /** Thumbnail. Absent or null draws the placeholder rather than a broken tile. */
  previewUrl?: string | null;
  /** Corner badge — a kind, a duration, a count. */
  badge?: ReactNode;
  /** One short line under the tile. Two or three words, not a sentence. */
  label?: string;
  /**
   * The source could not resolve this one and says so itself. It gets the
   * placeholder and no click target: there is nothing behind it to open.
   */
  unknown?: boolean;
  alt?: string;
}

export interface MediaGridProps<T extends MediaGridItem> {
  items: readonly T[];
  'aria-label': string;
  /** Ids currently chosen. Presence of this prop is what draws the checkmarks. */
  selected?: ReadonlySet<string>;
  onToggle?: (item: T) => void;
  /** A plain click when nothing is selectable — open, preview, pick. */
  onActivate?: (item: T) => void;
  aspect?: MediaAspect;
  /** Smallest tile width; the grid fits as many as go in. Default 132. */
  minTile?: number;
  /** Hover/focus actions in the tile's top-right corner. */
  actions?: (item: T) => ReactNode;
  /** Fires once when the end of the list comes into view. */
  onEndReached?: () => void;
  /** Nothing has arrived yet — the grid is a field of skeletons. */
  loading?: boolean;
  /** A further page is on its way. */
  loadingMore?: boolean;
  /** Drawn instead of the grid when there is nothing and nothing is coming. */
  empty?: ReactNode;
  className?: string;
}

const ASPECT: Record<MediaAspect, string> = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[16/9]',
};

const SKELETONS = 12;

/**
 * A grid of pictures that can be picked from.
 *
 * Three things it does that a `div` full of `img` does not, and each is the
 * reason a picker written by hand goes wrong:
 *
 * 1. **The tile is a button, always.** Not a div with an onClick — a media
 *    picker is reached by keyboard as often as by mouse, and a grid of divs is
 *    a dead end for one of those.
 * 2. **A missing picture is a state, not a broken glyph.** `previewUrl` may be
 *    null and the source may say outright that it could not resolve an item;
 *    both draw the placeholder, and the second is not clickable, because there
 *    is nothing behind it.
 * 3. **The end of the list is an observer, not a scroll handler.** The sentinel
 *    below fires `onEndReached` once when it comes into view, which is the same
 *    thing every infinite list here does and the reason none of them recompute
 *    on every scroll frame.
 *
 * Selection is deliberately not a mode: hand it `selected` and it draws
 * checkmarks, leave it out and a click means open. A component with a
 * `selectable` flag has two behaviours and one of them is always the untested
 * one.
 */
export function MediaGrid<T extends MediaGridItem>({
  items,
  selected,
  onToggle,
  onActivate,
  aspect = 'square',
  minTile = 132,
  actions,
  onEndReached,
  loading = false,
  loadingMore = false,
  empty,
  className = '',
  ...rest
}: MediaGridProps<T>) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const fire = useRef(onEndReached);
  fire.current = onEndReached;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fire.current?.();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = { gridTemplateColumns: `repeat(auto-fill, minmax(${minTile}px, 1fr))` };

  if (!loading && items.length === 0) {
    return <div className={className}>{empty ?? null}</div>;
  }

  return (
    <div className={className}>
      <ul aria-label={rest['aria-label']} className="grid list-none gap-2 p-0" style={style}>
        {loading
          ? Array.from({ length: SKELETONS }, (_, index) => (
              <li key={`skeleton-${index}`}>
                <div className={`${ASPECT[aspect]} w-full skeleton rounded-card`} />
              </li>
            ))
          : items.map((item) => {
              const isSelected = selected?.has(item.id) ?? false;
              const pick = selected ? onToggle : onActivate;
              return (
                <li key={item.id} className="group/tile relative">
                  <button
                    type="button"
                    disabled={item.unknown || !pick}
                    aria-pressed={selected ? isSelected : undefined}
                    onClick={() => pick?.(item)}
                    className={`relative block w-full overflow-hidden rounded-card border bg-surface-sunken transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:cursor-default ${
                      isSelected ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    {item.previewUrl && !item.unknown ? (
                      <img
                        src={item.previewUrl}
                        alt={item.alt ?? ''}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className={`${ASPECT[aspect]} w-full object-cover`}
                      />
                    ) : (
                      <span
                        className={`${ASPECT[aspect]} flex w-full items-center justify-center text-text-faint [&_svg]:h-6 [&_svg]:w-6`}
                      >
                        <IconImage />
                      </span>
                    )}
                    {item.badge ? (
                      <span className="absolute left-1.5 top-1.5 rounded-chip bg-scrim px-1.5 py-0.5 text-nano font-medium text-text-inverse">
                        {item.badge}
                      </span>
                    ) : null}
                    {isSelected ? (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-nano font-semibold text-accent-fg">
                        ✓
                      </span>
                    ) : null}
                  </button>
                  {actions ? (
                    <div className="pointer-events-none absolute right-1.5 top-1.5 opacity-0 transition-opacity duration-fast ease-standard group-hover/tile:pointer-events-auto group-hover/tile:opacity-100 group-focus-within/tile:pointer-events-auto group-focus-within/tile:opacity-100">
                      {actions(item)}
                    </div>
                  ) : null}
                  {item.label ? <div className="mt-1 truncate text-micro text-text-muted">{item.label}</div> : null}
                </li>
              );
            })}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      {loadingMore ? (
        <div className="flex justify-center py-4">
          <Spinner size={16} />
        </div>
      ) : null}
    </div>
  );
}
