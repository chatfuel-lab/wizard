import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BroadcastAudienceCountDocument,
  BroadcastSetOneTimeSegmentDocument,
  BroadcastSetScheduledSegmentDocument,
  type SegmentInput,
} from '~api/generated/broadcasts/graphql';
import { useCampaigns } from '../BroadcastsCampaignsContext';
import { useBroadcasts } from '../BroadcastsContext';
import type { AudienceFilter } from '../lib/audienceFilter';
import { buildSegment, segmentToFilter, type PassthroughFilter } from '../lib/audienceSegment';
import { hasErrors, validateAudience, type AudienceIssue } from '../lib/audienceValidation';
import type { CampaignRecord } from '../lib/campaign';
import { errorMessage } from '../lib/errors';
import { useAttributeCatalog, type AttributeCatalog } from './useAttributeCatalog';

/** How long the builder is left alone before a change is written and counted. */
export const AUDIENCE_DEBOUNCE_MS = 400;

export interface AudienceState {
  filter: AudienceFilter;
  setFilter: (next: AudienceFilter) => void;
  /** Filters the campaign carries that the builder has no row for. Re-sent as they were read. */
  passthrough: PassthroughFilter[];
  removePassthrough: (id: string) => void;
  issues: AudienceIssue[];
  /** Recipients the segment selects, or null while unknown. */
  count: number | null;
  counting: boolean;
  error: string | null;
  catalog: AttributeCatalog;
}

interface Draft {
  flowId: string;
  filter: AudienceFilter;
  passthrough: PassthroughFilter[];
  /** The wire form of what was read, so the first render never writes what the server already holds. */
  seedKey: string;
}

const keyOf = (segment: SegmentInput): string => JSON.stringify(segment);

function seed(record: CampaignRecord): Draft {
  const { filter, passthrough } = segmentToFilter(record.audience.segment);
  return {
    flowId: record.flowId,
    filter,
    passthrough,
    seedKey: keyOf(buildSegment(filter, record.flowId, passthrough)),
  };
}

/**
 * The audience of one draft: the filter the builder edits, the segment it
 * becomes, the write that keeps the campaign holding it, and the count.
 *
 * Seeded once per campaign from the segment the entry point holds. Every
 * change is validated; while any error stands nothing is written and nothing
 * is counted, so the figure on screen never describes a half-built row. A
 * valid change waits `AUDIENCE_DEBOUNCE_MS`, then writes the segment through
 * the store (`writeBlock`, so the list holds the answer and the composer can
 * show it pending) and asks `contactsTotalCount` with the same segment. The
 * count is epoch-guarded: an answer for a filter that has since changed is
 * dropped rather than landing on top of the newer one. Writes are chained so
 * two cannot race on the server, where the last to land would win whatever
 * order they were sent in.
 *
 * The first count of a campaign goes out at once; the read segment is never
 * re-written, because its wire form is what the seed already is.
 */
export function useAudience(record: CampaignRecord, onCount: (count: number | null) => void): AudienceState {
  const { client, botId } = useBroadcasts();
  const store = useCampaigns();
  const catalog = useAttributeCatalog();

  const [draft, setDraft] = useState<Draft>(() => seed(record));
  // Another campaign under the same hook: re-seed, the way React prefers over an effect.
  const current = draft.flowId === record.flowId ? draft : seed(record);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (current !== draft) {
    setDraft(current);
    setCount(null);
    setError(null);
  }

  const issues = useMemo(() => validateAudience(current.filter), [current.filter]);
  const valid = !hasErrors(issues);
  const segmentKey = useMemo(
    () => keyOf(buildSegment(current.filter, record.flowId, current.passthrough)),
    [current.filter, current.passthrough, record.flowId],
  );

  const { flowId } = record;
  const { elementId, typename } = record.settings;

  /* Refs for what the debounced work needs at the moment it fires rather than
     at the moment it was scheduled: the store's `writeBlock` is rebuilt on
     every list change and must not restart the timer. */
  const storeRef = useRef(store);
  const onCountRef = useRef(onCount);
  useEffect(() => {
    storeRef.current = store;
    onCountRef.current = onCount;
  });

  const epochRef = useRef(0);
  const writtenRef = useRef<{ flowId: string; key: string } | null>(null);
  const countedRef = useRef<string | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    /* Every change retires the count that was out for the previous filter —
       an invalid row in between must not let it land as if it were this one. */
    const epoch = ++epochRef.current;
    if (!valid) {
      setCounting(false);
      return;
    }
    if (writtenRef.current?.flowId !== flowId) writtenRef.current = { flowId, key: current.seedKey };
    const delay = countedRef.current === flowId ? AUDIENCE_DEBOUNCE_MS : 0;
    countedRef.current = flowId;

    const timer = setTimeout(() => {
      const segment = JSON.parse(segmentKey) as SegmentInput;
      setCounting(true);
      let failed = false;

      const write = async () => {
        if (writtenRef.current?.key === segmentKey) return;
        try {
          await storeRef.current.writeBlock(`audience:${flowId}`, flowId, async () => {
            if (typename === 'WhatsAppOneTimeNotificationBlockElement') {
              const data = await client.mutate(BroadcastSetOneTimeSegmentDocument, { elementID: elementId, segment });
              return data.whatsAppOneTimeNotificationUpdateSegment;
            }
            const data = await client.mutate(BroadcastSetScheduledSegmentDocument, { elementID: elementId, segment });
            return data.whatsAppScheduledMessageUpdateSegment;
          });
          writtenRef.current = { flowId, key: segmentKey };
        } catch (err) {
          failed = true;
          if (epoch === epochRef.current) setError(errorMessage(err));
        }
      };

      const measure = async () => {
        try {
          const data = await client.query(BroadcastAudienceCountDocument, { botID: botId, segment });
          if (epoch !== epochRef.current) return;
          setCount(data.bot.contactsTotalCount);
          if (!failed) setError(null);
        } catch (err) {
          if (epoch === epochRef.current) setError(errorMessage(err));
        } finally {
          if (epoch === epochRef.current) setCounting(false);
        }
      };

      queueRef.current = queueRef.current.then(write).then(measure);
    }, delay);

    return () => clearTimeout(timer);
  }, [segmentKey, valid, flowId, elementId, typename, client, botId, current.seedKey]);

  // Nothing lands after the step is gone.
  useEffect(
    () => () => {
      epochRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    onCountRef.current(count);
  }, [count]);

  const setFilter = useCallback((next: AudienceFilter) => {
    setDraft((prev) => ({ ...prev, filter: next }));
  }, []);

  const removePassthrough = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, passthrough: prev.passthrough.filter((entry) => entry.id !== id) }));
  }, []);

  return useMemo(
    () => ({
      filter: current.filter,
      setFilter,
      passthrough: current.passthrough,
      removePassthrough,
      issues,
      count,
      counting,
      error,
      catalog,
    }),
    [current.filter, current.passthrough, setFilter, removePassthrough, issues, count, counting, error, catalog],
  );
}
