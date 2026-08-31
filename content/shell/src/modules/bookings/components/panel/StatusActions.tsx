import { Button, MenuButton, type MenuItem } from '~ui';
import type { BookingStatus } from '~api/generated/bookings/graphql';
import { STATUS_META, TARGET_STATUSES, primaryActions, statusMeta } from '../../lib/status';

export interface StatusActionsProps {
  current: BookingStatus;
  isPast: boolean;
  disabled: boolean;
  onSet: (status: BookingStatus) => void;
}

const BUTTON_VARIANT: Record<BookingStatus, 'primary' | 'secondary' | 'danger' | 'outline'> = {
  Pending: 'secondary',
  Confirmed: 'primary',
  Attended: 'primary',
  NoShow: 'outline',
  Reschedule: 'secondary',
  Canceled: 'outline',
};

/**
 * The next steps a booking can take, led by `primaryActions(status, isPast)`
 * (Confirm / Cancel before, Attended / No-show after), with every other
 * target in the overflow. Pending is never a target — the API refuses it from
 * every state — so the menu lists `TARGET_STATUSES` (five),
 * with the current one checked and disabled.
 */
export function StatusActions({ current, isPast, disabled, onSet }: StatusActionsProps) {
  const primary = primaryActions(current, isPast).filter((s) => s !== current);
  const items: MenuItem[] = [
    { kind: 'label', id: 'set', label: 'Set status' },
    ...TARGET_STATUSES.map((status): MenuItem => {
      const meta = statusMeta(status);
      return {
        id: status,
        label: meta.label,
        checked: status === current,
        disabled: status === current || disabled,
        onSelect: () => onSet(status),
      };
    }),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Status actions">
      {primary.map((status) => {
        const meta = STATUS_META.find((m) => m.status === status)!;
        return (
          <Button
            key={status}
            size="sm"
            variant={BUTTON_VARIANT[status]}
            disabled={disabled}
            onClick={() => onSet(status)}
          >
            {meta.verb ?? meta.label}
          </Button>
        );
      })}
      <MenuButton items={items} label="More statuses" />
    </div>
  );
}
