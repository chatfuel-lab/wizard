# Automations — the model, the reads, the writes, and what the live API actually does

The dashboard's **Automations** tab: how the bot's AI behaves. Configuration is per *scope* (a channel + entry point, e.g. "Instagram post comments"), not one flat config. Operations: `examples/operations.graphql`. The traps section at the end collects the surprises.

## Model

- **Scope** — one of 18 fixed entry points (enum `FuelyAutomationScope`). `All` is the root; the rest are `{Instagram,WhatsApp,Facebook,TikTok,WebWidget} × {direct messages, post comments, ad comments, story replies, me-links, click-from-ads, click-from-posts}` (only the combinations that exist; grep the enum).
- **Automation** — `FuelyAutomation {id, isBase, name, enabled, scope, updatedAt, settings}`. Every bot is bootstrapped with exactly one **base** automation (`isBase: true`, `name: null`) per scope. Bases cannot be created, renamed or deleted.
- **Custom automations** (`isBase: false`) narrow a scope — "react only to these posts / these keywords". They exist **only in scopes that own at least one filter setting** (see the table); elsewhere `fuelyAutomationCreate` returns `FuelyAutomationScopeInvalid`. Max **30 per scope** (`FuelyAutomationScopeLimitReached`).
- **Setting** — an element of `automation.settings: [FuelySetting!]!`. 16 concrete types; the interface itself carries only `inheritsFrom` / `canInheritFrom`. **There is no id and no kind field — `__typename` is the only discriminator.**
- "Turn the bot's AI on/off" = `fuelyAutomationSetEnabled` on the **`All` base automation**. There is no bot-level toggle in this world.

The words the product uses for these, and the module with it: **Default** = the All base; a **source** = a scope; a **rule** = a custom automation; a setting **Follows Default** / **Follows &lt;source&gt; default** or is **Customized**; **Revert to Default** = follow the parent again.

### Settings per scope

Every scope carries these 8: `IncomingMessages`, `WhenAIReplies`, `MessageDelays`, `CatalogImages`, `BookingRules`, `SwitchToHuman`, `FollowUps`, `CollectContactInfo`.

Extras, and therefore whether the scope accepts custom automations:

| Scope | Extra settings | Custom? |
|---|---|---|
| `InstagramPostComments`, `FacebookPostComments` | `Keywords`, `ListOfPosts`, `PrivateReply`, `PublicReply` | yes |
| `InstagramAdComments` | `Keywords`, `ListOfAds`, `PrivateReply`, `PublicReply` | yes |
| `TikTokPostComments` | `Keywords`, `PublicReply` | yes |
| `InstagramClickFromAds`, `WhatsAppClickFromAds`, `FacebookClickFromAds` | `ListOfAds`, `Keywords` | yes |
| `InstagramStoryReplies` | `ListOfStories`, `Keywords` | yes |
| `InstagramIgMeLinks`, `FacebookMMeLinks` | `RefLinks` | yes |
| `TikTokClickFromAds` | `Keywords` | yes |
| `All`, `InstagramDirectMessages`, `WhatsAppDirectMessages`, `WhatsAppClickFromPosts`, `FacebookDirectMessages`, `TikTokDirectMessages`, `WebWidgetDirectMessage` | — | no |

`Keywords`, `ListOfPosts`, `ListOfStories`, `ListOfAds`, `RefLinks` are the **filter settings**: valid on custom automations only, never on a base one. Any other scope/isBase combination ⇒ `FuelySettingNotAllowedInScope` (for example `ListOfAds` / `RefLinks` / `ListOfStories` on IG post comments, `ListOfPosts` on IG ad comments).

*Live*: a fresh custom on `InstagramPostComments` arrives with **12 settings** — the 8 common ones inherited from the scope base, `PrivateReply` / `PublicReply` inherited, `Keywords` / `ListOfPosts` owned. Create emits a subscription event.

One more setting type, `FuelySettingSendEventsToMeta`, IS in the schema but this module does not edit it — that is `ads-optimization`'s job (see its skill). The module's fragment selects nothing for it and renders it as "Managed in the Chatfuel dashboard".

## Reads

