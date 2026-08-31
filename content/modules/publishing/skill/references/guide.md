# Publishing to Instagram

*What a publish costs, that the media subscription does NOT fire on one, the
four refusal codes, the caption limit and its unit, and the reachability and the
lifetime of an uploaded file.*

## The model

There is no post entity. `instagramAccountPublish{Image,Reel,Story,Carousel}` take a
`botID` and an input, do the work, and answer with `InstagramPublishedMedia { id
permalink }`. There is no post entity in this API — that type is the return of the four
publish mutations and of nothing else, and no query reads published media
back — so a draft, a scheduled time, a failure worth
retrying and the history of what went out are all things an app has to keep for
itself. `references/scheduler.md` is where that goes.

The account itself is reached through the bot's contact scopes, not off the bot
directly:

```graphql
bot(id: $botID) {
  contactScopes {
    ... on InstagramAccountContactScope { instagramAccount { id username permissions } }
  }
}
```

That single query answers three different screens, and they must not be
collapsed into one:

| What comes back | What it means | What to offer |
|---|---|---|
| no `InstagramAccountContactScope` | nobody has connected an account | the connect flow |
| a scope, `permissions` without `InstagramBusinessContentPublish` | connected with the `Minimal` group | the re-grant flow |
| a scope with that permission | ready | the composer |

`env.instagramPermissionGroups` confirms the split: `Full` carries
`InstagramBusinessBasic`, `ManageMessages`, `ManageComments` and
`ContentPublish`; `Minimal` carries only `InstagramBusinessBasic`. So
`instagramOAuthMakeUrl(permGroup: Full)` is the URL for both connecting and
re-granting.

Asking up front is what lets a composer be absent rather than present and
broken. A publish into an unpermitted account fails several seconds later with
`InstagramMissingPermissionsOrExpiredToken`, after somebody has written the whole
post.

## The four shapes

They are not variations on one input. Read them as four:

```graphql
input InstagramPublishImageInput { imageURL: String!, caption: String }
input InstagramPublishReelInput  { videoURL: String!, caption: String,
                                   coverURL: String, shareToFeed: Boolean, thumbOffset: Int }
input InstagramPublishStoryInput { mediaType: Image|Video, mediaURL: String! }
input InstagramPublishCarouselInput { items: [{ mediaType: Image|Video, mediaURL: String! }],
                                      caption: String }
```

Three differences that shape a UI:

- **A Story has no caption.** Not an optional one — the field does not exist. A
  composer switching to Story removes the caption control rather than disabling
  it.
- **The URL field is named differently in each.** `imageURL`, `videoURL`,
  `mediaURL`. There is no shared media input to build once.
- **A carousel is 2 to 10 items and cannot contain a Reel.** Neither limit is
  expressed in the SDL, so enforce both in the composer; the server answers
  `InstagramCarouselSizeInvalid` for the first.

## URLs, not files

Every publish input takes a link, and **Instagram fetches the bytes itself**. That
is the constraint everything else about media follows from: the URL has to be
reachable by a server on the other side of the internet with no session, no
cookie and no header.

The proxy requires every one of those links — the media items and a reel's
`coverURL` alike — to be `https:`, and refuses the whole post with a sentence in
the row rather than dropping the item that failed. The deployment is naming an
address for somebody else to open, so a `file:` or a plaintext `http:` to an
address only reachable from inside is not a post. Which https hosts are
acceptable is Instagram's policy, and the proxy does not invent a list of its
own.

Chatfuel's own upload is REST and returns an id, not a link:

```
POST {base}/api/filestorage/upload/bot?fileType=Image&botID=…   (multipart, field "file")
→ { "id": "<storage path>", "status": "downloaded", "size": 23498,
    "createdAt": "…", "deleteAfter": "…" }
then  query { file(id: $id) { url status } }
   → a download URL
```

Two things about that decide the design.

**The URL carries no authorization.** Instagram has to fetch it itself, so it
cannot be behind a header, and an upload can be published straight from it with
no other storage in the way. Treat anything uploaded as reachable by whoever
holds the link, and put nothing there that must not travel. (Note the id is a
*path*, not a uuid; nothing should assume a uuid shape.)

**And it does not last.** The upload response carries a `deleteAfter`, and
**that field does not exist on the GraphQL `File`** — which is
`{ id url type status size }` and nothing else. So a client cannot see the
expiry at all; it can only know that it is there.

The window is generous for publishing now and worthless for publishing later. A
post scheduled for tomorrow morning with an uploaded photo fails at the platform
with nothing useful to say, because by then Instagram is fetching a URL that no
longer resolves. So the three media sources are not interchangeable:

| Source | Public | Survives a schedule |
|---|---|---|
| platform upload | link-reachable | **no — short-lived** |
| media already on the account | link-reachable | yes |
| a link somebody pasted | theirs to keep alive | theirs to keep alive |
| a bucket the deployment controls | yes | yes |

An app that schedules needs the last row. An app that does not, does not — which
is the same distinction as `canSchedule`, seen from the media side.

`File.status` is `Expired | NotDownloaded | DownloadInProgress | Downloaded |
Failed`. Poll while it is `DownloadInProgress`, and **when it is `Expired` do not
read any other field** — the file is gone.

## The wait

`instagramAccountPublishReel` blocks inside the mutation while Instagram
transcodes the video. It can run up to five minutes, and there is no
subscription to poll instead and no container id to check: the mutation returns
when the platform is done.

