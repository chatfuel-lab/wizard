# Platform links — connecting a channel without dashboard access

A **platform link** is a URL a bot member mints and hands to somebody who has no dashboard account — the client whose WhatsApp number, Instagram account or TikTok account should be wired to the bot. The person opens it, signs in to the platform, grants access, and the asset lands on the bot as a `ContactScope`. Two kinds exist: a **connection link** connects a new asset; an **access-refresh link** re-grants permissions on the asset already connected and touches nothing else. The page the recipient sees, the OAuth round trip and the provider redirect URIs are all Chatfuel's, on `panel.chatfuel.com`: an app mints the link, shows `url`, reads the active links back and revokes — it never hosts the consume side.

Not to be confused with the bookings skill's Google Calendar connection link, which invites a specialist's calendar rather than a channel.

## Two kinds

| Kind | What the recipient does | Root field | Precondition |
|---|---|---|---|
| Connection | connects a new WhatsApp phone / Instagram account / TikTok account to the bot | `botPlatformConnectionLinkCreate` | nothing of that platform connected yet — otherwise the page tells them so and stops |
| Access refresh | re-grants permissions on the asset already connected; connects and disconnects nothing | `botPlatformAccessRefreshLinkCreate` | a connected scope of that platform, else `NoConnectedContactScopeForPlatform`; the link is bound to it (`connectedContactScope`) |

## Platforms

`PlatformOperationLinkPlatform` has three values: `whatsapp`, `instagram`, `tiktok`. There is no `facebook` member — a Facebook page cannot be connected by link (`PlatformNotSupportedForOperationLink`); it goes through the signed-in OAuth route in `references/misc.md`. The web widget needs no connection at all.

## Lifecycle

Rules:

1. **Creating and revoking need the `Configure` / `Edit` permission on the bot** (`MyBotRole`). The link records who made it; when the recipient uses it, the connection runs **as that creator**, whose permission is checked again at that moment.
2. **A link expires 24 hours after `createdAt`** (`expiresAt` says exactly when) **and is used once**: a successful connection consumes it. Failed attempts do not consume it; a long run of failures revokes it.
3. ⚠ **One active link per (bot, platform, kind). Creating another replaces the first silently** — the old URL stops working, no error is raised and no field says so. Read the active map before minting; if a link is already out, offer to copy that one rather than issue a second to the same person.
4. ⚠ **The API exposes active links only.** `Bot.activePlatformConnectionLinks` and `Bot.activePlatformAccessRefreshLinks` are maps `{ whatsapp, instagram, tiktok }`, each slot a link or null. A link that was used, expired, replaced or revoked simply vanishes from the map — there is no status field and no history. "Did they finish?" = the slot is empty **and** (connection kind) a scope of that platform is now in `bot.contactScopes`.
5. Links are also revoked without anyone asking: when the creator loses `Configure` / `Edit` on the bot, when the creator's account is deleted, when the bot is deleted, and — access-refresh only — when the scope it was bound to is disconnected or deleted.
6. Revoke with `botPlatformConnectionLinkRevoke` / `botPlatformAccessRefreshLinkRevoke(botID, linkID)`. Both answer `Bot!` — select the maps off it, no refetch. A link that is no longer active answers `PlatformOperationLinkNotFound`; treat it as "already gone" and re-read.
7. No subscription covers links or scopes. Re-read on focus, on reconnect, and whenever a redirect lands.

## The URL is the credential

`url` is rendered by the server: `https://panel.chatfuel.com/platform-link?connectLinkID=<linkID>` for a connection link, `?accessRefreshLinkID=<linkID>` for an access-refresh one. `linkID` is a long random hex string and the **only** secret: whoever holds it can perform the operation, once, as the creator. Rules:

- Show and copy `url` verbatim. Never rebuild it from `linkID`, never rewrite the host.
- Do not log it, put it in your own URLs, or send it to analytics; it is a credential with the lifetime above.
- An app **cannot host the consume page**: the provider redirect URIs are registered to Chatfuel's host, and the mutations the page calls finish there.
- For proxy authors: a link is always addressed together with its bot (`botID` on every mutation, `bot(id:)` on the read), so the bot fence applies as it does everywhere; the link id itself needs no memory of its own.

## Redirects

`onSuccessRedirectURL` and `onFailureRedirectURL` are optional. When set, each must be an `https://` URL with a host, or the create answers `PlatformOperationLinkInvalidRedirectURL`; check that client-side and say the same thing. Chatfuel's page performs the redirect after the finish. ⚠ Arrival at your success URL is navigation, not proof — anyone can type it. Confirm by re-reading the API; if you must match the visit to a link, put your own opaque token in the query when you create it.

## Access refresh: the bound scope

`PlatformAccessRefreshLink.connectedContactScope` is a `PublicContactScope` — the trimmed public projection of the connected asset, because a bot admin may hold the bot and not the asset. Select the three concrete types the enum allows, and `__typename` to tell them apart (the excerpt omits it):

