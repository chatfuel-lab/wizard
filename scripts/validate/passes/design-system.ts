// ---------------------------------------------------------------------------
// Pass 11 (a, b, e, d) — design-system integrity, text-adjudicated rules
//   a. the two dark-mode blocks in tokens.css declare the same property set
//   b. no raw color literal in a content/ui component (icons/ is markup)
//   e. `focus-ring` is only ever used as `focus-visible:focus-ring`
//   d. every component file is re-exported from its directory's barrel, and
//      every directory barrel from src/index.ts (internal/ opts out)
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

export function checkDesignSystem(ctx: ValidateContext): void {
  const { root, shellDir, uiSrc } = ctx;
  const tokensFile = join(uiSrc, 'styles', 'tokens.css');

  // (a) The dark palette is mapped twice on purpose — once for the system media
  // query, once for an explicit data-theme. Duplication is the safe choice (see
  // the file header), but only while the two stay in lockstep.
  {
    const css = readFileSync(tokensFile, 'utf8');
    const blockAfter = (marker: string): string | null => {
      const start = css.indexOf(marker);
      if (start === -1) return null;
      const open = css.indexOf('{', start);
      if (open === -1) return null;
      let depth = 0;
      for (let i = open; i < css.length; i += 1) {
        if (css[i] === '{') depth += 1;
        else if (css[i] === '}') {
          depth -= 1;
          if (depth === 0) return css.slice(open + 1, i);
        }
      }
      return null;
    };
    const declaredProps = (block: string): Set<string> =>
      new Set([...block.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]));

    const mediaBlock = blockAfter(':root:not([data-theme])');
    const attrBlock = blockAfter("[data-theme='dark']");
    if (!mediaBlock || !attrBlock) {
      fail('content/ui/src/styles/tokens.css: could not find both dark-mode blocks');
    } else {
      const inMedia = declaredProps(mediaBlock);
      const inAttr = declaredProps(attrBlock);
      for (const prop of inMedia) {
        if (!inAttr.has(prop)) {
          fail(`tokens.css: ${prop} is set for prefers-color-scheme but missing from [data-theme='dark']`);
        }
      }
      for (const prop of inAttr) {
        if (!inMedia.has(prop)) {
          fail(`tokens.css: ${prop} is set for [data-theme='dark'] but missing from prefers-color-scheme`);
        }
      }
    }
  }

  // (b) A hardcoded color cannot follow the theme. Avatar is the one place that
  // needs a ramp, and it goes through oklch() over --avatar-* tokens instead.
  {
    const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
    for (const file of walkAll(uiSrc)) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
      if (file.includes(join('src', 'icons') + sep)) continue; // SVG path data, not color
      const rel = relative(root, file);
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) return;
          if (COLOR_LITERAL.test(line)) {
            fail(`${rel}:${index + 1}: hardcoded color — use a semantic token so theming stays a tokens-only edit`);
          }
        });
    }
  }

  // (e) The focus-ring utility sets `outline` unconditionally — it is a plain
  // rule, not a variant. Written bare it paints a permanent blue outline on every
  // instance of the element, which is exactly what it looked like on the deals
  // board: every card ringed. It has to be reached through the focus-visible
  // variant. Both content/ui and module code, because both got it wrong.
  {
    const roots = [uiSrc, join(shellDir, 'src'), join(root, 'packages', 'design-system', 'src')];
    for (const base of roots) {
      for (const file of walkAll(base)) {
        if (!/\.tsx?$/.test(file)) continue;
        const src = readFileSync(file, 'utf8');
        for (const line of src.split('\n')) {
          // Only class attributes; the token gallery names the utility in prose.
          if (!/class(Name)?\s*=|className:/.test(line) && !/^\s*'/.test(line)) continue;
          for (const m of line.matchAll(/(^|[\s'"`[])(focus-ring)\b/g)) {
            const before = line.slice(0, m.index! + m[1].length);
            if (before.endsWith('focus-visible:')) continue;
            fail(
              `${relative(root, file)}: bare "focus-ring" — the utility sets outline unconditionally, ` +
                `so it draws all the time. Write focus-visible:focus-ring.`,
            );
          }
        }
      }
    }
  }

  // (d) A component nobody can import is the most likely mistake when a change
  // lands two dozen files at once — it type-checks, it renders in the gallery
  // through a deep import, and it is invisible to every consumer of `~ui`.
  {
    const COMPONENT_DIRS = [
      'primitives',
      'forms',
      'floating',
      'feedback',
      'nav',
      'data',
      'overlay',
      'dnd',
      'shell',
      'chat',
      'theme',
      'layout',
      'canvas',
      'calendar',
      'app',
    ];
    /* Directories that are deliberately NOT component dirs: they export a chosen
       subset through the barrel by hand, so a blanket every-file rule would be
       wrong for them. */
    const NON_COMPONENT_DIRS = ['hooks', 'icons', 'lib', 'styles'];
    const rootBarrel = readFileSync(join(uiSrc, 'index.ts'), 'utf8');

    /* This list is hand-maintained, which gives it a blind spot exactly the size
       of the thing the pass exists to catch: add a new directory and every file
       in it is silently unchecked. So a directory must be classified, one way or
       the other, before it can exist. */
    for (const entry of readdirSync(uiSrc, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (COMPONENT_DIRS.includes(entry.name) || NON_COMPONENT_DIRS.includes(entry.name)) continue;
      fail(
        `content/ui/src/${entry.name}/ is in neither COMPONENT_DIRS nor NON_COMPONENT_DIRS in ` +
          `scripts/validate/passes/design-system.ts — add it to one, or its files are never barrel-checked`,
      );
    }

    /* Each component directory carries its own barrel and the root file only
       stitches barrels together, so the guarantee is checked one level deeper:
       the directory barrel exists, every component file appears in it, and the
       root re-exports the directory barrel — break any link and the component
       is unreachable from ~ui. */
    for (const dir of COMPONENT_DIRS) {
      const base = join(uiSrc, dir);
      /* The other direction of the same hand-maintained list. A name left here
         after the directory is gone — `media` was one — costs nothing today and
         is a place for the check to go quiet tomorrow, when a directory is
         renamed and the old name keeps the pass looking somewhere else. */
      if (!existsSync(base)) {
        fail(
          `content/ui/src/${dir}/ is in COMPONENT_DIRS in scripts/validate/passes/design-system.ts ` +
            `but does not exist — remove it from the list`,
        );
        continue;
      }

      const subBarrelFile = join(base, 'index.ts');
      if (!existsSync(subBarrelFile)) {
        fail(
          `content/ui/src/${dir}/index.ts is missing — every component directory ` +
            `carries its own barrel, re-exported from src/index.ts`,
        );
        continue;
      }
      const subBarrel = readFileSync(subBarrelFile, 'utf8');

      if (!rootBarrel.includes(`'./${dir}/index'`)) {
        fail(
          `content/ui/src/index.ts does not re-export './${dir}/index' — ` +
            `everything in content/ui/src/${dir}/index.ts is unreachable from ~ui`,
        );
      }

      for (const file of walkAll(base)) {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
        if (/\.test\.tsx?$/.test(file)) continue;
        if (file === subBarrelFile) continue;
        /* Anything genuinely internal opts out by living under internal/. */
        if (relative(base, file).split(sep).includes('internal')) continue;

        const specifier = `./${relative(base, file)
          .replace(/\.tsx?$/, '')
          .split(sep)
          .join('/')}`;
        if (!subBarrel.includes(`'${specifier}'`)) {
          fail(
            `content/ui/src/${dir}/index.ts does not re-export ${specifier} — ` +
              `a component outside the barrel is unreachable from ~ui`,
          );
        }
      }
    }
  }
}
