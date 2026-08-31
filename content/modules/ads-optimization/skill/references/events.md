# Events, trigger by trigger

An event is two decisions: **which conversion is reported**, and **what fires it**. The first is a union of two name kinds; the second is a union of seven event types, each carrying whatever its own trigger needs.

## The conversion name

```graphql
union FuelySettingSendEventsToMetaEventName =
    FuelySettingSendEventsToMetaStandardName   # { standardName }
  | FuelySettingSendEventsToMetaCustomName     # { customName }
```

The fourteen names Meta knows: `Purchase`, `LeadSubmitted`, `InitiateCheckout`, `AddToCart`, `ViewContent`, `OrderCreated`, `OrderShipped`, `OrderDelivered`, `OrderCanceled`, `OrderReturned`, `CartAbandoned`, `QualifiedLead`, `RatingProvided`, `ReviewProvided`.

Anything else is a name of your own: at most 50 characters, reported to Meta verbatim, and it must not be one of the fourteen spelled differently (`FuelySendEventsToMetaCustomEventNameIsStandard`).

Do not hard-code the list. `bot.availableMetaConversionEventNames` answers `standardEvents` (Meta's) and `customEvents` (the ones this bot has already used, sorted). Refetch it after saving an event under a new name of your own, or the next event will not offer it.

The input is one-of:

```graphql
input FuelySettingSendEventsToMetaEventNameInput {
  standardName: FuelySettingSendEventsToMetaStandardEventName
  customName: String
}
```

## The seven triggers

| Union member | Input key | Carries | Refused when |
|---|---|---|---|
| `…OnContactMessageKeywordEvent` | `onContactMessageKeyword` | `keywordsRule` (`Contains` \| `ExactMatch`), `keywords` | `FuelySendEventsToMetaKeywordsEmpty` |
| `…OnContactFirstMessageEvent` | `onContactFirstMessage` | nothing | — |
| `…OnContactAttributeEvent` | `onContactAttribute` | exactly one `AttrFilterInput` | `attributeConditionErrors` comes back filled |
| `…OnBookingEvent` | `onBooking` | nothing | — |
| `…OnSalesStageEvent` | `onSalesStage` | `salesStages` | `FuelySendEventsToMetaSalesStagesEmpty` |
| `…OnSwitchToHumanEvent` | `onSwitchToHuman` | `switchToHumanFrom` | `FuelySendEventsToMetaSwitchToHumanFromEmpty` |
| `…OnCustomPromptEvent` | `onCustomPrompt` | `conditionPrompt` | `…ConditionPromptEmpty`, `…ConditionPromptTooLong` |

**Keywords** match a message the contact sends. `Contains` fires on any message holding one of the words, which is why generic words are a poor choice: a promo code or a phrase keeps the reported conversions meaningful.

**First message** fires once, on the first message of the conversation — the moment an ad click becomes a real chat.

**Contact property** fires when a property on the contact card comes to match the condition. The filter is the same `AttrFilter` the contacts surfaces use: `{ name, defaultStrategy: { operator, comparableValues } }`, operators `IS`, `IS_NOT`, `STARTS_WITH`, `CONTAINS`, `LT`, `GT`, `IS_EMPTY`, `IS_NOT_EMPTY`. The last two take no values. A `dateStrategy` variant exists and its `comparableDate` is **optional coming back and required going in**, so an emptiness test read from the API cannot be rebuilt as a date condition — rebuild it on the default strategy, where the same two operators live.

**Booking** fires when a booking is made in the conversation.

**Contact status** fires when the contact reaches one of `Sorting`, `Ready`, `WorkingOn`, `Won`, `Lost`. `New` is absent on purpose: every contact starts there, so it is never *reached*.

**Hand-off to a human** fires on `FuelyAI` (the AI passes the chat on) or `UserAccount` (a teammate takes it), or either.

**A condition in words** hands the decision to the AI: describe the moment — "the customer confirmed the order" — and it fires when it sees it. For moments no fixed keyword can catch.

## Every error code

`FuelySendEventsToMetaTooManyEvents`, `FuelySendEventsToMetaEventNameInvalid`, `FuelySendEventsToMetaCustomEventNameTooLong`, `FuelySendEventsToMetaCustomEventNameIsStandard`, `FuelySendEventsToMetaDuplicateEvent`, `FuelySendEventsToMetaConditionPromptEmpty`, `FuelySendEventsToMetaConditionPromptTooLong`, `FuelySendEventsToMetaKeywordsEmpty`, `FuelySendEventsToMetaSalesStagesEmpty`, `FuelySendEventsToMetaSwitchToHumanFromEmpty`, `FuelySendEventsToMetaEventNotFound`, `FuelySendEventsToMetaDuplicateEventID`, `FuelyKeywordsTooMany`, `FuelyKeywordTooLong`.

## Rebuilding the list

Every save rewrites all the events, so every event has to survive a round trip from the returned union back to the input union. Two cases need a decision rather than a mapping:

- **An event of a kind this build does not know.** The API can grow an eighth trigger. Dropping it from the rebuilt list deletes somebody's event, so refuse the write instead and say why.
- **A contact-attribute event with no condition, or a condition with neither strategy.** Send the attribute name alone; the server stores it with its error, which is recoverable, where guessing at a strategy is not.
