# Every knob

## Limits

`lib/eventRules.ts` holds each ceiling the API enforces — `MAX_SETS`,
`MAX_SET_NAME`, `MAX_EVENTS`, `MAX_ADS`, `MAX_AD_ID_LENGTH`, `MAX_CUSTOM_NAME`,
`MAX_PROMPT`, `MAX_KEYWORDS`, `MAX_KEYWORD_LENGTH`. They are checked before the
write so a bad twentieth event cannot throw away nineteen good ones. Lowering
one is safe; raising one past what the API accepts only moves the refusal later.

## Words

- `lib/summary.ts` — the label for each of Meta's fourteen conversion names, the
  contact statuses, the hand-off sources, the comparison operators, the name the
  default set is shown under (`BASE_SET_NAME`), and the one line under a set in
  the rail (`railLine`). An unknown enum value reads as itself rather than
  crashing, which is what keeps the app working the day the API grows one.
- `lib/eventKinds.ts` — the seven triggers: the order they are offered in, the
  two or three words each is called, and the sentence saying what fires it.
  `typename` and `inputKey` are the API's and must not be edited.
- `lib/errors.ts` — every server error code and the sentence shown for it.

## Ad ids

`lib/adIds.ts` owns the parsing: which URL parameter is trusted, what a bare id
looks like (`BARE_ID`), what counts as malformed, and the Ads Manager link built
back out of an id. Widening `BARE_ID` accepts more strings; it cannot make them
real, because nothing on this API can check an ad id.

## Keyboard and palette

`lib/shortcuts.ts` is the single source of every binding AND of the `?` sheet —
`shortcuts.test.ts` fails if either grows an entry the other does not have. It
holds two scopes: `BINDINGS`, which the module root gives to `useHotkeys`, and
`EVENT_ROW_BINDINGS`, which `EventsBlock` resolves against the focused row so
the reorder keys cannot fire from anywhere on the page.

`lib/commands.ts` builds the ⌘K palette: the sets, one row per trigger for
adding an event straight away, and the plain actions. It is pure and takes its
glyphs as an argument, so what appears in which state is a test rather than a
component to click through; `components/AdsCommandPalette.tsx` is the thin shell
that supplies the icons.

Everything the keyboard reaches is also on the header, which is what makes it
findable: the palette button carries its own `⌘K`, and `?` opens the sheet.

## Undo

One entry at a time, 60 seconds, in `AdsOptimizationApp`. It is a compensating
write and not a revert: restoring a deleted event writes the old list back, and
the server gives the restored event a new id.

## Icons

`components/TriggerIcon.tsx` maps each trigger to a glyph. Changing one is
cosmetic; the trigger identity lives in `lib/eventKinds.ts`.