**One list, all scopes.** `fuelyAutomations` without `$scope` returns every base and every custom of the bot with full settings — one response of a few hundred kilobytes, in a second or two, with the Default prompt alone running to thousands of characters. That is fine for one store and much better than one request per scope: the module loads `FuelyAutomationList` once into `lib/automationsStore.ts` (`byId`; selectors for scope, base, customs, status) and derives the rail, the scope page and the Test panel from it. `FuelyAutomationGet` exists for one automation; `FuelyAutomationsOverview` for the per-scope summary — neither is needed once the list is in memory.

**The fan-out subscription.** `subscription fuelyAutomationUpdated(botID)` streams whole `FuelyAutomation` objects. **One user edit can emit several events**: editing a base changes the resolved value of every automation inheriting from it, and each affected automation is published separately (a base edit fans out to every automation inheriting from it, each with its own event, all within a moment of one another; only the changed setting matters, but the event carries the whole automation). Merge by `automation.id`; never assume one event per edit. The API has a real subscription route for this, so it works over the normal `graphql-transport-ws` socket (`../chatfuel-core/references/transport-auth.md`).

**Subscribe, then load.** *Live*: the subscription needs **~1–3 s after subscribe** before it delivers, and events emitted before that are lost. So mount the subscription first, load the list after it (or refetch once it is up), and refetch on reconnect. The module's store hook does exactly this and drops live events while a full load is in flight — the load is the truth.

Reads always return the **resolved effective value** — an inherited setting still shows the parent's value in its own fields, with `inheritsFrom` telling you it is not locally owned. `contactScopes` order is not stable between calls — never index it, find by `__typename`.

## Writes

One mutation for all 16 settings:

```graphql
fuelyAutomationUpdateSetting(botID:, id:, update: FuelySettingUpdateInput!)
```

`FuelySettingUpdateInput` is **`@oneOf`** — exactly one of its 16 keys. Each per-setting input is `@oneOf` again — either `setInheritFrom: FuelyAutomationID` or `update: <Setting>UpdateInput`:

```graphql
update: { incomingMessages: { update: { howToReply: UsingAI, messagePrompt: "…" } } }
update: { incomingMessages: { setInheritFrom: "<automationID>" } }
```

⚠ **The bundled SDL does not carry the `@oneOf` directive** (it is stripped from the snapshot), so `../chatfuel-core/scripts/validate-operations.mjs` will happily accept a two-key input — the API **does** enforce it ("must have exactly one field provided"). Send one key. The module has one document per setting and per direction (`FuelySettingSet*` / `FuelySettingInherit*`) so a document cannot carry two keys.

**Whole-value replace.** Every setting update **replaces the whole value**, including list-valued ones (`rules`, `captures`, `keywords`, `refs`, `postIDs`, `storyIDs`, `adIDs`). There is no per-entry CRUD: read, modify the array, send it back (`lib/settingValue.ts` `settingUpdateInput` is the read → write shape). All five mutations return the full `FuelyAutomation` — re-render from the response, not from what you sent: the server resolves the value (duplicates dropped, blanks removed).

