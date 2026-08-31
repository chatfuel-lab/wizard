### Contacts / CRM (contacts)

A CRM workspace over the bot's people. Three surfaces behind one header —
**Contacts** (the record table, with filters, saved views, inline editing and
bulk actions), **Fields** (the bot's attribute catalog: what exists, how many
contacts carry it, which flows use it) and **Audience** (the breakdown by
stage, channel and owner) — plus a full **record page** with overview, fields
and activity tabs.

Route: `/contacts` (the list), `/contacts/fields` and `/contacts/audience` are
the other two surfaces;
`?contact=<contactID>` opens a record page; the filter travels in the URL too (`q`, `assignee`, `stage`, `unread`,
`since`, `until`, `platform`, `sort`, `density`), so a filtered list is a
shareable link.

The one thing to understand before changing anything: **two different server
queries can list contacts, and they see different sets.**
`contactsConnection` + `SegmentInput` sees every contact and can express any
attribute filter, but has no live feed. `contactChatsConnection` is live and
searches server-side — and only lists contacts that **have a conversation**, so
it cannot see a contact created by an import. The
segment engine is therefore the default, and `lib/queryPlan.ts` is the single
pure function that routes between them and emits the caveats the UI prints.
Read `skill/references/guide.md` before touching it; `skill/references/filters.md`
is the same for the filter tree and `skill/references/import-export.md` for CSV.

First-task ideas:

1. **Open Contacts and sort by a custom field** such as `deal amount`, then
   note the caveat that appears: custom attributes are all
   `dataType: string` on this API, so the sort is text order and `1000` comes
   before `9`. That sentence is a unit test in `lib/queryPlan.test.ts` — the
   module's honesty is a build gate, not a good intention.
2. **Add a filter, then watch the engine switch.** Filter by a custom field and
   the list stays on the segment engine; add "unread only" and it moves to the
   chats engine, loses the sort, and says so. The whole decision is one
   function; the views only read its output.
3. **Import the sample CSV.** `skill/assets/contacts-sample.csv` is eight rows
   with a phone, a name and three fields. Upload it, watch the backend's own
   column mapping come back already guessed, unmap the phone column and see the
   wizard object *before* the server does. The interesting part is what happens
   after: the imported contacts have no conversation, so they are invisible to
   every conversation filter until they write in — the result screen says so.
4. **Export the same contacts.** Select a few rows and export the selection; the
   API caps that at 100 ids per task, so a bigger selection becomes several
   files. Then try Cancel on a small export: it will probably lose the race and
   finish anyway, which is exactly what the panel tells you rather than
   claiming a cancel that did not happen.
5. **Add a column.** Any attribute in the catalog can be a column — there is no
   spec to write, `lib/tableColumns.ts` builds one from the name. Note that
   only attribute-backed columns get a sort header: `orderBy` takes an
   `AttributeName`, so there is no way to sort by stage or by last message, and
   a header that cannot work is not offered.
6. **Clear a field on the record page and watch what the module sends.** It is
   `contactAttributeDelete`, not a write of `""` — an empty string is a *value*
   that keeps the attribute alive and non-empty for every `IS_NOT_EMPTY`
   filter. This is the single easiest thing to get quietly wrong in this API.
7. **Set a bot-wide default on a field** in Fields, and read the confirmation
   before you agree: a default makes every contact read that field as
   non-empty, which silently changes what every empty/not-empty filter means
   and what every "how many contacts have this" number says.

Things that look like bugs and are not: the list header can show a larger count
than the number of rows, because `contactsCount` counts the whole segment while
some filters are applied to loaded rows only; the default list does not update
live, because no subscription exists for that query shape; saved views are
per signed-in user, because `setUserStorageItem` is the only persistence this
API offers a client; and there is no Delete, no merge and no tags anywhere,
because no such mutation exists.
