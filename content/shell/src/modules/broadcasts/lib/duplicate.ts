/**
 * Duplicate is not an API operation. A copy is a new draft with the source's
 * template, parameters, audience and recurrence replayed onto it, one setter
 * at a time — the same setters the composer uses, in the order the composer
 * would use them. The pure half is here: what to replay, and the audience
 * turned back into the input the server takes. The wire half runs the list.
 *
 * Two facts shape the audience mapping:
 *
 * - the read side hands back `attribute { name }` where the input takes
 *   `name`, so a stored segment cannot be sent back as it came;
 * - `dateStrategy`, `byTag` and `byStoredSegment` fail live (the contacts
 *   module's finding, repeated here), so a filter carrying only one of those
 *   is dropped rather than sent to fail the whole write. Ids are minted fresh
 *   with `stableUuid` under the copy's own scope, so the copy never shares an
 *   id with its source.
 *
 * The same replay serves the name step when a draft's KIND changes: a second
 * pair on the same flow gets the first pair's template before the first
 * entry point is deleted.
 */
import { stableUuid } from '~api';
import {
  BroadcastRepeatType,
  BroadcastSetBodyTextDocument,
  BroadcastSetCopyCodeDocument,
  BroadcastSetDatesDocument,
  BroadcastSetEveryNDaysDocument,
  BroadcastSetFooterTextDocument,
  BroadcastSetHeaderDocumentDocument,
  BroadcastSetHeaderImageDocument,
  BroadcastSetHeaderTextDocument,
  BroadcastSetHeaderVideoDocument,
  BroadcastSetOneTimeSegmentDocument,
  BroadcastSetRepeatTypeDocument,
  BroadcastSetScheduledSegmentDocument,
  BroadcastSetTemplateDocument,
  BroadcastSetUrlButtonParamDocument,
  BroadcastSetWeekdaysDocument,
  type FilterInput,
  type SegmentInput,
  type Weekday,
} from '~api/generated/broadcasts/graphql';
import type { ApiClient, CampaignBlock, CampaignFlow, SegmentRead, TemplateConfig } from '../types';
import { campaignOf, type CampaignRecord } from './campaign';
import { errorMessage } from './errors';
import { toCorrectedWeekdays, toDisplayWeekdays, type CampaignSchedule } from './schedule';
import { templateFields } from './templatePreview';

// ---------------------------------------------------------------------------
// The audience, read → input
// ---------------------------------------------------------------------------

type ReadFilter = SegmentRead['filters'][number];
type ReadSegment = {
  name?: string | null;
  resultOperator: SegmentRead['resultOperator'];
  filters: readonly ReadFilter[];
};

/** One filter as the input takes it, or null when nothing in it survives the wire. */
function filterToInput(filter: ReadFilter, id: string, scope: string): FilterInput | null {
  if (filter.byAttribute?.defaultStrategy) {
    return {
      id,
      byAttribute: {
        name: filter.byAttribute.attribute.name,
        defaultStrategy: {
          operator: filter.byAttribute.defaultStrategy.operator,
          comparableValues: [...filter.byAttribute.defaultStrategy.comparableValues],
        },
      },
    };
  }
  if ('byInFlightSegment' in filter && filter.byInFlightSegment) {
    return { id, byInFlightSegment: segmentToInput(filter.byInFlightSegment, `${scope}/${id}`) };
  }
  return null;
}

/**
 * A stored segment as `SegmentInput`. Fresh UUIDs under `scope` — the copy's
 * flow id — so the ids are stable across renders and never the source's.
 */
export function segmentToInput(read: ReadSegment, scope: string): SegmentInput {
  const filters: FilterInput[] = [];
  read.filters.forEach((filter, index) => {
    const input = filterToInput(filter, stableUuid(`${scope}/filter/${index}`), scope);
    if (input) filters.push(input);
  });
  return {
    id: stableUuid(`${scope}/segment`),
    name: read.name ?? null,
    resultOperator: read.resultOperator,
    filters,
  };
}

/** True when the segment says something — an empty filter list is the default and needs no write. */
export const hasFilters = (segment: SegmentInput): boolean => segment.filters.length > 0;

// ---------------------------------------------------------------------------
// The message, config → setter calls
// ---------------------------------------------------------------------------

export type ReplayStep =
  | { kind: 'text'; component: 'Header' | 'Body' | 'Footer'; name: string; value: string }
  | { kind: 'urlParam'; buttonId: string; name: string; value: string }
  | { kind: 'copyCode'; buttonId: string; value: string }
  | { kind: 'media'; fileKind: 'image' | 'video' | 'document'; fileId: string; fileName: string | null };

