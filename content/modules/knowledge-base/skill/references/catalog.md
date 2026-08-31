# Catalog and specialists

What the assistant can offer, and who it can book with.

## The list

`bot.goodsCatalog` is one **unpaginated** array of a three-member union:

```
GoodsProduct | GoodsService | DeletedGoodsService
```

`DeletedGoodsService` carries nothing but a `__typename` — a booking can still point at a service that no longer exists, and this is how that appears. **Narrow before touching any field**; a naive `.map(item => item.title)` throws on the first deleted stub.

```graphql
GoodsProduct { id title description price { amount currency } isAvailable images }
GoodsService { id title description price { amount currency } isAvailable images durationSeconds }
```

Single items behave differently from each other, which is easy to trip over: `bot.goodsProduct(id:)` returns a concrete `GoodsProduct!`, while `bot.goodsService(id:)` returns the union `CommonGoodsService = GoodsService | DeletedGoodsService`.

## Two response shapes

| Mutation | Answers with |
|---|---|
| `GoodsProductCreate`, `GoodsProductDelete`, `GoodsServiceCreate`, `GoodsServiceDelete` | The **whole catalog** |
| `GoodsProductUpdate`, `GoodsServiceUpdate` | The **one item** |

So a store needs both paths: replace-everything, and merge-one-by-id. Keeping `byId` plus an `order` array makes the second cheap and keeps the first honest. The operations in `examples/operations.graphql` also re-select `usage { total catalog }` on create and delete so the budget moves with the change.

## Prices

`price.amount` is a **String**. `"29"` and `"29.00"` are both fine; a number does not typecheck, and a locale-formatted `"29,00"` comes back as `GoodsItemPriceAmountWrongFormat`. `currency` is the `GoodsItemPriceCurrency` enum — the full ISO list, so default a new item to the currency the rest of the catalog already uses rather than to USD on a EUR bot.

A null price is legal and common, and it has a real consequence worth saying out loud in a UI: the assistant will not quote a price it does not have.

## Images

REST first, GraphQL second:

1. `POST {base}/api/filestorage/upload/bot?fileType=Image&botID=<botID>` with a multipart `file` field.
2. Put the returned `FileID`s into the input's `images`.

The read gives you `File` objects; the write takes ids. Order matters — the first image is the one the assistant sends — so a picker that can only append is half a feature. `FileTooBig` and `FileContentTypeNotSupported` come back from the REST call, not from GraphQL.

## Who owns editing

`GoodsService` and `Specialist` are also edited by `../chatfuel-bookings/references/staff.md`: a service is a bookable thing there, with availability and a duration that drives the calendar. Two full editors over one entity drift, so the reference implementation shows services and staff here read-only, with a link into that module, and only edits them itself when bookings is not installed. They still appear, because they are part of what the assistant knows and they spend the same character budget.

## Specialists

```graphql
Specialist { id profile { firstName lastName aboutInfo logo } services { id } }
```

`SpecialistCreate/Update/Delete` take `SpecialistInfoInput` (profile + schedule + service ids). Avatars use the same `/upload/bot` REST endpoint. Per-specialist Google Calendar sync exists (`specialistStartGoogleCalendarSync` returns a `Task`, following `../chatfuel-core/references/files-tasks.md`) and belongs to the bookings domain.

Specialists cost characters like everything else, but the server folds them into `usage.total` rather than into `usage.catalog` — a budget breakdown has to count them separately.

## Limits

Two different ceilings, two different errors:

- `GoodsItemsTooMuchForBot` — too many items on this bot.
- `FuelyKnowledgeBaseLimitReached` — the character budget is full. Any goods mutation can return it.
