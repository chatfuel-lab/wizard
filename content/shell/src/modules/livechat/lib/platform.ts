import { ConversationStatus, Platform } from '~api/generated/livechat/graphql';

/**
 * The channel, in the words a person uses for it — the one table, read by the
 * list row, the thread header, the contact card, the flow picker and the
 * sentence that explains why a file cannot be sent.
 *
 * Keyed by the enum and total over it, so a sixth channel is a compile error
 * here rather than a raw string on screen. `ChatListItem` kept a second copy
 * for a while, keyed by the raw string, and it said "Web" where the header
 * said "Web widget" — which is what a second table for one idea does.
 */
export const PLATFORM_LABEL: Record<Platform, string> = {
  [Platform.Whatsapp]: 'WhatsApp',
  [Platform.Widget]: 'Web widget',
  [Platform.Instagram]: 'Instagram',
  [Platform.Facebook]: 'Facebook',
  [Platform.Tiktok]: 'TikTok',
};

/** `automated` is the one an operator has to act on — it means the bot has it. */
export const STATUS_LABEL: Record<ConversationStatus, string> = {
  [ConversationStatus.Open]: 'Open',
  [ConversationStatus.Closed]: 'Closed',
  [ConversationStatus.Automated]: 'Automated',
};

/**
 * Every platform, for the arguments that demand the list and mean "all".
 *
 * `botAttributes` requires `platforms` — there is no "just give me the
 * attributes" call — and the inbox is not a per-platform view, so the honest
 * value is the whole enum. Read off the generated enum so a sixth channel is
 * included the day codegen learns about it.
 */
export const ALL_PLATFORMS: Platform[] = Object.values(Platform);
