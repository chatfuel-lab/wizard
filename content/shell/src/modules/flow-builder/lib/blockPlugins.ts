/**
 * The "Add block" catalog: every plugin family with a
 * Create<Family>Block mutation (<family>CreateWithBlock in the schema —
 * flowID + positionX/positionY). There is NO createBlock — blocks are born
 * through these per-family mutations (guide.md "Creating things").
 *
 * Response contract: most ops select the deliberately SLIM FlowBlocksSlim
 * fragment (id + block ids/names/positions) — 26 whole-FlowParts result types
 * would each inline the 30-variant element union and blow up generated-type
 * size (and tsc memory). Callers diff the new block id out of the slim
 * response and REFETCH FlowStructure for elements/connections/errors. The
 * four ops that predate this contract (whatsAppText, widgetTextAndButtons,
 * widgetEP, aiAgent — the seed recipe depends on them) still return full
 * FlowParts, a superset of the slim shape, so the same diff works.
 *
 * Platform gating is client-side and mirrors lib/plugins.ts: platform-specific
 * families are offered only on flows of that platform; platform-neutral action
 * families (condition, contact-property ops, send JSON, summarize chat,
 * redirect) are offered everywhere. An unknown/foreign platform (e.g.
 * `facebook`, which has no flow-builder blocks of its own) gets the neutral
 * set only — never crash, never guess.
 *
 * aiAgent is the ONE family with an extra creation arg
 * (templateID: AiAgentTemplateID!, catalog via aiAgentTemplates(locale)) —
 * flagged `needsTemplate` so the menu can run its two-step pick.
 */
import type { TypedDoc } from '~api';
import {
  CreateAiAgentBlockConnectedDocument,
  CreateAiAgentBlockDocument,
  CreateClearContactPropertyBlockConnectedDocument,
  CreateClearContactPropertyBlockDocument,
  CreateInstagramSwitchToHumanBlockConnectedDocument,
  CreateInstagramSwitchToHumanBlockDocument,
  CreateRedirectToFlowBlockConnectedDocument,
  CreateRedirectToFlowBlockDocument,
  CreateSendJsonBlockConnectedDocument,
  CreateSendJsonBlockDocument,
  CreateSetConditionBlockConnectedDocument,
  CreateSetConditionBlockDocument,
  CreateSetContactPropertyBlockConnectedDocument,
  CreateSetContactPropertyBlockDocument,
  CreateSummarizeChatBlockConnectedDocument,
  CreateSummarizeChatBlockDocument,
  CreateTikTokSwitchToHumanBlockConnectedDocument,
  CreateTikTokSwitchToHumanBlockDocument,
  CreateTriggeredMessageBlockDocument,
  CreateWhatsAppAudioBlockConnectedDocument,
  CreateWhatsAppAudioBlockDocument,
  CreateWhatsAppDocumentBlockConnectedDocument,
  CreateWhatsAppDocumentBlockDocument,
  CreateWhatsAppImageBlockConnectedDocument,
  CreateWhatsAppImageBlockDocument,
  CreateWhatsAppListBlockConnectedDocument,
  CreateWhatsAppListBlockDocument,
  CreateWhatsAppOneTimeNotificationBlockDocument,
  CreateWhatsAppScheduledMessageBlockDocument,
  CreateWhatsAppSwitchToHumanBlockConnectedDocument,
  CreateWhatsAppSwitchToHumanBlockDocument,
  CreateWhatsAppTemplateBlockConnectedDocument,
  CreateWhatsAppTemplateBlockDocument,
  CreateWhatsAppTextAndButtonsBlockConnectedDocument,
  CreateWhatsAppTextAndButtonsBlockDocument,
  CreateWhatsAppTextAndUrlBlockConnectedDocument,
  CreateWhatsAppTextAndUrlBlockDocument,
  CreateWhatsAppTextBlockConnectedDocument,
  CreateWhatsAppTextBlockDocument,
  CreateWhatsAppVideoBlockConnectedDocument,
  CreateWhatsAppVideoBlockDocument,
  CreateWidgetEntryPointDocument,
  CreateWidgetImageBlockConnectedDocument,
  CreateWidgetImageBlockDocument,
  CreateWidgetSwitchToHumanBlockConnectedDocument,
  CreateWidgetSwitchToHumanBlockDocument,
  CreateWidgetTextAndButtonsBlockConnectedDocument,
  CreateWidgetTextAndButtonsBlockDocument,
  type AiAgentTemplateId,
  type UndefinedTargetBlockConnectionCreateRequest,
} from '~api/generated/flow-builder/graphql';
import type { FlowT } from '../types';
import { NUDGE_PX } from './graph';
import { findNewId } from './pickBlock';
import type { PluginPlatform } from './plugins';

