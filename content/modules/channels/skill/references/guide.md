# Channels — the page model

The API rules for platform links live in `../chatfuel-core/references/platform-links.md`; this file is about the page an app builds on them.

## Connecting is a hand-off, not a form

Nothing in this API lets an app carry somebody through a platform's OAuth: the consent screens, the callback and the WhatsApp embedded sign-up all belong to pages Chatfuel serves. What the API gives instead is a **platform link** — a one-shot URL on those pages, valid for 24 hours.

So the app spends one on the spot. Somebody presses **Connect**, the app mints a connection link with both redirects pointing back at this page, and the browser leaves for it. They finish on Chatfuel's page and come back here, where the channel is read again and shows as connected.

The link itself never reaches the screen. It is a credential with a job that starts immediately, not a thing to copy, keep or hand over — an app that shows one is asking its own user to do the delegation dance with themselves.

⚠ **The redirects only exist over https.** The API refuses a redirect that is not `https://` with a host, so a deployment served over plain http — every `npm run dev` — mints the link without them, and the return leg is the browser's own Back button. `lib/returnUrl.ts` decides that, and it is the one place that knows.

## Two reads, two permission needs

| Document | Reads | Needs | Who sees it |
|---|---|---|---|
| `BotChannels` | `bot.contactScopes` | access to the bot | every role |
| `MyBotRole` | the caller's permissions | — | every role |

`Configure: Edit` is what the three writes need, so a role without it sees what is connected and no control to change it. The active-link maps (`BotPlatformLinks` in the core skill) are **not** read here: a link the app spends in the same gesture is never a thing to keep in sync. They are there for an app that wants the other shape — an agency minting a link to send to a client.

## One action per platform

WhatsApp, Instagram and TikTok each hold one asset, and the card offers the one thing that fits:

| Connected? | May manage? | The card shows |
|---|---|---|
| no | no | Not connected |
| no | yes | Not connected · **Connect** |
| yes | no | Connected · the asset |
| yes | yes | Connected · the asset · **Refresh access** · **Disconnect** |

Connect mints a connection link; Refresh access mints an access refresh link, which re-grants permissions on the asset already connected and touches nothing else. Both leave the app the same way.

Facebook pages come in any number and the web widget is one per bot; neither takes a link. They are listed with Disconnect where the server allows it — which for the widget it does not (`CannotDisconnectWidgetScope`), so that row has no control at all.

## What a scope prints as

`lib/channels.ts` reduces every `ContactScope` to a label and an optional second line:

| Scope | Label | Detail |
|---|---|---|
| `WhatsAppPhoneContactScope` | `phone.displayPhoneNumber` | `phone.verifiedName` |
| `InstagramAccountContactScope` | `@` + `instagramAccount.username` | `instagramAccount.name` |
| `TikTokAccountContactScope` | `@` + `tiktokAccount.username`, else `name`, else the id | `name` when a handle exists |
| `FacebookContactScope` | `facebookPage.name` | — |
| `WebWidgetContactScope` | `webWidget.name`, which is the empty string on every bot | — |

`contactScopes` arrives in no fixed order: the first scope of a platform wins, Facebook pages are sorted by name, and a `__typename` the module does not know is skipped rather than thrown on. An asset whose label comes back empty prints no row — the chip already says it is connected.

## The return leg

The redirects carry two keys of the module's own: `result` (`connected` or `failed`) and `channel` (the platform). `lib/returnUrl.ts` writes them and reads them back; `ChannelsWorkspace` says what they said once, then clears them out of the address.

⚠ Arrival is not proof — anybody can type that address. It decides what to **say**, never what is true: the read that runs on mount is what puts a channel on screen, and a failed hand-off is a sentence, not a state.

## What each write does to local state

Nothing is optimistic.

- **Connect / Refresh access** end by leaving the page, so there is no local state to write. What comes back is the next load.
- **Disconnect** answers `Bot` with the fresh scopes, and they replace what is held. Its refusals are the awkward pair: the widget's `CannotDisconnectWidgetScope` arrives nested, and a scope the bot does not have answers `InternalServerError` rather than naming the miss — so every failed disconnect re-reads first and shows the error second.

Every load answer carries the epoch it was asked under and a stale one is dropped; `lib/channelsStore.ts` is the reducer. Nothing on the server pushes a channel connecting or going away — it happens on somebody else's page — so the store re-reads on reconnect and when a tab comes back after `CHANNELS_REFETCH_THROTTLE_MS`, and the header carries a Refresh.
