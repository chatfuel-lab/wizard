# Contacts / People

The contact directory of a Chatfuel bot, and the CRM built on it: a record
table with saved views and nested filters, a record page, a fields
administration surface, an audience breakdown, and CSV import/export.
Operations: `examples/operations.graphql`. The filter tree has its own file
(`references/filters.md`); so does the CSV story (`references/import-export.md`).

Every note below reflects observed behaviour. Where the
SDL and the live API disagree, the live answer wins and the SDL claim is named
so nobody re-derives it.

## The model

A contact is a `Contact`, and `Contact` is an **interface with one concrete
type per channel** — `WhatsappContact`, `InstagramContact`, `FacebookContact`,
`TikTokContact`, `WidgetContact` — plus `UnavailableContact` for one the caller
may not see. So:

- **Always select `__typename`.** It is the channel, it is the restricted flag,
  and omitting it makes fields go missing.
- `phone` exists only on `WhatsappContact`; `username` only on Instagram and
  TikTok. Everything else — `name`, `note`, `salesStageV2`, `assignee`,
  `attributes`, `unreadMessagesCount`, `updatedAt` — is on the interface.
- **There is no `createdAt`.** `updatedAt` is the only timestamp a contact
  carries, and it moves on every write. "New this week" is not a question this
  API can answer, and no amount of client work changes that.

What a contact does *not* have is as load-bearing as what it does. There is no
delete, no merge, no block, no unsubscribe, no tags, and no change history.
Anything a UI offers along those lines is a UI that will have to take it back.

## The two engines, and why the default is not the live one

Two connections return contacts. They are **not interchangeable**, and routing
between them honestly is the whole data design of this module.

| | segment engine | chats engine |
|---|---|---|
| Operation | `contactsConnection` + `SegmentInput` | `contactChatsConnection` |
| Sees | **every contact** | only contacts that HAVE a conversation |
| Filters | arbitrary attribute predicates, nested AND/OR, channels | assignee, unread, stage subset, server-side text over name + phone |
| Sort | any attribute name, either direction | fixed: last message first |
| Paging | forward *and* backward (`before`) | forward only |
| Live | none | `contactsChatUpdates` |
| Count | `contactsCount` / `contactsTotalCount` | `contactChatsCountV2` |

The chats engine is the tempting one: it is live, it searches server-side, and
it filters by the four things a support inbox cares about. Deals defaults to it
for exactly that reason.

**Contacts must not.** `contactChatsConnection` lists only contacts that have
a conversation. A contact created by `whatsappContactCreateV2` — or by a CSV
import — comes back with `conversation: null` and never appears there.
`contactsCount` and `contactChatsCountV2` differ by exactly the contacts that
have never messaged. Searching the chats
engine for such a contact returns nothing while the same contact sits on the
first page of the segment engine.

A contact list that silently hides part of the address book is wrong in a
way no caveat repairs. So the segment engine is the floor, and the chats engine
is an opt-in the user reaches by asking for something only it can answer
(unread, owner, stage, a last-message window). The routing is one pure function
— `lib/queryPlan.ts` in the app — and every caveat string it emits is a test
assertion rather than a promise.

Two consequences to build around:

- **Under the segment engine the list is a snapshot.** No subscription exists
  for that shape, so Refresh is the only thing that moves it. The shipped UI
  gives people the button and does not narrate the reason: that is a UI
  decision, not an API one, and everything here is still true of the data.
- **Under the chats engine, channel, sort and attribute predicates are gone.**
  The connection takes no `platforms` argument and no `orderBy`, so they are
  applied client-side to the rows that happened to load. Anything built on top
  of this module should keep that in mind before quoting a filtered count.

**`first` is capped.** A large page size fails with a generic error.
Page at 50 and let a sentinel pull more.

## Counting

- `contactsCount` respects the caller's visibility restrictions — this is the
  number to put next to a list.
- `contactsTotalCount` ignores them. It is the "how many will this broadcast
  reach" number, and printing it beside a list the viewer cannot fully see is
  how a count and a table come to disagree in public.
- `contactDealsByStages` is the one server-side aggregation in the whole
  contact API, and it counts contacts per sales stage. **There is no
  aggregation over attribute values at all** — no sums, no averages, no group
  by. Any such figure is a client-side reduction over the rows that happened to
  load, and it has to be printed with its coverage.

## Filtering

Every query carries an inline `SegmentInput`; **there is no saved-segment
API**, and `byStoredSegment` fails live. The full treatment — UUID ids, the one
strategy per filter, nesting, the operators, the dead branches and the generic
error — is `references/filters.md`. The three rules that catch everyone:

