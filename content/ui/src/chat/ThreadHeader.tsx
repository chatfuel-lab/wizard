import type { ReactNode } from 'react';
import { IconChevronLeft } from '../icons';
import { Avatar } from '../primitives/Avatar';
import type { ConversationAssignee } from './ConversationListItem';

export interface ThreadHeaderProps {
  name: string;
  avatarUrl?: string | null;
  /** The channel the conversation arrived on — "WhatsApp", "Web widget". */
  platform?: ReactNode;
  /** Whatever the module calls its states: "automated", "open", "closed". */
  status?: ReactNode;
  assignee?: ConversationAssignee | null;
  /** Turns the assignee chip into a button — an assignment menu, usually. */
  onAssigneeClick?: () => void;
  /** Shown in the chip when nobody owns the conversation. */
  unassignedLabel?: string;
  /**
   * Take over, Close, an overflow menu. A slot rather than props because every
   * platform and permission set has a different three of them, and a header
   * that enumerated them would grow a boolean per deployment.
   */
  actions?: ReactNode;
  /**
   * Back to the list. The CALLER decides whether this exists, because it is a
   * band question — the stacked layout has no list on screen to go back to,
   * the split one has it right there — and that answer belongs to the module
   * that owns the layout, not to the bar.
   */
  onBack?: () => void;
  className?: string;
}

/**
 * The bar above a thread: who this is, where they came from, who owns them.
 *
 * Fixed height (`h-14`) on purpose. It sits above a scroller in a column flex
 * container, and a header that changes height when the subtitle wraps drags
 * the message list's viewport with it — which, with bottom anchoring, is a
 * visible jump on every re-render that happens to wrap differently.
 *
 * Everything below the name is one line, truncated, for the same reason.
 */
export function ThreadHeader({
  name,
  avatarUrl,
  platform,
  status,
  assignee,
  onAssigneeClick,
  unassignedLabel = 'Unassigned',
  actions,
  onBack,
  className = '',
}: ThreadHeaderProps) {
  const assigneeName = assignee?.name ?? unassignedLabel;

  const chipContent = (
    <>
      {assignee ? <Avatar src={assignee.avatarUrl} name={assignee.name} size={18} /> : null}
      <span className="max-w-28 truncate">{assigneeName}</span>
    </>
  );
  const chipClasses = `flex items-center gap-1.5 rounded-chip bg-surface-sunken py-1 pr-2 pl-1 text-micro ${
    assignee ? 'text-text-muted' : 'text-text-faint'
  }`;

  return (
    <div
      className={`flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-raised px-3 ${
        className ?? ''
      }`}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-text"
        >
          <IconChevronLeft size={18} />
        </button>
      ) : null}

      <Avatar src={avatarUrl} name={name} size={32} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{name}</div>
        {platform || status ? (
          <div className="truncate text-xs text-text-muted">
            {platform}
            {platform && status ? <span aria-hidden> · </span> : null}
            {status}
          </div>
        ) : null}
      </div>

      {/* The chip is the first thing to go when the module gets narrow: the
          same fact is on the list row behind it, and the actions are not.
          `@max-compact:` and not a viewport prefix — an embed can be 700px
          wide inside a 2560px screen. */}
      {onAssigneeClick ? (
        <button
          type="button"
          onClick={onAssigneeClick}
          className={`${chipClasses} shrink-0 transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover @max-compact:hidden`}
        >
          {chipContent}
        </button>
      ) : assignee ? (
        <span className={`${chipClasses} shrink-0 @max-compact:hidden`}>{chipContent}</span>
      ) : null}

      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}