```graphql
connectedContactScope {
  ... on PublicWhatsAppPhoneContactScope {
    phone {
      displayPhoneNumber
      verifiedName
    }
  }
  ... on PublicInstagramAccountContactScope {
    instagramAccount {
      username
      name
    }
  }
  ... on PublicTikTokAccountContactScope {
    tiktokAccount {
      username
      name
    }
  }
}
```

⚠ `PublicTikTokAccount.username` and `name` are both nullable; `PublicInstagramAccount.username` is not. Fall back to the id for TikTok. ⚠ `WebWidget.name` is non-null and is the empty string on every bot — a widget has no name to print.

## Reading and reconciling

Two documents in `examples/operations.graphql`, on purpose:

- `BotChannels` reads `bot.contactScopes` — every member with access to the bot may.
- `BotPlatformLinks` reads both active maps — `Configure` / `Edit` only. The map fields are non-null, so a document that asks for scopes and links together answers **nothing at all** to a role that may read but not manage. Ask for links only once `MyBotRole` says the role holds the permission.

Writes: a create answers the new link — set it into its slot (the server just replaced whatever was there). A revoke answers `Bot` with both maps — replace them. `botDisconnectContactScope` (below) answers `Bot` too, and both documents' fragments spread on it. `creator { id name }` is on both link types if a "created by" line is wanted.

## Disconnecting a channel

`botDisconnectContactScope(botID, contactScopeID)` → `Bot!`, same `Configure` / `Edit`. The web widget cannot be disconnected: that refusal is `CannotDisconnectWidgetScope`, and it arrives **nested** — `errors[0].extensions.errors[0].extensions.code` — so a check that reads only the top level misses it. ⚠ A contact scope id the bot does not have answers `InternalServerError`, not a code naming the miss: the refusal exists upstream but is not one of the codes this API publishes, so "this channel is already gone" is indistinguishable from a server fault. Re-read after a failed disconnect rather than trusting the code. ⚠ Disconnecting revokes the access-refresh link bound to that scope: select the link maps on the payload rather than keeping the old ones. Reconnecting afterwards is a connection link, or the signed-in route.

## Errors

| Code | When | What to do |
|---|---|---|
| `PlatformNotSupportedForOperationLink` | platform outside the three | do not offer the control |
| `PlatformOperationLinkInvalidRedirectURL` | a redirect is not `https://` with a host | say so under the field |
| `NoConnectedContactScopeForPlatform` | access-refresh create with nothing of that platform connected | offer a connection link instead |
| `PlatformOperationLinkNotFound` | revoking a link that is no longer active | treat as done, re-read |
| `CannotDisconnectWidgetScope` | disconnecting the web widget | never draw the control (arrives nested) |
| `InternalServerError` | disconnecting a scope the bot does not have — and a genuine fault | re-read; the two cannot be told apart |
| `NotEnoughPermissions` | role lacks `Configure` / `Edit` | hide the write half, keep the read |
| `Unauthorized` | token rejected | rotate and reload |

Envelope and the nested-code rule: `references/transport-auth.md`.

## Exists, not for you: the public side

The page the recipient opens calls `publicPlatformConnectionLinkGet`, `publicPlatformAccessRefreshLinkGet`, and ten mutations — `publicPlatformConnectionInstagramOAuthMakeUrl`, `publicPlatformConnectionInstagramOAuthFinishAndConnect`, `publicPlatformConnectionTiktokOAuthMakeUrl`, `publicPlatformConnectionTiktokOAuthFinishAndConnect`, `publicPlatformConnectionWaEmbeddedSignUpFinishAndConnect`, and their five `publicPlatformAccessRefresh*` twins. They are in `references/schema.graphql` and they are unauthenticated: keyed by the link id alone, no `botID`, no token. They are deliberately absent from `examples/operations.graphql`: nothing an app can finish with them — the OAuth callbacks belong to Chatfuel's host — and behind a proxy they would run under the deployment's token with nothing for the bot fence to check. Do not add them to an allowlist.

## Two shapes, and the one an app usually wants

A link is a credential with a job, and there are two ways to spend it.

- **The app spends it itself.** Somebody presses Connect in your product, you mint a link with both redirects pointing back at the page they pressed it on, and you send the browser there in the same tab. They finish on Chatfuel's page and come back. The link is never shown, never copied and never kept — this is the shape for a product whose users connect their own channels, and it is what the `channels` module does.
- **Somebody else spends it.** An agency mints a link and sends it to a client who has no account in the product at all. That is the shape `url`, the active maps and revoke exist for: the link is read off the map, handed over, and killed if the client never uses it.

⚠ The first shape has a consequence for local development: the redirect must be `https://` with a host, so an app served over plain http mints the link without redirects and the person has to come back by hand. Build the address from where the app is standing and send none when it cannot be one the API accepts, rather than sending one it will refuse.

## When to use the signed-in route instead

The OAuth make-URL / finish pairs and `botConnect*` mutations in `references/misc.md` are for a caller who **is** a bot member holding the token — the operator connecting their own channel. A platform link is for the person who is not.
