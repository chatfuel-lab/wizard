---
name: chatfuel-channels
description: Build a channels page over the Chatfuel GraphQL API — which WhatsApp number, Instagram account, TikTok account, Facebook pages and web widget a bot is connected to (bot.contactScopes), disconnecting one (botDisconnectContactScope), and the one-shot platform links that let somebody without dashboard access connect a new WhatsApp, Instagram or TikTok channel or refresh an existing one's permissions (botPlatformConnectionLinkCreate/Revoke, botPlatformAccessRefreshLinkCreate/Revoke) — one active link per bot, platform and kind, 24 hours long, gated on Configure: Edit. Use when building any connected-channels, onboarding-link or channel-settings UI over Chatfuel. Requires the chatfuel-core skill, which carries the operations and the API rules.
---

# Chatfuel Channels

The channels a bot is connected to, and the links that connect or refresh one.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The page model: the hand-off, the two reads with two permission needs, the per-platform state machine, the return leg |
| `playbooks/customize.md` | Every knob: the platform order and titles, the refresh throttle, the redirect rule, the error sentences, the date format |
| `playbooks/embed.md` | Mounting inside a host app: no views, no params, the role gate, the toast provider |
| `../chatfuel-core/references/platform-links.md` | The API rules for the links: one per slot, one-shot, 24 hours, the URL as credential, the redirect rule, disconnecting a channel, the refusal codes |
| `../chatfuel-core/examples/operations.graphql` | `BotChannels`, `BotPlatformLinks`, `BotDisconnectContactScope` and the four link mutations — this module ships no operations of its own |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- **Read the channels; ask the role separately.** `contactScopes` needs only access to the bot, and the three writes need Configure: Edit. Never put the active-link maps in the same document as the channels: they are non-null and need the permission, so one document asking for both answers nothing at all to a role that may read but not manage.
- **Connect is a hand-off the app performs, not a link it shows.** Mint the link when somebody presses the button, put this page's own address in both redirects, and leave for it in the same tab. A user connecting their own channel should never be handed a URL to pass along.
- **The redirects must be `https://` with a host** or the create is refused, so a deployment on plain http mints the link without them and the person comes back with Back.
- **Creating replaces.** A second create on the same (platform, kind) kills the first link silently. That is harmless here — the link is spent in the same gesture — and it is why nothing keeps one around.
- **Only WhatsApp, Instagram and TikTok take links.** `PlatformOperationLinkPlatform` has three values; Facebook pages and the web widget are listed and disconnected here, never linked.
- **A disconnect takes the bound access refresh link with it.** `botDisconnectContactScope` answers `Bot`; read the scopes and both link maps off that payload rather than keeping the old maps. The web widget cannot be disconnected at all, and that refusal arrives nested; a scope the bot no longer has answers `InternalServerError` rather than naming the miss, so re-read instead of reading the code.
- A redirect must be `https://` with a host, or the server answers `PlatformOperationLinkInvalidRedirectURL`; check it client-side first and say the same thing.
