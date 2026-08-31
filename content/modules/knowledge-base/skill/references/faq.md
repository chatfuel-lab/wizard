# FAQs

One array on the Fuely config, and the single most-edited thing in the module.

```graphql
faqs: [FuelyKnowledgeBaseFAQ!]!        # { question, answer }
fuelyConfigSetFAQs(botID:, faqs: [FuelyKnowledgeBaseFAQInput!]!)
```

## The constraint everything else follows from

**There are no entry ids and the write replaces the whole array.** An entry's identity on the wire is its position. Build anything stateful on top of that naively — selection, drag-to-reorder, inline editing, undo — and every save silently re-keys the list underneath it: the row a person had selected becomes a different row, the one they were editing jumps, the undo restores the wrong thing.

The fix is a **local key per entry, reattached by content on every server response**:

1. When a list arrives, match each incoming entry against the previous list by `question + answer`, greedily and in order. An identical pair keeps its key; anything else gets a fresh one.
2. Two byte-identical entries are interchangeable by definition, so matching them in order is enough.
3. The common case — one answer edited, ten untouched — re-keys exactly one row.

Keys are module-local, never persisted and never sent. `src/modules/knowledge-base/lib/knowledgeStore.ts` in the reference implementation is `reconcileFaqKeys`, and its test file is where the reasoning is nailed down.

## Read-merge-write, and the conflict

Because the write is a replace, a save built on stale data silently deletes whatever somebody else added in the meantime. The reference implementation:

1. Re-queries the live list immediately before writing.
2. Compares it against the **baseline** the caller's draft was built from.
3. If it moved, **refuses the save** and hands the live list back, so the UI can offer "changed elsewhere: use theirs / keep mine".

A save that overwrites another person's edit without asking is not a save, it is a loss. Passing no baseline writes unconditionally, which is right for an import or a restore, and wrong for a person typing.

## Order matters

The array order is the order the assistant reads. Reordering is a real edit, not a display preference, so it goes through the same draft and the same save, and it is undoable.

## What good FAQ content looks like

Worth encoding in the UI as advisory lint rather than prose nobody reads:

| Finding | Why |
|---|---|
| The same question twice with **different** answers | The assistant picks one and nobody knows which |
| The same question twice with the same answer | Harmless, but it is paying for the same characters twice |
| An empty answer | Worse than no entry — it looks answered |
| An answer over ~600 characters | That is a page, not an answer; split it or link out |
| Fewer than ~5 entries | Not a knowledge base yet. Most businesses need 10–25: shipping, prices, booking, cancellation, location |

Match duplicates on a normalised question (lowercased, punctuation stripped, whitespace collapsed) — "Do you ship?" and "DO YOU SHIP" are the same question to a customer and to the assistant.

## Import and export

CSV in and out, with question and answer columns. The parser has to survive quoted fields, embedded commas, newlines inside quotes, a BOM and CRLF — a round trip that mangles an answer containing a comma is worse than no export at all. See `references/import.md`.
