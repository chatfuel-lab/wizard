// ---------------------------------------------------------------------------
// Pass 10c — intra-module import cycles in content/shell/src/modules/<id>/
// ---------------------------------------------------------------------------
// A module's file graph must be acyclic over VALUE imports. A cycle means no
// file in it can be read alone, and what a consumer sees during module
// initialization depends on which file happened to be imported first. The fix
// is always the same: hoist the shared piece into a leaf file (lib/).
//
// Type-only edges (`import type … from`, `export type { … } from`) are
// exempt: they erase at compile time, so they cannot create an initialization
// order at all. The exemption is load-bearing — auth carries a legitimate
// type-only cycle (AuthGate -> AuthProvider -> runtime -> AuthGate) that tsc
// compiles happily. A mixed clause (`import { x, type Y } from`) counts as a
// value edge.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

// The specifier regexes mirror pass 10's (import-boundaries.ts), with one
// difference: the whole-clause `import type` / `export type` forms are
// excluded here, because only value imports participate in cycles.
const valueSpecifiers = (text: string): string[] => {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const specs: string[] = [];
  for (const re of [
    /(?<!['"\w$])import\s+(?!type[\s{])[^'"]*?\bfrom\s*['"]([^'"\n]+)['"]/g, // import … from
    /(?<!['"\w$])export\s+(?!type[\s{])[^'"]*?\bfrom\s*['"]([^'"\n]+)['"]/g, // export … from
    /(?<!['"\w$])import\s*['"]([^'"\n]+)['"]/g, // side-effect import
    /(?<!['"\w$])import\s*\(\s*['"]([^'"\n]+)['"]/g, // dynamic import()
  ]) {
    for (const m of stripped.matchAll(re)) specs.push(m[1]);
  }
  return specs;
};

/** Strongly connected components with more than one member (Tarjan). */
const nontrivialSccs = (nodes: string[], edges: Map<string, string[]>): string[][] => {
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let counter = 0;
  const connect = (v: string): void => {
    idx.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of edges.get(v) ?? []) {
      if (!idx.has(w)) {
        connect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, idx.get(w)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const scc: string[] = [];
      for (;;) {
        const w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
        if (w === v) break;
      }
      if (scc.length > 1) sccs.push(scc);
    }
  };
  for (const n of nodes) if (!idx.has(n)) connect(n);
  return sccs;
};

// Every elementary cycle inside one SCC, each reported once, rooted at its
// lexicographically smallest member so the output is stable across runs. The
// graphs are small (a module is ~150 files) and nearly acyclic, so a bounded
// path-DFS does the job without a full Johnson implementation.
const CYCLE_CAP = 20;

const cyclesOf = (scc: string[], edges: Map<string, string[]>): string[][] => {
  const sorted = [...scc].sort();
  const order = new Map(sorted.map((n, i) => [n, i]));
  const cycles: string[][] = [];
  for (const start of sorted) {
    const startOrder = order.get(start)!;
    const path: string[] = [start];
    const onPath = new Set([start]);
    const walk = (node: string): void => {
      if (cycles.length >= CYCLE_CAP) return;
      for (const next of edges.get(node) ?? []) {
        const nextOrder = order.get(next);
        if (nextOrder === undefined || nextOrder < startOrder) continue;
        if (next === start) {
          cycles.push([...path]);
          if (cycles.length >= CYCLE_CAP) return;
          continue;
        }
        if (onPath.has(next)) continue;
        path.push(next);
        onPath.add(next);
        walk(next);
        path.pop();
        onPath.delete(next);
      }
    };
    walk(start);
  }
  return cycles;
};

export function checkImportCycles(ctx: ValidateContext): void {
  const { shellDir } = ctx;
  const shellModulesDir = join(shellDir, 'src', 'modules'); // checked to exist by pass -1

  const moduleDirs = readdirSync(shellModulesDir).filter((e) => statSync(join(shellModulesDir, e)).isDirectory());

  for (const id of moduleDirs) {
    const moduleRoot = join(shellModulesDir, id);
    const files: string[] = [];
    for (const file of walkAll(moduleRoot)) {
      if (/\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts')) files.push(file);
    }
    const stripExt = (p: string): string => p.replace(/\.(tsx|ts)$/, '');
    const byBase = new Map(files.map((f) => [stripExt(f), f]));

    const edges = new Map<string, string[]>();
    for (const file of files) {
      const out: string[] = [];
      for (const spec of valueSpecifiers(readFileSync(file, 'utf8'))) {
        if (!spec.startsWith('.')) continue; // ~ui/~api/bare never point back into the module
        const base = stripExt(resolve(dirname(file), spec));
        const target = byBase.get(base) ?? byBase.get(join(base, 'index'));
        if (target !== undefined && target !== file) out.push(target);
      }
      edges.set(file, out);
    }

    for (const scc of nontrivialSccs(files, edges)) {
      for (const cycle of cyclesOf(scc, edges)) {
        const shown = [...cycle, cycle[0]].map((f) => relative(moduleRoot, f)).join(' -> ');
        fail(
          `content/shell/src/modules/${id}: value-import cycle ${shown} — hoist the shared piece ` +
            `into a leaf file (lib/); type-only edges are exempt, they erase at compile time`,
        );
      }
    }
  }
}
