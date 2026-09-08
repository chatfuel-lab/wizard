/**
 * A flow → a campaign row.
 *
 * There is no campaign on the server. What there is: a flow whose entry point
 * is a one-time notification (send now) or a scheduled message (later, or on
 * a repeat), connected to a template block that carries the message. This
 * file reads that shape once, and everything on screen reads the record it
 * produces. A flow with no such entry point is somebody's chatbot flow, and
 * `campaignOf` answers null for it.
 *
 * Status, from what the live API actually does: a one-time element goes
 * Draft → Live (the moment `whatsAppOneTimeNotificationSend` answers) →
 * Finished (seconds later). A scheduled element goes Draft → Live when its
 * entry point is enabled and back to DRAFT when it is disabled — there is no
 * paused state to show, so a campaign taken off the schedule is a draft
 * again. `Finished` is the one-shot's end; a repeating campaign never
 * reaches it.
 */
import { BroadcastStatus } from '~api/generated/broadcasts/graphql';
import type {
  CampaignBlock,
  CampaignElement,
  CampaignFlow,
  OneTimeElement,
  ScheduledElement,
  TemplateConfig,
  TemplateElement,
} from '../types';
import { decodeSchedule, nextRun, type CampaignSchedule } from './schedule';

export type CampaignKind = 'now' | 'later' | 'recurring';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent';

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = ['draft', 'scheduled', 'sending', 'sent'];

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
};

export const KIND_LABELS: Record<CampaignKind, string> = {
  now: 'Now',
  later: 'Later',
  recurring: 'Repeating',
};

/** One verdict on the campaign, with the parameter it names when it names one. */
export interface CampaignProblem {
  code: string;
  paramName: string | null;
  buttonId: string | null;
}

export interface CampaignRecord {
  flowId: string;
  name: string;
  createdAt: number;
  kind: CampaignKind;
  status: CampaignStatus;
  settings: {
    blockId: string;
    elementId: string;
    /** Which entry point this is — the only thing the API needs to know back. */
    typename: 'WhatsAppOneTimeNotificationBlockElement' | 'WhatsAppScheduledMessageBlockElement';
    enabled: boolean;
    serverStatus: BroadcastStatus;
  };
  /** The template block, or null when the flow lost it. */
  payload: {
    blockId: string;
    elementId: string;
    template: TemplateConfig | null;
  } | null;
  /** Null for a one-time campaign. */
  schedule: CampaignSchedule | null;
  audience: {
    segment: OneTimeElement['segment'] | ScheduledElement['segment'];
    /** `FilterErrCode`s the server put on the segment. */
    errors: string[];
  };
  /** Every verdict that stands against going live, entry point and message together. */
  problems: CampaignProblem[];
  /** How many contacts the one-time send was launched for. Null until Finished, and sometimes after. */
  sentToContactsCount: number | null;
  /** The next instant it goes out, or null when it will not. */
  nextRunAt: number | null;
  /** When the one-time send happened — the launch is not stamped, so the last read is the best there is. */
  isOneTime: boolean;
}

type SettingsElement = OneTimeElement | ScheduledElement;

const isSettingsElement = (element: CampaignElement): element is SettingsElement =>
  element.__typename === 'WhatsAppOneTimeNotificationBlockElement' ||
  element.__typename === 'WhatsAppScheduledMessageBlockElement';

const isTemplateElement = (element: CampaignElement): element is TemplateElement =>
  element.__typename === 'WhatsAppTemplateBlockElement';

/** The entry point that makes this flow a campaign, or null. */
export function findSettingsBlock(flow: CampaignFlow): { block: CampaignBlock; element: SettingsElement } | null {
  for (const block of flow.blocks) {
    if (block.__typename !== 'WhatsAppOneTimeNotificationBlock' && block.__typename !== 'WhatsAppScheduledMessageBlock')
      continue;
    const element = block.blockElements.find(isSettingsElement);
    if (element) return { block, element };
  }
  return null;
}

/**
 * The template block the entry point is connected to — by the connection
 * first, and failing that the first template block in the flow, which is what
 * a flow the pair mutation created has.
 */
