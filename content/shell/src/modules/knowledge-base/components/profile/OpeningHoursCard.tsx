import { useCallback, useMemo } from 'react';
import { Card, WeekHoursEditor, useToast, validateWeekHours, type WeekHours } from '~ui';
import { useKnowledgeUndo } from '../../KnowledgeBaseUndoContext';
import { useKnowledge } from '../../KnowledgeBaseStoreContext';
import { useKnowledgeDraft } from '../../hooks/useKnowledgeDraft';
import { messageFor } from '../../lib/errors';
import { hoursSummary, toWeekHours, toWorkingHours, weekHoursIdentity } from '../../lib/weekHours';
import type { WorkingHoursDay } from '../../types';
import { SectionSaveBar } from './SectionSaveBar';

export interface OpeningHoursCardProps {
  schedule: readonly WorkingHoursDay[] | null | undefined;
  canEdit: boolean;
}

/**
 * Opening hours, as one draft alongside the six text fields.
 *
 * `WeekHoursEditor` speaks `Record<0..6, DayHours>` and the API speaks a list
 * of `Weekday` strings; `lib/weekHours.ts` is the whole of that translation,
 * including the Monday-first write order the alphabetical SDL enum would
 * otherwise decide for us. Breaks are off because the schedule input has no
 * field for one.
 *
 * Validation runs before the write rather than after: a save that reaches the
 * server with an end before its start comes back as
 * `FuelyBusinessHoursScheduleInvalidTimeRange`, which is the same message a
 * beat later and a round trip more expensive.
 */
export function OpeningHoursCard({ schedule, canEdit }: OpeningHoursCardProps) {
  const store = useKnowledge();
  const undo = useKnowledgeUndo();
  const toast = useToast();

  const serverWeek = useMemo(() => toWeekHours(schedule), [schedule]);

  const write = useCallback(
    async (week: WeekHours, previous: WeekHours) => {
      const problems = validateWeekHours(week);
      if (Object.keys(problems).length > 0) throw new Error('Fix the days marked below before saving.');

      await store.saveSchedule(toWorkingHours(week));

      const revert = () => {
        void store.saveSchedule(toWorkingHours(previous)).catch((failure: unknown) => {
          toast.show({ title: 'Could not undo', description: messageFor(failure), tone: 'danger' });
        });
      };
      undo.push({ kind: 'hours', at: Date.now() }, revert);
      toast.show({
        title: 'Opening hours saved',
        tone: 'success',
        /* See ProfileFieldRow: a captured `undo.run` is one render stale. */
        action: {
          label: 'Undo',
          onClick: () => {
            undo.clear();
            revert();
          },
        },
      });
    },
    [store, undo, toast],
  );

  const draft = useKnowledgeDraft('profile', 'hours', serverWeek, write, weekHoursIdentity);
  const errors = useMemo(() => validateWeekHours(draft.value), [draft.value]);

  return (
    <Card title="Opening hours" description={hoursSummary(draft.value)}>
      <WeekHoursEditor
        value={draft.value}
        onChange={draft.set}
        weekStartsOn={1}
        errors={errors}
        breaks={false}
        disabled={!canEdit}
      />
      <SectionSaveBar
        dirty={false}
        error={draft.error}
        conflict={draft.conflict}
        onUseTheirs={draft.useTheirs}
        onKeepMine={draft.keepMine}
        canEdit={canEdit}
      />
    </Card>
  );
}
