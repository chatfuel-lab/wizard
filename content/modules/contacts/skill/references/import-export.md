# CSV import and export

The two bulk operations this API has. Everything else about contacts is one
record at a time — there is no bulk mutation anywhere — so these two carry more
weight than a CSV feature usually does: the import is the only way to put a
thousand contacts on a bot, and the export is the only way to get them off it.

Operations are in `examples/operations.graphql`. Task and upload mechanics are
in `../chatfuel-core/references/files-tasks.md`; this file is what happens when
you actually run them.

---

# Export

```
csvContactExportStartBySegment(botID, platforms, segment, attributes) → Task
csvContactExportStartByIDsList(botID, contactIDs, attributes)        → Task
getTask(id) / taskUpdated(id)                                        → Task
csvContactExportCancel(botID, id)                                    → Bot
bot.lastActiveCSVContactsExportTask                                  → Task | null
```

## Which contacts

The two starts are not two ways of saying the same thing, and a UI that hides
the difference will export the wrong set:

- **By segment** covers everything the *server-side* filter matches — the whole
  segment, not the rows loaded so far. Whatever the list narrows client-side
  (a text search under the segment engine, a stage, an owner, unread) is not
  part of a segment and cannot narrow the export. With `segment: null` it is
  the entire address book. `platforms` is a **separate argument**: leave it at
  all five and a channel-filtered list exports channels it is not showing.
- **By ids** covers exactly the ids you send, and nothing else. It ignores
  every filter, which is what makes it right for a selection.

**The id list is capped at 100.** Over that the mutation answers
`CSVContactExportInvalidContactIDsCount`. There is no "export the selection"
call that takes more, so a bigger selection is either several exports — one
task and one file per hundred, which is what this module does — or a silent
switch to the segment path, which exports a different set of contacts than the
one the user selected. Whichever you pick, say it on screen before the button
is pressed.

## Which columns

`attributes: [AttributeName!]!`, and **the empty list means every attribute**.

That single fact shapes the whole picker:

- "Everything" is `[]`, not "every box ticked". Ticking all 56 names is a
  *narrower* request than `[]` the moment a flow creates the 57th.
- "Nothing ticked" therefore cannot be sent at all — it would be the widest
  export in the API. Refuse it and explain why.
- **An unknown name errors the whole export**, so names must be filtered
  against the live catalog before sending. This matters more than it sounds:
  deleting the last contact's value for a field removes it from the catalog, so
  a saved column list can rot without anyone doing anything.

## The task

Both starts return a `Task`, and the shape is the platform's standard async
job (`../chatfuel-core/references/files-tasks.md`):

- **`statuses` is a log, not a state.** The current phase is the entry with the
  latest `startedAt`. Reading `statuses[0]`, or "the last terminal-looking
  entry", gives the wrong answer on a task that was cancelled and finished
  anyway — which is a real case, see below.
- **`completedPoints` / `totalPoints`** give a determinate bar. `totalPoints`
  is 0 until the server has counted, so the bar is indeterminate first; and
  `completedPoints` may overshoot `totalPoints`, so clamp.
- **Past `deadline` the task is failed**, whatever the log says. Without that
  rule a server that stopped answering leaves a bar spinning for ever.
- **`data` is an interface.** Select `__typename` and
  `... on CSVContactsExport { id file { … } }`. `UnavailableTaskData` means no
  access to that task.
- **`data.file.url` is a direct download link.** An `<a href download>` is the
  whole download implementation — treat the link itself as sensitive, and do not
  persist or forward it.

A small export can go **Created → InProgress → Finished in a second or two**,
which is fast enough that a well-behaved UI must handle "already done by the
time the panel rendered".

Follow it on **both channels**: `taskUpdated(id)` for latency, and a poll of
`getTask(id)` every couple of seconds for truth. The socket may be quiet or
dropped; the poll is also the only one that survives a backgrounded tab
throttling timers.

## Cancel loses the race, and says nothing useful

`csvContactExportCancel(botID, id: String!)` has two traps in one signature:

1. **`id` is `task.data.id`** — the `CSVContactsExport` id — while
   `getTask(id: TaskID!)` wants `task.id`. Two different ids on one object.
   Send the data id, and fall back to the task id if the server rejects it.
2. **It returns the `Bot`.** Not the task, not a status, not a boolean. The
   response tells you nothing about what happened, so the cancel has to be
   followed by a re-read of the task.

And the outcome is genuinely uncertain. A cancel can land and the export
finish anyway — the status log then reads:

```
Created → Cancelled → InProgress → Finished     (and a downloadable file)
```

So **"Cancelled" is a request, not an outcome**: while it is in flight say
that a small export often
finishes regardless, and when the answer arrives say which it was. Telling
somebody their export was cancelled and then handing them the file is the one
outcome worth writing code to avoid.

## Restoring after a reload

