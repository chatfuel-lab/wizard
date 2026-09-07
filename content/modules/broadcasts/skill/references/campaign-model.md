# The campaign model

There is no campaign in the API. What there is, and what this module makes of it.

## Two blocks in a flow

A campaign is a `RegularFlow` on the WhatsApp platform holding:

- an **entry point** that carries the audience and the schedule —
  `WhatsAppOneTimeNotificationBlock` for "send now", `WhatsAppScheduledMessageBlock` for
  "later" and "on a repeat" — with one block element of the matching type;
- a **`WhatsAppTemplateBlock`** that carries the message: an approved WhatsApp template with
  its parameters filled, on its one `WhatsAppTemplateBlockElement`;
- a `ComponentToBlockConnection` from the entry point's element to the template block.

One mutation makes the pair: `whatsAppScheduledMessageCreateWithBlockAndWATemplate(flowID,
positionX, positionY)` or the `whatsAppOneTimeNotification…` twin. Both answer the whole flow.
The flow itself comes from `createFlow(botID, platform: whatsapp)`, which answers the **Bot**,
not the flow — the new one is the id in `flowsWithoutGroup` that was not there before, named
"Flow N" by the server. `updateFlowName` names it.

The module keeps campaigns in one flow group named "Broadcasts" (`createFlowGroup` answers the
Bot too; `updateFlowGroupName`, `moveFlowToGroup`), so the dashboard's flow builder shows them
together. The group is a convention found by name, not a fact the API keeps.

Three ids come out of the pair and every later write is keyed by one of them:

| Id | Where it is in the answer | What it keys |
|---|---|---|
| the entry point's **block** id | `blocks[]` where `__typename` is one of the two entry-point blocks; also `entryPoints[].id` | `blockEnableEntryPoint`, `blockDisableEntryPoint`, `deleteBlock` |
| the entry point's **element** id | that block's `blockElements[0].id` | the segment setter, the send, the five time setters |
| the template block's **element** id | the `WhatsAppTemplateBlock`'s `blockElements[0].id` | `whatsAppTemplateSetTemplate` and every parameter setter |

`lib/campaign.ts` reads the three once (`findSettingsBlock`, `findPayloadBlock`) and puts them
on the record as `settings.blockId`, `settings.elementId` and `payload.elementId`.

## What a list is

No query lists campaigns. `bot.flowGroups { flows }` and `bot.flowsWithoutGroup` are every flow
on the bot; a flow is a campaign when one of its entry points is one of the two block types
above (`findSettingsBlock` in `lib/campaign.ts`). The template block is the one the entry
point's connection targets, falling back to the first template block in the flow
(`findPayloadBlock`). Campaigns made in the dashboard's own broadcast page and in its flow
builder show up the same way — they are the same shape.

```graphql
query ($botID: BotID!) {
  bot(id: $botID) {
    flowGroups {
      id
      name
      flows {
        id
        name
        entryPoints {
          # plus __typename: the block type is what says "campaign"
          id
          isEntryPointEnabled
        }
      }
    }
    flowsWithoutGroup {
      id
      name
    }
  }
}
```

The module's own document selects the whole flow (`BroadcastFlow` in
`examples/operations.graphql`) because the row names the template and the panel draws it;
the excerpt above is the part that decides what is a campaign.

## Status, from live behaviour

The server's `BroadcastStatus` on the entry-point element is Draft, Live, Paused or Finished.
What was observed:

| Entry point | Server says | Module shows |
|---|---|---|
| one-time | `Draft` | **draft** |
| one-time | `Live` — the moment `whatsAppOneTimeNotificationSend` answers | **sending** |
| one-time | `Finished` — seconds later | **sent** |
| scheduled | `Draft`, entry point disabled | **draft** |
| scheduled | `Live`, `isEntryPointEnabled: true` | **scheduled** — or **sending** once a one-shot's time has come and it is not yet Finished |
| scheduled | `Finished` | **sent** |
| scheduled | disabled after having been armed | **draft** — `blockDisableEntryPoint` sets the status back to Draft; there is no paused state |

`Paused` was never produced by anything the module does. On a one-time element it is read as
draft; on a scheduled one the entry-point bit decides, as in the table.

A one-time entry point is **born with `isEntryPointEnabled: true`** and `blockDisableEntryPoint`
on it answers a bare server error. For it the bit means nothing; `status` is the truth.

The kind is the entry point's type, and a schedule's repeat: `now` for a one-time entry
point, `later` for a scheduled one whose `repeatType` is `Never`, `recurring` for any other
repeat type (`CampaignKind` in `lib/campaign.ts`).

## What can still be done, by status

| Status | Edit | Send / schedule | Take off the schedule | Duplicate | Delete |
|---|---|---|---|---|---|
| draft | yes | yes, when nothing is incomplete | — | yes | yes |
| scheduled | pause first — the time setters refuse while armed; the audience does not | — | yes | yes | yes |
| sending | no — `WhatsAppOneTimeBroadcastAlreadyStarted` on send and segment alike | — | — | yes | no |
| sent | no | — | — | yes | yes |

