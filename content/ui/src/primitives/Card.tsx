import type { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Top-right slot: a menu button, a link, a status chip. */
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /**
   * Lifts the card off the page with a real drop shadow. Off by default — a page
   * of raised cards is noise — and off, the card still carries the hairline inset
   * ring, which is how this system spells elevation: a surface step and a 1px
   * line, not a lifted plane.
   */
  elevated?: boolean;
  /** Turn off to let the body run edge to edge (a table, a media strip). */
  padded?: boolean;
  /**
   * Take the height the card is given and hand the slack to the body.
   *
   * Off, a card is as tall as what is in it — right for a page of cards. On,
   * the card becomes a flex column and the body the flexing part, so the header
   * and footer rules stay put while the body stretches. That is what a card
   * holding one growable thing needs: a text box that should eat the spare
   * height rather than leave it blank beneath itself.
   *
   * The caller still has to give the card a height to divide up — `flex-1`
   * inside a flex column, or `h-full`.
   */
  fill?: boolean;
  /**
   * `danger` is the "danger zone" card — delete the workspace, revoke every
   * session. The border takes the danger tint and the title turns danger; the
   * body stays ordinary text, because a paragraph of red is unreadable and the
   * frame is signal enough.
   */
  tone?: 'default' | 'danger';
  className?: string;
}

/**
 * Surface container: header rule, body, footer rule.
 *
 * Header and footer only render when something fills them, so a bare
 * <Card>content</Card> is exactly one bordered box with no stray dividers.
 */
export function Card({
  title,
  description,
  actions,
  footer,
  children,
  elevated = false,
  padded = true,
  fill = false,
  tone = 'default',
  className = '',
}: CardProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  const danger = tone === 'danger';
  return (
    <section
      className={`overflow-hidden rounded-card border bg-surface-raised ${
        danger ? 'border-danger/40' : 'border-border'
      } ${elevated ? 'shadow-raised' : 'shadow-card-inset'} ${fill ? 'flex flex-col' : ''} ${className}`}
    >
      {hasHeader ? (
        <header
          className={`flex shrink-0 items-start gap-3 border-b px-4 py-3 ${
            danger ? 'border-danger/40' : 'border-border'
          }`}
        >
          <div className="min-w-0 flex-1">
            {title !== undefined ? (
              <h3 className={`truncate text-sm font-semibold ${danger ? 'text-danger' : 'text-text'}`}>{title}</h3>
            ) : null}
            {description !== undefined ? <p className="mt-0.5 text-xs text-text-muted">{description}</p> : null}
          </div>
          {actions !== undefined ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </header>
      ) : null}

      {children !== undefined ? (
        <div className={`${fill ? 'flex min-h-0 flex-1 flex-col' : ''} ${padded ? 'p-4' : ''}`}>{children}</div>
      ) : null}

      {footer !== undefined ? (
        <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-surface-sunken px-4 py-2.5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
