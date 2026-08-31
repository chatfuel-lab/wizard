---
name: chatfuel-automations
description: Configure how a Chatfuel bot's AI behaves via the GraphQL API — the per-scope AI behaviour settings behind the dashboard's Automations tab. Base ("Default") and custom automations ("rules") per scope (18 channel + entry-point sources), the 16 FuelySetting types, inheritance from the All base, the single @oneOf write path, the fan-out subscription, and the preview chat pinned to one automation. Use when configuring a bot's AI replies, keyword/post/ad filters, follow-ups, switch-to-human rules or lead capture, when testing an automation, or when building an AI-automations workspace. Requires the chatfuel-core skill (auth, CORS proxy, schema).
---

# Chatfuel Automations

The dashboard's **Automations** tab: how the bot's AI behaves, configured per *scope* (a channel + entry point). Not to be confused with **Flows** (scripted canvas logic — the chatfuel-flow-builder skill).

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Quickstart: configuring the bot's AI

```
0. subscribe = FuelyAutomationUpdated           -> FIRST: it needs 1–3 s before it delivers
1. list   = FuelyAutomationList                 -> omit $scope: every base + every rule, one request
2. toggle = FuelyAutomationSetEnabled           -> on the All base = "AI on/off" for the bot
3. edit   = FuelyAutomationUpdateSetting        -> one @oneOf mutation for all 16 settings
4. narrow = FuelyAutomationCreate(scope, name)  -> a custom automation + its filter setting
5. test   = AutomationsPreviewStartForAutomation-> a preview chat pinned to ONE automation
```

One edit can emit several events (a base fans out to every inheritor) — merge by id.

## Out of scope: the legacy configuration surface

Bot AI configuration lives in the per-scope automations model. An older surface — the `fuelyConfig*` behaviour mutations (agent name, chat language, greeting, message length, respond-to-sources, switch-to-human, summarize-chat, recover-chat) and comment reply rules V1/V2 — is not in the bundled schema at all, so there is nothing here to call. Also out of scope: AI broadcasts and Fuely initial setup, whose types the bundle does still carry; don't build on them.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | Scope/automation/setting model, per-scope settings table, reads (one list + the fan-out subscription), the @oneOf write path, limits, inheritance and compare, drafts vs immediate saves, undo, the bootstrap context, and the confirmed traps |
| `references/test-panel.md` | The test chat pinned to one automation: the session lifecycle, what the preview can and cannot tell you |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/possible-types.json` | Register the FuelySetting interface's 16 implementations in normalized caches |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live — but note the bundled SDL strips `@oneOf`; the validator cannot catch a two-key `FuelySettingUpdateInput`.
