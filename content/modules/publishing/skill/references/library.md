# The account's media

## The connection

```graphql
bot(id: $botID) {
  instagramMediasConnection(first: Int!, after: InstagramMediasCursor) {
    edges { cursor node { ...InstagramMediaRef } }
    pageInfo { hasNextPage endCursor }
  }
}
```

Newest first. The same list hangs off `InstagramAccount.mediasConnection` for a
caller that already has the account id; the bot-scoped one is the right default
for an app scoped to one bot, because it needs no second lookup.

`InstagramMediasPageInfo` has **no `hasPreviousPage`** and there is no shared
`PageInfo` in this schema. This cursor walks forward only.

## Four types in a union, and they are not symmetrical

```graphql
union InstagramMedia = InstagramPost | InstagramReel | InstagramAd | InstagramStory
```

All four carry `id`, `isUnknown`, `caption`, `ownerUsername`, `file`,
`thumbnailPreview` and `url`. Two differences:

- `InstagramPost`, `InstagramReel` and `InstagramAd` carry `buildCommentURL` and
  `childMedias`; **`InstagramStory` carries neither**.
- **There is no carousel type.** A carousel is an `InstagramPost` whose
  `childMedias` is not empty. Anything that wants to show carousels apart from
  single photos derives that, and derives it in one place.

## `isUnknown` is a real state and appears in real lists

When `isUnknown` is true, treat the post as unknown: render a placeholder and
ignore every other field on it.

The platform returns these. A grid must draw a placeholder for them and must not
make them clickable — there is nothing behind one to open. Reading `caption` or
`url` on an unknown media is reading fields the flag just said to ignore.

The `file.url` of library media is a direct link that carries no expiry, unlike
a fresh upload — which is what makes "publish this again" and "schedule this
again" safe to build on.

## Refreshing

The connection serves the media this API already knows about. Media created on
the Instagram side is not in it until a refetch has run:

```graphql
mutation { instagramAccountRefetchLatestMedias(id: $accountID, count: 30) { … } }
```

Asking for more than 100 does not return more. Run the refetch before listing,
and it matters: a library that only ever reads the connection will look stale
and will be blamed for it.

There is a bot-scoped twin, `botInstagramRefetchLatestMedias(id: BotID!, count:)`,
if the account id is not to hand.

## Live

`botInstagramMediaAdded(id: BotID!)` fires when the platform **ingests** media —
which is not the same thing as the API publishing it, and the difference is
measurable. A successful publish emits nothing and does not appear in the
connection; `instagramAccountRefetchLatestMedias` a moment later fires the
subscription with exactly that post and adds it to the list.

So the subscription is how an ingest becomes visible without polling, and the
refetch is what causes one. A library that only subscribes will never show a
post this app just made. Deduplicate by id all the same: a refetch that ingests
a post already listed is a normal thing to happen.

On a bot with no Instagram connected the refusal arrives **inside a `next`
frame** as a result-level `errors[]` carrying `InstagramDoesNotConnected`, not as
a transport `error` frame. The subscription is not a place where nothing can go
wrong, and a client that only handles `error` frames will sit there looking
subscribed to something that refused it.

## No date, and what follows from it

None of the four types carries a timestamp. So:

- the list can be ordered (the connection is newest-first) but not **dated**;
- media cannot be placed on a calendar unless the app itself recorded when it
  went out;
- "posted last Tuesday" is not a question this API answers.

A calendar built over this is therefore a calendar of the app's own queue, and
the library is a separate surface — ordered, paged, and undated. That is a
modelling truth, not a limitation to apologise for on screen.

## Reusing a post

`instagramAccount.media(id: InstagramMediaID!)` answers one media, or null when
the id is unknown or belongs to another account. It is what "make another one
like this" is built on: the caption comes back to be edited, and `file.url` is a
link that can be published again if it is publicly reachable — the same question
`references/guide.md` raises about every URL, with the same answer.
