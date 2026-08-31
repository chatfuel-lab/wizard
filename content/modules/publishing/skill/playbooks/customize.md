# Customizing this module

An index of every knob, and what each one costs to move.

## The limits

`lib/constants.ts` holds every number a post is checked against, in one place so
that no screen has to carry an explanation of one:

- `CAPTION_MAX` — 2 200, Instagram's own ceiling. The server answers
  `InstagramPublishCaptionTooLong` past it, and the schema does not say where the
  line is, so this is the number that keeps a five-minute wait from ending in a
  refusal.
- `HASHTAG_MAX` — 30. Instagram stops counting there and ignores the rest. It is
  a warning, never a refusal: a post with 31 tags is a worse post, not an
  invalid one.
- `CAROUSEL_MIN` / `CAROUSEL_MAX` — 2 and 10, from the mutation's own doc
  comment.
- `PUBLISH_TIMEOUT_MS` — the budget a publish gets. It has to clear the five
  minutes a Reel can block for, and it has to be **longer than the proxy's own
  slow budget**, or a proxy giving up is reported as a client abort and the
  upstream's reason is lost.
- `CONFIRM_WINDOW_MS` — how long a failed publish waits on
  `botInstagramMediaAdded` before it is believed. Shorten it and a slow arrival
  reads as a failure; lengthen it and a genuine failure takes longer to report.
  The cost of getting it wrong is asymmetric: too short means a retry that posts
  twice.
- `LIBRARY_PAGE_SIZE` / `REFETCH_COUNT` — how much of the account is read at a
  time, and how much is pulled down from Instagram before listing.

Changing any of these is one edit and no screen changes, which is the point.

## Validation

`lib/postValidation.ts` is the only place a rule about a post is written. Add a
rule there and it appears at the right control on every surface; add it in a
component and it applies on one of them. Its tests are the specification.

## The kinds

`PostKind` is `post | reel | story | carousel`, and the four map onto the four
mutations in `lib/publishInput.ts`. That file is where a new field on an input
lands — `shareToFeed`, `thumbOffset`, `coverURL` are all there — and it is pure,
so a change to it is a change to a test.

**A Story has no caption** and that is not a policy, it is the shape of
`InstagramPublishStoryInput`. If a caption control appears on Story, something
has stopped reading the input type.

## The composer

A card centred over the page, one column wide, with the format tiles, the
writing area, the media strip and a toolbar stacked in it. `Compose` and
`Preview` are two tabs over that column rather than two panes beside each other:
side by side, each is half the width it wanted, and the preview — whose whole job
is to show what a photograph will look like — is the half that suffers.

**Nothing in it stretches.** The caption opens at about two lines and grows with
what is typed, the strip sits straight under it, the toolbar straight under
that, and the card is the sum of the three. That is the whole reason it is a
Dialog sized by its contents rather than a full-height panel: a panel gives a
two-line caption and one thumbnail the height of a spreadsheet, and the
difference becomes white space above a footer pinned to the bottom of the
window. Anything added here should be sized by what it holds for the same
reason.

Whose account this goes to is in the header, once. It is not on the format
tiles: all four lead to the same account, so four copies of its picture say one
true and useless thing four times, and on an account with no picture they say it
as four identical letters.

Three decisions the column draws are pure functions with tests, so changing one
is a change to a test rather than to markup:

- `lib/formatTiles.ts` — what each of the four tiles shows. Every crop is the
  same height and none of them the same width, because the shape a format
  appears in is the only thing that differs between the four. Pixels rather than
  a CSS `aspect-ratio`: the crop is a flex item in a fixed slot, and whether a
  browser transfers a ratio through to the width of one of those is engine
  trivia. The proportions come from `previewShape`, so the tiles and the preview
  behind the other tab cannot disagree about what shape a kind is.
