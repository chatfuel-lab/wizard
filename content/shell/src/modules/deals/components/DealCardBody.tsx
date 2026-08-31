import { Avatar, IconLock } from '~ui';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import { attributeMap, currencyOf, formatMoney, readValue } from '../lib/dealFieldValue';
import { isRestricted } from '../lib/dragPayload';
import type { Density } from '../lib/layout';
import { rotOf, type RotLevel } from '../lib/rot';
import { ageLabel } from '../lib/time';
import type { DealCard } from '../types';

export interface DealCardBodyProps {
  card: DealCard;
  bindings: DealFieldBindings;
  density: Density;
  /** One clock read per board render, so every card agrees. */
  now: number;
  dragging?: boolean;
}

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** A 2px left bar, not a tinted card: one rule, and it survives dark mode. */
const ROT_BAR: Record<RotLevel, string> = {
  none: 'bg-transparent',
  warn: 'bg-warning',
  stale: 'bg-danger',
};

const ROT_CHIP: Record<RotLevel, string> = {
  none: 'text-text-muted',
  warn: 'text-warning',
  stale: 'text-danger',
};

function assigneeLabel(card: DealCard): string {
  const assignee = card.assignee;
  if (!assignee) return 'Unassigned';
  if (assignee.__typename === 'FuelyAIAssignee') return 'Fuely AI';
  return assignee.isUnknown ? 'Deleted user' : assignee.name;
}

/**
 * Everything a card looks like — and nothing about how it behaves. The drag
 * ghost renders this too, so it must not read from a drag session, a selection
 * or a router.
 */
export function DealCardBody({ card, bindings, density, now, dragging }: DealCardBodyProps) {
  const restricted = isRestricted(card);
  const rot = rotOf(card.salesStageV2, card.lastSalesStageUpdateTime, now);
  const age = ageLabel(card.lastSalesStageUpdateTime, now);
  const unread = card.unreadMessagesCount ?? 0;

  const values = attributeMap(card.attributes);
  const amount = readValue('money', values[bindings.amount.name]);
  const closeDate = readValue('date', values[bindings.closeDate.name]);
  const money = amount.parsed === null ? null : formatMoney(amount.parsed, currencyOf(values, bindings.currency.name));

  // Inset by a hair so the bar reads as part of the card's edge rather than a
  // stripe painted over its border radius.
  const bar = <span aria-hidden className={`absolute inset-y-1 left-1.5 w-0.5 rounded-full ${ROT_BAR[rot.level]}`} />;

  const unreadBadge =
    unread > 0 ? (
      <span className="shrink-0 rounded-chip bg-accent px-1.5 py-px text-nano font-medium tabular-nums text-accent-fg">
        {unread}
      </span>
    ) : null;

  if (restricted) {
    return (
      <div className="relative flex min-h-11 items-center gap-2 py-2 pl-4 pr-3 text-xs text-text-muted">
        <IconLock />
        <span className="truncate">Restricted contact</span>
      </div>
    );
  }

  if (density === 'compact') {
    return (
      <div className="relative flex h-8 items-center gap-2.5 pl-4 pr-3 text-xs">
        {bar}
        <span className="min-w-0 flex-1 truncate font-medium">{card.name || 'Unnamed'}</span>
        {money ? <span className="shrink-0 tabular-nums text-text-muted">{money}</span> : null}
        {unreadBadge}
        {age ? <span className={`shrink-0 tabular-nums ${ROT_CHIP[rot.level]}`}>{age}</span> : null}
      </div>
    );
  }

  /* The right edge of the top row is left empty on purpose: that is where the
   * selection checkbox appears, and the unread badge used to collide with it. */
  return (
    <div className={`relative py-3 pl-4 pr-3 ${dragging ? 'select-none' : ''}`}>
      {bar}
      <div className="flex items-center gap-2.5 pr-6">
        <Avatar src={card.profilePictureUrl} name={card.name || '?'} size={24} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium leading-5">{card.name || 'Unnamed'}</span>
      </div>

      {money || closeDate.parsed !== null ? (
        <div className="mt-2.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate font-medium tabular-nums">{money ?? ''}</span>
          {closeDate.parsed === null ? null : (
            <span className="shrink-0 text-xs tabular-nums text-text-muted">
              {shortDate.format(new Date(closeDate.parsed))}
            </span>
          )}
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-text-muted">
        <span className="truncate">{assigneeLabel(card)}</span>
        <span className="flex shrink-0 items-center gap-2">
          {unreadBadge}
          {age ? <span className={`tabular-nums ${ROT_CHIP[rot.level]}`}>{age}</span> : null}
        </span>
      </div>
    </div>
  );
}
