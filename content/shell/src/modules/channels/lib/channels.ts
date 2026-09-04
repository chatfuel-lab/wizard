import type { ChannelScopes } from '../types';

/** The platforms a platform link can connect or refresh, in the order the page lists them. */
export const LINK_PLATFORMS = ['whatsapp', 'instagram', 'tiktok'] as const;
export type LinkPlatform = (typeof LINK_PLATFORMS)[number];

export const PLATFORM_TITLES: Record<LinkPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

/** One connected asset, reduced to what a card prints. */
export interface ChannelAsset {
  scopeId: string;
  /**
   * What the channel is connected as: a phone number, an @handle, a page name.
   *
   * Empty when the asset has no name worth printing — every `WebWidget.name`
   * the API answers is the empty string, though the field is non-null — and a
   * card with an empty label prints no row at all rather than a blank one.
   */
  label: string;
  /** A second line when the asset carries one: the verified name, the display name. */
  detail: string | null;
}

/**
 * Every channel the bot has, by platform.
 *
 * WhatsApp, Instagram and TikTok hold one asset each — the server refuses a
 * second of the same platform — so they are slots. Facebook pages come in any
 * number and are a list. The web widget is one per bot and cannot be
 * disconnected, so it is a slot without a control.
 */
export interface Channels {
  whatsapp: ChannelAsset | null;
  instagram: ChannelAsset | null;
  tiktok: ChannelAsset | null;
  facebook: ChannelAsset[];
  widget: ChannelAsset | null;
}

export function emptyChannels(): Channels {
  return { whatsapp: null, instagram: null, tiktok: null, facebook: [], widget: null };
}

/**
 * `bot.contactScopes` → the page's shape. The API returns scopes in no fixed
 * order, so the first of a platform wins and Facebook pages are sorted by
 * name. A `__typename` this module does not know is skipped rather than
 * thrown on: a new platform on the server is not a reason to blank the page.
 */
export function channelsOf(scopes: ChannelScopes): Channels {
  const out = emptyChannels();
  for (const scope of scopes) {
    switch (scope.__typename) {
      case 'WhatsAppPhoneContactScope':
        out.whatsapp ??= {
          scopeId: scope.id,
          label: scope.phone.displayPhoneNumber,
          detail: scope.phone.verifiedName ?? null,
        };
        break;
      case 'InstagramAccountContactScope':
        out.instagram ??= {
          scopeId: scope.id,
          label: `@${scope.instagramAccount.username}`,
          detail: scope.instagramAccount.name ?? null,
        };
        break;
      case 'TikTokAccountContactScope': {
        // Both `username` and `name` are nullable on TikTok; the id is the last resort.
        const account = scope.tiktokAccount;
        const handle = account.username ? `@${account.username}` : null;
        out.tiktok ??= {
          scopeId: scope.id,
          label: handle ?? account.name ?? account.id,
          detail: handle ? (account.name ?? null) : null,
        };
        break;
      }
      case 'FacebookContactScope':
        out.facebook.push({ scopeId: scope.id, label: scope.facebookPage.name, detail: null });
        break;
      case 'WebWidgetContactScope':
        out.widget ??= { scopeId: scope.id, label: scope.webWidget.name.trim(), detail: null };
        break;
      default:
        break;
    }
  }
  out.facebook.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}
