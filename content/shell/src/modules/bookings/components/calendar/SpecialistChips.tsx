import type { ReactNode } from 'react';
import { Avatar, EVENT_TONE_CLASSES, IconUser } from '~ui';
import { UNASSIGNED } from '../../lib/bookingsFilter';
import { toneOf } from '../../lib/calendarLayout';
import { specialistName } from '../../lib/catalogStore';
import { specialistTone } from '../../lib/colors';
import type { SpecialistRecord } from '../../types';

export interface SpecialistChipsProps {
  specialists: readonly SpecialistRecord[];
  /** `filter.specialists` — ids and/or `'none'`. Empty = everyone. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Colour dot per chip (only when the calendar colours by specialist). */
  showTone: boolean;
}

/**
 * The specialist filter as toggle chips: avatar, name, the specialist's tone
 * dot, and an "Unassigned" chip at the end. Multi-select; nothing pressed
 * means everyone. Ids stay in catalog order so the URL reads the same
 * however they were clicked.
 */
export function SpecialistChips({ specialists, value, onChange, showTone }: SpecialistChipsProps) {
  const order = specialists.map((sp) => sp.id);
  const toggle = (key: string) => {
    const next = value.includes(key) ? value.filter((id) => id !== key) : [...value, key];
    const sorted = [...next].sort((a, b) => {
      const ia = a === UNASSIGNED ? order.length : order.indexOf(a);
      const ib = b === UNASSIGNED ? order.length : order.indexOf(b);
      return ia - ib;
    });
    onChange(sorted);
  };
  const chip = (key: string, label: string, avatar: ReactNode, tone: number) => {
    const pressed = value.includes(key);
    return (
      <button
        key={key}
        type="button"
        aria-pressed={pressed}
        onClick={() => toggle(key)}
        className={`inline-flex h-field-sm max-w-40 items-center gap-1.5 rounded-full border pl-1 pr-2.5 text-xs transition-colors duration-fast ease-standard focus-visible:focus-ring ${
          pressed
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border bg-surface-raised text-text hover:bg-surface-hover'
        }`}
      >
        {avatar}
        <span className="truncate">{label}</span>
        {showTone && tone !== 0 ? (
          <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_TONE_CLASSES[toneOf(tone)].bar}`} />
        ) : null}
      </button>
    );
  };
  return (
    <div role="group" aria-label="Filter by specialist" className="flex flex-wrap items-center gap-1">
      {specialists.map((sp) =>
        chip(
          sp.id,
          specialistName(sp.profile),
          <Avatar name={specialistName(sp.profile)} src={sp.profile.logo?.url} size={20} />,
          specialistTone(sp.id, order),
        ),
      )}
      {chip(
        UNASSIGNED,
        'Unassigned',
        <span className="flex size-5 items-center justify-center rounded-full bg-surface-sunken text-text-muted">
          <IconUser size={12} />
        </span>,
        0,
      )}
    </div>
  );
}
