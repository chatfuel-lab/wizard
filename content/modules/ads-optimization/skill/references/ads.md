# Ad ids

## What the API stores

`FuelySettingListOfAds.adIDs` is a list of opaque strings. At most 50, each at most 60 characters. Blanks and repeats are dropped before validation.

**They are not checked against Meta.** Any string under the ceiling is accepted, no query turns an id back into an ad, and nothing reports that an id names an ad that was deleted, paused or never existed. An interface that implies otherwise is lying: validate the *shape*, flag what is obviously wrong, and never claim an id is real.

## Where people get them

Nobody reads an ad id off a screen. They open the ad in Meta's Ads Manager and copy the browser's address bar, which looks like one of these:

```
https://adsmanager.facebook.com/adsmanager/manage/ads?act=1234567890&business_id=…&selected_ad_ids=120210000000000010%2C120210000000000020
https://business.facebook.com/adsmanager/manage/ads/edit?act=…&selected_ad_ids=120210000000000010&nav_entry_point=…
…/adsmanager/manage/campaigns?act=…#selected_ad_ids=120210000000000010,120210000000000020
```

So the input takes free text and finds the ids in it. Two rules make that safe:

1. **When `selected_ad_ids=` is present, trust it exclusively.** `act=` and `business_id=` are digit runs too, and taking either for an ad id silently points a set at nothing.
2. **Otherwise, take every whitespace- or comma-separated token that is a bare 15-20 digit run.** A URL without the parameter carries no id worth trusting; ignore it rather than erroring.

Keep the order, drop repeats, and never turn an unrecognised token into an error — people paste whole sentences.

Linking back out is the reverse, and it must be built from the ad id itself:

```
https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=<adID>
```

## What only you can work out

Nothing on the server reports that **two custom sets claim the same ad**, and one of them silently loses. The whole list is in hand after one query, so build the reverse index — ad id to the sets claiming it — and say which other set holds it. The same pass finds blank entries and ids that are not shaped like ids at all.

## Ads the API does expose, and why they are not here

`currentUser.metaAdAccounts` lists the Meta ad accounts the signed-in person's Facebook login can reach, and `MetaAdAccount.ads(botID, platforms, first, after)` pages the ads inside one, with `name`, `thumbnailURL`, `effectiveStatus`, budgets, and both Meta's own insights (impressions, clicks, spend, CTR, messaging connections) and Chatfuel's own click count. The window that count covers is not in the schema, so do not label it with one. `metaAdsSyncStart` refreshes them.

Three things to know before building on it:

- It hangs off the **user**, not the bot: no Facebook account answers `FacebookAccountRequired`, and no `ads_read` permission answers `FacebookAdsReadPermissionRequired`. Re-granting is an interactive Facebook consent.
- `MetaAd` cannot be looked up by id. Resolving the ids in a set means paging an account and matching `metaAdId` client-side.
- The insights carry **no date range**: one aggregate figure per ad, no frequency, no cost-per-anything, no conversions. Every rate an interface shows has to be derived, and no trend can be drawn from a single snapshot.
