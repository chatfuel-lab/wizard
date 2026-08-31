# Import and export

## What an import can be here

There is no ingestion API. Nothing can be "attached" to a Chatfuel knowledge base: no file store, no crawler, no chunker, no index. So an import is a **local parse that produces rows a person reviews, and then writes them as real FAQ entries or catalog items** through the ordinary mutations.

That is worth stating plainly in the UI, because the alternative — a progress bar that implies a document was ingested — is a promise the platform cannot keep. Show exactly what will be created before creating it.

## Two sources

| Source | How |
|---|---|
| A file | CSV, TSV, TXT or Markdown, read in the browser |
| Pasted text | The same parsers, no file needed |

## Parsing

**CSV/TSV.** Detect the delimiter, detect whether the first row is a header, and survive quoted fields, embedded commas, newlines inside quotes, a BOM and CRLF. A round trip that mangles an answer containing a comma is worse than no import at all — this belongs in a pure module with a test file, not inline in a component.

**Question-and-answer prose.** Several conventions are common and all are heuristics, so name each one and let the review step show which one fired:

- `## Question` followed by a body
- `Q:` / `A:` pairs
- `**Question**` on its own line
- a line ending in `?` followed by a paragraph

**HTML.** Strip `script`, `style`, `nav` and `footer`, prefer `main` or `article`, collapse whitespace, and keep headings as structure so the Q&A heuristics have something to work with. Do it in the browser with the platform's own parser; do not add a dependency, because everything here ships vendored into the customer's project.

## Column mapping

Guess from the header names, in more than one language, and let a person override it. FAQ takes question and answer; a catalog item takes title, description, price amount, currency and availability.

## Applying

- **FAQ**: one replace-all write of `existing + accepted`, undoable by writing the previous whole list back.
- **Catalog**: sequential creates, with per-row success and failure. A partial import must report exactly which rows landed. Never claim success for a run that half-failed.
- Either can stop on `FuelyKnowledgeBaseLimitReached`; say how far it got.
- Show the character cost of the import before it runs. The budget is the constraint that bites, and an import is the fastest way to hit it.
- Flag duplicates against what is already there, and skip them by default.

## Reading a page from the customer's website is deliberately not offered

It is the obvious third source, and it is left out on purpose. A browser cannot read a cross-origin page, so the only way to offer it is a server endpoint that takes an address a person typed and makes a request from inside the deployment's network — which is the definition of SSRF. Done properly that endpoint has to reject every scheme but `http:` and `https:`, resolve the hostname and judge the resolved ADDRESS rather than the literal, pin that judgement onto the socket so a name that changes answer mid-flight cannot slip past it, re-run the whole check on every redirect, cap the response while it streams, and sit behind the app's own authentication. Each of those is a place to be wrong, and being wrong there is a security bug rather than a bad screen.

What a page actually buys over pasting is small: the same text, minus a copy and a paste. Weigh that against the surface before adding it back. Until then the honest answer in the UI is the file and paste paths, with no URL field to explain away.

## Export

The mirror of the import: CSV for a spreadsheet, JSON for everything. Export is a read, so it should be available to someone who cannot edit — their data is still their data.