1. **`SegmentID` and `FilterID` must be real UUIDs.** A readable id like
   `contacts-inline` fails the entire query with a
   generic error and nothing that says which field
   was wrong.
2. **`filters: []` is legal and matches everyone.** So is `segment: null`. An
   empty builder means "no filter", not "no results".
3. **An unknown attribute name matches nobody, silently.** No error, no
   warning, an empty page. Validate names against the catalog before sending.

## Attributes

Attributes are the CRM. There is no custom-object model, no field schema and no
migration story — an attribute exists because some contact has a value for it.

- **Catalog:** `bot.botAttributes(locale, platforms, attributeTypes, filters, orderBy, …)`.
  It carries `name`, localized `aliases`, `dataType`, `type` (`system` /
  `custom`), `usersCount`, `defaultValue` and `flowsCount`. Order it by
  contacts-count descending and the first page is the fields people actually
  use rather than the alphabet.
- **Values:** `Contact.attributes(names: [...])` returns
  `ContactAttribute { attr, value }` where `value` is one of the
  `BotAttributeValue*` variants. **Ask for the names you need.** `names: null`
  means every attribute of every row, which on a 50-row page is 50 × the whole
  catalog.
- **Writing creates.** `contactAttributeUpdate(id, attrName, attrValue: String!)`
  on a name that does not exist yet creates it — `type: custom`,
  `dataType: string` — and it is filterable immediately, with no propagation
  delay observable. This is the only creation path; see the trap below.
- **`attrValue` is always a String.** A datetime attribute takes a
  **millisecond timestamp string** (`"1720456863000"`).
- **Custom attributes read back as strings.** `BotAttributeValue` has typed
  branches, but a custom attribute comes back as `BotAttributeValueString`
  whatever it holds. Parse the string; never assume the branch.
- **Deleting the last value deletes the field.** `contactAttributeDelete` on
  the only contact that carried a value removes the attribute from
  `botAttributes` entirely. Custom attributes are derived from contacts that
  have values, not from a list of their own — which is why a saved column, a saved view
  or an export column list can go stale without anyone doing anything wrong.

### Two traps worth their own paragraph

**`botAttributeCreateDefaultVal` is not the creation API.** It sets a
**bot-wide default value**, and a field with a default reads as non-empty on
*every* contact. Every `IS_EMPTY` / `IS_NOT_EMPTY` filter silently changes
meaning, and so does every "how many contacts have this field" figure. Create a
field by writing a value on one contact; ask before writing a default, and say
what it will do.

**Anything can write into the same bucket.** A flow, a Live Chat operator or a
CSV import can put `"about 5k"` into a field a UI treats as money. Render a dash
and a hint — never `NaN`, and never count it as zero in a total.

## Editing a contact

Every write mutation returns the contact, so there is nothing to reconcile: put
the response into the store and the whole record is current. `contactUpdated`
also fires on attribute writes, so a second tab catches up
without a refetch.

The rule that is not obvious: **clearing a field is a delete, not an empty
write.** `contactAttributeUpdate(attrValue: "")` stores an empty string, which
is a *value* — the attribute stays alive, stays counted in `usersCount`, and
stays non-empty for `IS_NOT_EMPTY`. `contactAttributeDelete` is what "clear"
means. An inline editor that saves an empty box as a write is quietly wrong in
a way nothing on screen shows.

Names and notes are their own mutations (`contactUpdateName`, `contactSetNote`)
and behave normally. `contactSetNote(note: null)` genuinely clears the note.

## Assignment

`contactSetAssignee(assigneeID)`, `contactSetFuelyAIAssignee`,
`contactRemoveAssignee`. Two things:

- **`assigneeID` is `member.user.id`** (a `UserAccountID`) from
  `bot.members` — *not* `member.id`, which is a `BotTeamMemberID` and is
  rejected.
- `Contact.assignee` is a union of `PublicUserAccount | FuelyAIAssignee`, and a
  `PublicUserAccount` with `isUnknown: true` is a deleted user. Render a
  placeholder rather than an empty name.

## Creating and deleting

**`whatsappContactCreateV2` is the only create mutation in the API, and it is
WhatsApp-only.** On every other channel a contact comes into existence when the
person writes in. A CSV import is the same path at scale, which is why an
imported contact has no conversation and cannot be seen by the chats engine.

**There is no delete.** Not soft, not hard, not per contact, not in bulk. Do not
ship a Delete button; do not ship an "archive" that is really a custom
attribute nobody else respects.

A contact can also be brought into existence through `previewResponsesStartForBot`
— the returned `conversationID` **is** the contact id — which is the only path
that needs no phone number. Those synthetic preview contacts can be hidden from
list queries, so verify one by deep link rather than by search.

