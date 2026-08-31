# The model

## What an event set is

A set is a `FuelyAutomation` whose `scope` is `WhatsAppClickFromAds`. A bot has exactly one **base** set (`isBase: true`, `name: null`) and up to **30** custom ones.

- The **base set** applies to every click-to-WhatsApp ad. It carries no list of ads: the API strips filter settings from a base automation, and that absence is what makes it "everything".
- A **custom set** claims the ads it lists in `FuelySettingListOfAds.adIDs` and overrides the base for them.

Read them with `AdsEventSets`; the API does not promise an order, so sort the base first yourself.

## Inheritance

Every setting on a custom set either holds its own value or follows a parent. `inheritsFrom` names the parent when it is following, `canInheritFrom` names the parents it may be pointed at.

Two consequences worth building around:

1. **Saving an inherited setting takes a private copy.** The set stops following, and for `sendEventsToMeta` **every event id is regenerated**. Ids you read a moment ago are gone; refetch, or use what the mutation returns.
2. **A write on a parent republishes its children.** The subscription sends one update per affected set, not one per change, so merge by id and never assume a single event per write.

## The limits

| Thing | Ceiling | Error code when exceeded |
|---|---|---|
| Custom sets per bot | 30 | `FuelyAutomationScopeLimitReached` |
| Set name | 200 characters | `FuelyAutomationNameInvalid` |
| Ads per set | 50 | `FuelyListOfAdsTooManyEntries` |
| One ad id | 60 characters | `FuelyAdIDTooLong` |
| Events per set | 20 | `FuelySendEventsToMetaTooManyEvents` |
| A conversion name of your own | 50 characters | `FuelySendEventsToMetaCustomEventNameTooLong` |
| A condition in words | 512 characters | `FuelySendEventsToMetaConditionPromptTooLong` |
| Keywords per event | 50, each 50 characters | `FuelyKeywordsTooMany`, `FuelyKeywordTooLong` |

Check them before the write. The server refuses the **whole list**, so one bad twentieth event throws away nineteen good ones that were typed in the same session.

## Writing

There is one mutation for settings — `fuelyAutomationUpdateSetting` — and its input names exactly one setting. Four shapes matter here:

```graphql
update: { listOfAds: { update: { adIDs: [...] } } }
update: { listOfAds: { setInheritFrom: <FuelyAutomationID> } }
update: { sendEventsToMeta: { update: { events: [...] } } }
update: { sendEventsToMeta: { setInheritFrom: <FuelyAutomationID> } }
```

`events` is the **whole ordered list**, every time. Order is stored and it is part of the value. Leave an event's `id` out to add it; send an id the set already owns to keep it; leave one out to delete it. Two events reporting the same conversion on the same trigger are refused (`FuelySendEventsToMetaDuplicateEvent`).

The API also cleans the input before it validates: ad ids are trimmed, blanks dropped and repeats removed; keywords likewise. What you read back is therefore not always what you sent.

## Delivery

Nothing configured here is sent unless the bot's WhatsApp number can carry it:

```graphql
bot(id: $botID) { contactScopes { ... on WhatsAppPhoneContactScope {
  phone { whatsAppBusinessAccount { hasMetaConversionsAPIPermission accessLost } } } } }
```

- No `WhatsAppPhoneContactScope` at all — the bot has no number, and there is no click-to-WhatsApp conversation to report on.
- `hasMetaConversionsAPIPermission: false` — the stored Meta token lacks the conversions permission. Re-granting it is an interactive consent in Chatfuel; an app built on the public API cannot do it on somebody's behalf, so link out and say why.
- `accessLost: true` — the number or its business account is no longer reachable with this token.

## Traps

- **Errors arrive one level down.** The top-level message is generic; the code is at `errors[0].extensions.errors[0].extensions.code`. Read both levels or you will find nothing.
- **`FuelyAutomationBeingEdited`** means another write to this bot is in flight, not a conflict with the value. It clears on its own — offer a retry rather than an explanation.
- **Turning a set on can be refused by the plan.** `fuelyAutomationSetEnabled(enabled: true)` answers `NotAllowedBySubscriptionFeatureSet` on a plan without AI.
- **A contact-attribute condition that fails validation is stored anyway.** The error comes back on the event in `attributeConditionErrors` instead of the save failing, so read that array and show it.
- **There is no history and no read-back.** Conversions are sent and forgotten: no query reports what Meta received, what it accepted, or how an ad performed afterwards. Anything claiming otherwise on this API is invented.
