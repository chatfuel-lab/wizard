import { Button, DatePickerPopover, IconClose, Input } from '~ui';
import type { Weekday } from '~api/generated/broadcasts/graphql';
import { DATES_MAX, EVERY_N_DAYS_MAX, type ScheduleDraft } from '../../lib/composerSteps';
import { WEEKDAY_LABELS, WEEK_ORDER } from '../../lib/schedule';

export interface RecurrenceFieldsProps {
  draft: ScheduleDraft;
  set: (patch: Partial<ScheduleDraft>) => void;
  /** A control was left — write what changed. */
  onCommit: () => void;
  canEdit: boolean;
  todayKey: string;
  formatDay: (dayKey: string) => string;
}

/**
 * The repeat's own controls: seven chips for weekdays, a number for every N
 * days, a growing list of days for "on dates". Each writes when it is left —
 * a chip has no blur, so it writes on the toggle.
 */
export function RecurrenceFields({ draft, set, onCommit, canEdit, todayKey, formatDay }: RecurrenceFieldsProps) {
  switch (draft.repeat) {
    case 'once':
      return null;
    case 'weekdays':
      return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Weekdays">
          {WEEK_ORDER.map((day) => (
            <WeekdayChip
              key={day}
              day={day}
              on={draft.weekdays.includes(day)}
              disabled={!canEdit}
              onToggle={() => {
                const weekdays = draft.weekdays.includes(day)
                  ? draft.weekdays.filter((other) => other !== day)
                  : [...draft.weekdays, day];
                set({ weekdays });
                onCommit();
              }}
            />
          ))}
        </div>
      );
    case 'everyNDays':
      return (
        <label className="flex items-center gap-2 text-label text-text">
          Every
          <Input
            type="number"
            className="w-20 tabular-nums"
            min={1}
            max={EVERY_N_DAYS_MAX}
            step={1}
            value={draft.everyNDays}
            disabled={!canEdit}
            aria-label="Every how many days"
            onChange={(event) => {
              const n = Number(event.target.value);
              set({ everyNDays: Number.isFinite(n) ? Math.max(1, Math.min(EVERY_N_DAYS_MAX, Math.round(n))) : 1 });
            }}
            onBlur={onCommit}
          />
          days
        </label>
      );
    case 'dates':
      return (
        <div className="space-y-2">
          <DatePickerPopover
            aria-label="Add a date"
            placeholder="Add a date"
            value={null}
            min={todayKey}
            todayKey={todayKey}
            disabled={!canEdit || draft.dates.length >= DATES_MAX}
            format={formatDay}
            onChange={(day) => {
              if (!day || draft.dates.includes(day)) return;
              set({ dates: [...draft.dates, day].sort() });
              onCommit();
            }}
          />
          {draft.dates.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {draft.dates.map((day) => (
                <li
                  key={day}
                  className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-meta text-text"
                >
                  {formatDay(day)}
                  {canEdit ? (
                    <Button
                      iconOnly
                      variant="ghost"
                      size="xs"
                      aria-label={`Remove ${formatDay(day)}`}
                      onClick={() => {
                        set({ dates: draft.dates.filter((other) => other !== day) });
                        onCommit();
                      }}
                    >
                      <IconClose size={12} />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
  }
}

function WeekdayChip({
  day,
  on,
  disabled,
  onToggle,
}: {
  day: Weekday;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`min-w-11 rounded-full border px-2.5 py-1 text-label font-medium transition-colors focus-visible:focus-ring disabled:opacity-60 ${
        on
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text'
      }`}
    >
      {WEEKDAY_LABELS[day]}
    </button>
  );
}
