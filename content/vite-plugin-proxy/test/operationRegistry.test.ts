import { describe, expect, it } from 'vitest';
import { buildOperationRegistry, canonicalKey } from '../src/core';

/**
 * A generated namespace is a module object of string-like exports, so the tests
 * hand the builder exactly that: plain objects. `TypedDocumentString extends
 * String`, and the boxed case is the one production actually passes, so both
 * shapes appear here.
 */
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types -- the boxed type is the point: TypedDocumentString extends String.
const boxed = (text: string): String => new String(text);

const BOT = 'query BotById($id: ID!) { bot(id: $id) { id name } }';
const FRAGMENT = 'fragment FileInfo on File { id url }';

describe('buildOperationRegistry', () => {
  it('indexes a document by its exact text and by its canonical key', () => {
    const registry = buildOperationRegistry([{ BotByIdDocument: boxed(BOT) }]);
    expect(registry.size).toBe(1);
    expect(registry.byText.get(BOT)).toEqual({ text: BOT, operationName: 'BotById' });
    expect(registry.byKey.get(canonicalKey(BOT))?.operationName).toBe('BotById');
  });

  it('takes the same document written differently as one entry, and a changed field as another', () => {
    const spaced = 'query BotById($id: ID!) {\n  bot(id: $id) {\n    id\n    name\n  }\n}\n';
    const widened = 'query BotById($id: ID!) { bot(id: $id) { id name apiToken } }';
    const registry = buildOperationRegistry([{ a: BOT, b: spaced, c: widened }]);
    expect(registry.size).toBe(3);
    expect(canonicalKey(spaced)).toBe(canonicalKey(BOT));
    expect(canonicalKey(widened)).not.toBe(canonicalKey(BOT));
    expect(registry.byKey.size).toBe(2);
  });

  // Test 10 — a fragment is the same TypedDocumentString as an operation.
  it('leaves fragments out: nothing executable, nothing admitted', () => {
    const registry = buildOperationRegistry([{ FileInfoFragmentDoc: boxed(FRAGMENT), BotByIdDocument: boxed(BOT) }]);
    expect(registry.size).toBe(1);
    expect(registry.byText.has(FRAGMENT)).toBe(false);
    expect(registry.byKey.get(canonicalKey(FRAGMENT))).toBeUndefined();
  });

  it('skips exports that are not documents at all', () => {
    const registry = buildOperationRegistry([
      { BotByIdDocument: BOT, version: 'not graphql', count: 3, helper: () => 1, nothing: undefined },
    ]);
    expect(registry.size).toBe(1);
  });

  // Test 11 — one record must admit exactly one thing.
  it('refuses to build a registry from a document that defines two operations', () => {
    const two = 'query A { bot(id: "1") { id } } query B { bot(id: "2") { id } }';
    expect(() => buildOperationRegistry([{ TwoDocument: two }])).toThrow(/defines 2 operations/);
  });

  it('keeps an anonymous operation, and remembers that it has no name', () => {
    const registry = buildOperationRegistry([{ AnonDocument: '{ bot(id: "1") { id } }' }]);
    expect(registry.size).toBe(1);
    expect([...registry.byText.values()][0]!.operationName).toBeUndefined();
  });

  it('absorbs comments and commas, which the client bundler may move but not add', () => {
    const commented = 'query BotById($id: ID!) {\n  # what this is for\n  bot(id: $id) { id, name }\n}';
    expect(canonicalKey(commented)).toBe(canonicalKey(BOT));
  });

  it('does not absorb an alias, a reordering or a directive', () => {
    expect(canonicalKey('query BotById($id: ID!) { b: bot(id: $id) { id name } }')).not.toBe(canonicalKey(BOT));
    expect(canonicalKey('query BotById($id: ID!) { bot(id: $id) { name id } }')).not.toBe(canonicalKey(BOT));
    expect(canonicalKey('query BotById($id: ID!) { bot(id: $id) { id name @include(if: true) } }')).not.toBe(
      canonicalKey(BOT),
    );
  });

  // Test 22 — unreachable with real sha256, which is why it needs the seam.
  it('throws rather than overwrite when two different operations share one key', () => {
    const other = 'query WorkspaceById($id: ID!) { workspace(id: $id) { id } }';
    expect(() => buildOperationRegistry([{ a: BOT, b: other }], () => 'same-key')).toThrow(
      /two different operations share one canonical key/,
    );
  });

  it('accepts the same operation arriving from two namespaces', () => {
    const spaced = 'query BotById($id: ID!) {\n  bot(id: $id) {\n    id\n    name\n  }\n}\n';
    const registry = buildOperationRegistry([{ BotByIdDocument: BOT }, { BotByIdDocument: spaced }]);
    expect(registry.size).toBe(2);
    expect(registry.byKey.size).toBe(1);
    // First one wins: both are the app's own, and they are interchangeable.
    expect(registry.byKey.get(canonicalKey(BOT))?.text).toBe(BOT);
  });

  // Test 4 — an app that ships no operations admits none. Not the same as a
  // host that passes no `operations` at all, which is checked in units.test.ts.
  it('builds an empty registry from an empty module list rather than no registry', () => {
    const registry = buildOperationRegistry([]);
    expect(registry.size).toBe(0);
    expect(registry.byText.size).toBe(0);
    expect(registry.byKey.size).toBe(0);
  });
});
