# Files & async tasks

## Files

`File` entity: `{ id: FileID!, url, type: Image|Video|Audio|Document, status, size }`.

- `status: Expired | NotDownloaded | DownloadInProgress | Downloaded | Failed`. **If `status == Expired`, do not request or use any other field** — the file no longer exists. `fileStartDownload(id)` asks the platform to (re)fetch a remote file's bytes; poll `file(id)` until `Downloaded`.
- GraphQL never accepts file bytes — **uploads are REST**, returning a `FileID` that you then pass into a mutation input:

| Endpoint (POST, multipart field `file`, `Authorization: Bearer <token>`) | Used for |
|---|---|
| `{base}/api/filestorage/upload/livechat?fileType=&botID=&contactID=` | chat attachments (the chatfuel-livechat skill) |
| `{base}/api/filestorage/upload/bot?fileType=&botID=` | CSV imports, catalog images, specialist avatars |
| `{base}/api/filestorage/upload/widget?fileType=&botID=` | widget avatar |
| `{base}/api/filestorage/upload/plugin?fileType=&botID=&pluginID=` | WhatsApp template header media |
| `{base}/api/filestorage/upload/useraccount?fileType=` | user profile pictures |

`fileType` is one of `Image | Video | Audio | Document`. Upload errors mirror the GraphQL codes: `FileTooBig`, `FileContentTypeNotSupported`.

Through the app's proxy these are the only five paths under `/api` that are forwarded, and three rules apply to them there: **`botID` is required** on the four bot-scoped ones (it is the only thing the proxy's fence can check, so an upload without it answers `400 InvalidRequest`), the method must be `POST` (anything else is `405`), and `useraccount` — which writes to the Chatfuel account behind the deployment's own token rather than to any caller's bot — is refused `403 AccountOperationBlocked` whenever the auth gate is on.

## Async tasks (`Task`)

Long-running jobs (CSV contact export, specialist Google-Calendar sync) return a `Task`:

```graphql
Task {
  id
  statuses { type startedAt }   # HISTORY, not a single value
  completedPoints
  totalPoints
  data { ... }                  # per-job payload, e.g. CSVContactsExport { file }
  deadline
}
```

Rules:

1. **`statuses` is a history** — the current status is the entry with the latest `startedAt` (`Created | InProgress | Paused | Cancelled | Failed | Finished`), not `statuses[0]`.
2. Progress is approximate: `completedPoints` can exceed `totalPoints`, and a task may finish before they converge. Render progress defensively.
3. **Past `deadline` ⇒ treat the task as failed/timed out** even without a `Failed` status.
4. Track via `getTask(id)` polling or the `taskUpdated(id)` subscription.
5. Cancellation lives in the owning domain, not on Task (e.g. `csvContactExportCancel`), and is async — wait for a `Cancelled` status.
6. `data` is an interface — always select `__typename` and the concrete type's fields (e.g. `... on CSVContactsExport { file { ... } }`). An `UnavailableTaskData` branch means no access.

## The three async patterns in this API

1. **Task-tracked**: mutation returns `Task` → `getTask` / `taskUpdated` (CSV export, GCal sync).
2. **Domain subscription**: mutation returns the entity or `Boolean`, completion arrives on a dedicated subscription (`csvContactImportUpdated`, `whatsAppBusinessPhoneNumberUpdated`, `metaAdsSyncStateUpdated`, `fbPagesSyncStatusUpdated`).
3. **Timestamp polling**: fire-and-forget mutation, then poll a `...LastUpdatedAt` field until it advances (WhatsApp business-entities refetch).

The mutation's return type in `references/schema.graphql` tells you which pattern applies: `Task` is pattern 1, the entity or `Boolean` is pattern 2 or 3 — look for a matching subscription first, and fall back to a `...LastUpdatedAt` field. The bundle carries no descriptions, so there is no doc-comment to confirm it from; the examples in this module show each pattern end to end.
