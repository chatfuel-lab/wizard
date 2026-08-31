// ---------------------------------------------------------------------------
// Pass 10b — a module's context provider and its consumers are different
//            components
// ---------------------------------------------------------------------------
// Every module ships `<Id>Context.ts` exporting a `use<Id>()` that throws when
// the provider is missing. Rendering `<IdContext.Provider>` and calling that
// hook — directly or through another hook — in the SAME component throws at
// runtime: the hook runs while the provider is still only a return value.
//
// `tsc` cannot see it and vitest here is node-only with no jsdom, so this
// passes every other gate and white-screens the module. It has happened once.
// The repo's answer is the split every other module already uses: the exported
// `App` renders the providers, an inner component consumes them.
//
// Scoped per component, not per file — a provider in one function and a
// consumer in another is exactly the correct shape.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

export function checkProviderConsumerSplit(ctx: ValidateContext): void {
  const { root, shellDir } = ctx;
  const shellModulesDir = join(shellDir, 'src', 'modules'); // checked to exist by pass -1
  for (const id of readdirSync(shellModulesDir)) {
    const moduleDir = join(shellModulesDir, id);
    if (!statSync(moduleDir).isDirectory()) continue;

    // The whole subtree, at any depth. EVERY context the module declares, not
    // just the first one readdir hands back — deals grew a second
    // (DealsUndoContext) and the single-file version of this check silently
    // stopped covering it. And every consumer, wherever it sits: the three
    // directories this used to walk (module root, `components/`, `views/`) are
    // one module layout among several, and auth, flow-builder and livechat put
    // every one of their components somewhere else, so the pass was reading
    // none of them.
    const tree = [...walkAll(moduleDir)];
    const contextFiles = tree.filter((f) => /Context\.tsx?$/.test(f));
    const files = tree.filter((f) => f.endsWith('.tsx'));

    for (const contextFile of contextFiles) {
      const contextName = basename(contextFile).replace(/\.tsx?$/, '');
      // The hooks that require the provider: the context's own, plus every hook
      // in the module that calls one (one level is enough — they all bottom out
      // in the context hook).
      const contextSource = readFileSync(contextFile, 'utf8');
      const contextHook = contextSource.match(/export function (use[A-Za-z0-9]+)/)?.[1];
      if (!contextHook) {
        /* The hook is found by its declaration form, so a hook written any
           other way — `export const useX = () => …` — leaves this pass with
           nothing to look for and every consumer of that context unchecked.
           Refuse the shape rather than skip the module: unchecked is the
           outcome this pass exists to prevent. */
        if (/export const (use[A-Za-z0-9]+)\s*=/.test(contextSource)) {
          fail(
            `${relative(root, contextFile)}: its hook is written as \`export const\` — this pass reads ` +
              `\`export function use…\`, and cannot check who calls it. Declare it with \`function\`.`,
          );
        }
        continue;
      }

      const needsProvider = new Set([contextHook]);
      for (const f of tree) {
        if (f === contextFile) continue;
        const src = readFileSync(f, 'utf8');
        if (!new RegExp(`\\b${contextHook}\\s*\\(`).test(src)) continue;
        for (const m of src.matchAll(/export function (use[A-Za-z0-9]+)/g)) {
          needsProvider.add(m[1]);
        }
      }

      for (const file of files) {
        const raw = readFileSync(file, 'utf8');
        // Only the module's OWN contexts. A module may render other providers
        // (flow-builder has a selection context) and those are unrelated.
        if (!raw.includes(`${contextName}.Provider`)) continue;
        const label = relative(root, file);
        // Comments describing this very rule would otherwise match it.
        const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        const bounds = [...src.matchAll(/^(?:export )?function [A-Za-z0-9_]+/gm)].map((m) => m.index);
        /* Same blind spot, from the other end: the component is located by its
           `function` declaration, so a provider rendered inside an arrow
           component sits in no bound and the loop below has nothing to read.
           A render that no bound covers is reported, not passed over. */
        for (const render of src.matchAll(new RegExp(`<${contextName}\\.Provider[\\s>]`, 'g'))) {
          const inside = bounds.some(
            (start, i) => render.index >= start && render.index < (bounds[i + 1] ?? src.length),
          );
          if (!inside) {
            fail(
              `${label}: <${contextName}.Provider> is rendered outside any \`function\` declaration — ` +
                `this pass reads function declarations, so it cannot tell whether that component also ` +
                `calls the context's hooks. Declare the component with \`function\`.`,
            );
          }
        }
        for (let i = 0; i < bounds.length; i += 1) {
          const body = src.slice(bounds[i], bounds[i + 1] ?? src.length);
          if (!new RegExp(`<${contextName}\\.Provider[\\s>]`).test(body)) continue;
          for (const hook of needsProvider) {
            if (new RegExp(`(?<![.\\w])${hook}\\s*\\(`).test(body)) {
              fail(
                `${label}: the component rendering <${contextName}.Provider> also calls ${hook}() — ` +
                  `it runs before the provider exists and throws. Move the consumers into a child component.`,
              );
            }
          }
        }
      }
    }
  }
}
