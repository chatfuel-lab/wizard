/* Pass 18 — the GraphQL names in shipped markdown are names the SDL has.
   ---------------------------------------------------------------------------
   The ```graphql blocks under modules/<id>/skill/ are the part of the payload an
   agent reads before it writes a query, and nothing was checking them. The
   .graphql documents beside them are validated against the schema by pass 0,
   so a renamed field breaks the build; the same rename in a reference page
   breaks nothing here and surfaces on someone else's disk, months later, as a
   confidently wrong query.

   Parsing is not the check. Most of these blocks are deliberately not
   documents — a selection-set excerpt with no operation around it, the shape
   of a type written without `type`, a mutation signature with the argument
   values left out — and turning them into whole operations to satisfy a parser
   would make them worse at the job they are there for. So the check is on the
   names: every identifier in a block must be one the SDL knows, as a type, a
   field, an argument, an input field or an enum value.

   That is a set, not a graph: it says `durationSeconds` exists somewhere, not
   that it exists on the type the block hangs it off. A field moved between
   types passes. A field renamed or withdrawn — which is what the export
   actually does to this repo, and what pass 0 catches on the documents — does
   not, and that is the rot this pass is here for.

   Strings, comments and fragment names are blanked before the scan rather than
   skipped, so line numbers survive: prose belongs in all three, and a `#` note
   naming a field the schema dropped is a note, not a claim. Prose OUTSIDE them
   is the one style rule this enforces — an unquoted `...the same, plus
   durationSeconds` reads as a fragment spread to everything but a human. */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isEnumType, isInputObjectType, isInterfaceType, isObjectType } from 'graphql';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

const FENCE = /```graphql\n([\s\S]*?)```/g;
/** A `...` spread, a `$variable` or a `@directive` is a name from somewhere else. */
const NAME = /(\.\.\.\s*|\$|@)?\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
const BLOCK_STRING = /"""[\s\S]*?"""/g;
const STRING = /"(?:[^"\\\n]|\\.)*"/g;
const COMMENT = /#[^\n]*/g;
const FRAGMENT_NAME = /fragment\s+[A-Za-z_][A-Za-z0-9_]*/g;

/** The language's own words, which name nothing in any schema. */
const KEYWORDS: ReadonlySet<string> = new Set([
  'query',
  'mutation',
  'subscription',
  'fragment',
  'on',
  'true',
  'false',
  'null',
  'schema',
  'type',
  'input',
  'interface',
  'union',
  'enum',
  'scalar',
  'extend',
  'implements',
  'directive',
  'repeatable',
]);

/** Same length, no characters: the text after it still starts on the line it started on. */
const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

function namesIn(ctx: ValidateContext): ReadonlySet<string> {
  const known = new Set(Object.keys(ctx.schema.getTypeMap()));
  for (const type of Object.values(ctx.schema.getTypeMap())) {
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        known.add(field.name);
        for (const arg of field.args) known.add(arg.name);
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) known.add(field.name);
    } else if (isEnumType(type)) {
      for (const value of type.getValues()) known.add(value.name);
    }
  }
  for (const directive of ctx.schema.getDirectives()) {
    known.add(directive.name);
    for (const arg of directive.args) known.add(arg.name);
  }
  return known;
}

export function checkMarkdownGraphql(ctx: ValidateContext): void {
  const { root } = ctx;
  const known = namesIn(ctx);
  // All three are checked to exist by pass -1, before any pass runs.
  for (const dir of [join(root, 'content'), join(root, 'docs'), join(root, 'packages')]) {
    for (const file of walkAll(dir)) {
      if (!file.endsWith('.md')) continue;
      const source = readFileSync(file, 'utf8');
      if (!source.includes('```graphql')) continue;
      for (const fence of source.matchAll(FENCE)) {
        const first = source.slice(0, fence.index).split('\n').length;
        const body = fence[1]
          .replace(BLOCK_STRING, blank)
          .replace(STRING, blank)
          .replace(COMMENT, blank)
          .replace(FRAGMENT_NAME, blank);
        body.split('\n').forEach((line, offset) => {
          for (const [, borrowed, name] of line.matchAll(NAME)) {
            if (borrowed || KEYWORDS.has(name) || known.has(name)) continue;
            fail(
              `${relative(root, file)}:${first + 1 + offset}: "${name}" in a \`\`\`graphql block is ` +
                `not a name the bundled SDL has — as a type, a field, an argument, an input field ` +
                `or an enum value. Either the schema moved and the example is now wrong, or the ` +
                `word is prose and belongs in a # comment.`,
            );
          }
        });
      }
    }
  }
}