`bot.lastActiveCSVContactsExportTask` returns **only active tasks** — a finished
one reads as `null`. That is exactly the right shape for a
restore: adopt whatever it returns and you can never pop a stale download panel
for an export somebody finished last week. Nothing else needs guarding.

The SDL documents `CSVContactExportAlreadyInProgress`, which suggests one export
at a time — but the server does not always answer with it. Handle the code if
it arrives; do not build a queue around it.

## Export errors

| Code | What it means |
|---|---|
| `CSVContactExportAlreadyInProgress` | An export is already running on this bot |
| `SegmentIsInvalid` | The segment was rejected — usually an attribute that no longer exists |
| `CSVContactExportInvalidContactIDsCount` | Too many (or zero) ids for the by-ids export |
| `CSVContactExportDoesNotExist` | Cancel arrived after the task was already gone |
| `NotEnoughPermissions` | The caller lacks `People: View` |

---

# Import

```
POST {base}/api/filestorage/upload/bot?fileType=Document&botID=…   → FileID
csvContactImportCreate(botID, fileID, platform, locale)            → CSVContactImport
csvContactImportUpdateFile(botID, id, fileID)                      → CSVContactImport
csvContactImportUpdateColumns(botID, id, request)                  → CSVContactImport
csvContactImportStart(botID, id)                                   → CSVContactImport
csvContactImportUpdated(botID, id)                     (subscription)
bot.latestCSVContactsImport(platform)                              → CSVContactImport | null
latestCSVContactsImport.errorsFile(botID)                          → File | null
```

Five calls, four of which correspond to a step the user can see. That is why
the wizard has exactly four steps: file, columns, import, result.

## Step 0: the upload is REST

GraphQL never accepts bytes. `POST …/filestorage/upload/bot` with
`fileType=Document` and a multipart `file` field returns the `FileID` that
`csvContactImportCreate` takes. A host that did not wire an upload path has no
import at all — hide the wizard behind a sentence rather than behind a file
picker whose Continue never lights up.

## The backend maps the columns first

This is the part that changes the design. `csvContactImportCreate` comes back
with `columns[]` **already mapped** where it can:

```graphql
CSVContactImportColumn {
  columnIndex     # also the id
  columnPreview   # the first row's value for this column
  attribute       # the guess, or null
}
```

The server has already done part of the work: right after the import is
created, it maps the columns for the required attributes — for WhatsApp, the
required attribute is `WhatsAppPhone`.

So the mapping screen's job is to **show and correct** a mapping, never to build
one from nothing. And `columnPreview` is load-bearing: the API gives no header
names, so a list of "Column 1 … Column 9" with pickers beside it would be
unmappable. The preview is how a person tells column 4 from column 5.

`csvContactImportUpdateColumns` takes the whole mapping:

```graphql
request: { columns: [{ columnIndex, attributeName }] }
```

**An unmapped column is simply left out.** `attributeName` is a non-null
`AttributeName`, so `""` is a value, not an absence — the backend would take it
as an attribute named nothing. Leaving a column out is how "skip this one" is
expressed, and skipping is common: a CSV exported from another CRM is full of
internal ids and timestamps that have no business becoming contact attributes.

Mapping to a name **no contact has yet is legitimate** — writing an attribute is
what creates it in this API, and an import is a perfectly ordinary way to add a
field to a bot.

## Validation is a union, and half of it belongs to a column

```graphql
union CSVContactImportValidationError =
    CSVContactImportCommonError    # commonErrCode
  | CSVContactImportColumnError    # columnErrCode + columnIndex
```

| Common code | Sentence to show |
|---|---|
| `FileIsEmpty` | The file has no rows |
| `FileSizeTooBig` | Split it and import the parts |
| `FileInvalidFormat` | Not a CSV the importer can read — save as comma-separated UTF-8 |
| `WaPhoneRequired` | A WhatsApp import needs a phone column |

| Column code | Sentence to show, **next to that column** |
|---|---|
| `ColumnDuplicated` | Another column already writes this attribute |
| `SystemAttrNotAllowed` | A platform-maintained field an import may not write |
| `AttrIsInvalid` | Not a name the API accepts |

A column error that renders in a banner instead of against `columnIndex` is a
message nobody can act on — the whole point of the code carrying an index is
that it can be shown where the mistake is.

Two of these are worth catching **before** the round trip, because the user is
looking at the cause right now and will not be later:

- **Duplicates** — two pickers on the same attribute is client-side arithmetic.
- **The WhatsApp phone column** — if the platform is WhatsApp and no column maps
  to a phone attribute, say so beside the mapping instead of letting `Start`
  return `WaPhoneRequired` at the one moment the user has stopped thinking about
  columns.

## Swapping the file

`csvContactImportUpdateFile` exists for "that was the wrong CSV". It keeps the
import id, so re-picking is one call rather than a new import the server has to
expire. It only works before the start — afterwards it is
`CSVContactImportAlreadyStarted` / `AlreadyFinished`.