Delete is `deleteFlow(flowID)`. There is no cancel: a one-time send that has started is with
the platform. Duplicate is not an API operation either — see the recipe below.

**Never call `deleteFlowGroup`.** It deletes every flow inside the group with it. Also:
`bot.flow(unknownID)` and `deleteFlow(unknownID)` answer a bare `InternalServerError`, not a
named miss — the module re-reads the list rather than reading the code.

## From nothing to a scheduled campaign

Every operation named here is in `examples/operations.graphql`. The variables are the exact
ones; ids are the placeholders the previous step produced.

1. **`BroadcastFlowsList`** `{ "botID": "<bot>" }` — read the list first so the ids that
   exist are known, because the next step does not name the flow it makes.
2. **`BroadcastCreateFlow`** `{ "botID": "<bot>" }` — answers the Bot. `flowID` is the id in
   `flowsWithoutGroup` that step 1 did not have.
3. **`BroadcastRenameFlow`** `{ "flowID": "<flowID>", "name": "Spring sale" }`.
4. **The group, once per bot.** Find `flowGroups[]` named "Broadcasts" in step 1; when it is
   not there, **`BroadcastCreateGroup`** `{ "botID": "<bot>" }` (the new group is the id that
   was not there before) then **`BroadcastRenameGroup`** `{ "groupID": "<groupID>", "name":
   "Broadcasts" }`. Then **`BroadcastMoveToGroup`** `{ "flowID": "<flowID>", "groupID":
   "<groupID>" }`.
