import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BroadcastSetDatesDocument,
  BroadcastSetEveryNDaysDocument,
  BroadcastSetFirstSendTimeDocument,
  BroadcastSetRepeatTypeDocument,
  BroadcastSetWeekdaysDocument,
  type Weekday,
} from '~api/generated/broadcasts/graphql';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { useBroadcasts } from '../BroadcastsContext';
import { findSettingsBlock, type CampaignRecord } from '../lib/campaign';
import { planScheduleWrites, scheduleDraftOf, type ScheduleDraft, type ScheduleWrite } from '../lib/composerSteps';
import { errorMessage } from '../lib/errors';
import { zonedInstant } from '../lib/zone';

export interface ScheduleApi {
  /** What the controls show. Null for a one-time draft. */
  draft: ScheduleDraft | null;
  /** The instant the draft resolves to in the display zone, or NaN while the day is unparseable. */
  at: number;
  set: (patch: Partial<ScheduleDraft>) => void;
  /** Write what changed, in the server's order. Resolves with whether every write landed. */
  commit: () => Promise<boolean>;
  saving: boolean;
  failure: string | null;
}

/**
 * The schedule step's state and its writes.
 *
 * The draft is the person's: seeded from the stored schedule once per entry
 * point and never overwritten by a later read, so a write landing while the
 * next control is being edited cannot put the old value back. After every
 * commit the server's copy and the draft agree, because the commit sent the
 * draft. The order of writes is the server's — repeat type, its list, the
 * first send time last with the corrected weekdays riding along
 * (`planScheduleWrites`) — and an armed campaign is disarmed first, because
 * the five time setters refuse while the entry point is enabled.
 */
export function useSchedule(record: CampaignRecord | null, zone: string): ScheduleApi {
  const { client } = useBroadcasts();
  const store = useCampaigns();
  const elementId = record?.settings.elementId ?? null;
  const schedule = record?.schedule ?? null;
  const [draft, setDraft] = useState<ScheduleDraft | null>(() => (schedule ? scheduleDraftOf(schedule, zone) : null));
  const [inFlight, setInFlight] = useState(0);
  const saving = inFlight > 0;
  /* Commits run one after another: two chip toggles in a row plan against
     what the first one landed, not against the same stale schedule. */
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [failure, setFailure] = useState<string | null>(null);

  const storeRef = useRef(store);
  storeRef.current = store;
  const recordRef = useRef(record);
  recordRef.current = record;
  /* The draft as of the last `set`, for a commit fired in the same tick as
     the change — a chip toggle writes at once, before React has rendered. */
  const draftRef = useRef<ScheduleDraft | null>(draft);

  /* Seeded on the first render; seeded again only for another entry point
     or zone. A later schedule read is a commit's own answer. */
  const seededFor = useRef(`${elementId}|${zone}`);
  useEffect(() => {
    const key = `${elementId}|${zone}`;
    if (seededFor.current === key) return;
    seededFor.current = key;
    const seeded = schedule ? scheduleDraftOf(schedule, zone) : null;
    draftRef.current = seeded;
    setDraft(seeded);
    setFailure(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, zone]);

  const set = useCallback((patch: Partial<ScheduleDraft>) => {
    const current = draftRef.current;
    if (!current) return;
    draftRef.current = { ...current, ...patch };
    setDraft(draftRef.current);
  }, []);

  const at = useMemo(() => (draft ? zonedInstant(draft.dayKey, draft.minuteOfDay, zone) : NaN), [draft, zone]);

  const commitNow = useCallback(async (): Promise<boolean> => {
    const current = recordRef.current;
    const draft = draftRef.current;
    if (!current || !current.schedule || !draft) return true;
    const flow = storeRef.current.flowOf(current.flowId);
    const settings = flow ? findSettingsBlock(flow)?.element : null;
    const storedWeekdays: readonly Weekday[] =
      settings && settings.__typename === 'WhatsAppScheduledMessageBlockElement' ? settings.repeatOnWeekdays : [];
    const { writes } = planScheduleWrites(current.schedule, storedWeekdays, draft, zone);
    if (writes.length === 0) return true;

    setInFlight((n) => n + 1);
    setFailure(null);
    const elementID = current.settings.elementId;
    const key = `write:${elementID}:schedule`;
    const send = async (write: ScheduleWrite) => {
      switch (write.kind) {
        case 'repeatType':
          return (await client.mutate(BroadcastSetRepeatTypeDocument, { elementID, repeatType: write.repeatType }))
            .whatsAppScheduledMessageSetRepeatType;
        case 'weekdays':
          return (await client.mutate(BroadcastSetWeekdaysDocument, { elementID, weekdays: write.weekdays }))
            .whatsAppScheduledMessageSetWeekdays;
        case 'everyNDays':
          return (await client.mutate(BroadcastSetEveryNDaysDocument, { elementID, everyNDays: write.everyNDays }))
            .whatsAppScheduledMessageSetRepeatEveryNDays;
        case 'dates':
          return (await client.mutate(BroadcastSetDatesDocument, { elementID, dates: write.dates }))
            .whatsAppScheduledMessageSetOnCertainDates;
        case 'firstSendTime':
          return (
            await client.mutate(BroadcastSetFirstSendTimeDocument, {
              elementID,
              firstSendTime: write.firstSendTime,
              correctedWeekdays: write.correctedWeekdays,
            })
          ).whatsAppScheduledMessageSetFirstSendTime;
      }
    };
    try {
      if (current.settings.enabled) await storeRef.current.disable(current);
      for (const write of writes) {
        await storeRef.current.writeBlock(key, current.flowId, () => send(write));
      }
      return true;
    } catch (err) {
      setFailure(errorMessage(err));
      return false;
    } finally {
      setInFlight((n) => n - 1);
    }
  }, [client, zone]);

  const commit = useCallback((): Promise<boolean> => {
    const turn = queueRef.current.catch(() => undefined).then(commitNow);
    queueRef.current = turn;
    return turn;
  }, [commitNow]);

  return { draft, at, set, commit, saving, failure };
}
