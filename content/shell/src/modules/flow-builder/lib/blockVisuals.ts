/**
 * What a block or an element LOOKS like: a role colour and a glyph, per
 * typename.
 *
 * Split out from the component and stated as data for two reasons. The first is
 * that it can then be tested — vitest here is node-only with no jsdom, so
 * anything that lives inside JSX is untestable by construction, and "every
 * known typename has a considered appearance" is exactly the kind of claim that
 * rots silently. `blockVisuals.test.ts` asserts it against `ELEMENT_LABELS` and
 * `BLOCK_LABELS`, so a new typename cannot arrive with a default look by
 * accident.
 *
 * The second is the never-crash invariant this module carries:
 * real flows can hold typenames outside this schema subset, and the canvas must
 * render them rather than throw. `NEUTRAL` is what an unknown one gets, and it
 * is deliberately a look and not an error — an unrecognised block is a block
 * this build does not know about, not a broken one.
 *
 * Glyphs are IDs rather than components on purpose. A component reference in
 * here would drag React into a module whose whole value is being plain data,
 * and the mapping from id to icon is one dumb record in `BlockGlyph`.
 */

/** The role a typename plays, which is all the colour means. */
export type VisualTone = 'entry' | 'message' | 'logic' | 'ai' | 'neutral';

export type GlyphId =
  | 'send'
  | 'image'
  | 'play'
  | 'mic'
  | 'file'
  | 'buttons'
  | 'link'
  | 'list'
  | 'book'
  | 'branch'
  | 'user'
  | 'minus'
  | 'external'
  | 'flow'
  | 'users'
  | 'sparkles'
  | 'bolt'
  | 'calendar'
  | 'monitor'
  | 'inbox';

export interface Visual {
  tone: VisualTone;
  glyph: GlyphId;
}

/** Unknown typenames. A look, not an error — see the module comment. */
export const NEUTRAL: Visual = { tone: 'neutral', glyph: 'file' };

const ELEMENT_VISUALS: Record<string, Visual> = {
  // Things the bot says.
  WhatsAppTextBlockElement: { tone: 'message', glyph: 'send' },
  WhatsAppImageBlockElement: { tone: 'message', glyph: 'image' },
  WhatsAppVideoBlockElement: { tone: 'message', glyph: 'play' },
  WhatsAppAudioBlockElement: { tone: 'message', glyph: 'mic' },
  WhatsAppDocumentBlockElement: { tone: 'message', glyph: 'file' },
  WhatsAppTextAndButtonsBlockElement: { tone: 'message', glyph: 'buttons' },
  WhatsAppTextAndURLBlockElement: { tone: 'message', glyph: 'link' },
  WhatsAppListBlockElement: { tone: 'message', glyph: 'list' },
  WhatsAppTemplateBlockElement: { tone: 'message', glyph: 'book' },
  WidgetTextAndButtonBlockElement: { tone: 'message', glyph: 'buttons' },
  WidgetImageBlockElement: { tone: 'message', glyph: 'image' },

  // Things the bot decides or records.
  SetConditionBlockElement: { tone: 'logic', glyph: 'branch' },
  SetContactPropertyBlockElement: { tone: 'logic', glyph: 'user' },
  ClearContactPropertyBlockElement: { tone: 'logic', glyph: 'minus' },
  SendJsonBlockElement: { tone: 'logic', glyph: 'external' },
  RedirectToFlowBlockElement: { tone: 'logic', glyph: 'flow' },
  WidgetSwitchToChatWithHumanAgentBlockElement: { tone: 'logic', glyph: 'users' },
  WhatsAppSwitchToChatWithHumanAgentBlockElement: { tone: 'logic', glyph: 'users' },
  InstagramSwitchToChatWithHumanAgentBlockElement: { tone: 'logic', glyph: 'users' },
  TikTokSwitchToChatWithHumanAgentBlockElement: { tone: 'logic', glyph: 'users' },

  // Where a conversation enters this flow.
  WidgetEntryPointBlockElement: { tone: 'entry', glyph: 'monitor' },
  DefaultReplyBlockElement: { tone: 'entry', glyph: 'inbox' },
  TriggeredMessageBlockElement: { tone: 'entry', glyph: 'bolt' },
  WhatsAppOneTimeNotificationBlockElement: { tone: 'entry', glyph: 'send' },
  WhatsAppScheduledMessageBlockElement: { tone: 'entry', glyph: 'calendar' },

  // Generative.
  SummarizeChatBlockElement: { tone: 'ai', glyph: 'book' },
  FuelyAIAgentBlockElement: { tone: 'ai', glyph: 'sparkles' },
  AiAgentBlockElement: { tone: 'ai', glyph: 'sparkles' },
  AiAgentCustomBlockElement: { tone: 'ai', glyph: 'sparkles' },
};

