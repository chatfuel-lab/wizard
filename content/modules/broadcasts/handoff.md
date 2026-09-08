### Broadcasts (broadcasts)

WhatsApp campaigns, the way a mailing tool does them. Route: `/broadcasts` is
the campaign list with a side panel, `/broadcasts/templates` the template
catalog, `/broadcasts/compose?c=<flow>&step=<name|message|audience|schedule|review>`
the composer over one draft. `⌘K` opens the palette anywhere in the module,
`?` the keyboard sheet.

Two things are worth knowing before changing anything. First, **a campaign is
a flow**: there is no campaign entity in the API. Every campaign is a flow the
dashboard's flow builder shows too, holding an entry point that carries the
audience and the schedule (a one-time notification for "send now", a
scheduled message for "later" and "on a repeat") connected to a template block
that carries the message. `lib/campaign.ts` reads that shape once and
everything on screen reads the record it produces; every write is a block
mutation keyed by one of the three ids on that record. Second, **nothing in
the API writes a WhatsApp template**: templates are written in WhatsApp
Manager and read here, and the catalog's "New template" is a door to Meta's
page, not a form. Read `references/campaign-model.md` and
`references/schedule.md` in chatfuel-broadcasts before touching the write
path; the first walks a campaign from nothing to sent, operation by operation.

First-task ideas:
1. Open a draft in the composer, pick a template, fill `{{1}}` with a contact
   field from the "Insert field" picker, and watch the phone preview change as
   the server answers.
2. Schedule a repeating campaign for Monday 01:00 on a bot east of UTC and
   read `repeatOnWeekdays` back — `lib/schedule.ts` is why it says Sunday.
3. Add a column to the list: `components/campaigns/CampaignsTable.tsx` draws
   from `CampaignRecord`, and `lib/campaign.ts` is where a new fact is derived.
4. Add a command to `⌘K`: one entry in `COMMANDS` in `lib/commands.ts` with a
   `when`, one handler in `hooks/useBroadcastsCommands.ts`, and the test tells
   you what you forgot.

Things that look like bugs and are not: a campaign taken off the schedule is a
**draft** again — the API has no paused state; a one-time campaign that has
started refuses every edit (`WhatsAppOneTimeBroadcastAlreadyStarted`) because
the send is already with the platform; the recipients count on a sent campaign
can stay empty — the API fills it only sometimes; the template catalog ignores
paging and answers the whole list; "Send now" campaigns are born with their
entry point enabled and cannot be disabled — the status is what counts;
"Schedule" can come back with nothing scheduled and no error — the server
re-validates and stays silent, so the composer re-reads and shows the verdicts;
and there are no delivery or read figures anywhere in the API, so the module
shows none.
