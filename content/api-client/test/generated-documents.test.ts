import { readdirSync } from 'node:fs';
import { Kind, parse, type DocumentNode, type FragmentDefinitionNode } from 'graphql';
import { describe, expect, it } from 'vitest';
import { getDocMeta } from '../src/transport/http';

/**
 * The generated documents after `scripts/hoist-fragments.ts`: every operation
 * text must still be a complete, valid GraphQL document — the operation first
 * (what `getDocMeta` reads), every spread fragment defined, and each fragment
 * defined exactly once (a server rejects a duplicate name outright). The
 * hoisting pass rewrites codegen's output with a regex and template
 * interpolation; this is what proves the rewrite produced documents a server
 * will accept, for every module, every time codegen runs.
 */
const generatedRoot = new URL('../src/generated/', import.meta.url);
const moduleIds = readdirSync(generatedRoot).sort();

const spreads = (doc: DocumentNode): Set<string> => {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const record = node as { kind?: string; name?: { value: string } };
    if (record.kind === Kind.FRAGMENT_SPREAD && record.name) found.add(record.name.value);
    for (const value of Object.values(record)) walk(value);
  };
  walk(doc);
  return found;
};

describe('generated documents (post hoist-fragments)', () => {
  it('has generated output for every module id', () => {
    expect(moduleIds.length).toBeGreaterThan(5);
  });

  for (const id of moduleIds) {
    it(`${id}: every operation document parses, spreads resolve, fragments are unique, operation is first`, async () => {
      const mod = (await import(`../src/generated/${id}/graphql.ts`)) as Record<string, unknown>;
      const docs = Object.entries(mod).filter(([name, value]) => name.endsWith('Document') && value instanceof String);
      expect(docs.length).toBeGreaterThan(0);
      for (const [name, value] of docs) {
        const text = String(value);
        expect(text.includes('${'), `${name} still contains an unexpanded interpolation`).toBe(false);
        const doc = parse(text, { noLocation: true });
        const operations = doc.definitions.filter((d) => d.kind === Kind.OPERATION_DEFINITION);
        expect(operations, `${name}: exactly one operation`).toHaveLength(1);
        expect(doc.definitions[0]!.kind, `${name}: operation first`).toBe(Kind.OPERATION_DEFINITION);

        const defined = doc.definitions
          .filter((d): d is FragmentDefinitionNode => d.kind === Kind.FRAGMENT_DEFINITION)
          .map((d) => d.name.value);
        expect(new Set(defined).size, `${name}: duplicate fragment definitions`).toBe(defined.length);
        for (const spread of spreads(doc)) {
          expect(defined, `${name}: spread ...${spread} has no definition`).toContain(spread);
        }
        // Every defined fragment is actually spread — nothing dead was interpolated.
        const used = spreads(doc);
        for (const fragment of defined)
          expect(used, `${name}: fragment ${fragment} defined but never spread`).toContain(fragment);

        const meta = getDocMeta(value as never);
        expect(meta.name, `${name}: getDocMeta reads a name`).toBeTruthy();
      }
    });

    it(`${id}: a fragment constant holds only its own definition`, async () => {
      const mod = (await import(`../src/generated/${id}/graphql.ts`)) as Record<string, unknown>;
      for (const [name, value] of Object.entries(mod)) {
        if (!name.endsWith('FragmentDoc') || !(value instanceof String)) continue;
        const doc = parse(String(value), { noLocation: true });
        expect(doc.definitions, `${name}`).toHaveLength(1);
        expect(doc.definitions[0]!.kind).toBe(Kind.FRAGMENT_DEFINITION);
      }
    });
  }
});