That kept id has a consequence worth knowing before you cache anything. Swap
January's export for February's and the id is the same, the column count is the
same, and the backend guesses the same attributes off the same header row —
**only `columnPreview` changes.** A mapping screen that decides "did anything
change?" from the indexes and the guesses therefore concludes nothing did, and
goes on showing sample values out of the file that was just discarded. The
previews have to be part of whatever identity the mapping is keyed on.

## Running: counters, and no percentage

`csvContactImportUpdated(botID, id)` streams the whole `CSVContactImport` while
it runs. What it carries is `createdContacts`, `updatedContacts`,
`declinedContacts` — **and no total of any kind**. Unlike an export's
`totalPoints`, the API never says how many rows the file has.

So there is no honest progress bar here. Count up instead. A bar that fills at
an invented rate is a lie with an animation on it.

Two error breakdowns come back alongside the counters, and they mean different
things:

- **`declinedContactsErrors`** — rows that did not become contacts at all
  (invalid phone number, rate limits). Their total equals `declinedContacts`.
- **`partialContactsErrors`** — contacts that *were* created or updated, but
  some of whose attributes were not saved. These are the quiet ones: the count
  says success and the record is incomplete.

Each entry is `{ id, count, description }` and the description is already a
sentence — render it, do not re-word it.

## The rejected rows

`latestCSVContactsImport.errorsFile(botID)` is a per-row CSV of what failed. It
is asked for **on its own**, not inside the main fragment, because it errors
three ways and two of them are ordinary:

| Code | Treatment |
|---|---|
| `CSVContactImportNotFinishedYet` | Silent — you asked early |
| `CSVContactImportErrorsEmpty` | Silent — nothing went wrong |
| `CSVContactImportErrorsExpired` | Say so: the errors file is no longer available |

An `errorsFile` inside `CSVImportInfo` would make the whole fragment fail on
every import that had nothing to report.

## Resuming

`bot.latestCSVContactsImport(platform)` is **per platform** and returns the last
import whether it is running or long finished. Unlike the export's restore
query it does not filter itself, so:

- an **unfinished** one is a wizard to resume — show the mapping;
- a **finished** one is history — show it as history, with when it finished,
  not as "your import just completed".

## What an import does to the address book

Imported contacts are created the same way `whatsappContactCreateV2` creates
them, which means **they have no conversation**. They are invisible to
`contactChatsConnection` and therefore to every filter that engine owns (unread,
owner, stage, last-message) until the person writes in. The gap between the two
counts can be large. Say it on the result screen: somebody who imports
500 contacts and then filters by owner will otherwise conclude the import failed.

A row whose phone matches an existing contact **updates** that contact rather
than creating a second one — which is what makes the import usable as a
recurring sync and not only as a one-time load.

## Import errors

| Code | What it means |
|---|---|
| `ContactImportPlatformNotAllowed` | That channel cannot import contacts |
| `ContactScopeNotConnected` | No WhatsApp number is connected for them to belong to |
| `CSVContactImportFileDoesNotExist` | The uploaded file is gone — upload again |
| `CSVContactImportDoesNotExist` | The import expired or was replaced |
| `CSVContactImportAlreadyStarted` / `AlreadyFinished` | Too late to edit this one |
| `CSVContactImportAtLeastOneColumnRequired` | Nothing is mapped |
| `CSVContactImportInvalidColumnIndex` | The mapping names a column the file does not have |
| `NotEnoughPermissions` | The caller lacks `People: Edit` |

Checking for a connected WhatsApp number up front (`bot.contactScopes`) turns
the second row of that table from a failure after the upload into a sentence
before it.

## The sample file

`assets/contacts-sample.csv` is eight rows of `phone, name, company, city, plan`
with numbers from the +1 555 01xx range reserved for fiction. It exists so a
demo import takes twenty seconds instead of twenty minutes of inventing data,
and so the mapping screen has something with a recognisable shape in it. The
same eight rows are also embedded in the app (`lib/importPlan.ts`) behind a
"download a sample" link — change one and change the other.

This range is fine here — the API never validates a phone on import — but it is
not safe everywhere: other mutations reject the same fictional `+1 555…` range
as pattern-invalid. Synthetic data that has to survive a write elsewhere wants
`+1 202 555 01xx` instead.

## How the module holds all this

- `lib/csvColumns.ts` — the export's pure half: column options, the empty-list
  trap, the id chunking, `readExportTask`, and the cancel-race sentence.
- `lib/importPlan.ts` — the import's pure half: the mapping drafts, every error
  code as a sentence, the pre-flight checks, the outcome summary.
- `hooks/useContactExport.ts` — restore, subscribe + poll, cancel-then-look, and
  the chunk queue.
- `hooks/useContactImport.ts` — upload, create-or-swap, map, start, resume.
