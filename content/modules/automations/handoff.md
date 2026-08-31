### AI Automations (automations)

The workspace over the bot's AI, one surface behind `/automations`: the rail
of 18 sources on the left, the selected source's page in the middle — the
Default rules card and, where the source accepts them, the custom rules —
and the Test panel always open on the right. All 15 settings, with inheritance
shown as *Follows Default* / *Customized* (+ a compare popover and Revert);
prompts and lists edited as drafts with Save / Cancel and ⌘S, switches and
selects saving on change with an undo; real pickers for Instagram media,
Facebook posts and Meta ads, teammates and contact attributes; duplicate, copy
settings to other sources, delete with restore, every rule of a source on / off,
templates in the New-rule dialog. The Test panel is a preview chat pinned to
the source's Default or the rule the reader last opened.

Everything derives from one store: `FuelyAutomationList` without a scope, kept
fresh by `fuelyAutomationUpdated` (one edit fans out to every inheritor).
Deep links: `/automations?scope=…&automation=…&setting=…&new=…`. ⌘K, `?`,
⌘S, ⌘Z, `/`, `[` `]`, `n`, `r`. Read `skill/references/guide.md` before
changing anything — the confirmed traps are at the end of it.

First-task ideas:

1. **Send events to Meta is not this module's job.** `FuelySettingSendEventsToMeta`
   and `whatsAppBusinessAccount.hasMetaConversionsAPIPermission` are in the
   schema, but this module renders the setting as "Managed in the Chatfuel
   dashboard" on purpose — `ads-optimization` owns editing it. Do not add an
   editor for it here.
2. **Verify the two unverified pickers.** The `ListOfPosts` (`FbPagePost.id`)
   and `ListOfAds` (`MetaAd.metaAdId`) paths are not verified against live data
   — verify them on your own account. Both drawers ship with a "paste an id"
   fallback and say so; confirm
   on a bot that has them and delete the caveat.
3. **A per-rule "why did it not answer?"** The API has no dry-run: the direct
   test bypasses `enabled` and every filter, so a rule that would never match
   still answers. A client-side matcher over the rule's keywords / posts / ads
   against a pasted comment would close the gap the preview cannot.
4. **Ordering between rules.** Two rules on one source can both match and the
   API has no priority field — the server decides and does not say how. If it
   ever grows one, the rules list on the source page is where it belongs (drag
   to reorder).
5. **A cross-source view.** The five-view build (an Overview with readiness
   checks, a Rules table, a Handoff & Leads matrix, a Playground with a routed
   "as a customer" mode) is not built — the store already holds every
   automation of the bot, so any of them is a selector plus a table if the need
   returns.

Deliberately not built, and why:

- **Per-scope working hours** — `WhenAIReplies` is a two-value enum; the hours
  live once, globally, in the knowledge base. The editor links there.
- **Per-scope persona / tone / language** — the legacy `fuelyConfigSet*` setters
  are not in this schema, and agent name and language are not readable either:
  they left `FuelyKnowledgeBase` with the rest of the persona fields.
- **A rules dry-run, versions, an audit log, priority ordering, AI analytics** —
  none exist in the API.
- **Demo rules** — a rule added for show would change how the bot answers
  real customers, so the New-rule dialog's templates are the demo instead.

Things that look like bugs and are not:

- The **Default (All channels)** source cannot be tested on its own — the API
  refuses it (`PreviewResponsesFuelyAutomationScopeNotPreviewable`): it is the
  root others inherit from, never a message source. Open a source; its Default
  rules apply there and the panel tests them.
- A **disabled rule still answers in the Test panel**, and so does one whose
  keywords do not match: the test calls the automation directly, routing is not
  emulated. The panel says so.
- **Bookings' "AI autonomy"** is read-only and links here: on a migrated bot the
  value the AI obeys is the Default automation's Booking rules.
- Facebook sources are shown, and
  the widget source is shown with the widget disabled — a source can be on with
  its platform not connected; the rail's connection chip and the panel say so.