**Nested error codes.** The API wraps its codes one level down: the top-level message is generic and the real code sits at `errors[0].extensions.errors[0].extensions.code`. Read both places (the api client's `nestedErrorCodes`, which `lib/errors.ts` builds its messages on); a client that reads only the top level never sees the real code.

**The lock and the backoff.** `FuelyAutomationBeingEdited` means another write to this bot is in flight — retryable, never shown on the first try. Write sequentially: in practice parallel writes to one automation are what produce it. The module retries the lock with 500 · 2ⁿ ms backoff, five attempts (`lib/composites.ts` `withLockRetry`), then toasts.

### Limits and hard errors

Value limits are enforced **independently of the mode flag** — an empty `messagePrompt` fails even when `howToReply` is `DontReply`.

| Setting | Limits (SDL) | *Live* additions |
|---|---|---|
| `IncomingMessages` | `messagePrompt` required, ≤5000. `howToReply` must be `UsingAI` outside IG post comments, IG ad comments, FB post comments, TikTok post comments (`FuelyIncomingMessagesHowToReplyNotAllowed`) | |
| `FollowUps` | `messagePrompt` required, ≤3000 | |
| `SwitchToHuman` | ≤20 rules; each `switchingConditions` and `messagePrompt` required, ≤3000 | |
| `CollectContactInfo` | ≤40 captures, `description` ≤450. Per-capture problems are **soft**: read-only `captures[].validationErrors` (`AttributeRequired`, `InvalidAttribute`, `SystemAttributeIsNotAllowed`, …), not a mutation failure | a **new attribute name is accepted and created** (`type: custom`), no validation error; `name` is not a system attribute here |
| `CatalogImages` | `imagesPerCatalogItem` 0–10 | |
| `PrivateReply` / `PublicReply` | `exactTextReply` required ≤1000, `messagePrompt` required ≤3000. `likeContactComment` is Facebook-only (`FuelyLikeContactCommentNotAllowed`) | the code fires on any non-Facebook scope, IG included |
| `Keywords` | ≤50 keywords, ≤50 chars each; duplicates dropped server-side | 51 → `FuelyKeywordsTooMany`; **a non-`AnyComment` mode with an empty list is not a savable state** — the client must block it before the save, the API will not name it |
| `ListOfPosts` / `ListOfStories` | ≤50 entries, id ≤60 chars. Each id is resolved against Instagram: a story id in `ListOfPosts` ⇒ `FuelyPostMediaWrongType` and vice versa | Instagram not connected → `FuelyListOfPostsNoConnectedAccount` / `FuelyListOfStoriesNoConnectedAccount` for any id, even a fake one; connected: post and reel ids accepted, duplicates dropped, **an id that is not one of this account's media has no error code of its own** — source ids from the picker rather than accepting typed input, a post id in `ListOfStories` → `FuelyStoryMediaWrongType`; an empty list = all posts |
| `ListOfAds` | ≤50 ads, id ≤60 chars | any string within the limit is accepted (`"12 34"` too), a pasted URL → `FuelyAdIDTooLong`; duplicates dropped |
| `RefLinks` | ≤20 refs, ≤100 chars; blanks and duplicates dropped server-side | 21 → `FuelyRefLinksTooMany`; `"with space"` accepted |

`ListOfPosts` / `ListOfStories` take ids only; the `contactScopeID` in the read shape comes from the media. Source the ids from `bot.instagramMediasConnection` (`InstagramMediaPicker` in the examples) — same string, different scalar (`InstagramMediaID` → `PostID` / `StoryID`).

Other codes: `FuelyAutomationNotFound`, `FuelyAutomationNotDeletable` (base), `FuelyAutomationNotRenamable` (base), `FuelyAutomationNameInvalid` (empty or >200 chars), `FuelyAutomationScopeInvalid`, `FuelyAutomationScopeLimitReached`, `FuelyInheritFromInvalid`. Rename / enable / delete work as documented; delete returns `Bot.fuelyAutomations(scope)` — adopt that list wholesale for the scope.

## Inheritance & compare

Two levels, and custom automations never inherit from each other:

1. an `All`-scope automation inherits from nothing;
2. any other automation may inherit from the **`All` base**;
3. a custom automation may additionally inherit from **its own scope's base**.

Read the allowed parents off the setting itself (`canInheritFrom`) rather than deriving them; `inheritsFrom` is `null` when the automation owns the value. Anything else ⇒ `FuelyInheritFromInvalid` (for example `PublicReply ← All`, `Keywords ← anything`). On a custom, `canInheritFrom` = [All base, scope base] for the 8 common settings, [scope base] for `PublicReply` / `PrivateReply`, [] for the filters.

The module states this as three words per setting (`lib/inheritance.ts`): **follows** (`inheritsFrom` set — "Follows Default" / "Follows &lt;source&gt; default"), **own** (owned, and there is a parent it could follow — "Customized", with "Revert to Default"), **fixed** (nothing to inherit from: the All base's settings and every filter). "Revert" on a rule goes to the **nearer** parent — its own scope's base — because that is what "back to what every rule of this source does" means. **Differs from parent** is a separate question from ownership: an owned value can equal the parent's, and the compare popover says so ("own but not different"). A parent that is not loaded reads as "not different" (unknown, not alarming).

## Drafts vs immediate saves — the hybrid model

- **Switches, selects, radios save immediately** (`saveSetting`): the section shows its saving state, adopts the response, toasts, and offers Undo. Not optimistic — the server may resolve the value differently from what was sent.
- **Prompts and lists are drafts** (`lib/drafts.ts`, `hooks/useSettingDraft.ts`): the section holds `value` and `baseline`, `dirty` is "value ≠ baseline" by write shape, Save writes, Cancel restores. A draft never toasts on error — the sentence goes under its Save button (`quiet: true`).
- **Live under a draft**: not dirty → adopt the server value; dirty and the server equals the old baseline → nothing; dirty and the server moved → **conflict**: "Changed elsewhere · Use theirs / Keep mine". Saving anyway wins — the API is last-write.
- The registry (`AutomationsDraftContext`) is what lets ⌘S save every dirty draft (sequentially — the lock), the header count "n unsaved", and the navigation guard (Save / Discard / Stay) work across sections.

## Undo — a compensating forward mutation

There is no revert on the server. Undo (`lib/undo.ts`) is one offered entry, 60 s, ⌘Z or the toast button, and it always writes forward:

| Action | Undo = |
|---|---|
| turn on / off, rename | set the previous `enabled` / `name` again |
| an immediate setting save, a Revert to Default, a Follow | write the previous owned value back (`Set*`), or follow the previous parent again (`Inherit*`) |
| delete a rule | **re-create** it by name in its scope, re-set the settings it owned, re-inherit the rest — a **new id**; the toast says so |
| duplicate / create from template | delete the created rule(s) |
| "Turn every rule on / off" on a source | the batch inverse, sequentially |

One entry, not a stack: a deep history would promise an ordering the server does not keep. Composites (duplicate, copy to, every-rule on/off, from template, restore) are plans of steps run sequentially with the lock retry and a progress toast (`lib/composites.ts`).

## Bootstrap context

What the workspace needs besides the automations, in one query plus an independent one (`hooks/useBootstrap.ts`, exposed as the catalog):

- **Channels** — `bot.contactScopes` × the five scope fragments → which platform is connected, its handle (`@luma.skin`, `+1 …`, the page name, the widget name), the account id the pickers need. The widget scope exists on every bot; "connected" means `isEnabled`. The FB posts drawer and the ads picker cannot be verified without a connected Facebook page and Meta ad accounts on the bot — only that their queries validate.
- **Team** — `bot.members` with `role.botPermissions` — enough to mark managers (no `Ai: Edit`). The signed-in role comes from `MyBotRole` (core): `Ai: View` reads, `Ai: Edit` writes and tests.
- **Attributes** — `botAttributes(attributeTypes: [custom], orderBy: {orderBy: AttributeName, direction: Asc})` — a bot's custom attributes with a `usersCount` on each. The Lead-qualification picker; a new name is accepted by the API and created.
- **Knowledge-base facts** — `fuelyConfig.knowledgeBase` (`companyName`, working hours) and `fuelyConfig.usage`. The persona knobs are NOT here: agent name, language, tone and who to respond to are per-scope automation settings. The test chat labels the AI's bubbles with a constant, because there is no bot-wide agent name to read.
- **Instagram media** (the posts / stories pickers) — `instagramMediasConnection` (posts + reels; `thumbnailPreview` often null; captions null), `instagramAccount.media(id)` (unknown id → null), `instagramAccountRefetchLatestMedias(count: 30)` (it lengthens the list — call it before showing the picker). Without Instagram: nested `InstagramDoesNotConnected` plus a "Cannot return null" companion error.

## Preview — the Test panel

`previewResponsesStartForFuelyAutomation(botID, fuelyAutomationID)` pins a **real conversation** to one automation — enabled and filters bypassed, routing not emulated; the All base is refused (`PreviewResponsesFuelyAutomationScopeNotPreviewable`). The panel is always open beside the scope page and pins to the source's Default or the rule the reader last opened. Send by the session's platform, subscribe first, merge by `clientId`, restart = a new start plus a client watermark. The whole thing, with the timings and what is not available, is `test-panel.md`.

## The traps

1. `@oneOf` is enforced by the API although the bundled SDL strips it.
2. Fuely error codes are **nested** one level down; read `extensions.errors[0].extensions.code`.
3. `Keywords` in a non-`AnyComment` mode with an empty list is not savable and gets no error code you can show. Block it client-side.
4. There is no `FuelyPostMediaNotFound`: an id outside the account's media gets no code of its own, so take ids from `instagramMediasConnection` and never from typed input. Instagram not connected → `…NoConnectedAccount` even for a fake id.
5. `likeContactComment: true` outside Facebook → `FuelyLikeContactCommentNotAllowed`.
6. `FuelySettingNotAllowedInScope` per scope: filters a scope does not own are refused even on a custom.
7. `FuelyInheritFromInvalid` for any parent not in `canInheritFrom` — read the list, never derive.
8. The subscription needs ~1–3 s to become active; events before that are lost. Subscribe, then load; refetch on reconnect.
9. `contactScopes` order is not stable. Find by `__typename`.
10. `FuelySettingSendEventsToMeta` and `WhatsAppBusinessAccount.hasMetaConversionsAPIPermission` are in the schema — the `ads-optimization` module owns them (see its skill). Do not build them here as a setting type in this module's editors.
11. The `fuelyConfig*` behaviour setters are not in this schema, `fuelyConfigBookingSetAIAutonomyLevel` included: AI behaviour is configured per scope through `fuelyAutomation*`. A design that reaches for one — bookings' Autonomy card is the usual case — wants the per-scope setting instead.
12. The preview session pinned to a disabled automation still answers; the All base is not previewable.

## Operations

`examples/operations.graphql` — fragments `FuelyAutomationRef`, `FuelySettingParts`, `FuelyAutomationParts`, `AutomationFile`, `AutomationsPvMessage`; reads `FuelyAutomationList` (no scope = everything), `FuelyAutomationGet`, `FuelyAutomationsOverview`, `InstagramMediaPicker`; the subscription `FuelyAutomationUpdated`; writes `FuelyAutomationCreate` / `Delete` / `SetName` / `SetEnabled`, `FuelySettingSet*` ×15 and `FuelySettingInherit*` ×10; bootstrap `AutomationsBootstrap`, `AutomationsAttributes`; pickers `AutomationsInstagramMedia`, `AutomationsInstagramRefetch`, `AutomationsFacebookPosts`, `AutomationsMetaAds`; preview `AutomationsPreviewStartForAutomation`, `AutomationsPreviewMessages`, `AutomationsPreviewMessageAdded` / `Updated`, `AutomationsPreview*TextSend` ×5. `MyBotRole` is core's.

### Caching note

`settings` is a list of **interface values with no id**. Normalized caches (Apollo & co.) must not try to normalize it — configure `FuelySetting` as non-normalized and replace the array wholesale from each mutation/subscription payload, and register the interface's implementations from `../chatfuel-core/references/possible-types.json`.

## Where it lives

- `src/modules/automations/AutomationsApp.tsx` — the providers (client, store, catalog, drafts, undo, toasts); `AutomationsWorkspace.tsx` — the URL, the band, the keyboard, the Test panel's target, the New-rule dialog, the dirty guard.
- `src/modules/automations/lib/automationsStore.ts` (+ test) — the one reducer over `byId`, the selectors; `hooks/useAutomationsStore.ts` — subscribe first, then load, refetch on reconnect.
- `src/modules/automations/lib/automationsParams.ts` (+ test) — the deep links (`scope`, `automation`, `setting`, `new`); an unknown value falls back silently, a default is omitted, the retired keys of the five-view build (`view`, `test`, `mode`, …) are ignored and dropped.
- `src/modules/automations/lib/scopes.ts` — the 18 scopes, platforms, labels, descriptions, `DM_SCOPE`, the behaviour groups; `lib/settingValue.ts` — read → write shape, `sameValue`; `lib/inheritance.ts` — follows / own / fixed, the revert target, the compare; `lib/settingSummary.ts` — labels and one-line summaries; `lib/errors.ts` — nested codes → sentences.
- `src/modules/automations/hooks/useAutomationMutations.ts` — every write (optimism, toasts, undo, the store dispatch); `hooks/useComposites.ts` + `lib/composites.ts` — plans, the lock retry, the batch report; `lib/undo.ts`; `lib/drafts.ts` + `hooks/useSettingDraft.ts` — the hybrid save model.
- `src/modules/automations/hooks/useBootstrap.ts` — the catalog; `hooks/useMyRole.ts` — the permission gate.
- `src/modules/automations/components/channels/` — `ChannelsView` (rail ‖ scope page ‖ Test panel), `ScopeRail`, `ScopePage`, `ScopeHeader`, `BaseCard`, `RulesList`, `SettingSection`, `InheritanceRow`, `CopyToDialog`; `components/customs/RuleCard.tsx`; `components/editors/` — the 15 editors and the registry; `components/pickers/` — Instagram media, Facebook posts, Meta ads, teammates, attributes; `components/newRule/`; `components/panel/` — the Test panel.
- `src/modules/automations/lib/samples.ts` — the mutable dataset "Luma Skin Studio" the unit tests read.
- `test-panel.md` — the test chat.