/**
 * Every value the source holds, as the setter that puts it back. An empty
 * value is skipped — the server's verdict on the copy says it is empty, the
 * same as on the source. An attribute reference prints as `{{name}}` and is
 * parsed back into a reference on the way in.
 */
export function replayPlan(config: TemplateConfig): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const header = config.header;
  if (header && header.__typename !== 'WhatsAppTemplateComponentText') {
    const file =
      header.__typename === 'WhatsAppTemplateComponentImage'
        ? header.image
        : header.__typename === 'WhatsAppTemplateComponentVideo'
          ? header.video
          : header.document;
    if (file) {
      steps.push({
        kind: 'media',
        fileKind:
          header.__typename === 'WhatsAppTemplateComponentImage'
            ? 'image'
            : header.__typename === 'WhatsAppTemplateComponentVideo'
              ? 'video'
              : 'document',
        fileId: file.id,
        fileName: header.__typename === 'WhatsAppTemplateComponentDocument' ? (header.fileName ?? null) : null,
      });
    }
  }
  for (const field of templateFields({
    header: config.header ?? null,
    body: config.body,
    footer: config.footer ?? null,
    buttons: config.buttons,
  })) {
    if (field.kind === 'file' || field.value === '') continue;
    if (field.kind === 'text')
      steps.push({ kind: 'text', component: field.component, name: field.name, value: field.value });
    else if (field.kind === 'urlParam')
      steps.push({ kind: 'urlParam', buttonId: field.buttonId, name: field.name, value: field.value });
    else steps.push({ kind: 'copyCode', buttonId: field.buttonId, value: field.value });
  }
  return steps;
}

/** One replay step, sent. Answers the block. */
export async function runReplayStep(client: ApiClient, elementID: string, step: ReplayStep): Promise<CampaignBlock> {
  switch (step.kind) {
    case 'text': {
      const vars = { elementID, name: step.name, value: step.value };
      if (step.component === 'Header')
        return (await client.mutate(BroadcastSetHeaderTextDocument, vars)).whatsAppTemplateSetHeaderTextParamValue;
      if (step.component === 'Body')
        return (await client.mutate(BroadcastSetBodyTextDocument, vars)).whatsAppTemplateSetBodyTextParamValue;
      return (await client.mutate(BroadcastSetFooterTextDocument, vars)).whatsAppTemplateSetFooterTextParamValue;
    }
    case 'urlParam':
      return (
        await client.mutate(BroadcastSetUrlButtonParamDocument, {
          elementID,
          buttonID: step.buttonId,
          name: step.name,
          value: step.value,
        })
      ).whatsAppTemplateSetURLButtonTextParamValue;
    case 'copyCode':
      return (
        await client.mutate(BroadcastSetCopyCodeDocument, { elementID, buttonID: step.buttonId, codeValue: step.value })
      ).whatsAppTemplateSetCopyCodeButtonCodeValue;
    case 'media': {
      if (step.fileKind === 'image')
        return (await client.mutate(BroadcastSetHeaderImageDocument, { elementID, fileID: step.fileId }))
          .whatsAppTemplateSetHeaderImageFile;
      if (step.fileKind === 'video')
        return (await client.mutate(BroadcastSetHeaderVideoDocument, { elementID, fileID: step.fileId }))
          .whatsAppTemplateSetHeaderVideoFile;
      return (
        await client.mutate(BroadcastSetHeaderDocumentDocument, {
          elementID,
          fileID: step.fileId,
          fileName: step.fileName ?? 'document',
        })
      ).whatsAppTemplateSetHeaderDocumentFile;
    }
  }
}

/**
 * The source's template onto another payload element: the pick, then every
 * value. A refused step — a header file the server will not attach twice —
 * is left where it is and the verdict on the copy says so; the rest of the
 * plan still runs. Answers the last block the server gave, or null when the
 * pick itself failed.
 */
export async function replayTemplate(
  client: ApiClient,
  elementID: string,
  config: TemplateConfig,
): Promise<{ block: CampaignBlock; failures: string[] }> {
  const picked = await client.mutate(BroadcastSetTemplateDocument, { elementID, templateID: config.templateID });
  let block: CampaignBlock = picked.whatsAppTemplateSetTemplate;
  const failures: string[] = [];
  for (const step of replayPlan(config)) {
    try {
      block = await runReplayStep(client, elementID, step);
    } catch (err) {
      failures.push(errorMessage(err));
    }
  }
  return { block, failures };
}

// ---------------------------------------------------------------------------
// The recurrence, source → setter calls
// ---------------------------------------------------------------------------

