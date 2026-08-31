import { blockPluginsForFlow, type BlockPluginDef } from './blockPlugins';
import { pluginVisual, type GlyphId } from './blockVisuals';
import type { PluginPlatform } from './plugins';
import type { FlowT } from '../types';

/**
 * What the block palette shows for a flow, as data.
 *
 * `blockPlugins.ts` already decides WHICH families a flow may host; this file
 * decides how they read in a searchable list — the grouping, the search words,
 * the note on the entry points — and it is pure so "a WhatsApp flow's palette
 * has a WhatsApp group, then Actions, then AI, and the entry points say so" is
 * a test rather than a screenshot.
 *
 * Grouping is by role, not by platform: a flow has one platform, so a
 * per-platform group would be one group with everything in it and a heading
 * that says what the page header already says. The platform's own families
 * come first because they are the ones the flow is FOR; the neutral actions
 * follow; the AI agent sits alone at the end because it is the one entry that
 * opens a second question (which template) rather than landing at once.
 */
export interface PaletteEntry {
  /** The plugin key — what `blockPluginsForFlow` returns and `usePlaceBlock` takes. */
  id: string;
  label: string;
  group: string;
  glyph: GlyphId;
  keywords: readonly string[];
  note?: string;
}

const PLATFORM_GROUP: Record<Exclude<PluginPlatform, null>, string> = {
  widget: 'Widget',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

/**
 * Words the label does not say but a hand typing might. `wa` for WhatsApp,
 * because it is what people type; the platform name itself, so "widget" narrows
 * to the widget group; and a few synonyms the schema's names do not use.
 */
const KEYWORDS: Record<string, readonly string[]> = {
  widgetTextAndButtons: ['message', 'reply', 'quick replies'],
  widgetImage: ['picture', 'photo', 'media'],
  widgetSwitchToHuman: ['operator', 'live chat', 'agent', 'handoff'],
  widgetEntryPoint: ['start', 'trigger', 'site chat'],
  whatsAppText: ['wa', 'message'],
  whatsAppImage: ['wa', 'picture', 'photo', 'media'],
  whatsAppVideo: ['wa', 'media', 'clip'],
  whatsAppAudio: ['wa', 'voice', 'media', 'sound'],
  whatsAppDocument: ['wa', 'file', 'pdf', 'attachment'],
  whatsAppTextAndButtons: ['wa', 'buttons', 'reply', 'quick replies'],
  whatsAppTextAndURL: ['wa', 'link', 'cta', 'website'],
  whatsAppList: ['wa', 'menu', 'options', 'rows'],
  whatsAppTemplate: ['wa', 'hsm', 'approved', 'marketing'],
  whatsAppSwitchToHuman: ['wa', 'operator', 'live chat', 'agent', 'handoff'],
  triggeredMessage: ['wa', 'start', 'trigger', 'chat trigger', 'attribute'],
  whatsAppOneTimeNotification: ['wa', 'start', 'trigger', 'broadcast', 'otn'],
  whatsAppScheduledMessage: ['wa', 'start', 'trigger', 'schedule', 'later', 'delay'],
  instagramSwitchToHuman: ['ig', 'operator', 'live chat', 'agent', 'handoff'],
  tiktokSwitchToHuman: ['operator', 'live chat', 'agent', 'handoff'],
  setCondition: ['if', 'branch', 'filter', 'logic', 'segment'],
  setContactProperty: ['attribute', 'variable', 'save', 'field'],
  clearContactProperty: ['attribute', 'variable', 'unset', 'remove', 'field'],
  sendJson: ['webhook', 'http', 'api', 'request', 'post'],
  summarizeChat: ['ai', 'summary', 'recap', 'transcript'],
  redirectToFlow: ['go to', 'jump', 'another flow', 'link'],
  aiAgent: ['assistant', 'gpt', 'llm', 'bot', 'template'],
};

function groupOf(plugin: BlockPluginDef): string {
  if (plugin.platform !== null) return PLATFORM_GROUP[plugin.platform];
  return plugin.needsTemplate ? 'AI' : 'Actions';
}

const GROUP_ORDER = ['Widget', 'WhatsApp', 'Instagram', 'TikTok', 'Actions', 'AI'];

export function paletteEntries(flow: Pick<FlowT, 'platform'>): PaletteEntry[] {
  const entries = blockPluginsForFlow(flow).map<PaletteEntry>((plugin) => ({
    id: plugin.key,
    label: plugin.label,
    group: groupOf(plugin),
    glyph: pluginVisual(plugin.key).glyph,
    keywords: [...(plugin.platform ? [plugin.platform] : []), ...(KEYWORDS[plugin.key] ?? [])],
    note: plugin.entryPoint ? 'entry point' : undefined,
  }));
  /* Stable within a group — the catalog's own order is a considered one — and
     groups in role order. */
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.entry.group) - GROUP_ORDER.indexOf(b.entry.group) || a.index - b.index)
    .map(({ entry }) => entry);
}
