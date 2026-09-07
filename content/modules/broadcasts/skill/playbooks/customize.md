# Customizing this module

Every knob, and what moving it costs.

## The list and the model

| Knob | Where | Notes |
|---|---|---|
| The flow group campaigns are created in | `CAMPAIGNS_GROUP_NAME` in `hooks/useCampaignsStore.ts` | Found by name on every create, made when missing. Renaming the group in the dashboard makes the next create a second group. |
| What counts as a campaign | `findSettingsBlock` in `lib/campaign.ts` | A flow whose entry point is a one-time notification or a scheduled message. A flow with both keeps the first. |
| The status words | `STATUS_LABELS`, `KIND_LABELS` in `lib/campaign.ts` | Four statuses: draft, scheduled, sending, sent. There is no paused. |
| How status is derived | `statusOf` in `lib/campaign.ts` | From live behaviour: read `references/campaign-model.md` before changing it. |
| The list columns | `components/campaigns/CampaignsTable.tsx` | Draws from `CampaignRecord`; a new fact is derived in `lib/campaign.ts` first. |
| What a row's menu offers, by status | `campaignMenuItems` in `components/campaigns/CampaignRowMenu.tsx` | Edit, take off the schedule, duplicate, delete — see the table in `references/campaign-model.md`. |
| The re-read throttle | `REFETCH_THROTTLE_MS` in `hooks/useCampaignsStore.ts` | How long a tab may have been away before coming back re-reads the list. |
| The sending poll | `SENDING_POLL_MS` in `hooks/useCampaignsStore.ts` | A one-time send is over in seconds; nothing announces it. |
| How long past its time a one-shot is still polled | `SENDING_POLL_WINDOW_MS` in `hooks/useCampaignsStore.ts` | An hour. After that the row keeps saying sending until Refresh reads it. |
| What a new draft is called | `NEW_CAMPAIGN_NAME` in `BroadcastsWorkspace.tsx` | The name step renames it; a draft is born scheduled and "send now" is a switch there. |
| The clock | `NOW_TICK_MS` in `lib/zone.ts` | How often "now" moves everywhere it is read. |

## The composer

| Knob | Where | Notes |
|---|---|---|
| The steps and their order | `COMPOSER_STEPS` in `lib/broadcastsParams.ts` | name, message, audience, schedule, review. The address carries the open one. |
| When a step counts as done | `lib/composerSteps.ts` | `firstInvalidStep` is where a reload lands; a one-time draft skips the schedule step. |
| Which composer step a verdict belongs to | `PROBLEM_AREAS`, `problemArea` in `lib/errors.ts` | Marks the stepper and groups the review step's list. |
| Which templates the composer offers | `sendableTemplates` in `lib/templatePreview.ts` | Approved AND supported by the flow builder. The catalog tab shows every status regardless. |
| What the template picker searches | `templateSearchTexts` in `lib/templatePreview.ts`, used by `components/composer/TemplatePicker.tsx` | Name, body, category, language, a text header. |
| The blanks and their keys | `templateFields` in `lib/templatePreview.ts` | `header:1`, `body:2`, `button:<id>:<name>`, `code:<id>` — the fill store, the form and the error mapping share them. |
| Which names may be inserted into a parameter | `hooks/useParamAttributes.ts` | The WhatsApp attribute catalog, and only that: a free name creates an attribute on the bot. |
| The phone frame around the preview | `components/composer/PhonePreview.tsx` | Draws `components/TemplatePreviewCard.tsx` inside it. |
| Which weekday is first in a week | `WEEK_ORDER` in `lib/schedule.ts` | Display only; the wire order is the schema's. |
| The every-N-days range | `EVERY_N_DAYS_MAX` in `lib/composerSteps.ts` | 1–365. The server refuses above 1000 with a bare error. |
| How many dates a repeat may list | `DATES_MAX` in `lib/composerSteps.ts` | 500, the server's ceiling. |
| The order the schedule is written in | `hooks/useSchedule.ts` | Repeat type, then its list, then the first send time last. Do not reorder: `references/schedule.md`. |
| The audience presets | `components/composer/AudienceStep.tsx` | "Everyone" and "Contacts who…"; the second opens the builder. |
| The operators the builder offers | `OPERATORS`, `OPERATOR_LABELS` in `lib/audienceFilter.ts` | The eight the server takes; adding one needs the server to have it. |
| The builder's caps | `lib/audienceValidation.ts` | 20 predicates, 10 groups, and the issue levels. |
| How the recipient count is debounced | `hooks/useAudience.ts` | The wait after the last change before the segment is written and counted. |
| The attribute catalog behind the builder | `hooks/useAttributeCatalog.ts` | Pages of a hundred, up to five; failure leaves the picker on free text. |
| What a copy is called, and what it copies | `duplicateCampaign` in `lib/duplicate.ts` | "<name> copy"; template, parameters, media, audience, repeat — not the first send time. |

## The catalog and the hand-off

| Knob | Where | Notes |
|---|---|---|
| How long after asking Meta the catalog is re-read | `REFETCH_DELAYS_MS` in `hooks/useWhatsAppTemplates.ts` | Two looks, because the first can be early. |
| The WhatsApp Manager address | `whatsAppManagerUrl` in `lib/waManager.ts` | Built from the WhatsApp Business Account behind the bot's number. |

## Words

| Knob | Where | Notes |
|---|---|---|
| The error sentences | `MESSAGES` in `lib/errors.ts` | Keyed by `extensions.code`, nested or top-level. |
| The verdict sentences | `PROBLEM_TEXTS`, `problemText` in `lib/errors.ts` | Keyed by the snake_case validation codes. |
| The repeat sentence | `describeRepeat` in `lib/schedule.ts` | What the list and the panel print for a repeating campaign. |

## The keyboard and the palette

| Knob | Where | Notes |
|---|---|---|
| The keyboard | `lib/shortcuts.ts` | The `?` sheet is rendered from the same table; `shortcuts.test.ts` pins the two. |
| What ⌘K offers in which state | `COMMANDS`, `commandDefs` in `lib/commands.ts` | Pure, tested: each command's `when` is the whole rule for its presence; one "Open <name>" row per campaign. Keys beside a command are read from `lib/shortcuts.ts`, never typed again. |
| What the palette can see and do | `hooks/useBroadcastsCommands.ts` | The context and the handlers, from the two shared stores and the workspace. |
| The palette's icons | `components/BroadcastsCommandPalette.tsx` | The thin shell over the design system's `Command`. |
| The rail item | `index.tsx` and the `growth` group in the app's nav table | The module sits under Growth in this shell. |

**Not a knob: delivery figures.** The API has none for a template block, and a
number invented from the recipient count would be a lie on the screen.

**Not a knob: a template editor.** Nothing in the API writes a Meta template;
the catalog's "New template" is the door to WhatsApp Manager and must stay one.