- `lib/composerMeters.ts` — which figures the toolbar carries and when. Both are
  bare numbers with no ceiling written beside them, and a figure turns colour at
  the moment the limit is crossed, which is also the moment validation refuses
  the publish. The length is always carried, `0` included: a pill that appears
  on the first keystroke is a toolbar that changes shape while somebody is
  typing into it. The hashtag figure waits for a hashtag, because a post with no
  tags is the ordinary case rather than an empty one. Neither is rederived from
  `String.length` — see `lib/caption.ts` on why codepoints.
- `lib/footerControls.ts` — what the two controls at the bottom say and whether
  they are drawn joined. Where nothing can honour a time the left half is absent
  and the primary keeps both its corners.

`canAddMore` in `lib/composerDraft.ts` decides whether the strip still offers a
way in. A kind that takes ONE item always does, because adding to it replaces
what is there; only a carousel fills up.

## The preview

`PhonePreview` in the design system takes a shape, a name, a caption and its
slides as children. Its shapes are aspect ratios with chrome attached: a caption
under a feed post, over a vertical one, progress segments on a story. To change
what a post looks like, change the component; to change which shape a kind gets,
change the composer's mapping. The frame is drawn from `--radius-device` and
`--width-preview` and has no colour of its own, so it follows the theme.

`framed={false}` drops the bezel, for a panel where the frame is the noise.

## The queue

`lib/queue/` holds the two backends behind one interface. `canSchedule` is the
only thing that differs to a caller, and it decides whether a time control
exists at all. A deployment that grows a third store — somebody else's database,
a different host — implements `QueueBackend` and changes nothing above it.

The local backend's `LOCAL_CAP` bounds how much a browser keeps. Raising it is
free until the value stops saving; the oldest already-published posts are the
ones dropped, because those are on Instagram whatever this list says.

## What a post is sorted by

`orderOf` in `lib/postsStore.ts`: scheduled first, soonest at the top, then
drafts by when they were last touched. That is one function and every surface
reads it, so a different order is one edit rather than three.

## Keyboard

`lib/shortcuts.ts` is the single source of every binding AND of the `?` sheet —
`shortcuts.test.ts` fails if either grows an entry the other does not have. Do
not restate a key anywhere else; change the list.

Three sets, installed by three different components, because each one is only
live where its keys mean something. The workspace's set sits above all three
views. The calendar's set is installed by the calendar itself, because stepping
a period needs the day the calendar is anchored on and that anchor is the
calendar's own state — the address carries a month and no day. The composer's
two are installed by the composer and armed only while it is open.

Everything is scoped to the module root, so a key fires only while focus is
inside this module or nowhere at all: a host app's own `n` stays the host's, and
every one of these stands down while a dialog holds focus, because a dialog is
portalled outside that root. The composer's own two are the exception and pass no
root — the panel is portalled, so the root would switch them off exactly when
they are wanted, and the modal traps focus and makes the background inert, so
while it is open there is nowhere else a keystroke can have come from.

Only the composer's two reach into a text field (`scope: 'always'`), because they
are pressed with the caption box focused. Everything else is a bare letter and
must stay a letter while somebody is typing.

Escape is not bound. The dialog already closes on it, and its `onClose` is the
one guarded against closing over a post that is going out; a second handler on
that keystroke would be two closes racing. It is documented in the sheet as a
row with no binding id, which is also how the table's and the grids' own keys
are printed — a reader does not care which layer implements a key.

`/` reaches a view's own filter through the DOM: `data-publishing-filter` is the
contract, and what takes focus is the segmented control's roving tab stop. The
calendar has no filter and answers nothing.

## Motion, density, tokens

Everything visual comes from the design system's tokens — there is not a
hardcoded colour in this module, and no `dark:` variant anywhere, which is why
both themes work without either being tested separately. Reduced motion is
handled in the tokens too.

Layout is measured against the module's own box, not the window. A deployment
that mounts this in a 700px slot inside a 2560px page gets the narrow layout,
which is correct.
