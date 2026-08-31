import { useState, type ReactNode } from 'react';
import { IconChevronRight } from '../icons';
import { collapseTrail, hiddenTrailLabel, type TrailItem } from '../lib/app/breadcrumbs';
import { safeAppHref } from '../lib/markdown';

export interface BreadcrumbItem extends TrailItem {
  /**
   * Renders an anchor. Omit for a button, or for a step that goes nowhere.
   *
   * Run through `safeAppHref`: an in-app path is the point here, so a relative
   * target is kept, but a scheme is not. This is the worst place in the package
   * for an unchecked URL — the trail is built from record names and ids that
   * came off the wire, and a breadcrumb navigates the tab the operator is in.
   * A rejected target degrades to the button the item would have been.
   */
  href?: string;
  onSelect?: () => void;
  /** A leading glyph — a module icon on the first step. */
  icon?: ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /**
   * How many real steps to show before the middle collapses. Default 3, which
   * is module / view / record — the shape a record page actually has.
   */
  maxItems?: number;
  /** Names the trail for a screen reader. Default "Breadcrumb". */
  'aria-label'?: string;
  className?: string;
}

/**
 * The trail above a record page.
 *
 * It lives INSIDE a module, not in the app chrome, which is what makes it
 * small: the shell already says which product you are in, so repeating that
 * here would be the third copy of the same word on screen. It says which
 * record you have opened and how to get back out of it.
 *
 * The last item is plain text with `aria-current="page"`, never a link. A link
 * to the page you are already on is a control that does nothing, and it is the
 * one every breadcrumb ships with.
 *
 * The middle collapses rather than the whole strip scrolling — see
 * lib/app/breadcrumbs.ts for which items go and why the ellipsis never stands in
 * for a single one. Clicking it expands the trail in place instead of opening
 * a menu: the hidden steps are two or three words each, and a popover for
 * three words is a lot of machinery to reach a link.
 */
export function Breadcrumbs({ items, maxItems = 3, className = '', ...rest }: BreadcrumbsProps) {
  const [expanded, setExpanded] = useState(false);
  const slots = expanded
    ? items.map((item, index) => ({ kind: 'item' as const, item, index }))
    : collapseTrail(items, maxItems);
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={rest['aria-label'] ?? 'Breadcrumb'} className={`min-w-0 ${className}`}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-meta">
        {slots.map((slot, position) => {
          const separator = position === 0 ? null : <IconChevronRight size={12} className="shrink-0 text-text-faint" />;

          if (slot.kind === 'ellipsis') {
            const label = hiddenTrailLabel(slot.hidden);
            return (
              <li key="ellipsis" className="flex shrink-0 items-center gap-1">
                {separator}
                <button
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => setExpanded(true)}
                  className="rounded-chip px-1 text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                >
                  …
                </button>
              </li>
            );
          }

          const { item, index } = slot;
          const current = index === lastIndex;
          const href = item.href === undefined ? null : safeAppHref(item.href);
          const body = (
            <>
              {item.icon !== undefined ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </>
          );

          return (
            <li key={item.id} className={`flex min-w-0 items-center gap-1 ${current ? '' : 'shrink-0'}`}>
              {separator}
              {current ? (
                /* Plain text. `aria-current` alone would not be enough — a
                 * link here is still a link, and it still does nothing. */
                <span aria-current="page" className="flex min-w-0 items-center gap-1 font-medium text-text">
                  {body}
                </span>
              ) : href !== null ? (
                <a
                  href={href}
                  onClick={item.onSelect}
                  className="flex min-w-0 items-center gap-1 rounded-chip px-1 text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                >
                  {body}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={item.onSelect}
                  disabled={item.onSelect === undefined}
                  className="flex min-w-0 items-center gap-1 rounded-chip px-1 text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-text-muted"
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
