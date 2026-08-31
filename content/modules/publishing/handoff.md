### Publishing (publishing)

Publishing to the Instagram account connected to the bot: feed photos, Reels,
Stories and carousels, written in a composer with a live preview of what the
post will look like, then published on the spot or put in a queue. Route:
`/publishing` (the calendar); `/publishing/queue` and `/publishing/library` are the
other two, and `?compose=<id>` or `?compose=new` opens the composer over any of
them. **There is no post entity on the API** — the four `instagramAccountPublish`
mutations take a bot id and some URLs, publish, and answer with an id and a
permalink. Everything with a status, a time or a history is this app's own, kept
in `lib/queue/`.

The workspace also owns the account gate, and it is three screens rather than
one: no connected account, an account connected without
`InstagramBusinessContentPublish`, and one that is ready. Asking up front is what
lets the composer be absent rather than present and broken — a publish into an
unpermitted account fails several seconds later, after the whole post has been
written.

Read `skill/references/guide.md` before changing the composer — the four inputs
are four shapes rather than variations on one, the five-minute wait on a Reel is
why publishing has a request budget of its own, and the double-publish guard has
a reason that is not obvious from the code. `skill/references/scheduler.md` is
the same for the queue: why it has two backends, and why only one of them may
show a time control. `skill/playbooks/customize.md` is the index of knobs.

First-task ideas:

1. Publish a photo, then watch the library: the post arrives on
   `botInstagramMediaAdded` without a refresh. Then publish a Reel and watch the
   request stay open for minutes — that single operation is why `RequestOptions`
   grew a per-request `timeoutMs` and the proxy grew a slow budget, and why both
   numbers have to be ordered rather than merely large.
2. **Make the composer seed itself from an existing post.** The library already
   opens `?compose=new`, and `InstagramMediaOne` already answers a caption and a
   file URL by id. What it does not do is carry that id into the composer. The
   interesting part is not the plumbing: it is deciding whether a republished
   photo reuses the original's URL — which works only while that URL is still
   reachable by Instagram's servers, and only they can say.
3. Add a field to a publish input. `lib/publishInput.ts` is the one map from a
   post to a mutation, and it is pure, so a new knob is an edit there, a case in
   its test, and a control in the composer.
4. Give the queue a second attempt policy. `cf_ig_reap` puts a stale claim back
   and fails it past a cap; the cap is a number, and what a good one is depends
   on whether the failure was Instagram refusing the media or a function being
   killed halfway. The API does not tell those apart, which is the real problem.
5. Show what a post did after it went out. Deliberately not built: no Instagram
   type in this schema carries a like, a reach or an impression, and
   `InstagramBusinessManageInsights` is a permission name with nothing behind it
   here. An analytics view would have to invent every number on it.
6. Put published media on the calendar. Also deliberately not built, and for a
   sharper reason: `InstagramPost`, `InstagramReel`, `InstagramAd` and
   `InstagramStory` carry no timestamp of any kind, so media that did not go out
   through this app cannot be placed on a day at all. The calendar is this app's
   queue over time; the library is the account's, ordered and undated.

Things that look like bugs and are not: a Story's composer has no caption field
because `InstagramPublishStoryInput` has no caption; the schedule control is
missing entirely in a deployment without the database half, because a queue only
a browser can read cannot make anything happen at a time; a publish that reports
success after its request appeared to fail is the double-publish guard working —
the request was lost, the post was not; and the library can look stale until
`instagramAccountRefetchLatestMedias` has run, because the connection serves what
the platform has already pulled down rather than what Instagram has.
