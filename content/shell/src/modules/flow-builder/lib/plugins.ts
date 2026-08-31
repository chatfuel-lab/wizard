/**
 * The "Add element" catalog: every stackable plugin family with an
 * Add<Family>ToBlock mutation (<family>CreateInBlock in the schema — blockID
 * only, returns the enclosing BlockParts for the applyBlock reconcile).
 *
 * Platform gating mirrors the server's: platform-specific plugins stack only
 * into blocks of the same platform; platform-neutral action plugins (send
 * JSON, condition, contact-property ops, summarize chat) stack anywhere. An
 * unknown/foreign platform (e.g. `facebook`, which has no flow-builder
 * blocks of its own) offers the neutral set only — never crash, never guess.
 */
import type { TypedDoc } from '~api';
import {
  AddClearContactPropertyToBlockDocument,
  AddInstagramSwitchToHumanToBlockDocument,
  AddSendJsonToBlockDocument,
  AddSetConditionToBlockDocument,
  AddSetContactPropertyToBlockDocument,
  AddSummarizeChatToBlockDocument,
  AddTikTokSwitchToHumanToBlockDocument,
  AddWhatsAppAudioToBlockDocument,
  AddWhatsAppDocumentToBlockDocument,
  AddWhatsAppImageToBlockDocument,
  AddWhatsAppSwitchToHumanToBlockDocument,
  AddWhatsAppTextToBlockDocument,
  AddWhatsAppVideoToBlockDocument,
  AddWidgetImageToBlockDocument,
  AddWidgetSwitchToHumanToBlockDocument,
  AddWidgetTextAndButtonsToBlockDocument,
} from '~api/generated/flow-builder/graphql';
import type { BlockT } from '../types';
import { findNewId } from './pickBlock';

/** null = platform-neutral: offered on every block regardless of platform. */
export type PluginPlatform = 'widget' | 'whatsapp' | 'instagram' | 'tiktok' | null;

/**
 * Every Add*ToBlock document erased to the common shape: one root field
 * carrying the enclosing block. `pickCreatedBlock` recovers the block without
 * knowing the per-family field name.
 */
export type AddElementDocument = TypedDoc<Record<string, unknown>, { blockID: string }>;

export interface PluginDef {
  /** Stable key — the schema's mutation-family prefix. */
  key: string;
  /** Menu label (matches the element labels in elementSummary.ts). */
  label: string;
  /** The Add<Family>ToBlock mutation document. */
  document: AddElementDocument;
  platform: PluginPlatform;
}

export const PLUGIN_CATALOG: readonly PluginDef[] = [
  // --- Widget content ---
  {
    key: 'widgetTextAndButtons',
    label: 'Widget text + buttons',
    document: AddWidgetTextAndButtonsToBlockDocument,
    platform: 'widget',
  },
  { key: 'widgetImage', label: 'Widget image', document: AddWidgetImageToBlockDocument, platform: 'widget' },
  // --- WhatsApp content ---
  { key: 'whatsAppText', label: 'WhatsApp text', document: AddWhatsAppTextToBlockDocument, platform: 'whatsapp' },
  { key: 'whatsAppImage', label: 'WhatsApp image', document: AddWhatsAppImageToBlockDocument, platform: 'whatsapp' },
  { key: 'whatsAppVideo', label: 'WhatsApp video', document: AddWhatsAppVideoToBlockDocument, platform: 'whatsapp' },
  { key: 'whatsAppAudio', label: 'WhatsApp audio', document: AddWhatsAppAudioToBlockDocument, platform: 'whatsapp' },
  {
    key: 'whatsAppDocument',
    label: 'WhatsApp document',
    document: AddWhatsAppDocumentToBlockDocument,
    platform: 'whatsapp',
  },
  // --- Platform-neutral actions ---
  { key: 'setCondition', label: 'Condition', document: AddSetConditionToBlockDocument, platform: null },
  {
    key: 'setContactProperty',
    label: 'Set contact property',
    document: AddSetContactPropertyToBlockDocument,
    platform: null,
  },
  {
    key: 'clearContactProperty',
    label: 'Clear contact property',
    document: AddClearContactPropertyToBlockDocument,
    platform: null,
  },
  { key: 'sendJson', label: 'Send JSON', document: AddSendJsonToBlockDocument, platform: null },
  { key: 'summarizeChat', label: 'Summarize chat', document: AddSummarizeChatToBlockDocument, platform: null },
  // --- Switch to human agent (one family per platform) ---
  {
    key: 'widgetSwitchToHuman',
    label: 'Human agent (widget)',
    document: AddWidgetSwitchToHumanToBlockDocument,
    platform: 'widget',
  },
  {
    key: 'whatsAppSwitchToHuman',
    label: 'Human agent (WhatsApp)',
    document: AddWhatsAppSwitchToHumanToBlockDocument,
    platform: 'whatsapp',
  },
  {
    key: 'instagramSwitchToHuman',
    label: 'Human agent (Instagram)',
    document: AddInstagramSwitchToHumanToBlockDocument,
    platform: 'instagram',
  },
  {
    key: 'tiktokSwitchToHuman',
    label: 'Human agent (TikTok)',
    document: AddTikTokSwitchToHumanToBlockDocument,
    platform: 'tiktok',
  },
];

/** Plugins offerable on this block: its platform's families + the neutral set. */
export function pluginsForBlock(block: Pick<BlockT, 'platform'>): PluginDef[] {
  const platform = String(block.platform);
  return PLUGIN_CATALOG.filter((plugin) => plugin.platform === null || plugin.platform === platform);
}

/**
 * The enclosing block out of an Add*ToBlock response — exactly `pickBlock`'s
 * erasure, re-exported under this catalog's name for its callers.
 */
export { pickBlock as pickCreatedBlock } from './pickBlock';

/** The freshly created element: present after the mutation, absent before. */
export function findNewElementId(
  before: Pick<BlockT, 'blockElements'>,
  after: Pick<BlockT, 'blockElements'>,
): string | null {
  return findNewId(before.blockElements, after.blockElements);
}
