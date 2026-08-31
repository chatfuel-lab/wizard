# Filtering contacts — `SegmentInput` in full

Every contact query that filters carries an **inline** `SegmentInput`. There is
no saved-segment API: a segment is not persisted anywhere, and the one field
that would reference a stored one errors. So a filter is a tree the client builds
on every request, and getting that tree right is most of what a contacts UI does.

Read `references/guide.md` first for the two engines — only one of them takes a
segment at all.

## The shape

```graphql
input SegmentInput {
  id: SegmentID!            # a UUID. Not optional. Not a readable string.
  name: String              # only meaningful for persisted segments; harmless
  resultOperator: BoolOperator!   # AND | OR — one per segment, for all its filters
  filters: [FilterInput!]!
}

input FilterInput {
  id: FilterID!             # a UUID, again
  byAttribute: AttrFilterInput      # the one that works
  byInFlightSegment: SegmentInput   # nesting, and the only way to mix AND with OR
  byTag: TagFilterInput             # fails live — see "the dead branches"
  byStoredSegment: StoredSegmentFilterInput  # fails live
  bySegment: SegmentFilterInput     # legacy; see the table below
}

input AttrFilterInput {
  name: String!             # an attribute name, matched exactly
  defaultStrategy: AttrFilterDefaultStrategyInput   # use this one
  dateStrategy: AttrFilterDateStrategyInput         # fails live, on every attribute
}
```

`FilterInput` is a record of nullable slots rather than a union, which means
**nothing in the type system stops you filling two of them**. The server does, at runtime,
with a code.

## The ids must be UUIDs. This is the expensive one.

`SegmentID` and `FilterID` are documented as "UUID string", and the API
enforces it. A segment whose `id` is `contacts-inline`, or a filter
whose `id` is `p1`, does not fail *that filter* — it fails the whole query:

```
The upstream service rejected the request.
```

Nothing in the response says which field was wrong, or that the problem was a
format at all. Budget an hour for this if you do not know it, which is why it is
the first thing in this file.

Two properties an id generator here has to have:

1. **Valid**: RFC-4122 shaped, version nibble and variant bits included.
2. **Stable across renders.** `crypto.randomUUID()` per render makes every
   request a fresh variables object, so any list that watches its variables
   refetches forever. Derive the UUID from a stable key instead — the module
   hashes the filter model's own ids (`stableUuid` from `~api`, FNV-1a, no
   dependency), so the same filter always produces byte-identical variables
   and a test can assert the exact request a filter makes.

## One strategy per attribute filter. Exactly one.

`AttrFilterInput` has two strategy slots and both are nullable. Sending **both**
is an error; sending **neither** is an error (`attr_filter_too_many_strategies`,
`filter_body_required`). There is no default.

And the choice is not really a choice, because:

> **`dateStrategy` fails on every attribute, including genuine `datetime`
> ones** — whichever operator and whichever date form it is given.

So **everything goes through `defaultStrategy`**, dates included. Both a
millisecond-timestamp string (`"1720456863000"`) and an RFC-3339 string work
there, and they answer identically. Pick one and be consistent; this module
sends the millisecond string, because that is the canonical wire form
`contactAttributeUpdate` wants for a datetime attribute and it keeps read and
write in one shape.

## What the default strategy actually compares

The rule is not obvious from the field names, and the bundled SDL carries no
descriptions, so this is the only place it is written down.

The Default strategy interprets the attribute and the compared value in several
ways at once — as strings, as integers, as floating point numbers, as dates —
and **if the condition holds for at least one interpretation, the condition is
satisfied.** Take an attribute holding the string `"000123456789"`. All of these
succeed: `starts_with "00"`, `greater_than "500"`, `is "123456789"`,
`contains "34"`.

Two consequences:

- **`IS`, `IS_NOT`, `CONTAINS` and `STARTS_WITH` behave the way people expect.**
- **`GT` and `LT` are approximate by construction.** They are an OR across four
  interpretations, not a numeric comparison. A range filter is a legitimate
  thing to offer — it is genuinely useful — but the UI has to say that the
  server compares the value as text, number and date at once and keeps the row
  if any of them matches. Presenting it as arithmetic is the lie.

### The operators

`AttrFilterDefaultOperator`: `IS`, `IS_NOT`, `CONTAINS`, `STARTS_WITH`, `GT`,
`LT`, `IS_EMPTY`, `IS_NOT_EMPTY`.

- **`comparableValues` is a list, and a multi-value list is an OR *inside* one
  predicate.** In practice: two values on one `CONTAINS` matched exactly what
  two `CONTAINS` predicates joined by `OR` matched. This is the cheapest way to
  express "city is Berlin or Hamburg" and it costs no nesting.
- **`IS_EMPTY` and `IS_NOT_EMPTY` take no values.** Send `comparableValues: []`;
  sending one anyway is `attr_filter_comparable_values_not_allowed`.
