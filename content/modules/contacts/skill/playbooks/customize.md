# Customizing this module

Shared ground rules — design tokens, adding an operation, regenerating types —
live in `../chatfuel-core/playbooks/customize.md`. This file is the index of
this module's own knobs: what to change, in which file, and what breaks if you
change it somewhere else.

Everything below is either a constant or a pure function, so a change is one
edit and a test rather than a hunt through components. That is the house rule
the module is built on: **judgement lives in `lib/*.ts` with unit tests, and
`.tsx` files hold JSX.** A rule moved into a component becomes untestable, since
the test runner here is node-only — there is no jsdom and no React rendering.

## Which query answers a filter

`lib/queryPlan.ts` is the whole routing decision as one function: a filter goes
in, `{ engine, segmentVars, chatsVars, clientFilters, caveats, live }` comes
out, and every downstream choice reads off that object.

- **The default engine is `segment`, deliberately**, and the file header says
  why: the chats engine cannot see a contact that has never had a conversation.
  Do not flip that default to get live updates — you would hide every imported
  contact. Read `references/guide.md` before touching it.
- **Every caveat is a string with an id**, and `queryPlan.test.ts` asserts them
  verbatim. Adding a caveat means adding a test; changing the wording means
  changing the test. That is what makes "honest about its limits" a build gate
  instead of a good intention.
- The two engines' variables are separate types so a mistake is a type error,
  not a wrong query. `chatsVars` is *also* the subscription's variables, which
  is what makes "the subscription must match the query" structural.

## The filter model

`lib/contactsFilter.ts` holds one model that both engines read.

- **`OPERATORS` and `OPERATOR_LABELS`** are the operator list the editor offers.
  Removing one is safe; adding one means adding it to the SDL enum too, which
  you cannot.
- `isNullary` (takes no value), `isSingleValued` (no list form) and
  `isRangeOperator` (approximate — see `references/filters.md`) are what the
  editor and the caveat bar both read. Change the behaviour there, not in the
  controls.
- **`ASSIGNEE_PRESETS`** and the `u:<UserAccountID>` key form. The id in that
  key is `member.user.id`, not `member.id` — the other one is rejected by the
  API.
- `activeFilterCount` decides what the "N filters" pill counts. Sort is
  deliberately not a filter.

`lib/contactsSegment.ts` turns the model into a `SegmentInput`.

- **`SCOPE`** is the namespace every generated id is derived under. It exists so
  two segments built in one session — the list's and an export's — cannot
  collide on a `FilterID`. Change it and every id changes; nothing persists
  them, so that is harmless, but there is also no reason to.
- Ids come from `~api`'s `stableUuid` (FNV-1a). **Do not replace it with
  `crypto.randomUUID()`**: the ids must be UUID-shaped *and* stable across
  renders, and a fresh id per render is an infinite refetch loop. Its file
  header has the whole story.
- One group flattens into the outer segment; two or more nest one level through
  `byInFlightSegment`. Deeper nesting is possible and pointless.

## Columns

`lib/tableColumns.ts`.

- **`FIXED_COLUMNS`** — the eight built-in columns, each with its header, its
  `<colgroup>` width and whether it is editable. Attribute columns are built on
  demand by `attributeColumn(name)`, so any name in the catalog can be a column
  without a spec being written for it.
- **`DEFAULT_COLUMNS`** is what a fresh install shows, in order.
- **`NARROW_HIDDEN`** is what drops as the container narrows — a reading
  decision, not a filter. `visibleColumnKeys` applies it per band.
- **`sortable` is not a preference.** `ContactSearchOrderByInput.orderBy` is an
  `AttributeName`, so only attribute-backed columns can sort. Leave
  `sortable: false` on anything you add to `FIXED_COLUMNS`; a header that sorts
  by nothing is a control that cannot work.
- `attributeNamesFor` is what the row query asks for. Keep it exact: `null`
  there means *every* attribute of every row, which on a 50-row page is 50 ×
  the whole catalog.

## Paging

`lib/contactsStore.ts`.

- **`PAGE_SIZE`** (50). Large page sizes are refused with a generic error — do
  not raise this to 1000 to "load it all".
- **`AUTO_PAGE_CAP`** (6) is how many pages the scroll sentinel may pull before
  it stops and asks for a click. It is what stops one long scroll turning into a
  full-address-book download.
- `FLASH_MS` and `ARRIVED_MS` are how long a rolled-back row and a live arrival
  stay marked.
- The reducer **never reads the clock** — `now` arrives in the action — which is
  what makes those two timings assertable.

## Deep links

`lib/contactsParams.ts` owns every URL parameter:
`view`, `contact`, `tab`, `density`, `q`, `assignee`, `stage`, `unread`,
`since`, `until`, `platform`, `sort`.

