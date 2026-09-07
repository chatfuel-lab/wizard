/**
 * Record factories for tests: the smallest valid record, plus what a case
 * overrides. Shapes follow the generated fragments exactly, so a test that
 * passes here is a test over what the server would hand the module.
 */
import { BroadcastRepeatType, BroadcastStatus, WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import type {
  CampaignFlow,
  CatalogTemplate,
  OneTimeElement,
  ScheduledElement,
  TemplateConfig,
  TemplateElement,
} from '../types';

type Block = CampaignFlow['blocks'][number];
type SettingsBlockTypename = 'WhatsAppOneTimeNotificationBlock' | 'WhatsAppScheduledMessageBlock';

export function sampleSegment(over: Partial<ScheduledElement['segment']> = {}): ScheduledElement['segment'] {
  return {
    id: '9819f3d0-33d8-4dc9-a87b-4a979509a71b',
    name: null,
    resultOperator: 'AND' as ScheduledElement['segment']['resultOperator'],
    filters: [],
    ...over,
  };
}

export function sampleTemplate(over: Partial<CatalogTemplate> = {}): CatalogTemplate {
  return {
    id: '2133097977610853',
    name: 'spring_sale',
    status: WhatsAppTemplateStatus.Approved,
    language: 'English' as CatalogTemplate['language'],
    category: 'Marketing' as CatalogTemplate['category'],
    IsSupportedInFlowbuilder: true,
    header: {
      __typename: 'WhatsAppTemplateComponentText',
      text: [{ __typename: 'WhatsAppTemplateComponentTextPartText', text: 'Spring sale' }],
    },
    body: {
      text: [
        { __typename: 'WhatsAppTemplateComponentTextPartText', text: 'Hi ' },
        { __typename: 'WhatsAppTemplateComponentTextPartParam', name: '1', value: { parts: [] } },
        { __typename: 'WhatsAppTemplateComponentTextPartText', text: ', everything is 20% off this week.' },
      ],
    },
    footer: null,
    buttons: [
      {
        __typename: 'WhatsAppTemplateURLButton',
        id: 'btn-1',
        text: 'Shop now',
        url: [{ __typename: 'WhatsAppTemplateComponentTextPartText', text: 'https://example.com/sale' }],
      },
    ],
    ...over,
  };
}

/** The payload copy of `sampleTemplate`, with `{{1}}` filled unless overridden. */
export function sampleTemplateConfig(over: Partial<TemplateConfig> = {}): TemplateConfig {
  const catalog = sampleTemplate();
  return {
    templateID: catalog.id,
    name: catalog.name,
    status: catalog.status,
    header: catalog.header,
    body: {
      text: [
        { __typename: 'WhatsAppTemplateComponentTextPartText', text: 'Hi ' },
        {
          __typename: 'WhatsAppTemplateComponentTextPartParam',
          name: '1',
          value: { parts: [{ __typename: 'TemplateStrText', text: 'there', errCode: '' }] },
        },
        { __typename: 'WhatsAppTemplateComponentTextPartText', text: ', everything is 20% off this week.' },
      ],
    },
    footer: null,
    buttons: catalog.buttons,
    ...over,
  };
}

export function sampleTemplateElement(over: Partial<TemplateElement> = {}): TemplateElement {
  return {
    __typename: 'WhatsAppTemplateBlockElement',
    id: 'el-template',
    errors: [],
    waitForReplies: false,
    saveContactReply: false,
    whatsAppTemplate: sampleTemplateConfig(),
    ...over,
  };
}

export function sampleOneTimeElement(over: Partial<OneTimeElement> = {}): OneTimeElement {
  return {
    __typename: 'WhatsAppOneTimeNotificationBlockElement',
    id: 'el-otn',
    errors: [],
    status: BroadcastStatus.Draft,
    sentToContactsCount: null,
    segment: sampleSegment(),
    segmentErrors: [],
    ...over,
  };
}

export function sampleScheduledElement(over: Partial<ScheduledElement> = {}): ScheduledElement {
  return {
    __typename: 'WhatsAppScheduledMessageBlockElement',
    id: 'el-sched',
    errors: [],
    status: BroadcastStatus.Draft,
    firstSendTime: '2030-01-06T07:00:00Z',
    repeatType: BroadcastRepeatType.Never,
    repeatOnWeekdays: [],
    repeatEveryNDays: null,
    repeatOnCertainDates: [],
    segment: sampleSegment(),
    segmentErrors: [],
    ...over,
  };
}

export interface SampleFlowOptions {
  id?: string;
  name?: string;
  createdAt?: string;
  kind?: 'now' | 'scheduled';
  enabled?: boolean;
  settings?: Partial<OneTimeElement> | Partial<ScheduledElement>;
  template?: Partial<TemplateElement> | null;
  /** Leave the template block out altogether. */
  withoutPayload?: boolean;
}

/** A flow the pair mutation would have created: entry point → template block. */
export function sampleFlow(options: SampleFlowOptions = {}): CampaignFlow {
  const kind = options.kind ?? 'scheduled';
  const typename: SettingsBlockTypename =
    kind === 'now' ? 'WhatsAppOneTimeNotificationBlock' : 'WhatsAppScheduledMessageBlock';
  const element =
    kind === 'now'
      ? sampleOneTimeElement(options.settings as Partial<OneTimeElement>)
      : sampleScheduledElement(options.settings as Partial<ScheduledElement>);
  const settingsBlock = {
    __typename: typename,
    id: 'blk-settings',
    name: kind === 'now' ? 'One-time notification' : 'Scheduled message',
    isEntryPointEnabled: options.enabled ?? kind === 'now',
    blockElements: [element],
  } as Block;
  const payloadBlock: Block = {
    __typename: 'WhatsAppTemplateBlock',
    id: 'blk-template',
    name: 'Template',
    blockElements: [sampleTemplateElement(options.template ?? {})],
  };
  return {
    __typename: 'RegularFlow',
    id: options.id ?? 'flow-1',
    name: options.name ?? 'Spring sale',
    platform: 'whatsapp' as CampaignFlow['platform'],
    createdAt: options.createdAt ?? '2026-09-07T07:04:39.327Z',
    entryPoints: [{ __typename: typename, id: 'blk-settings', isEntryPointEnabled: options.enabled ?? kind === 'now' }],
    blocks: options.withoutPayload ? [settingsBlock] : [settingsBlock, payloadBlock],
    connections: options.withoutPayload
      ? []
      : [
          {
            __typename: 'ComponentToBlockConnection',
            id: 'blk-settings.el.handle',
            sourceBlockID: 'blk-settings',
            sourceBlockElementID: element.id,
            sourceHandleID: 'handle-1',
            targetBlockID: 'blk-template',
          },
        ],
  };
}