- `GT`, `LT` and `STARTS_WITH` have no sensible list form — send one value.
- **`IS_NOT_EMPTY` means "has a value", and a bot-wide default value makes that
  true for everyone.** `botAttributeCreateDefaultVal` is why an empty-ness
  filter can quietly start matching the whole address book.

## Nesting: one segment inside one filter slot

`resultOperator` is per segment, so a flat segment can only be all-AND or
all-OR. Mixed logic comes from `byInFlightSegment`, which drops a whole segment
into a filter slot:

```
segment(OR)
├── filter → byInFlightSegment: segment(AND) [ city IS Berlin, plan IS Pro ]
└── filter → byInFlightSegment: segment(AND) [ city IS Lisbon, plan IS Pro ]
```

Depth 3 answered live, and `too_many_nested_in_flight_segments` exists as a
code, so there is a limit somewhere above that. Two levels — groups of
predicates, groups joined by one operator — is the useful stopping point: there
is no question a third level asks that two cannot, and a builder that offers
arbitrary depth produces filters nobody can read back.

A one-group filter should **flatten** into the outer segment rather than nest a
segment inside a segment for no reason. `lib/contactsSegment.ts` in the app does
exactly that, and its test asserts the resulting shape.

## The empty cases, which are not errors

- **`segment: null`** — every contact. This is what an empty filter builder
  means, and it is a legal request.
- **`filters: []`** — also everyone. A segment with no filters is
  not "match nothing".
- **An unknown attribute name matches nobody, silently.** No error, no null
  entry, an empty page. This is the single most confusing failure mode in the
  whole API, because it looks exactly like "no results". Validate names against
  `bot.botAttributes` before sending, and when a name in a saved view no longer
  exists, say so instead of showing zero rows.

## Validation errors, and why you cannot rely on them

`FilterValidationError { filterID, code }` is the well-designed path: an empty
`filterID` is a whole-segment problem (`at_least_one_filter_required`), a filled
one points at the offending filter (`attr_filter_attr_name_required`,
`attr_filter_comparable_values_not_allowed`, `invalid_operator`, …).

It is also **not what you get from the contacts list**. Those errors surface on
the fields that *hold* a segment — a flow's condition block exposes
`segmentErrors` — while `contactsConnection` answers a bad segment with the
generic error and nothing else. So a contacts UI cannot lean on server
validation to explain a filter. It has to:

- generate valid ids itself,
- keep names inside the catalog,
- drop predicates that are incomplete (no name, or no value for an operator
  that needs one) instead of sending them,

and treat a failed query as "something in this filter is malformed", not as
"there are no contacts".

## Sorting

`ContactSearchOrderByInput { orderBy: AttributeName!, direction: Sort! }`.

- **You can only sort by an attribute.** There is no attribute name for
  "stage", "unread" or "last message", so those columns cannot carry a sort
  header — a control that cannot work is worse than no control.
- **Custom attributes sort as text**, because they all report
  `dataType: string`. `"1000"` sorts before `"9"`. Say so next to the sort
  rather than letting people conclude the data is wrong.
- **A sort does not exclude blanks**, and most contacts have no value for most
  attributes. A sort with no filter therefore orders the whole address book by a
  field almost nobody has — a page of dashes. Flooring such a route with an
  `IS_NOT_EMPTY` predicate on the sort attribute is the fix; it narrows the
  result, so it is a caveat, not a silent default.

## Free-text search

There is no `q` on the segment engine. The convention to copy is an **OR
sub-segment of `CONTAINS` filters over the system name and phone attributes** — `contact name` plus whatever the catalog reports as a
phone attribute for the connected channels.

The alternative is the chats engine's `textInputFilter`, which is a real
server-side search over name and phone — and which cannot see contacts without a
conversation. Neither is strictly better: one sees everyone and matches only
what you spell out, the other searches properly over a subset. Route between
them and say which one answered.

## The dead branches

| SDL field | Result | What to do |
|---|---|---|
| `byTag` | fails | Do not build tag UI. There is no tag mutation either. |
| `byStoredSegment` | fails | No stored segments exist to reference. |
| `bySegment` | legacy: superseded by the segment filter above | Ignore. |
| `dateStrategy` | fails on every attribute | Use `defaultStrategy` for dates. |

None of these is documented as "not implemented yet"; they are in the schema
and they do not work. Take the schema as a superset of what a client built from
this skill should reach for.

## How the module holds all this

- `lib/contactsFilter.ts` — the one filter model every surface reads: text,
  assignee, stages, unread, a last-message window, channels, and the predicate
  groups. Deliberately larger than either engine can honour alone.
- `lib/contactsSegment.ts` — model → `SegmentInput`. Ids through `stableUuid`,
  one strategy, flatten-one-group, nest-two.
- `lib/queryPlan.ts` — which engine answers, what has to be applied client-side,
  and the caveat strings for both. Its test asserts every caveat verbatim.
- `lib/contactsParams.ts` — the half of the filter a URL can honestly carry.
  **Predicate groups are not in the URL**: they are unbounded, and a link with
  twenty predicates in it is not a link. They live in saved views instead.
