### Ads Optimization (ads-optimization)

Conversion reporting for click-to-WhatsApp ads, as one workspace: the event sets
on the left — the default one, then the custom sets that override it — and the
selected set open beside them. Route: `/ads-optimization`,
which lands on the default set; `/ads-optimization/<automationID>` opens a
specific set and `?e=<eventID>` opens that event's editor (`?e=new` an empty
one).

Two things are worth knowing before changing anything. First, **the default set
covers every ad and a custom set claims the ads it lists** — the default set has
no ad list at all, and that absence is what makes it the fallback. Second,
**every save rewrites the whole ordered list of events**: there is no add-one or
delete-one mutation, order is part of the stored value, and saving a set that
was still following the default takes a private copy and gives every event a new
id. Read `references/guide.md` in chatfuel-ads-optimization before touching the
write path.

Configured is not delivered: conversions go out only while the bot's WhatsApp
number carries `hasMetaConversionsAPIPermission`. The workspace reads it and
says so when it is false, because everything else on the screen looks the same
either way.

First-task ideas:
1. Open it, add an event to the default set with one of the seven triggers, and
   watch the rail count change.
2. Give a custom set its ads by pasting an Ads Manager link into the Ads box —
   `lib/adIds.ts` takes the ids out of `selected_ad_ids`.
3. Claim the same ad from two sets and see the chip name the rival
   (`lib/coverage.ts` is the whole of that; nothing on the server reports it).
4. Add a column to the events table — the row is in
   `components/EventsBlock.tsx` and the text it shows comes from
   `describeEvent` in `lib/summary.ts`.
5. Resolve the ad ids to real ads: `currentUser.metaAdAccounts` and
   `MetaAdAccount.ads(botID, platforms, first, after)` carry names, thumbnails,
   statuses and spend. Read `references/ads.md` first — the ads hang off the
   signed-in person's Facebook login, not off the bot, and there is no
   lookup-by-id.

Things that look like bugs and are not: an ad id is never checked against Meta,
so a typo saves happily; a contact-property condition the server dislikes is
stored anyway and comes back with its error attached; and one change can arrive
as several live updates, because every set that follows the one you edited is
republished too.
