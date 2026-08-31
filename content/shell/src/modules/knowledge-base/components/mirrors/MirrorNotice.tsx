import { Alert, IconArrowRight } from '~ui';
import type { ModeNotice } from '../../lib/mirror';

export interface MirrorNoticeProps {
  notice: ModeNotice | null;
  className?: string;
}

/**
 * Why this page has no buttons.
 *
 * A read-only page that simply omits its controls reads as broken, and the
 * reader's next move is to look for the bug rather than for Bookings. So the
 * banner is not optional decoration: it is the page saying which of the two
 * situations it is in — somebody else owns this, or your role cannot edit it —
 * and, where there is one, pointing at the place the edit actually lives.
 *
 * The link is a plain `<a href="/…">`, which is how one module reaches
 * another in this shell. Nothing here touches `window.location`: routing is
 * the shell's, and a module that navigates by assignment breaks the moment it
 * is embedded in somebody else's page.
 */
export function MirrorNotice({ notice, className = 'mb-3' }: MirrorNoticeProps) {
  if (!notice) return null;
  return (
    <Alert
      tone="info"
      title={notice.title}
      className={className}
      action={
        notice.href ? (
          <a
            href={notice.href}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-control border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-text transition-colors duration-fast ease-standard hover:bg-surface-hover focus-visible:focus-ring"
          >
            {notice.linkLabel}
            <IconArrowRight size={12} />
          </a>
        ) : undefined
      }
    >
      {notice.body}
    </Alert>
  );
}