export function findPayloadBlock(
  flow: CampaignFlow,
  settingsBlockId: string,
): { block: CampaignBlock; element: TemplateElement } | null {
  const targets = new Set<string>();
  for (const connection of flow.connections) {
    if (connection.sourceBlockID === settingsBlockId) targets.add(connection.targetBlockID);
  }
  const candidates = flow.blocks.filter((block) => block.__typename === 'WhatsAppTemplateBlock');
  const block = candidates.find((candidate) => targets.has(candidate.id)) ?? candidates[0];
  if (!block) return null;
  const element = block.blockElements.find(isTemplateElement);
  return element ? { block, element } : null;
}

export const isCampaignFlow = (flow: CampaignFlow): boolean => findSettingsBlock(flow) !== null;

function statusOf(
  element: SettingsElement,
  enabled: boolean,
  schedule: CampaignSchedule | null,
  now: number,
): CampaignStatus {
  if (element.__typename === 'WhatsAppOneTimeNotificationBlockElement') {
    switch (element.status) {
      case BroadcastStatus.Live:
        return 'sending';
      case BroadcastStatus.Finished:
        return 'sent';
      case BroadcastStatus.Draft:
      case BroadcastStatus.Paused:
        return 'draft';
    }
  }
  if (element.status === BroadcastStatus.Finished) return 'sent';
  if (!enabled) return 'draft';
  // Armed. A one-shot whose time has come is on its way out; the status flips
  // to Finished on the next read.
  if (schedule && schedule.repeat === 'once' && schedule.at <= now) return 'sending';
  return 'scheduled';
}

function problemsOf(settings: SettingsElement, payload: TemplateElement | null): CampaignProblem[] {
  const out: CampaignProblem[] = [];
  const push = (errors: readonly CampaignElement['errors'][number][]) => {
    for (const error of errors) {
      out.push({
        code: error.code,
        paramName: 'paramName' in error ? error.paramName : null,
        buttonId: 'buttonID' in error ? error.buttonID : null,
      });
    }
  };
  push(settings.errors);
  if (payload) push(payload.errors);
  else out.push({ code: 'no_payload', paramName: null, buttonId: null });
  if (payload?.whatsAppTemplate && payload.whatsAppTemplate.status !== 'Approved') {
    if (!out.some((problem) => problem.code === 'TemplateNotAllowedForProcessing'))
      out.push({ code: 'TemplateNotAllowedForProcessing', paramName: null, buttonId: null });
  }
  return out;
}

/** The campaign a flow is, or null when the flow is not one. */
export function campaignOf(flow: CampaignFlow, now: number): CampaignRecord | null {
  const settings = findSettingsBlock(flow);
  if (!settings) return null;
  const payload = findPayloadBlock(flow, settings.block.id);
  const element = settings.element;
  const isOneTime = element.__typename === 'WhatsAppOneTimeNotificationBlockElement';
  const enabled = 'isEntryPointEnabled' in settings.block ? Boolean(settings.block.isEntryPointEnabled) : false;
  const schedule = isOneTime ? null : decodeSchedule(element as ScheduledElement);
  const kind: CampaignKind = isOneTime ? 'now' : schedule && schedule.repeat !== 'once' ? 'recurring' : 'later';
  const status = statusOf(element, enabled, schedule, now);
  const createdAt = Date.parse(flow.createdAt);
  return {
    flowId: flow.id,
    name: flow.name,
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    kind,
    status,
    settings: {
      blockId: settings.block.id,
      elementId: element.id,
      typename: element.__typename,
      enabled,
      serverStatus: element.status,
    },
    payload: payload
      ? { blockId: payload.block.id, elementId: payload.element.id, template: payload.element.whatsAppTemplate ?? null }
      : null,
    schedule,
    audience: { segment: element.segment, errors: element.segmentErrors.map((error) => error.code) },
    problems: problemsOf(element, payload?.element ?? null),
    sentToContactsCount: isOneTime ? ((element as OneTimeElement).sentToContactsCount ?? null) : null,
    nextRunAt: schedule && status === 'scheduled' ? nextRun(schedule, now) : null,
    isOneTime,
  };
}

/** Newest first — the order a campaign list reads in. */
export function sortCampaigns(records: readonly CampaignRecord[]): CampaignRecord[] {
  return [...records].sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));
}

/** The template's name, which is what a row is about when the campaign has no name of its own yet. */
export const templateNameOf = (record: CampaignRecord): string | null => record.payload?.template?.name ?? null;

export const canGoLive = (record: CampaignRecord): boolean =>
  record.problems.length === 0 && record.audience.errors.length === 0 && record.payload?.template !== null;
