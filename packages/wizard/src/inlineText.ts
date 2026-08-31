/**
 * A string from somewhere else, put on one line of a file an agent takes as
 * instructions.
 *
 * A manifest's `name`, `description` and permission fields are free text as far
 * as the schema is concerned, and a workspace title is whatever the account
 * called it — none of them is validated anywhere on the way here, and all of
 * them are spliced into CLAUDE.md / AGENTS.md, the file the coding agent reads
 * as the rules of the app it is about to work on. With `CHATFUEL_CONTENT_ORIGIN`
 * pointed elsewhere, a repo checkout somebody edited, or simply a workspace
 * renamed to suit, a value carrying its own newlines and headings writes lines
 * of that file itself, in the register the agent obeys.
 *
 * Flattened to one line, its markdown structure stripped, and cut short: what
 * comes through is a phrase, which is all these fields are ever meant to be.
 *
 * This is a write-time guard, not an intake one. The same titles are printed to
 * the terminal all through the run, where they should read as their owner typed
 * them; it is being written into a file with authority over an agent that makes
 * the punctuation dangerous.
 */
export function inlineText(text: string, limit = 240): string {
  const flat = text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[`*_#|<>[\]\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}
