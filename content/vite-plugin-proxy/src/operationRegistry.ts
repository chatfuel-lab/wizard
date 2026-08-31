/**
 * The set of GraphQL documents this app actually ships, and nothing else.
 *
 * Every other fence in the proxy answers "may this caller name that field?".
 * This one answers a narrower question first: is this document one of the
 * app's own? A caller who reaches the proxy can otherwise compose any
 * operation the account's schema allows out of root fields the allowlist has
 * to permit, because the app itself sends them — the allowlist is a name check
 * on the roots, and a name check cannot tell one shape of `bot { ... }` from
 * another. The registry can, because it compares whole documents.
 *
 * The documents arrive as the app's own generated namespaces (src/operationDocs.ts,
 * written by the wizard), so the surface is the app's, not this package's: an
 * app with two modules admits two modules' operations and refuses the other
 * nine's, without anybody maintaining a list.
 *
 * Two indices, both built eagerly at startup:
 *
 *   - by raw text, which is what the shipped client sends byte for byte
 *     (transport/http.ts hands over `String(doc)`), so the hot path costs a
 *     Map lookup and no parse at all;
 *   - by canonical key — sha256(stripIgnoredCharacters(text)) — so a rebuild
 *     that moved a space is not a production refusal.
 *
 * The key is the lexer's own idea of what does not matter: whitespace, line
 * breaks, commas and comments, and nothing else. `print(parse(text))` was the
 * obvious alternative and is the expensive one — re-serialising all 508
 * documents of the largest possible app costs ~85 ms against ~25 ms for the
 * strip, and it normalises strictly more (block-string indentation, for one).
 * More normalisation is the wrong direction for a fence: every pair of texts
 * the key collapses is a pair the registry can no longer tell apart. Stripping
 * cannot merge two documents that differ in a token, which is the only property
 * this index needs.
 *
 * The canonical index is not lazy on purpose. Built lazily it would be built
 * almost never — the shipped client always hits the exact index — which is to
 * say it would be untested code discovered on the day it was needed.
 *
 * Aliases, field order and @skip/@include all change the key, and should: there
 * the difference is semantic, and a registry that could not see it would be a
 * registry that admits a document the app never wrote.
 */
import { createHash } from 'node:crypto';
import { Kind, parse, stripIgnoredCharacters } from 'graphql';
import type { DocumentNode } from 'graphql';

/**
 * One generated module's namespace — what an `import * as livechat` binding is.
 *
 * Deliberately not a type from the generated code: this package is vendored
 * into the app beside those files, not built against them, and the only thing
 * it needs of them is that they have named exports to walk.
 */
export type OperationModule = Readonly<Record<string, unknown>>;

/** What is forwarded upstream when a request matches, and under which name. */
export interface OperationRecord {
  /** The app's own text — the same string the imported document holds. */
  text: string;
  /** Read from the document, never from the request body. */
  operationName: string | undefined;
}

export interface OperationRegistry {
  /** Exact text → record. A strict subset of what `byKey` admits. */
  byText: ReadonlyMap<string, OperationRecord>;
  /** sha256(stripIgnoredCharacters(text)) → record. */
  byKey: ReadonlyMap<string, OperationRecord>;
  /** Distinct documents, for the startup line. */
  size: number;
}

export function canonicalKey(text: string): string {
  return createHash('sha256').update(stripIgnoredCharacters(text)).digest('hex');
}

/**
 * The operation this document defines, or undefined when it defines none.
 *
 * A `*FragmentDoc` export is the same `TypedDocumentString` as an operation and
 * is told apart here rather than by type or by `__meta__` — which is declared
 * optional and untyped and so cannot be a criterion. A document with no
 * operation cannot be executed, so admitting one would only widen the set with
 * something nobody can send.
 *
 * Two operations in one document would make a single record admit two different
 * things, with the client's `operationName` choosing between them — the exact
 * shape this registry exists to refuse. Codegen already guarantees one; a
 * hand-written document is checked here.
 */