export type RecurrenceReplay =
  | { repeatType: BroadcastRepeatType.Weekdays; weekdays: Weekday[] }
  | { repeatType: BroadcastRepeatType.EveryNDays; everyNDays: number }
  | { repeatType: BroadcastRepeatType.OnCertainDates; dates: string[] }
  | null;

/**
 * What a recurring source's repeat becomes on the copy. The copy's first
 * send is the server's default (an hour ahead) until the person sets it, so
 * the stored UTC weekday list is read as the SOURCE's display days and
 * corrected for the COPY's first send — the day shift can differ between the
 * two instants, and a list moved by the wrong shift is off by a day.
 */
export function recurrenceReplay(
  schedule: CampaignSchedule | null,
  copyFirstSendAt: number,
  zone: string,
): RecurrenceReplay {
  if (!schedule) return null;
  switch (schedule.repeat) {
    case 'once':
      return null;
    case 'weekdays': {
      const display = toDisplayWeekdays(schedule.weekdays, schedule.at, zone);
      return {
        repeatType: BroadcastRepeatType.Weekdays,
        weekdays: toCorrectedWeekdays(display, copyFirstSendAt, zone),
      };
    }
    case 'everyNDays':
      return schedule.everyNDays
        ? { repeatType: BroadcastRepeatType.EveryNDays, everyNDays: schedule.everyNDays }
        : null;
    case 'dates':
      return {
        repeatType: BroadcastRepeatType.OnCertainDates,
        dates: schedule.dates.map((at) => new Date(at).toISOString()),
      };
  }
}

// ---------------------------------------------------------------------------
// The whole copy
// ---------------------------------------------------------------------------

/** What `duplicateCampaign` needs from the campaigns store — named so a test can hand it a double. */
export interface DuplicateStore {
  createDraft(name: string, kind: 'now' | 'scheduled'): Promise<string>;
  refetchFlow(flowId: string): Promise<CampaignFlow | null>;
}

export interface DuplicateResult {
  flowId: string;
  /** What did not make it onto the copy. The copy exists either way. */
  failures: string[];
}

export const copyName = (name: string): string => `${name.trim() || 'Campaign'} copy`;

/**
 * A new draft with the source replayed onto it. The setters run straight on
 * the client and the flow is re-read once at the end — every setter answers
 * only its block, and a draft the list does not hold yet has no flow for a
 * block to land in. Partial failure keeps the copy: the review step shows
 * what is missing, which is more honest than a copy that vanishes.
 */
export async function duplicateCampaign(
  store: DuplicateStore,
  client: ApiClient,
  source: CampaignRecord,
  zone: string,
  now: number,
): Promise<DuplicateResult> {
  const flowId = await store.createDraft(copyName(source.name), source.isOneTime ? 'now' : 'scheduled');
  const failures: string[] = [];
  const flow = await store.refetchFlow(flowId);
  const copy = flow ? campaignOf(flow, now) : null;
  if (!copy) return { flowId, failures: ['The copy was created but could not be read back.'] };

  if (source.payload?.template && copy.payload) {
    try {
      const replayed = await replayTemplate(client, copy.payload.elementId, source.payload.template);
      failures.push(...replayed.failures);
    } catch (err) {
      failures.push(errorMessage(err));
    }
  }

  const segment = segmentToInput(source.audience.segment, `broadcasts/${flowId}`);
  if (hasFilters(segment)) {
    try {
      if (copy.isOneTime)
        await client.mutate(BroadcastSetOneTimeSegmentDocument, { elementID: copy.settings.elementId, segment });
      else await client.mutate(BroadcastSetScheduledSegmentDocument, { elementID: copy.settings.elementId, segment });
    } catch (err) {
      failures.push(errorMessage(err));
    }
  }

  if (!copy.isOneTime && copy.schedule) {
    const repeat = recurrenceReplay(source.schedule, copy.schedule.at, zone);
    if (repeat) {
      const elementID = copy.settings.elementId;
      try {
        await client.mutate(BroadcastSetRepeatTypeDocument, { elementID, repeatType: repeat.repeatType });
        if (repeat.repeatType === BroadcastRepeatType.Weekdays)
          await client.mutate(BroadcastSetWeekdaysDocument, { elementID, weekdays: repeat.weekdays });
        else if (repeat.repeatType === BroadcastRepeatType.EveryNDays)
          await client.mutate(BroadcastSetEveryNDaysDocument, { elementID, everyNDays: repeat.everyNDays });
        else await client.mutate(BroadcastSetDatesDocument, { elementID, dates: repeat.dates });
      } catch (err) {
        failures.push(errorMessage(err));
      }
    }
  }

  await store.refetchFlow(flowId);
  return { flowId, failures };
}