const BLOCK_VISUALS: Record<string, Visual> = {
  RegularContentBlock: { tone: 'message', glyph: 'send' },
  RegularActionBlock: { tone: 'logic', glyph: 'bolt' },
  AiAgentBlock: { tone: 'ai', glyph: 'sparkles' },
  WhatsAppListBlock: { tone: 'message', glyph: 'list' },
  WhatsAppTemplateBlock: { tone: 'message', glyph: 'book' },
  WhatsAppTextAndButtonsBlock: { tone: 'message', glyph: 'buttons' },
  WhatsAppTextAndURLBlock: { tone: 'message', glyph: 'link' },
  SetConditionBlock: { tone: 'logic', glyph: 'branch' },
  SetContactPropertyBlock: { tone: 'logic', glyph: 'user' },
  ClearContactPropertyBlock: { tone: 'logic', glyph: 'minus' },
  RedirectToFlowBlock: { tone: 'logic', glyph: 'flow' },
  DefaultReplyBlock: { tone: 'entry', glyph: 'inbox' },
  TriggeredMessageBlock: { tone: 'entry', glyph: 'bolt' },
  WhatsAppOneTimeNotificationBlock: { tone: 'entry', glyph: 'send' },
  WhatsAppScheduledMessageBlock: { tone: 'entry', glyph: 'calendar' },
  WidgetEntryPointBlock: { tone: 'entry', glyph: 'monitor' },
};

/**
 * The block FAMILIES the palette offers (`blockPlugins.ts` keys), each with the
 * look of the element it is born holding — so the glyph beside "WhatsApp
 * image" in the palette is the glyph on the card it becomes. Same never-crash
 * rule: an unknown key gets `NEUTRAL`, and `blockVisuals.test.ts` holds that
 * every catalogued family is here.
 */
const PLUGIN_VISUALS: Record<string, Visual> = {
  widgetTextAndButtons: ELEMENT_VISUALS.WidgetTextAndButtonBlockElement!,
  widgetImage: ELEMENT_VISUALS.WidgetImageBlockElement!,
  widgetSwitchToHuman: ELEMENT_VISUALS.WidgetSwitchToChatWithHumanAgentBlockElement!,
  widgetEntryPoint: ELEMENT_VISUALS.WidgetEntryPointBlockElement!,
  whatsAppText: ELEMENT_VISUALS.WhatsAppTextBlockElement!,
  whatsAppImage: ELEMENT_VISUALS.WhatsAppImageBlockElement!,
  whatsAppVideo: ELEMENT_VISUALS.WhatsAppVideoBlockElement!,
  whatsAppAudio: ELEMENT_VISUALS.WhatsAppAudioBlockElement!,
  whatsAppDocument: ELEMENT_VISUALS.WhatsAppDocumentBlockElement!,
  whatsAppTextAndButtons: ELEMENT_VISUALS.WhatsAppTextAndButtonsBlockElement!,
  whatsAppTextAndURL: ELEMENT_VISUALS.WhatsAppTextAndURLBlockElement!,
  whatsAppList: ELEMENT_VISUALS.WhatsAppListBlockElement!,
  whatsAppTemplate: ELEMENT_VISUALS.WhatsAppTemplateBlockElement!,
  whatsAppSwitchToHuman: ELEMENT_VISUALS.WhatsAppSwitchToChatWithHumanAgentBlockElement!,
  triggeredMessage: ELEMENT_VISUALS.TriggeredMessageBlockElement!,
  whatsAppOneTimeNotification: ELEMENT_VISUALS.WhatsAppOneTimeNotificationBlockElement!,
  whatsAppScheduledMessage: ELEMENT_VISUALS.WhatsAppScheduledMessageBlockElement!,
  instagramSwitchToHuman: ELEMENT_VISUALS.InstagramSwitchToChatWithHumanAgentBlockElement!,
  tiktokSwitchToHuman: ELEMENT_VISUALS.TikTokSwitchToChatWithHumanAgentBlockElement!,
  setCondition: ELEMENT_VISUALS.SetConditionBlockElement!,
  setContactProperty: ELEMENT_VISUALS.SetContactPropertyBlockElement!,
  clearContactProperty: ELEMENT_VISUALS.ClearContactPropertyBlockElement!,
  sendJson: ELEMENT_VISUALS.SendJsonBlockElement!,
  summarizeChat: ELEMENT_VISUALS.SummarizeChatBlockElement!,
  redirectToFlow: ELEMENT_VISUALS.RedirectToFlowBlockElement!,
  aiAgent: ELEMENT_VISUALS.AiAgentBlockElement!,
};

export function elementVisual(typename: string): Visual {
  return ELEMENT_VISUALS[typename] ?? NEUTRAL;
}

export function pluginVisual(pluginKey: string): Visual {
  return PLUGIN_VISUALS[pluginKey] ?? NEUTRAL;
}

export function blockVisual(typename: string): Visual {
  return BLOCK_VISUALS[typename] ?? NEUTRAL;
}

/**
 * The tone a whole block card carries.
 *
 * A block's own typename is often the generic `RegularContentBlock`, which says
 * nothing — the interesting thing is inside it. So the FIRST element wins, and
 * the block typename is only consulted when there is nothing inside to ask.
 * A block called "Content" holding one WhatsApp image reads as a message block,
 * because that is what it is.
 */
export function cardVisual(blockTypename: string, elementTypenames: readonly string[]): Visual {
  const first = elementTypenames[0];
  if (first && ELEMENT_VISUALS[first]) return ELEMENT_VISUALS[first];
  return blockVisual(blockTypename);
}