This breaks a client tuned for a normal API in two places at once — the HTTP
client's own timeout, and any proxy in between. Both need a budget for these
four operations specifically. Raising the default everywhere instead means a
dead upstream is felt five minutes late on every other request in the product.

The ceiling is the host's, not the API's: a serverless function killed at five
minutes takes the request with it whether or not Instagram is finished.

Even the cheap case is not cheap. A single feed **image**, already uploaded, is
seconds rather than milliseconds. Nothing here is a form submit, and an
in-flight state that looks stuck after two seconds will be reported as a bug.

## Publishing twice is the failure mode that matters

A publish whose HTTP call dies may well have succeeded — the request was lost,
the work was not. Retrying it posts the same thing to the account twice, and
there is no delete in this API to undo it with.

**The obvious answer is a different one.** `botInstagramMediaAdded(id: BotID!)`
reads like it was written for this:

> Emits an event when a new InstagramMedia appears on the Instagram account
> connected to the bot.

It is not. Publishing an image succeeds with an id and a permalink, and no
event follows it; `bot.instagramMediasConnection` does not carry the post yet
either. `instagramAccountRefetchLatestMedias(count: 30)` is what brings both:
the subscription then fires carrying exactly that post, and the connection has
it.

So the event marks the platform **ingesting** media, not this API publishing it.
A guard that waits on the subscription after a publish waits for the wrong
thing.

**What does work** is a diff across a refetch:

1. **Before** publishing, read `instagramMediasConnection(first: 25)` and keep
   the ids. One cheap request, and the only thing that makes the diff afterwards
   mean anything.
2. Publish.
3. On success there is an id and a permalink; nothing else to do.
4. On a **transport** failure — a timeout, a dropped connection, a 5xx — the
   post may have landed. Then, inside a bounded window: refetch, read the
   connection again, and take the ids that were not there before. A candidate
   whose caption is the caption that was sent **is** the post: record its id and
   its `url` and report success. Ingestion is not instant, so this is two or
   three rounds rather than one.
5. Only when the window closes with nothing is a retry safe.

A **domain** error skips all of it. `InstagramCarouselSizeInvalid`,
`InstagramPublishCaptionTooLong`, `InstagramDoesNotConnected` and
`InstagramMissingPermissionsOrExpiredToken` are refusals: nothing was published
and a retry is immediately safe.

A Story has no caption to match on, so the diff is all there is — any new Story
inside the window is the one.

The same asymmetry decides how long the window should be. Too short and a slow
ingest reads as a failure, which offers a retry that posts twice; too long and a
genuine failure takes longer to report. Only one of those is unrecoverable.

**And the same finding has a second consequence**: after any successful publish,
something has to run the refetch, or the post that was just made does not appear
in the account's media at all and the operator concludes it failed.

## Error codes

In `DefinedErrorCode`:

```
InvalidIGToken                            InstagramDoesNotConnected
InstagramMissingPermissionsOrExpiredToken NoAccessToInstagramAccount
InstagramPublishCaptionTooLong            InstagramCarouselSizeInvalid
InstagramPublishContainerProcessingFailed InstagramPublishContainerNotReady
OAuthInstagramAccountMismatch
```

⚠ `instagramAccountPublishImage` can return `IGPermissionMissing`, which is **not a
member of the enum** — the enum never listed it, and the bundled SDL carries no
descriptions to warn you. So switch on the raw
`extensions.code` string with a fallback branch, not on an exhaustive enum that is
not exhaustive.

The envelope nests the real code two levels down, and the platform's own
message is worth more than a rewrite:

```
errors[0].extensions.errors[0].extensions.code      // the code to switch on
errors[0].extensions.serviceName                    // which upstream service refused
```

A malformed post is refused quickly and never costs the five-minute wait — but
it still costs a round trip, which is why the size and item-count rules are
written on the client too.

`InstagramPublishContainerProcessingFailed` is Instagram rejecting the media
itself — the wrong aspect ratio, a codec it will not take, a file too long. The
platform does not say which, so the message it gives is the most an app can
show.

## Limits worth knowing, and where they are enforced

- **Caption: 2 200, counted in CODEPOINTS.** The number is not in the schema;
  over it the server answers `InstagramPublishCaptionTooLong`. The unit matters
  as much as the number — an astral character (👋, four UTF-8 bytes and **two**
  UTF-16 units) counts as one. So count what `[...caption].length` counts: a
  counter built on `caption.length` over-counts every emoji, and a legal caption
  of 1 200 of them reads as 2 400 and gets refused by its own client.
- **Hashtags**: Instagram counts 30 and quietly ignores the rest. Nothing in
  this API mentions them, and there is no hashtag type anywhere in the schema.
- **Publishing rate**: Instagram throttles published posts per rolling 24 hours,
  at `media_publish` rather than at container creation. Neither the number nor
  the remaining allowance is exposed here, so it arrives as a failure and is
  reported as one.

## What this part of the API does not have

Checked, so nobody goes looking twice:

- **No scheduling.** The only `scheduledPublishTime` in the schema is on
  `FbPagePost`, and it is read-only.
- **No metrics.** `InstagramPost`, `InstagramReel`, `InstagramAd` and
  `InstagramStory` carry no likes, no reach, no impressions.
  `InstagramBusinessManageInsights` exists as a permission name and there is
  nothing behind it here.
- **No timestamp.** Those four types carry no creation date either, which is why
  media published outside your app cannot be placed on a calendar.
- **No hashtags, locations, user tags, product tags, collaborators or alt text**
  on any publish input.
- **No delete, and no edit.** Once it is on the account this API is finished with
  it.
