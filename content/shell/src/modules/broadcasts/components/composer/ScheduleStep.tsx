import { useEffect, useMemo, useRef } from 'react';
import { Alert, DatePickerPopover, RadioGroup, Tag, TimeInput, formatHHmm, parseHHmm } from '~ui';
import type { ScheduleApi } from '../../hooks/useSchedule';
import { KIND_LABELS, type CampaignRecord } from '../../lib/campaign';
import { REPEAT_LABELS, problemsOfStep, type RepeatKind } from '../../lib/composerSteps';
import { problemText } from '../../lib/errors';
import { formatDay } from '../../lib/format';
import { dayKeyInZone, offsetLabel, zonedInstant } from '../../lib/zone';
import { RecurrenceFields } from './RecurrenceFields';
import { StepFrame } from './StepFrame';

export interface ScheduleStepProps {
  record: CampaignRecord;
  schedule: ScheduleApi;
  zone: string;
  now: number;
  canEdit: boolean;
  /** The name step said "Repeating": a one-shot draft opens on a weekly repeat rather than Once. */
  recurring: boolean;
  /** The person picked a repeat here — the name step's word follows it. */
  onRepeatChange?: (repeat: RepeatKind) => void;
}

const REPEAT_OPTIONS: readonly { value: RepeatKind; label: string }[] = (
  ['once', 'weekdays', 'everyNDays', 'dates'] as const
).map((value) => ({ value, label: REPEAT_LABELS[value] }));

/**
 * When it goes. A one-time draft has nothing to set here — the send is the
 * review step's confirm — so the step shows the kind and nothing else. A
 * scheduled draft picks a day and a time on the bot's wall clock, resolved
 * to an instant in `zone`, and a repeat. Every control writes when it is
 * left, and Continue writes again; the server's verdict on a past time
 * prints beside the time.
 */
export function ScheduleStep({ record, schedule, zone, now, canEdit, recurring, onRepeatChange }: ScheduleStepProps) {
  const { draft, set, at } = schedule;
  const todayKey = dayKeyInZone(now, zone);
  const verdicts = useMemo(
    () => problemsOfStep(record, 'schedule').map((problem) => problemText(problem.code, problem.paramName)),
    [record],
  );
  const dayLabel = (dayKey: string) => formatDay(zonedInstant(dayKey, 12 * 60, zone), zone, now);

  /* "Repeating" on the name step, on a draft still set to Once: open on the
     weekly repeat so the step reads as the person meant it. Once per entry
     point — a person who then picks Once here has said Once. */
  const repeat = draft?.repeat;
  const seededFor = useRef<string | null>(null);
  const elementId = record.settings.elementId;
  useEffect(() => {
    if (seededFor.current === elementId) return;
    seededFor.current = elementId;
    if (recurring && repeat === 'once' && canEdit) set({ repeat: 'weekdays' });
  }, [elementId, recurring, repeat, canEdit, set]);

  if (record.isOneTime || !draft) {
    return (
      <StepFrame title="Schedule">
        <Tag tone="accent">{KIND_LABELS[record.kind]}</Tag>
      </StepFrame>
    );
  }

  const commit = () => void schedule.commit();
  const timeInvalid = verdicts.length > 0 || (!Number.isNaN(at) && at <= now);

  return (
    <StepFrame title="Schedule">
      <div className="max-w-xl space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="mb-1 block text-label font-medium text-text-muted">Day</span>
            <DatePickerPopover
              aria-label="First send day"
              value={draft.dayKey}
              min={todayKey}
              todayKey={todayKey}
              disabled={!canEdit}
              format={dayLabel}
              onChange={(day) => {
                if (!day) return;
                set({ dayKey: day });
                commit();
              }}
            />
          </div>
          <div>
            <span className="mb-1 block text-label font-medium text-text-muted">Time</span>
            <div className="flex items-center gap-2">
              <TimeInput
                aria-label="First send time"
                value={formatHHmm(draft.minuteOfDay)}
                step={15}
                disabled={!canEdit}
                invalid={timeInvalid}
                onChange={(value) => {
                  const minute = value === null ? null : parseHHmm(value);
                  if (minute === null || minute >= 24 * 60) return;
                  set({ minuteOfDay: minute });
                  commit();
                }}
              />
              <span className="text-meta tabular-nums text-text-faint">
                {offsetLabel(zone, Number.isNaN(at) ? now : at)}
              </span>
            </div>
          </div>
        </div>
        {verdicts.map((text) => (
          <p key={text} className="text-meta text-danger">
            {text}
          </p>
        ))}
        {verdicts.length === 0 && !Number.isNaN(at) && at <= now ? (
          <p className="text-meta text-danger">{problemText('start_time_cannot_be_in_past')}</p>
        ) : null}

        <RadioGroup
          legend="Repeat"
          orientation="horizontal"
          value={draft.repeat}
          options={REPEAT_OPTIONS}
          disabled={!canEdit}
          onChange={(value) => {
            set({ repeat: value });
            onRepeatChange?.(value);
            commit();
          }}
        />
        <RecurrenceFields
          draft={draft}
          set={set}
          onCommit={commit}
          canEdit={canEdit}
          todayKey={todayKey}
          formatDay={dayLabel}
        />

        {schedule.failure ? <Alert tone="danger">{schedule.failure}</Alert> : null}
      </div>
    </StepFrame>
  );
}
