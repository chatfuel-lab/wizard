# Other domains (compact map)

Surfaces that exist but rarely anchor an integration. Field signatures: grep `references/schema.graphql`.

## Web widget configuration

Reached via `bot.contactScopes → ... on WebWidgetContactScope { webWidget }`: `WebWidget { name, avatar, domains, color, isEnabled }`. Mutations: `webWidgetSetName / SetAvatar(fileID) / SetDomains([String!]!) / SetColor / SetIsEnabled`. Avatar upload: `/api/filestorage/upload/widget?fileType=Image&botID=<botID>` (`botID` is what the proxy fences on, so it is required). `domains` is the allowlist of sites where the end-user widget may run.

## WhatsApp templates

- `bot.whatsAppTemplates` — the approved template list. **Pagination args are accepted but ignored** (always returns everything) and the field is nullable.
- Sending a template from live chat: create a fill-in copy `filledWhatsAppTemplateCreateTemporary(botID, templateID)` → set parameters with `filledWhatsAppTemplateSet{Header,Body,Footer}TextParamValue`, `...SetHeader{Image,Video,Document}File(fileID)` (upload via `/api/filestorage/upload/plugin?fileType=…&botID=<botID>&pluginID=…`), `...SetURLButtonParamValue`, `...SetCopyCodeButtonCodeValue` → read back `bot.filledWhatsAppTemplate(id)` (check its `errors`) → pass to `whatsAppTemplateSend` (the chatfuel-livechat skill).

## Flows & keywords

- Flow ids for `conversationFinishSendToFlow` (live chat close): `bot.flowGroups { flows }` and `bot.flowsWithoutGroup`.
- The full flow-builder editing surface (blocks, plugins, buttons, connections, and the Test panel that runs a flow as a real preview conversation) is covered by the chatfuel-flow-builder skill.
- Keyword auto-replies: `bot.keywordRules` connection; `keywordRuleCreate / UpdateKeywords / UpdateMatchType / UpdateActionType / Delete` + per-platform reply-content setters.

## Broadcasts (WhatsApp)

Scheduled/one-time template sends are flow-builder blocks: `whatsAppScheduledMessage*` / `whatsAppOneTimeNotification*` component mutations + the `trigger` domain (`triggerSetConditionType / SetAttributeFilter / SetDelay` — **all fail with `EnabledTriggerIsImmutable` unless the trigger is disabled first**).

⚠ Scheduling timezone trap: `whatsAppScheduledMessageSetFirstSendTime` / `SetWeekdays` / `SetOnCertainDates` expect the **client** to convert local times to UTC, and to shift the weekday flags when that conversion crosses midnight. The rule, written out:

- `firstSendTime` is the datetime the user picked, converted to UTC.
- That conversion can move the calendar day, so a non-empty weekday list has to move with it. This is what `correctedWeekdays` on `SetFirstSendTime` is for: **send it whenever the stored list is non-empty, even when `repeatType` is not `Weekdays`**.
- The shift, stated the way the API states it: convert `firstSendTime` into the user's timezone. If that lands on the **next** day of the month, send the user's weekdays shifted **left** (`Sun→Sat`, `Mon→Sun`, `Tue→Mon`, …). If it lands on the **previous** day, shift **right** (`Sun→Mon`, `Mon→Tue`, `Tue→Wed`, …). Same day, no shift. Reverse the shift to display what the user originally picked.
- `SetWeekdays` takes that same UTC-corrected list — it is the same value as `correctedWeekdays`, not the raw picks.
- `SetOnCertainDates`: take the hours and minutes from `firstSendTime`, apply them to every date selected in the calendar, convert each result to UTC, and send those.
- Working reference implementation: `src/modules/flow-builder/lib/schedule.ts` (`localUtcDayShift`, `toCorrectedWeekdays`, `toDisplayWeekdays`).

## Platform connections (channel onboarding)

OAuth make-URL/finish pairs + connect mutations per channel: Facebook pages (`facebookMessagingOauth*`, `botConnectFacebookPage`), Instagram (`instagramOAuth*`, `botConnectInstagramAccount`), TikTok (`tiktokOAuth*`, `botConnectTikTokAccount`), WhatsApp embedded signup (`waEmbeddedSignUp*`, `botConnectWhatsAppPhone`, auto-connect flow with `Bot.whatsAppPhoneAutoConnectionProcess`). Progress arrives via subscriptions (`whatsAppBusinessPhoneNumberUpdated`, `fbPagesSyncStatusUpdated`) or timestamp polling (`whatsAppEntitiesStartRefetch` + `whatsAppEntitiesLastUpdatedAt`). Disconnect any channel with `botDisconnectContactScope`. Every one of those runs as the signed-in token holder. To let somebody **without** dashboard access connect a new WhatsApp / Instagram / TikTok asset, or re-authorize the one already connected, mint a platform link instead — `references/platform-links.md`. Facebook pages have no link form.

## Meta Ads & content

- `marketing`: `currentUser.metaAdAccounts / metaAdAccount(id)` → ads with Chatfuel + Meta insights; `metaAdsSyncStart` (+ `metaAdsSyncStateUpdated` subscription). Synthetic ids (`MetaAdAccountSynthID`) differ from raw Meta ids.
- Instagram content: `bot.instagramMediasConnection`, refetch mutations, publishing (`instagramAccountPublishImage/Reel/Story/Carousel`). ⚠ Reel/Story video publishing **blocks synchronously up to ~5 minutes**; media URLs must be publicly reachable; carousel = 2–10 items.
- Facebook pages/posts: `FacebookBusiness.facebookPages` → `FbPage.posts` connections; sync mutations return `Boolean` immediately, completion via `fbPagePostsSyncStatusUpdated`.

## Small ones

- Notifications (mobile push per device): `bot.mobileBotNotificationCfg` + 8 `deviceNotifications*Update(botID, enabled)` toggles. Device identity comes from the FCM token in context — only meaningful for the official mobile apps.
- `translation(key, locale)`, `getSchemaVersion`, `env` — service fields; rarely needed.