/** Shared variable shape of every plain Create*Block mutation. */
export interface CreateBlockVars {
  flowID: string;
  x: number;
  y: number;
}

/**
 * Every plain Create*Block document erased to the common shape: one root field
 * carrying the whole Flow. `pickCreatedFlow` recovers it without knowing the
 * per-family field name.
 */
export type CreateBlockDocument = TypedDoc<Record<string, unknown>, CreateBlockVars>;

/** The aiAgent variant keeps its extra templateID arg fully typed. */
export type CreateBlockWithTemplateDocument = TypedDoc<
  Record<string, unknown>,
  CreateBlockVars & { templateID: AiAgentTemplateId }
>;

/** The dangling-edge request every connected-create variant takes. */
export type ConnectedCreateRequest = UndefinedTargetBlockConnectionCreateRequest;

/** Create-and-connect: same shape plus the dangling-edge request. */
export type CreateConnectedBlockDocument = TypedDoc<
  Record<string, unknown>,
  CreateBlockVars & { request: ConnectedCreateRequest }
>;

export type CreateConnectedBlockWithTemplateDocument = TypedDoc<
  Record<string, unknown>,
  CreateBlockVars & { request: ConnectedCreateRequest; templateID: AiAgentTemplateId }
>;

interface BlockPluginBase {
  /** Stable key — the schema's mutation-family prefix. */
  key: string;
  /** Menu label (matches the block/element labels in elementSummary.ts). */
  label: string;
  platform: PluginPlatform;
  /** Entry-point family: the block is born with its entry point disabled. */
  entryPoint?: boolean;
}

export type BlockPluginDef =
  | (BlockPluginBase & {
      needsTemplate?: false;
      document: CreateBlockDocument;
      /**
       * <family>CreateWithBlockAndConnection — absent only on the entry-point
       * families, which cannot be edge targets.
       */
      connectedDocument?: CreateConnectedBlockDocument;
    })
  | (BlockPluginBase & {
      needsTemplate: true;
      document: CreateBlockWithTemplateDocument;
      connectedDocument?: CreateConnectedBlockWithTemplateDocument;
    });

