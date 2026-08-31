import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Usually a string; a node when the title carries a live dot or a count. */
  title: ReactNode;
  /** Row count, sync state — sits next to the title and may wrap away first. */
  meta?: ReactNode;
  /** Right-aligned controls: view switch, refresh, overflow menu. */
  actions?: ReactNode;
  /**
   * A `Tabs` strip, on its own full-width row under the title. This is the slot
   * an underline tab strip needs and `actions` is not: see the note below.
   */
  tabs?: ReactNode;
  className?: string;
}

/**
 * The module's top bar. Every module hand-rolled one of these; this is Deals'
 * (the most evolved) with one deliberate change.
 *
 * `min-h-topbar` + `flex-wrap`, not `h-topbar`. At the current desktop widths
 * the two are identical — nothing overflows today — but a fixed height in a
 * narrow container squashes the actions into each other instead of letting them
 * drop to a second line. Growing is the only honest answer at 360px.
 *
 * The gutter is the token, so this header's padding steps with the band without
 * knowing the band exists.
 *
 * ## Why `tabs` is a slot of its own
 *
 * Three modules put their `Tabs` in `actions`, and all three drew two parallel
 * lines: an underline tab strip carries its own baseline rule, and in `actions`
 * that rule floats in the middle of the header a few pixels above the header's
 * own bottom border. The strip is not a control that sits *in* a bar, it is a
 * bar — the rule it draws is meant to BE the edge the content hangs from.
 *
 * So `tabs` gets its own full-width row, and `-mb-px` on that row pulls the
 * header's bottom border up by exactly the pixel the strip's own rule occupies.
 * The two land on the same line: identical width outside the gutter, doubled
 * inside it, and one continuous edge to the eye. The active tab's `-mb-px
 * border-b-2` then straddles that shared line, which is what the pattern has
 * always meant to do and could not while the strip was inset on the right.
 */
export function PageHeader({ title, meta, actions, tabs, className }: PageHeaderProps) {
  return (
    <header
      className={`flex shrink-0 flex-col border-b border-border bg-surface-raised/80 backdrop-blur ${className ?? ''}`}
    >
      <div className="flex min-h-topbar flex-wrap items-center gap-3 px-gutter">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-heading font-semibold text-text">{title}</span>
          {meta}
        </div>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? <div className="-mb-px px-gutter">{tabs}</div> : null}
    </header>
  );
}
