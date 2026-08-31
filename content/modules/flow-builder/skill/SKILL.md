---
name: chatfuel-flow-builder
description: Build a custom visual flow builder on the Chatfuel GraphQL API — flows, blocks on a canvas, plugin cards (blocks, plugins, buttons, connections), all 16 block and 29 element types, creation via *CreateWithBlock, ~230 single-field setter mutations, TemplateStr rich text, validation-as-state, media upload, entry points and WhatsApp broadcasts, the AI-agent block. Use when building a flow editor or canvas UI, automating flow creation, or scripting bot logic against the Chatfuel API. Includes the Test panel: a real preview conversation pinned to one flow. Requires the chatfuel-core skill.
---

# Chatfuel Flow Builder

The visual flow editor surface: flows, canvas blocks, strongly-typed plugin cards, buttons/handles, connections. No JSON configs, no flow-builder subscriptions — reconcile from mutation results. Not to be confused with **Automations** (per-scope AI behaviour — the chatfuel-automations skill).

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Quickstart: minimal flow builder

```
1. flows  = FlowsList                        -> sidebar               (examples/operations.graphql)
2. canvas = FlowStructure                    -> blocks + connections; render EVERY __typename
3. move   = MoveBlock / MoveBlocksBulk       -> on drag-end (Int coords)
4. create = <plugin>CreateWithBlock[AndConnection] -> no createBlock exists
5. edit   = per-field setters (SetWhatsAppText, ...) -> reconcile from returned block; re-read errors
6. wire   = ConnectBlocks / ConnectComponent -> handles = button/row/condition ids
7. test   = FlowTestStart + FlowTest* sends/clicks   -> references/test-panel.md
```

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | Mental model, plugin catalog, creation/editing/wiring, TemplateStr, validation-as-state, uploads, broadcasts, AI-agent block |
| `examples/operations.graphql` | Validated operations; its `FlowStructure` fragments cover every block/element type — copy them wholesale |
| `references/test-panel.md` | The Test panel: session lifecycle, clicks, restart-as-watermark, what the preview API cannot do |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/possible-types.json` | Authoritative Block / BlockElement type lists for the generic canvas fallback |
| `../chatfuel-core/references/misc.md` | Broadcast UTC/weekday scheduling algorithm, keyword rules |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
