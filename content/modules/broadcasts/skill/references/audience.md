# The audience

Every campaign carries one segment on its entry-point element, replaced wholesale by
`whatsAppOneTimeNotificationUpdateSegment` / `whatsAppScheduledMessageUpdateSegment(blockElementID,
request: SegmentInput!)`. What the module knows about the input, from the contacts module's
findings and this module's own:

- `SegmentInput { id, name, resultOperator: AND | OR, filters: [FilterInput!]! }`. **Ids are
  client-minted UUIDs** (`stableUuid` from the api-client); anything else fails the whole write
  with a generic error naming no field.
- **"Everyone" is `filters: []`.** A fresh pair's default segment is exactly that, with no
  `segmentErrors`, and `contactsTotalCount` with it equals the count with no segment at all.
- A filter is `byAttribute { name, defaultStrategy { operator, comparableValues } }`. Operators:
  IS, IS_NOT, STARTS_WITH, CONTAINS, LT, GT, IS_EMPTY, IS_NOT_EMPTY — the last two send
  `comparableValues: []`. One strategy per filter: both is an error, none is an error.
- `dateStrategy`, `byTag` and `byStoredSegment` are in the schema and **fail on write**. Dates
  go through `defaultStrategy` as millisecond-timestamp strings. The module reads those three
  shapes back so a segment written elsewhere survives a re-save, and never builds them.
- Two levels: the segment's own filters, and one nested segment per filter slot through
  `byInFlightSegment`. Depth three answered once; nothing needs it.
- The read side hands back `attribute { name }` where the input took `name` — the two do not
  round-trip on their own.

The input, written out:

```graphql
input SegmentInput {
  id: SegmentID!
  name: String
  resultOperator: BoolOperator!
  filters: [FilterInput!]!
}

input FilterInput {
  id: FilterID!
  byAttribute: AttrFilterInput
  byInFlightSegment: SegmentInput
}

input AttrFilterInput {
  name: String!
  defaultStrategy: AttrFilterDefaultStrategyInput
}

input AttrFilterDefaultStrategyInput {
  operator: AttrFilterDefaultOperator!
  comparableValues: [String!]!
}
```

(`FilterInput` has more members in the schema; these are the ones that work.)

The count is `bot.contactsTotalCount(platforms: [whatsapp], segment)` — the one that ignores
the current user's assignee restrictions, which the schema names for broadcast estimates.
`contactsCount` under-reports for a role that sees only its own contacts.

```graphql
query ($botID: BotID!, $segment: SegmentInput) {
  bot(id: $botID) {
    contactsTotalCount(platforms: [whatsapp], segment: $segment)
  }
}
```

`segmentErrors` on the element carry `FilterErrCode`s (`at_least_one_filter_required` is NOT
raised for an empty list; `too_many_filters_in_segment`, `attr_filter_attr_name_required`,
`attr_filter_comparable_values_required`, `too_many_nested_in_flight_segments`, …), and the
element's own `errors` carry `segment_set_is_invalid` while any stands.

The audience is snapshotted when a run launches: changing it on an armed repeating campaign
affects the next run, not one in flight. A one-time campaign refuses the change once started.

There is no opt-out or consent anywhere in the API. Marketing consent is a convention the
account keeps — an attribute a flow sets — and a filter on it here.

## How the module builds one

The builder is the contacts module's, reduced to what a segment is and given a read side.

- **Model** — `lib/audienceFilter.ts`: `AttrPredicate { id, name, operator, values }` inside
  `FilterGroup { id, operator, predicates }` inside `AudienceFilter { groupOperator, groups }`;
  the operators table (`OPERATORS`, `OPERATOR_LABELS`, `isNullary`, `isSingleValued`,
  `isRangeOperator`) and the editing helpers. `EMPTY_AUDIENCE` is everyone.
- **Wire** — `lib/audienceSegment.ts`: `buildSegment(filter, flowId)` answers a `SegmentInput`
  — never null: everyone is `filters: []` with an id. One group flattens into the segment's
  own filters; two or more nest, one `byInFlightSegment` per group, joined by
  `groupOperator`. Ids come from `stableUuid` under the scope
  `chatfuel.broadcasts.segment/<flowId>`, so an unchanged builder is a byte-identical
  variables object and the same filter counts as the same segment. `segmentToFilter(read)`
  is the read side: `attribute.name` → `name`, `defaultStrategy` → operator and values, and
  whatever the builder cannot express (`dateStrategy`, `byTag`, `byStoredSegment`, a third
  level) kept verbatim in `passthrough` and re-sent as read. Whether the server takes those
  three strategies back from here was not observed — they fail when authored here, and a
  re-save that carries one may fail the same way; the composer prints the refusal. The read
  fragment selects three levels, so a segment nested that deep round-trips whole; anything
  deeper is beyond what the API is known to accept.
- **Validation** — `lib/audienceValidation.ts`: an empty attribute name, empty values on a
  valued operator, values on a nullary one, more than 20 predicates or 10 groups, and the
  range-operator approximation (LT / GT compare as strings on the server) as an issue level.
  Issues print beside the row they belong to; nothing is written while one stands.
- **Catalog** — `hooks/useAttributeCatalog.ts` over `BroadcastAttributes`: WhatsApp
  attributes, system and custom, by contact count, up to five pages of a hundred. A name that
  is not in the catalog is allowed in a **filter** — it selects nobody and creates nothing —
  which is the opposite of the rule for a template parameter (`references/templates.md`).
- **Hook** — `hooks/useAudience.ts`: owns the filter for one draft, seeded from
  `record.audience.segment`; on every valid change, after a short debounce, writes the
  segment setter for the draft's kind through `writeBlock` and reads
  `BroadcastAudienceCount` with the very same segment, epoch-guarded so a slow count for an
  old filter never lands. The count is what the review step's confirm dialog prints.
- **UI** — `components/composer/AudienceStep.tsx`: "Everyone" / "Contacts who…" at the top;
  under the second, the builder (`components/audience/FilterGroupBuilder.tsx`,
  `PredicateRow.tsx`, `AttributePicker.tsx`); beside or below it one large figure, the
  count, with the word "recipients" under it and nothing else. While counting the figure dims;
  it does not vanish. A role without Flows: Edit sees the builder read-only.
