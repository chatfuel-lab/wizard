# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. What is worth knowing here:

## One surface, three columns

`components/channels/ChannelsView.tsx` is the whole module below the header: the
rail of 18 sources (`ScopeRail`), the selected source's page (`ScopePage` —
`ScopeHeader`, the Default rules `BaseCard`, the `RulesList` of `RuleCard`s) and
the Test panel (`components/panel/TestPanel.tsx`), a column beside the page from
the `wide` band up and a section under it below (`lib/layout.ts`
`PANEL_INLINE_FROM`). `AutomationsWorkspace.tsx` owns the URL, the keyboard, ⌘K,
the New-rule dialog, the dirty guard and the panel's target — the rule the
reader last expanded, else the source's Default.

## The store, and why there is only one

`FuelyAutomationList` without a scope returns every automation of the bot, so
`lib/automationsStore.ts` holds them all in `byId` and everything derives what it
shows with selectors. Own mutation responses and subscription events go through
the SAME `live` action, so an edit of yours and an edit of a teammate reconcile
on one path. Trim `lib/scopes.ts` to hide sources you do not use — the rail and
the palette read that table.

## Which settings save at once, and which are drafts

Switches, selects and radios write on change through `hooks/useAutomationMutations.ts`
(toast + undo). Prompts and lists are drafts (`hooks/useSettingDraft.ts` +
`lib/drafts.ts`) with Save / Cancel, ⌘S, a dirty guard on navigation and a
"Changed elsewhere" banner when the server moves under an unsaved draft. To flip a
setting from one model to the other, change its editor in `components/editors/`;
nothing else knows the difference.

## Composites, templates

- `lib/composites.ts` — duplicate / copy-to / every-rule on-off / restore /
  from-template as step plans over the API's single-write mutations, run
  strictly sequentially with a backoff on the per-bot edit lock. New composite =
  a new planner + a test.
- `lib/templates.ts` — the starters in the New-rule dialog; each declares the
  scopes it applies to and builds the settings it pre-fills.

## Icons

`components/channels/PlatformGlyph.tsx` is the platform's glyph, on the rail's
group headings and the scope page. `components/channels/ScopeGlyph.tsx` is the
source's, on the rail rows — keyed by what a contact did (a direct message, a
comment, a story reply, a link, an ad) rather than by platform, because the
platform is already the heading above the row and three quarters of the short
labels repeat across the groups. Adding a source to `lib/scopes.ts` means adding
its glyph here; the record is exhaustive, so leaving it out is a type error.

## The keyboard and the palette

`lib/shortcuts.ts` and `lib/commands.ts` are data with tests that keep the `?`
sheet and the handlers in step. Add a binding in one place, document it in the
other; the test fails if either drifts.

## The test corpus

`lib/samples.ts` is one mutable dataset ("Luma Skin Studio"): 18 bases, eight
rules covering every filter type, an edit-lock rule, a rule that would 500 on
save, an unknown 16th setting, connected Instagram + WhatsApp and a disconnected
Facebook. The unit tests over the store, inheritance, the setting rows and the
rule summaries all read it — add a case there when you add a path.

## The test chat

`references/test-panel.md`. A session pinned to an automation bypasses `enabled`
and every filter — say so wherever you surface it, or a keyword filter will look
broken.
