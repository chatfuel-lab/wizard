import { useMemo, useState } from 'react';
import { Button, Field, Select, Tag, type SelectOption } from '~ui';
import {
  BroadcastRepeatType,
  SetScheduledMessageFirstSendTimeDocument,
  SetScheduledMessageOnCertainDatesDocument,
  SetScheduledMessageRepeatEveryNDaysDocument,
  SetScheduledMessageRepeatTypeDocument,
  SetScheduledMessageSegmentDocument,
  SetScheduledMessageWeekdaysDocument,
  Weekday,
} from '~api/generated/flow-builder/graphql';
import { pickBlock } from '../../lib/pickBlock';
import { segmentErrorFilterIds } from '../../lib/segmentInput';
import {
  ALL_WEEKDAYS,
  localInputToUtcIso,
  toCorrectedWeekdays,
  toDisplayWeekdays,
  utcIsoToLocalInput,
} from '../../lib/schedule';
import type { BlockT, ElementOf } from '../../types';
import { SegmentEditor } from './shared/SegmentEditor';
import { useBlockMutation } from './useBlockMutation';

export interface ScheduledMessageEditorProps {
  element: ElementOf<'WhatsAppScheduledMessageBlockElement'>;
  onBlock: (block: BlockT) => void;
}

const REPEAT_OPTIONS: SelectOption[] = [
  { value: BroadcastRepeatType.Never, label: 'Once' },
  { value: BroadcastRepeatType.Weekdays, label: 'On weekdays' },
  { value: BroadcastRepeatType.EveryNDays, label: 'Every N days' },
  { value: BroadcastRepeatType.OnCertainDates, label: 'On certain dates' },
];

/**
 * Recurring broadcast: segment, first send time and the repeat family. All
 * times ride the schema's UTC contract via lib/schedule.ts — weekdays are
 * stored UTC-shifted (displayed back in local terms), correctedWeekdays
 * accompanies every SetFirstSendTime while the stored list is non-empty, and
 * certain dates carry the firstSendTime's local time before conversion.
 */
export function ScheduledMessageEditor({ element, onBlock }: ScheduledMessageEditorProps) {
  const { run, runAction, actionError } = useBlockMutation(onBlock);
  const [dateDraft, setDateDraft] = useState('');
  const errorFilterIds = useMemo(() => segmentErrorFilterIds(element.segmentErrors), [element.segmentErrors]);

  const firstSendAt = element.firstSendTime ? new Date(element.firstSendTime) : null;
  const storedWeekdays = (element.repeatOnWeekdays ?? []) as Weekday[];
  const displayedWeekdays = firstSendAt ? toDisplayWeekdays(storedWeekdays, firstSendAt) : storedWeekdays;

  const saveFirstSendTime = (local: string) => {
    const iso = localInputToUtcIso(local);
    if (!iso) throw new Error('Pick a date and time');
    // correctedWeekdays must ride along whenever the stored list is
    // non-empty — recomputed against the NEW instant (schema docstring).
    const corrected =
      storedWeekdays.length > 0 && firstSendAt
        ? toCorrectedWeekdays(toDisplayWeekdays(storedWeekdays, firstSendAt), new Date(iso))
        : storedWeekdays.length > 0
          ? toCorrectedWeekdays(storedWeekdays, new Date(iso))
          : [];
    return run(
      SetScheduledMessageFirstSendTimeDocument,
      { elementID: element.id, firstSendTime: iso, correctedWeekdays: corrected },
      pickBlock,
    );
  };

  const toggleWeekday = (day: Weekday) => {
    const next = displayedWeekdays.includes(day)
      ? displayedWeekdays.filter((d) => d !== day)
      : [...displayedWeekdays, day];
    const corrected = firstSendAt ? toCorrectedWeekdays(next, firstSendAt) : next;
    void runAction(SetScheduledMessageWeekdaysDocument, { elementID: element.id, weekdays: corrected }, pickBlock);
  };

  const addCertainDate = () => {
    if (!dateDraft) return;
    // Take the TIME from firstSendTime, add it to the picked date, send UTC.
    const time = firstSendAt
      ? `${String(firstSendAt.getHours()).padStart(2, '0')}:${String(firstSendAt.getMinutes()).padStart(2, '0')}`
      : '09:00';
    const iso = localInputToUtcIso(`${dateDraft}T${time}`);
    if (!iso) return;
    const dates = [...(element.repeatOnCertainDates ?? []), iso];
    setDateDraft('');
    void runAction(
      SetScheduledMessageOnCertainDatesDocument,
      { elementID: element.id, certainDates: dates },
      pickBlock,
    );
  };

  const removeCertainDate = (iso: string) => {
    const dates = (element.repeatOnCertainDates ?? []).filter((d) => d !== iso);
    void runAction(
      SetScheduledMessageOnCertainDatesDocument,
      { elementID: element.id, certainDates: dates },
      pickBlock,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag>{element.status}</Tag>
      </div>
      <SegmentEditor
        segment={element.segment}
        platform={element.platform}
        errorFilterIds={errorFilterIds}
        onSave={(request) => run(SetScheduledMessageSegmentDocument, { elementID: element.id, request }, pickBlock)}
      />
      <div className="space-y-2 border-t border-border pt-3">
        <Field
          label="First send (your local time)"
          type="datetime-local"
          value={utcIsoToLocalInput(element.firstSendTime)}
          onSave={saveFirstSendTime}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-muted">Repeat</span>
          <Select
            className="w-full"
            aria-label="Repeat"
            value={element.repeatType}
            options={REPEAT_OPTIONS}
            onChange={(repeatType) =>
              void runAction(
                SetScheduledMessageRepeatTypeDocument,
                { elementID: element.id, repeatType: repeatType as BroadcastRepeatType },
                pickBlock,
              )
            }
          />
        </label>
        {element.repeatType === BroadcastRepeatType.Weekdays ? (
          <div className="flex flex-wrap gap-1">
            {ALL_WEEKDAYS.map((day) => {
              const active = displayedWeekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(day)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-text'
                      : 'border-border text-text-muted hover:border-accent'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        ) : null}
        {element.repeatType === BroadcastRepeatType.EveryNDays ? (
          <Field
            label="Every N days"
            value={element.repeatEveryNDays != null ? String(element.repeatEveryNDays) : ''}
            validate={(v) => (/^[1-9]\d*$/.test(v.trim()) ? null : 'Whole number ≥ 1 required')}
            onSave={(value) =>
              run(
                SetScheduledMessageRepeatEveryNDaysDocument,
                { elementID: element.id, everyNDays: Number(value.trim()) },
                pickBlock,
              )
            }
          />
        ) : null}
        {element.repeatType === BroadcastRepeatType.OnCertainDates ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-text-muted">Dates</div>
            {(element.repeatOnCertainDates ?? []).map((iso) => (
              <div key={iso} className="flex items-center justify-between gap-2 text-sm text-text">
                <span>{new Date(iso).toLocaleString()}</span>
                <Button variant="dangerGhost" size="sm" onClick={() => removeCertainDate(iso)}>
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              />
              <Button variant="ghost" size="sm" disabled={!dateDraft} onClick={addCertainDate}>
                Add date
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      {actionError ? <p className="text-xs text-danger">{actionError}</p> : null}
    </div>
  );
}