5. **`BroadcastCreateScheduled`** `{ "flowID": "<flowID>" }` — answers the flow with both
   blocks. Keep three ids: `blockID` (the `WhatsAppScheduledMessageBlock`), `settingsID` (its
   element) and `payloadID` (the `WhatsAppTemplateBlock`'s element). At this point the
   template element's `errors` is `[{ code: "template_required" }]`, the entry point's is
   empty, `firstSendTime` is an hour ahead, `repeatType` is `Never` and the segment is
   `{ resultOperator: AND, filters: [] }` — everyone.
6. **`BroadcastSetTemplate`** `{ "elementID": "<payloadID>", "templateID": "<template>" }` —
   the template must be `Approved` and `IsSupportedInFlowbuilder` in the catalog. The answer
   is the template block; its element's `errors` now names every blank, one
   `body_text_param_value_required` with `paramName` per parameter.
7. **`BroadcastSetBodyText`** `{ "elementID": "<payloadID>", "name": "1", "value": "Hi
   {{whatsapp user name}}" }` — one call per blank, `BroadcastSetHeaderText` and
   `BroadcastSetFooterText` for the other components, `BroadcastSetUrlButtonParam` for a
   link's blank. The verdict for `"1"` leaves the answer; `{{whatsapp user name}}` comes back
   as an attribute part. Only names from `BroadcastAttributes` may go inside the braces
   (`references/templates.md`).
8. **`BroadcastSetScheduledSegment`** — leave this step out for everyone; otherwise:

   ```json
   {
     "elementID": "<settingsID>",
     "segment": {
       "id": "6f1c2b6e-1a44-4a0d-9d0e-7a2b1c3d4e5f",
       "resultOperator": "AND",
       "filters": [
         {
           "id": "0b4a9c2d-3e5f-4a6b-8c7d-9e0f1a2b3c4d",
           "byAttribute": {
             "name": "whatsapp phone",
             "defaultStrategy": { "operator": "IS_NOT_EMPTY", "comparableValues": [] }
           }
         }
       ]
     }
   }
   ```

   Both ids are UUIDs the client mints (`references/audience.md`).
9. **`BroadcastSetRepeatType`** `{ "elementID": "<settingsID>", "repeatType": "Weekdays" }` —
   the element now carries `weekdays_are_empty` until the next step. `Never` for a one-shot
   (skip step 10), `EveryNDays` with **`BroadcastSetEveryNDays`** `{ "elementID",
   "everyNDays": 3 }`, `OnCertainDates` with **`BroadcastSetDates`** `{ "elementID", "dates":
   ["2030-01-05T22:00:00.000Z", "2030-01-12T22:00:00.000Z"] }`.
10. **`BroadcastSetWeekdays`** `{ "elementID": "<settingsID>", "weekdays": ["Sun", "Mon"] }` —
    the **corrected** list, not the picks. The picks here were Monday and Tuesday at 01:00 in
    a zone three hours ahead of UTC; the instant is 22:00 the previous UTC day, so the days
    shift left (`references/schedule.md`).
11. **`BroadcastSetFirstSendTime`** `{ "elementID": "<settingsID>", "firstSendTime":
    "2030-01-05T22:00:00.000Z", "correctedWeekdays": ["Sun", "Mon"] }` — **last**, and
    with the corrected list on every call while the stored list is non-empty, whatever the
    repeat type. A past instant is stored and answers `start_time_cannot_be_in_past` as data.
12. **`BroadcastEnable`** `{ "flowID": "<flowID>", "blockID": "<blockID>" }` — answers the
    flow. Read `entryPoints[]` for `blockID`: `isEntryPointEnabled: true` and the element's
    `status: Live` is scheduled; `false` means a verdict still stands somewhere and nothing
    was thrown — re-read with **`BroadcastFlowGet`** `{ "botID", "flowID" }` and print the
    element `errors`.

Steps 9–11 are what `hooks/useSchedule.ts` writes on the composer's schedule step, in that
order, through `writeBlock` in `hooks/useCampaignsStore.ts`; step 12 is `enable` there, and
the review step reads its answer.

## From nothing to a sent one-time campaign

1–4 as above.

5. **`BroadcastCreateOneTime`** `{ "flowID": "<flowID>" }` — the same three ids, from a
   `WhatsAppOneTimeNotificationBlock`. It is born `isEntryPointEnabled: true`; ignore the
   bit, the element's `status` is `Draft`.
6. **`BroadcastSetTemplate`** and the parameter setters, as steps 6–7 above, on `payloadID`.
7. **`BroadcastSetOneTimeSegment`** `{ "elementID": "<settingsID>", "segment": … }` — the
   same shape as step 8 above; leave it out for everyone.
8. **`BroadcastAudienceCount`** `{ "botID": "<bot>", "segment": … }` with the very same
   segment — the number the confirm dialog prints. `segment: null` counts every WhatsApp
   contact.
9. **`BroadcastSendNow`** `{ "elementID": "<settingsID>" }` — **live fire**, behind a confirm
   dialog, never from a script. Answers the block with `status: Live`. Thrown refusals:
   `ScopeNotConnectedToBot` (no number), `ComponentHasValidationErrors` (a verdict stands),
   `WhatsAppOneTimeBroadcastAlreadyStarted` (it already went).
10. **`BroadcastFlowGet`** every few seconds until the element's `status` is `Finished` —
    nothing announces it (`SENDING_POLL_MS` in `hooks/useCampaignsStore.ts`).
    `sentToContactsCount` fills in sometimes; null is a dash, not zero.

## Changing the kind of a draft

A block never changes type, so "later" → "send now" is a new pair. On the same flow:
`BroadcastCreateOneTime` makes a second entry point and a second template block; when the
first pair already carries a template it is replayed onto the new payload element the way
Duplicate does below; then the OLD ENTRY POINT goes through `deleteBlock(flowID, blockID)` —
the plain flow-builder mutation, which answers the flow. The old template block stays:
`deleteBlock` on a `WhatsAppTemplateBlock` answers a bare server error, connected or
orphaned, and so does deleting its element. The orphan is harmless — `findPayloadBlock`
follows the connection from the live entry point, so the list shows one campaign with the
right message, and the dashboard's flow builder shows a stray block nobody reaches. "Later"
and "on a repeat" are the same pair; only the repeat type differs, and that is the schedule
step's business. The composer's name step (`components/composer/NameStep.tsx`) is where the
kind is chosen; `components/composer/kindSwitch.ts` is the sequence.

## Duplicate

No clone API. A copy is a new draft with the source replayed onto it, in this order
(`duplicateCampaign` in `lib/duplicate.ts`, run by `hooks/useDuplicate.ts`):

1. A new draft named "<source name> copy": steps 1–5 of the sequences above, one-time when
   the source is one-time, scheduled otherwise.
2. `BroadcastSetTemplate` with the source's `whatsAppTemplate.templateID`.
3. For every text parameter of the source with a non-empty value, the matching setter with
   the value rendered back to a string — an attribute part becomes `{{Attribute name}}`
   again, so personalisation survives (`strText` in `lib/templatePreview.ts`).
4. `BroadcastSetUrlButtonParam` and `BroadcastSetCopyCode` for the buttons, the same way.
5. Header media by the source `File.id`: `BroadcastSetHeaderImage` / `Video` / `Document`.
   When the server refuses the id, the copy is left without it and the verdict on the
   header shows on the message step.
6. The audience: the source's read-side `Segment` converted back to a `SegmentInput` by
   `segmentToInput` in `lib/duplicate.ts` — `attribute { name }` becomes `name`,
   `defaultStrategy` is kept, `dateStrategy`, `byTag` and `byStoredSegment` are dropped
   because they fail on write, and every id is a fresh UUID. Sent with the segment setter
   for the copy's kind.
7. For a repeating source, `BroadcastSetRepeatType` and its list. **The first send time is
   not copied**: a copy is a draft, and its time is the person's to pick.

The composer then opens on the copy's review step. `CampaignRowMenu`'s Duplicate and the
detail panel's both route through the composer: a `sent` or `sending` campaign opened at
`step=review` offers Duplicate as its primary instead of a send.

## Figures

`WhatsAppTemplateBlock.stats` exists on the server but not in the bundled schema — selecting
it answers a server error on every block (the resolver is not implemented), so it was left out. The only count the API has is
`WhatsAppOneTimeNotificationBlockElement.sentToContactsCount`, filled when the element is
Finished — and observed null even then on a zero-contact run. The module prints it when it is
there and a dash when it is not, and invents nothing.

Before a send, the audience size is `bot.contactsTotalCount(platforms: [whatsapp], segment)` —
the count that ignores the current user's assignee restrictions, which is the one the schema
names for broadcast estimates.