function operationOf(doc: DocumentNode, text: string): string | undefined | null {
  const operations = doc.definitions.filter((def) => def.kind === Kind.OPERATION_DEFINITION);
  if (operations.length === 0) return null;
  if (operations.length > 1) {
    throw new Error(
      `chatfuel proxy: an operation document defines ${operations.length} operations, and a registry entry must admit exactly one — split it: ${text.slice(0, 120)}`,
    );
  }
  return operations[0]!.name?.value;
}

/**
 * Build both indices from the app's namespaces.
 *
 * Every string-like export is tried, because that is what a document is
 * (`TypedDocumentString extends String`), and anything that does not parse is
 * not one — a module may export whatever else it likes. What does parse is
 * kept only if it carries an operation.
 *
 * `keyOf` is a seam for the tests and nothing else. The collision assert below
 * cannot be reached with real sha256 keys — that is the point of it — and an
 * assert no test can enter is an assert nobody knows still works.
 */
export function buildOperationRegistry(
  modules: readonly OperationModule[],
  keyOf: (text: string) => string = canonicalKey,
): OperationRegistry {
  const byText = new Map<string, OperationRecord>();
  const byKey = new Map<string, OperationRecord>();
  for (const module of modules) {
    for (const value of Object.values(module)) {
      if (typeof value !== 'string' && !(value instanceof String)) continue;
      /* String(doc) over TypedDocumentString returns the internal primitive
         rather than a copy, so the record shares the string the imported
         document already holds. */
      const text = String(value);
      let doc: DocumentNode;
      try {
        doc = parse(text);
      } catch {
        continue;
      }
      const operationName = operationOf(doc, text);
      if (operationName === null) continue;
      if (byText.has(text)) continue;
      const record: OperationRecord = { text, operationName };
      byText.set(text, record);
      const key = keyOf(text);
      const seen = byKey.get(key);
      /* A module set can hold the same operation twice — the generated
         namespaces are produced independently of each other — and two records
         that canonise alike are interchangeable, because the name is inside the
         text that canonised. Two records with DIFFERENT names under one key are
         not: that is a bug in canonisation or in extraction, and overwriting it
         silently is how it would be found in production instead of here. */
      if (seen && seen.operationName !== operationName) {
        throw new Error(
          `chatfuel proxy: two different operations share one canonical key — ${String(seen.operationName)} and ${String(operationName)}`,
        );
      }
      if (!seen) byKey.set(key, record);
    }
  }
  return { byText, byKey, size: byText.size };
}

/**
 * The record admitting this text, or undefined when the app never shipped it.
 *
 * Exact first: the shipped client hands the transport `String(doc)`, so the
 * document arrives byte for byte and the common case costs one Map lookup and
 * no lexing at all. The canonical lane is for the case the exact one cannot
 * cover — a rebuild that reformatted the generated files, a bundler that
 * collapsed whitespace — and it is deliberately the second question rather than
 * the only one, so the price is paid by the request that needs it.
 */
export function admits(registry: OperationRegistry, query: string): OperationRecord | undefined {
  const exact = registry.byText.get(query);
  if (exact) return exact;
  let key: string;
  try {
    key = canonicalKey(query);
  } catch {
    /* A text the lexer will not take is not in the registry either, and the
       caller is told the one thing that is true of both. */
    return undefined;
  }
  return registry.byKey.get(key);
}

/**
 * Whether this text is a GraphQL document at all.
 *
 * Only ever asked on the refusal path, and only to say which refusal it is: a
 * document with a syntax error and a document nobody shipped send an app
 * developer to two different places, and telling them apart costs a parse of a
 * body that is already going no further.
 */
export function parses(text: string): boolean {
  try {
    parse(text);
    return true;
  } catch {
    return false;
  }
}

/* GraphQL's own name grammar. A caller's `operationName` is echoed in the
   refusal because that is the word the app developer will search their own
   source for — but only when it looks like a name, so the message stays the
   proxy's sentence rather than a place to put somebody else's text. */
const NAME = /^[_A-Za-z][_0-9A-Za-z]*$/;

/** What a caller is told instead of having a document the app never wrote forwarded. */
export const operationNotShippedMessage = (operationName: string | undefined): string =>
  `${operationName && NAME.test(operationName) ? operationName : 'This document'} is not one of the GraphQL documents this app ships, and the proxy forwards no other`;