export const BLOCK_PLUGIN_CATALOG: readonly BlockPluginDef[] = [
  // --- Widget ---
  {
    key: 'widgetTextAndButtons',
    label: 'Widget text + buttons',
    document: CreateWidgetTextAndButtonsBlockDocument,
    connectedDocument: CreateWidgetTextAndButtonsBlockConnectedDocument,
    platform: 'widget',
  },
  {
    key: 'widgetImage',
    label: 'Widget image',
    document: CreateWidgetImageBlockDocument,
    connectedDocument: CreateWidgetImageBlockConnectedDocument,
    platform: 'widget',
  },
  {
    key: 'widgetSwitchToHuman',
    label: 'Human agent (widget)',
    document: CreateWidgetSwitchToHumanBlockDocument,
    connectedDocument: CreateWidgetSwitchToHumanBlockConnectedDocument,
    platform: 'widget',
  },
  {
    key: 'widgetEntryPoint',
    label: 'Widget entry point',
    document: CreateWidgetEntryPointDocument,
    platform: 'widget',
    entryPoint: true,
  },
  // --- WhatsApp content ---
  {
    key: 'whatsAppText',
    label: 'WhatsApp text',
    document: CreateWhatsAppTextBlockDocument,
    connectedDocument: CreateWhatsAppTextBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppImage',
    label: 'WhatsApp image',
    document: CreateWhatsAppImageBlockDocument,
    connectedDocument: CreateWhatsAppImageBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppVideo',
    label: 'WhatsApp video',
    document: CreateWhatsAppVideoBlockDocument,
    connectedDocument: CreateWhatsAppVideoBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppAudio',
    label: 'WhatsApp audio',
    document: CreateWhatsAppAudioBlockDocument,
    connectedDocument: CreateWhatsAppAudioBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppDocument',
    label: 'WhatsApp document',
    document: CreateWhatsAppDocumentBlockDocument,
    connectedDocument: CreateWhatsAppDocumentBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppTextAndButtons',
    label: 'WhatsApp text + buttons',
    document: CreateWhatsAppTextAndButtonsBlockDocument,
    connectedDocument: CreateWhatsAppTextAndButtonsBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppTextAndURL',
    label: 'WhatsApp text + URL',
    document: CreateWhatsAppTextAndUrlBlockDocument,
    connectedDocument: CreateWhatsAppTextAndUrlBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppList',
    label: 'WhatsApp list',
    document: CreateWhatsAppListBlockDocument,
    connectedDocument: CreateWhatsAppListBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppTemplate',
    label: 'WhatsApp template',
    document: CreateWhatsAppTemplateBlockDocument,
    connectedDocument: CreateWhatsAppTemplateBlockConnectedDocument,
    platform: 'whatsapp',
  },
  {
    key: 'whatsAppSwitchToHuman',
    label: 'Human agent (WhatsApp)',
    document: CreateWhatsAppSwitchToHumanBlockDocument,
    connectedDocument: CreateWhatsAppSwitchToHumanBlockConnectedDocument,
    platform: 'whatsapp',
  },
  // --- WhatsApp chat-trigger entry points (born disabled; guide.md) ---
  {
    key: 'triggeredMessage',
    label: 'Triggered message (entry point)',
    document: CreateTriggeredMessageBlockDocument,
    platform: 'whatsapp',
    entryPoint: true,
  },
  {
    key: 'whatsAppOneTimeNotification',
    label: 'One-time broadcast (entry point)',
    document: CreateWhatsAppOneTimeNotificationBlockDocument,
    platform: 'whatsapp',
    entryPoint: true,
  },
  {
    key: 'whatsAppScheduledMessage',
    label: 'Scheduled message (entry point)',
    document: CreateWhatsAppScheduledMessageBlockDocument,
    platform: 'whatsapp',
    entryPoint: true,
  },
  // --- Instagram / TikTok ---
  {
    key: 'instagramSwitchToHuman',
    label: 'Human agent (Instagram)',
    document: CreateInstagramSwitchToHumanBlockDocument,
    connectedDocument: CreateInstagramSwitchToHumanBlockConnectedDocument,
    platform: 'instagram',
  },
  {
    key: 'tiktokSwitchToHuman',
    label: 'Human agent (TikTok)',
    document: CreateTikTokSwitchToHumanBlockDocument,
    connectedDocument: CreateTikTokSwitchToHumanBlockConnectedDocument,
    platform: 'tiktok',
  },
  // --- Platform-neutral actions ---
  {
    key: 'setCondition',
    label: 'Condition',
    document: CreateSetConditionBlockDocument,
    connectedDocument: CreateSetConditionBlockConnectedDocument,
    platform: null,
  },
  {
    key: 'setContactProperty',
    label: 'Set contact property',
    document: CreateSetContactPropertyBlockDocument,
    connectedDocument: CreateSetContactPropertyBlockConnectedDocument,
    platform: null,
  },
  {
    key: 'clearContactProperty',
    label: 'Clear contact property',
    document: CreateClearContactPropertyBlockDocument,
    connectedDocument: CreateClearContactPropertyBlockConnectedDocument,
    platform: null,
  },
  {
    key: 'sendJson',
    label: 'Send JSON',
    document: CreateSendJsonBlockDocument,
    connectedDocument: CreateSendJsonBlockConnectedDocument,
    platform: null,
  },
  {
    key: 'summarizeChat',
    label: 'Summarize chat',
    document: CreateSummarizeChatBlockDocument,
    connectedDocument: CreateSummarizeChatBlockConnectedDocument,
    platform: null,
  },
  {
    key: 'redirectToFlow',
    label: 'Redirect to flow',
    document: CreateRedirectToFlowBlockDocument,
    connectedDocument: CreateRedirectToFlowBlockConnectedDocument,
    platform: null,
  },
  // --- AI agent (neutral: the schema gives no platform signal to gate on) ---
  {
    key: 'aiAgent',
    label: 'AI agent',
    document: CreateAiAgentBlockDocument,
    connectedDocument: CreateAiAgentBlockConnectedDocument,
    platform: null,
    needsTemplate: true,
  },
];

