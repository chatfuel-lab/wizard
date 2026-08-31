import { useEffect, useMemo, useState } from 'react';
import { Button, DatePickerPopover, DurationInput, TimeInput, formatHHmm, parseHHmm, type Weekday } from '~ui';
import {
  dayLabel,
  isWhenDirty,
  validateWhen,
  whenFieldOfError,
  whenFormOf,
  whenInstants,
  type LabelOptions,
  type WhenField,
  type WhenForm as WhenFormModel,
} from '../../lib/panelForm';
import type { BookingRecord, DisplayZone } from '../../types';

/** Fewer chips than the default six: the panel column is narrow. Anything else is one tap away in Custom. */
const PANEL_PRESETS: readonly number[] = [30, 45, 60, 90];

export interface WhenFormProps {
  booking: BookingRecord;
  zone: DisplayZone;
  todayKey: string;
  weekStartsOn: number;
  labels: LabelOptions;
  disabled: boolean;
  /** Sends the two instants (already formatted with the bot offset). Resolves `{ ok, error }`; the error maps to a field here. */
  onSave: (next: { startTime: string; endTime: string }, detail: string) => Promise<{ ok: boolean; error: unknown }>;
}

/**
 * The panel's "When": day (`DatePickerPopover`), start (`TimeInput`) and
 * duration (`DurationInput`), edited in the display zone against a local
 * draft, with Save / Cancel once anything differs from the record. The model
 * and its rules are `lib/panelForm.ts`; the record's own change (a live event,
 * an undo) re-seeds the draft when it is not mid-edit.
 */
export function WhenForm({ booking, zone, todayKey, weekStartsOn, labels, disabled, onSave }: WhenFormProps) {
  const seeded = useMemo(() => whenFormOf(booking, zone.zone), [booking, zone.zone]);
  const [draft, setDraft] = useState<WhenFormModel>(seeded);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<{ field: WhenField | null; message: string } | null>(null);
  const dirty = isWhenDirty(draft, booking, zone.zone);

  // The record moved (live event, undo, another edit) → adopt it unless the operator is mid-edit.
  useEffect(() => {
    setDraft((current) => (isWhenDirty(current, booking, zone.zone) && !saving ? current : seeded));
    setProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded]);

  const reset = () => {
    setDraft(seeded);
    setProblem(null);
  };

  const save = async () => {
    const invalid = validateWhen(draft);
    if (invalid) {
      setProblem({ field: null, message: invalid });
      return;
    }
    setSaving(true);
    setProblem(null);
    const detail = `${dayLabel(draft.day, { ...labels, todayKey })} ${formatHHmm(draft.startMinute)}`;
    const result = await onSave(whenInstants(draft, zone.zone, zone.botZone), detail);
    setSaving(false);
    if (!result.ok && result.error) setProblem({ field: whenFieldOfError(result.error), message: '' });
  };

  const inert = disabled || saving;
  const startValue = formatHHmm(draft.startMinute);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <span className="mb-1 block text-xs font-medium text-text-muted">Day</span>
          <DatePickerPopover
            value={draft.day}
            onChange={(day) => day && setDraft((d) => ({ ...d, day }))}
            weekStartsOn={weekStartsOn as Weekday}
            todayKey={todayKey}
            disabled={inert}
            format={(day) => dayLabel(day, { ...labels, todayKey })}
            aria-label="Day"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-text-muted">
            Start{zone.botZone && zone.botZone !== zone.zone ? ` (${zone.zone})` : ''}
          </span>
          <TimeInput
            value={startValue}
            onChange={(value) => {
              const minute = value ? parseHHmm(value) : null;
              if (minute !== null) setDraft((d) => ({ ...d, startMinute: minute }));
            }}
            step={15}
            hour12={labels.hour12}
            disabled={inert}
            invalid={problem?.field === 'start'}
            aria-label="Start time"
          />
        </div>
        <div className="min-w-0 max-w-full overflow-x-auto">
          <span className="mb-1 block text-xs font-medium text-text-muted">Duration</span>
          <DurationInput
            value={draft.duration}
            onChange={(value) => value !== null && setDraft((d) => ({ ...d, duration: value }))}
            presets={PANEL_PRESETS}
            disabled={inert}
            size="sm"
            aria-label="Duration"
          />
        </div>
      </div>
      {problem?.message ? <p className="text-xs text-danger">{problem.message}</p> : null}
      {problem && !problem.message && problem.field === 'duration' ? (
        <p className="text-xs text-danger">Check the duration — the server refused this span.</p>
      ) : null}
      {dirty && !disabled ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>
            Save time
          </Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={reset}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}
