# Customizing the admin panel

Every knob, and what moving it costs.

## The door

| Knob | Where | Notes |
|---|---|---|
| Session length | `ADMIN_SESSION_MS` in the vendored proxy's `adminSession.ts` | Two hours. Signing out revokes only on the instance that served it, so on a serverless host this clock and a password rotation are the whole of revocation — a long session is a long-lived stolen cookie. |
| Password floor | `ADMIN_MIN_PASSWORD_LENGTH`, same file | Lowering it lowers the only defence that survives a host with per-request instances. |
| Attempts before the wait starts | `FREE_ATTEMPTS`, same file | Three, so a typo costs nothing. |
| The flat pause | `ADMIN_ATTEMPT_DELAY_MS`, same file | Applies to a right answer as well as a wrong one. That is the point. |
| The required header | `ADMIN_HEADER`, same file, and `lib/adminApi.ts` in the module | Rename it in both or every call is refused. |

## The panel

| Knob | Where |
|---|---|
| Which tabs exist | `VIEW_COMPONENTS` in `AdminWorkspace.tsx` and the tab list in `components/AdminHeader.tsx` |
| The address | `lib/adminParams.ts` — the view is a path segment, the workspace and the open bot are query keys |
| What one bot shows | the `BOT_QUERY` selection in the vendored proxy's `adminRoutes.ts`, then `components/BotPanel.tsx` |
| Channel names | `CHANNEL_LABELS` in `components/BotPanel.tsx` — the API exposes only a `__typename` |
| Health tiles | `components/HealthGrid.tsx`, over what `GET /chatfuel/admin/health` returns |

## The rail item

There is not one. `railHidden: true` in `index.tsx` keeps the module out of the
menu permanently, and `/admin` is the whole way in — before unlocking and after.

Dropping that line puts an Admin item in front of every user of the deployment,
signed in or not. On a deployment with customers that is the wrong list to be
on; on a single-operator one it is a convenience. It is one word either way.

## Billing

The workspace panel shows a subscription status. It is asked for in its own
query whose failure costs nothing, because the schema this app vendors
(`src/vendor/schema/`) carries no Stripe or Subscription declaration at all —
that field is never in the field set your queries can select. Drop
`BILLING_QUERY` and the `subscription` line in `handleWorkspace` to take it out
entirely; nothing else depends on it.