## Bulk, without a bulk API

There is **no bulk mutation of any kind**. A bulk stage change, a bulk
assignment, a bulk field write is N sequential round trips, and that has three
consequences a UI must state rather than discover:

- **A partial failure is an ordinary outcome.** Twelve of fifteen succeeded is
  a normal Tuesday. Report which ones did not, and leave those rows selected.
- **Cap the batch.** Past a few dozen, refuse with an explanation instead of
  firing sixty requests at a rate-limited bot.
- **Under the segment engine nothing tells the list.** There is no
  subscription, so rows keep showing their new values inside a filter they no
  longer match until Refresh. Say it; do not fake a removal.

The one genuinely bulk operation in the whole API is the CSV export, and the
one bulk *write* is the CSV import.

## Live

- `contactUpdated(botID, contactID)` — one open contact, whole payload, fires on
  attribute writes too. Pointed: do not hold fifty open.
- `contactsChatUpdates(botID, …)` — the chats engine's list feed. The
  subscription's arguments **must match the query's exactly** (minus paging) or
  the two describe different sets and the merge is wrong. Build both from one
  variables object and the invariant is structural rather than remembered.
  `ContactListUpdateStopped { willResumeAt }` means the server throttled the
  feed: refetch at that time rather than assuming the list is current.
- **The segment engine has no subscription.** No workaround exists. Refresh.

## Restricted contacts

Visibility can be restricted per role (`ContactsAssignedToOthers`,
`ContactsUnassigned`). Those contacts still arrive — as `UnavailableContact`
stubs with every field empty. They must be **rendered as a locked placeholder,
counted in totals, and excluded from selection, from editing and from every
bulk action**. A row that looks selectable but whose every mutation will fail is
worse than a visible lock.

## Permissions

`People: View` to read, `People: Edit` to write. The API answers a write the
caller may not make with `NotEnoughPermissions`, so the honest UI reads the
caller's role once and *disables* what cannot work rather than letting every
click fail. Import needs Edit; export needs View.

## Saved views

There are no server-side segments, so a saved view is JSON in
`setUserStorageItem` / `currentUser.userStorageItem` — see
`../chatfuel-core/examples/operations.graphql`. That storage is **per signed-in
user**, so call them "your views" and never "shared": two people on the same bot
do not see each other's. Version the storage key, bound the list, and let the
parser degrade to "no views" rather than throw — everything read back is
untrusted.

## Messages and bookings on a record

- **Messages:** `contact.conversation.messages(first, before)`, newest first.
  Only the text-bearing types are worth unpacking; everything else renders from
  `__typename`. The full per-platform matrix lives in the livechat skill.
- **Bookings:** there is no contact filter and no `Contact.bookings` field. The
  only route is `bookingsV2(startTime, endTime)` over the whole bot, matched on
  `contact.id` client-side. That means a window is mandatory and "all
  appointments ever" is not on offer — say which window is shown.

## Deliberately not offered

Every omission below is forced by the API, and each names the fact that forces
it. Building any of them means faking it.

- **No delete, no merge, no block, no unsubscribe.** No such mutation exists.
- **No tags.** `SegmentInput.byTag` is in the SDL and fails live, and there is
  no tag mutation to write one with.
- **No stored segments.** `byStoredSegment` fails live; saved views are
  per-user client storage standing in for it.
- **No date-typed filters.** `AttrFilterDateStrategy` fails on every attribute,
  including genuine `datetime` ones. Dates go through `defaultStrategy`, which
  accepts a millisecond string or an RFC-3339 string and compares approximately
  — see `references/filters.md`.
- **No "created this week".** `Contact` has no `createdAt`.
- **No field-change history, no audit trail.** Nothing in the API records who
  changed what.
- **No server-side aggregation of attribute values.** Counts per stage are the
  only server-computed numbers; everything else is a client sum over loaded
  rows and must be printed with its coverage.
- **No exact count under a client-side filter.** `contactsCount` counts the
  segment, so when the list narrows rows itself the header count is legitimately
  larger than the list. Show both numbers rather than one wrong one.
- **No live filtered list.** The engine that can express a filter has no
  subscription and the one with a subscription cannot express the filter.
- **No cross-user shared views.** `setUserStorageItem` is per user, and it is
  the only persistence the API offers a client.

## Files

| File | What is in it |
|---|---|
| `references/filters.md` | `SegmentInput` in full: ids, strategies, operators, nesting, what fails |
| `references/import-export.md` | The CSV import wizard and the export task, end to end |
| `examples/operations.graphql` | Every operation, validated, with the findings in the comments |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/files-tasks.md` | The upload endpoint and async `Task` semantics |