/** Block families offerable on this flow: its platform's + the neutral set. */
export function blockPluginsForFlow(flow: Pick<FlowT, 'platform'>): BlockPluginDef[] {
  const platform = String(flow.platform);
  return BLOCK_PLUGIN_CATALOG.filter((plugin) => plugin.platform === null || plugin.platform === platform);
}

/**
 * What every Create*Block response carries — the slim diff surface
 * (FlowBlocksSlim). The four legacy FlowParts-returning ops are a structural
 * superset, so this shape covers both.
 */
export interface CreatedFlowSlim {
  id: string;
  blocks: ReadonlyArray<{ id: string }>;
}

/**
 * The created-flow payload out of a Create*Block response without knowing the
 * family-specific root field name — the single value that carries a
 * blocks list. Undefined when no value in the payload carries one.
 */
export function pickCreatedFlow(data: Record<string, unknown>): CreatedFlowSlim | undefined {
  for (const value of Object.values(data)) {
    if (value !== null && typeof value === 'object' && Array.isArray((value as { blocks?: unknown }).blocks)) {
      return value as CreatedFlowSlim;
    }
  }
  return undefined;
}

/** The freshly created block: present after the mutation, absent before. */
export function findNewBlockId(
  before: Pick<CreatedFlowSlim, 'blocks'>,
  after: Pick<CreatedFlowSlim, 'blocks'>,
): string | null {
  return findNewId(before.blocks, after.blocks);
}

/** A candidate spot is "taken" while an existing block sits this close (px). */
const MIN_GAP_PX = 40;

/**
 * Where to drop a new block: round the requested (float) coordinates to the
 * server's Int grid, then — like lib/graph.ts's render nudge — walk
 * deterministically down the diagonal until no existing block sits within
 * MIN_GAP_PX, so freshly created blocks never stack invisibly.
 */
export function placeNewBlock(
  blocks: readonly Pick<FlowT['blocks'][number], 'positionX' | 'positionY'>[],
  x: number,
  y: number,
): { x: number; y: number } {
  let candidateX = Math.round(x);
  let candidateY = Math.round(y);
  const taken = () =>
    blocks.some(
      (b) => Math.abs(b.positionX - candidateX) <= MIN_GAP_PX && Math.abs(b.positionY - candidateY) <= MIN_GAP_PX,
    );
  // Each existing block can veto only a short diagonal run (the 28px step
  // clears its 40px square within 3 hops), so this bound both suffices and
  // guarantees termination.
  for (let step = 0; step < blocks.length * 3 && taken(); step += 1) {
    candidateX += NUDGE_PX;
    candidateY += NUDGE_PX;
  }
  return { x: candidateX, y: candidateY };
}

/** `BlockNode` is `w-64`; the card's header line sits about this far down. */
const CARD_WIDTH_PX = 256;
const CARD_HEADER_PX = 20;

/**
 * Where a block's ORIGIN goes so that the block lands under the pointer.
 *
 * A position is the card's top-left, and a card whose top-left is at the
 * pointer hangs down and to the right of it — which reads as "it landed next
 * to where I let go", every time. Centred horizontally with the title line
 * under the pointer, it reads as "it landed here". Applied before
 * `placeNewBlock`, which then nudges off anything already there.
 */
export function blockOriginUnderPointer(point: { x: number; y: number }): { x: number; y: number } {
  return { x: point.x - CARD_WIDTH_PX / 2, y: point.y - CARD_HEADER_PX };
}