Two rules to keep if you add one: an unknown value falls back silently (a stale
link must never white-screen), and a default is omitted from what is written
(otherwise every mount rewrites the URL with the full schema).

**Predicate groups are deliberately not in the URL.** They are unbounded, and a
link carrying twenty predicates is not a link. They live in saved views —
per-user server storage, which is the only persistence the API offers a client.
If you add a link parameter, keep it bounded.

## Attribute values

`lib/attributeValue.ts` is the read/write boundary for a contact field.

- `attributeValueToInput` unpacks the `BotAttributeValue*` union into an
  editable string; `inputToAttrValue` puts it back, converting a datetime to
  the **millisecond timestamp string** the API wants.
- **Clearing a field is `contactAttributeDelete`, never a write of `""`.** An
  empty string is a value: it keeps the attribute alive, keeps it counted, and
  keeps it non-empty for `IS_NOT_EMPTY`. Any editor you add has to route
  "cleared" to the delete mutation.
- Custom attributes always report `dataType: string`, so parsing is the
  client's job and a field can contain anything a flow put there. Render a dash
  and a hint for a value that will not parse — never `NaN`.

## The attribute catalog

`hooks/useAttributeCatalog.ts` walks `bot.botAttributes` ordered by
contacts-count descending. **`PAGE`** (100) and **`MAX_PAGES`** (5) bound it;
that covers every bot seen so far. Failure is not fatal by design — an empty
catalog means the pickers offer free text and every screen still works.

## Import and export

`lib/csvColumns.ts` — the export's pure half. One trap governs the file: an
**empty** `attributes` list tells the API to export *every* attribute, so "all"
and "every box ticked" are different requests and "nothing ticked" cannot be
sent at all.

- **`MAX_EXPORT_IDS`** (100) is the API's cap on `csvContactExportStartByIDsList`,
  not a UI preference. Over it, `chunkIds` splits the selection into one task
  and one file per chunk. Raising it produces
  `CSVContactExportInvalidContactIDsCount`.
- `readExportTask` reads the status **log** (latest `startedAt` wins), clamps
  the percentage, and treats a task past its `deadline` as failed. `cancelNote`
  is the sentence for a cancel that may lose the race — it does, verifiably.

`lib/importPlan.ts` — the import's pure half. Every error code the API can
answer with has a sentence here and a test asserting it is not just the code
echoed back. Add a code to the SDL's enum and add it here in the same edit.

- **`SAMPLE_CSV`** is the file behind "download a sample". The same eight rows
  ship as `assets/contacts-sample.csv` so a scaffolded skill carries them too —
  **change one and change the other.** Nothing enforces that: module code may
  not import `node:fs`, and a test that reached into `modules/` would fail in
  the scaffolded app, where that tree does not exist. It is the one invariant in
  this module that is a sentence rather than an assertion.
- **`columnsFingerprint`** decides when the mapping screen throws away its
  drafts and re-reads the server's. The previews are part of it deliberately:
  `csvContactImportUpdateFile` keeps the import id, so a re-picked file with the
  same header row differs in nothing else, and a fingerprint without them would
  leave the old file's sample values on screen after a swap.
- `missingPhoneColumn` is the pre-flight that stops a WhatsApp import from
  failing with `WaPhoneRequired` after the upload. If you add a channel that has
  its own required attribute, it goes here.
- There is deliberately **no progress bar** on a running import: the API
  publishes counters and never a row total, so a bar would be an invented
  number. `progressLabel` counts instead.

## Channels

`lib/platforms.ts` — `ALL_PLATFORMS`, the labels and the per-`__typename` tag
tone. It is a **copy** of the same table in the deals module rather than an
import: a module may not import another module's source, and the two are free
to disagree about wording.

## Time words

`lib/time.ts` — `shortTime`, `ago`, `toDateInput`. `ago` is coarse on purpose:
the API's timestamps are the only history there is, and a precise-looking
"2 h 14 m" would imply a resolution the data does not carry.

## Adding a surface

`views/types.ts` is the frozen contract: every view takes exactly
`ContactsViewProps` and nothing else, so adding a surface — or rewriting one —
never edits the workspace root. A view owns its own data, its own toolbar and
its own live channel, and reports counts and busy state upward.

When a view wants something that is not in that interface, the answer is almost
always that the view should own it, not that the contract should grow.

## Toasts

The module mounts its **own** `ToastProvider` at its root, and it is not
decoration: an optimistic edit that fails is rolled back, and the toast is the
only signal that the value the user typed went back. A host that strips the
provider gets a module that fails silently. If you are hoisting toasts to an
app-level provider, hoist them — do not delete this one.

