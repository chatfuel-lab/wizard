import type { ReactNode } from 'react';
import { Avatar } from '../primitives/Avatar';
import { EVENT_TONE_CLASSES, type EventChipTone } from './EventChip';

export interface ResourceHeaderProps {
  name: string;
  avatarSrc?: string | null;
  /** The resource's event tone; draws the dot that ties the header to its blocks. */
  tone?: EventChipTone;
  /** A second line — "Mon–Fri 9–18", "3 bookings", "No schedule". */
  meta?: ReactNode;
  /** Trailing controls — a menu button, a filter toggle. */
  actions?: ReactNode;
  /** `sm` for a resource-day column header, `md` for a staff list row. */
  size?: 'sm' | 'md';
  className?: string;
}

const AVATAR_PX: Record<NonNullable<ResourceHeaderProps['size']>, number> = { sm: 24, md: 32 };

/**
 * A person or room at the top of a column, or at the head of a list row:
 * avatar, name, tone dot, meta, actions. The dot is the same solid the
 * resource's blocks carry, so the eye can match a column to its colour
 * without a legend.
 */
export function ResourceHeader({
  name,
  avatarSrc,
  tone,
  meta,
  actions,
  size = 'sm',
  className = '',
}: ResourceHeaderProps) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <Avatar src={avatarSrc} name={name} size={AVATAR_PX[size]} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {tone !== undefined ? (
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${EVENT_TONE_CLASSES[tone].bar}`} />
          ) : null}
          <span className={`min-w-0 truncate font-medium text-text ${size === 'sm' ? 'text-label' : 'text-body'}`}>
            {name}
          </span>
        </div>
        {meta !== undefined ? <div className="truncate text-micro text-text-muted">{meta}</div> : null}
      </div>
      {actions !== undefined ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}
