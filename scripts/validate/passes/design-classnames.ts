// ---------------------------------------------------------------------------
// Pass 11 (g, h, i, j) — design-system integrity, parser-adjudicated rules
//   g. no viewport prefix in module code — a module is sized by its container
//   h. no text-[Npx] — every size a module needs has a role in the type scale
//   i. no class written flush against a template interpolation
//   j. no zero-sized <svg>
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type * as TS from 'typescript';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

/* The TypeScript import stays lazy: the raw text of every file is scanned
   first, and the compiler is only loaded once a candidate needs adjudicating —
   which on a clean tree is never. */
/* Both shapes, because the two live majors disagree: TypeScript 5 ships
   CommonJS and the namespace arrives under `default`; TypeScript 7 ships ESM
   and puts it at the top level, where `default` is `undefined` — and the first
   thing this pass touches is `ts.ScriptTarget.Latest`, so the whole gate died
   with "Cannot read properties of undefined" instead of checking anything. */
type TsApi = typeof TS;
let lazyTs: TsApi | null = null;
const loadTs = async (): Promise<TsApi> => {
  if (!lazyTs) {
    const mod: unknown = await import('typescript');
    lazyTs = ((mod as { default?: TsApi }).default ?? mod) as TsApi;
  }
  return lazyTs;
};

export async function checkClassnames(ctx: ValidateContext): Promise<void> {
  const { root, shellDir, uiSrc } = ctx;

  /* (g) and (h) both ban a spelling, and both have the same problem: the spelling
     they ban is also the spelling their own explanation has to use. The comment
     above a rule names the thing it forbids; so does the gallery entry that
     documents the token that replaced it. A line-level regex cannot tell those
     apart from a violation — an earlier draft of (g) flagged the words `guide.md:`
     in a sentence, and a draft sweep for (h) would have rewritten the token note
     "retires the text-[11px] arbitraries" into one describing itself.

     So adjudicate with the TypeScript parser, and only where it is needed. A
     Tailwind class can live in exactly four kinds of node: a string literal, a
     template literal, one of a template's fragments, and JSX text. A comment is
     none of them, because a comment is trivia and never a node at all — which is
     the property the whole thing rests on. The parse is not paid up front: the
     raw text is scanned first, and a file with no candidate at all is never
     parsed, which is every file on a clean tree. */
  {
    const CLASS_TEXT = new Set<TS.SyntaxKind>();

    const classTextRanges = async (file: string, source: string): Promise<Array<[number, number]>> => {
      const ts = await loadTs();
      if (CLASS_TEXT.size === 0) {
        CLASS_TEXT.add(ts.SyntaxKind.StringLiteral);
        CLASS_TEXT.add(ts.SyntaxKind.NoSubstitutionTemplateLiteral);
        CLASS_TEXT.add(ts.SyntaxKind.TemplateHead);
        CLASS_TEXT.add(ts.SyntaxKind.TemplateMiddle);
        CLASS_TEXT.add(ts.SyntaxKind.TemplateTail);
        CLASS_TEXT.add(ts.SyntaxKind.JsxText);
      }
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
      const ranges: Array<[number, number]> = [];
      const visit = (node: TS.Node): void => {
        if (CLASS_TEXT.has(node.kind)) ranges.push([node.getStart(sourceFile), node.end]);
        ts.forEachChild(node, visit);
      };
      /* getStart, not `pos`: `pos` begins at the end of the previous token, so it
         swallows the leading trivia — which is to say the comment above the node,
         which is the one thing this must not include. */
      ts.forEachChild(sourceFile, visit);
      return ranges;
    };

    interface ClassTextRule {
      pattern: RegExp;
      roots: string[];
      describe: (match: string) => string;
    }

    const RULES: ClassTextRule[] = [
      {
        // (g) A module can be 700px wide inside a 2560px viewport — that is the
        // premise the whole layout layer is built on. A viewport prefix asks the
        // window a question only the container can answer, and it is right by
        // accident on a full-width desktop, which is why it survives review.
        // `@md:` and friends are container variants and stay legal; so does any
        // viewport prefix in shell chrome, which really is window-sized.
        pattern: /(?<![\w@-])((?:max-)?(?:sm|md|lg|xl|2xl)):(?=[a-z[(-])/g,
        roots: [join(shellDir, 'src', 'modules')],
        describe: (match) =>
          `"${match}:" is a viewport prefix — a module is sized by its container, not by the ` +
          `window. Use a band (useBand) if it changes what renders, or a container variant ` +
          `(@compact:/@wide:/@inline:) if it only changes how it looks.`,
      },
      {
        // (h) Seated only after the sweep that emptied it, so it is a flat ban
        // rather than a ratchet against a baseline count.
        pattern: /\btext-\[\d+px\]/g,
        roots: [join(shellDir, 'src'), join(root, 'packages', 'design-system', 'src'), uiSrc],
        describe: (match) =>
          `"${match}" is a pixel size outside the type scale. Use a role: text-title, ` +
          `text-heading, text-body, text-label, text-meta, text-micro, text-nano.`,
      },
    ];

    for (const rule of RULES) {
      for (const base of rule.roots) {
        for (const file of walkAll(base)) {
          if (!/\.tsx?$/.test(file)) continue;
          const source = readFileSync(file, 'utf8');
          rule.pattern.lastIndex = 0;
          const candidates = [...source.matchAll(rule.pattern)];
          if (candidates.length === 0) continue;
          const ranges = await classTextRanges(file, source);
          for (const candidate of candidates) {
            const at = candidate.index!;
            if (!ranges.some(([start, end]) => at >= start && at < end)) continue;
            const line = source.slice(0, at).split('\n').length;
            fail(`${relative(root, file)}:${line}: ${rule.describe(candidate[1] ?? candidate[0])}`);
          }
        }
      }
    }
  }

  /* Pass 11(i) — a class must not be written flush against an interpolation.
     ---------------------------------------------------------------------------
     Tailwind does not read the DOM, or the import graph, or the values a template
     evaluates to. It reads source files as TEXT and extracts anything that looks
     like a class name. So this:

         className={`... bg-surface shadow-island${padding ? ` ${padding}` : ''}`}

     hands it the candidate `shadow-island${`, which matches no utility. The rule
     is never generated, the element has no shadow, and nothing anywhere reports a
     problem — a missing class is a missing rule, not an error. tsc sees a valid
     template, the node-only vitest sees no DOM, and the build succeeds.

     It survives review because it is usually harmless: `flex-col${` and `py-2${`
     are dropped too, and nobody notices, because those same utilities are written
     properly somewhere else in the codebase and generated from there. It only
     becomes visible when the glued class is the LAST place that class is used,
     which is exactly what happens to a design-system primitive that owns a token
     nothing else references. `Island` is the elevated-surface primitive and its
     own `shadow-island` was the casualty; `PageHeader`'s `backdrop-blur` was
     missing from every module in the shell.

     Both directions are wrong for the same reason: a fragment that ENDS without
     whitespace glues its last class to the `${`, and one that BEGINS without
     whitespace glues its first class to the `}`.

     Scoped to `className` attributes, decided by the parser. A template that
     builds a React key or an id is not a class list, and a regex cannot tell the
     difference — `key={`gap-${index}`}` looks identical to a broken class. */
  {
    const roots = [join(shellDir, 'src'), join(root, 'packages', 'design-system', 'src'), uiSrc];

    const lastToken = (text: string): string | undefined => text.trim().split(/\s+/).pop();
    const firstToken = (text: string): string => text.trim().split(/\s+/)[0];

    for (const base of roots) {
      for (const file of walkAll(base)) {
        if (!file.endsWith('.tsx')) continue;
        const source = readFileSync(file, 'utf8');
        /* Not paid on a file with no interpolated className at all, which is most
           of them. */
        if (!source.includes('className={')) continue;
        const ts = await loadTs();

        const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
        const label = relative(root, file);
        const lineOf = (position: number): number => source.slice(0, position).split('\n').length;

        const report = (position: number, token: string | undefined, side: 'interpolation' | 'close'): void =>
          fail(
            `${label}:${lineOf(position)}: "${token}" is written flush against a template ` +
              `${side} — Tailwind scans source as text, so it reads "${
                side === 'interpolation' ? `${token}\${` : `}${token}`
              }", generates nothing, and the class is silently absent from the CSS. ` +
              `Put the space outside the interpolation.`,
          );

        const checkTemplate = (template: TS.Node): void => {
          if (!ts.isTemplateExpression(template)) return;
          if (template.head.text !== '' && !/\s$/.test(template.head.text)) {
            report(template.head.getStart(sourceFile), lastToken(template.head.text), 'interpolation');
          }
          for (const span of template.templateSpans) {
            const { text } = span.literal;
            if (text === '') continue;
            if (!/^\s/.test(text)) {
              report(span.literal.getStart(sourceFile), firstToken(text), 'close');
            }
            if (ts.isTemplateMiddle(span.literal) && !/\s$/.test(text)) {
              report(span.literal.getStart(sourceFile), lastToken(text), 'interpolation');
            }
          }
        };

        const visit = (node: TS.Node): void => {
          if (
            ts.isJsxAttribute(node) &&
            node.name.getText(sourceFile) === 'className' &&
            node.initializer &&
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression
          ) {
            const walk = (inner: TS.Node): void => {
              checkTemplate(inner);
              ts.forEachChild(inner, walk);
            };
            walk(node.initializer.expression);
          }
          ts.forEachChild(node, visit);
        };
        ts.forEachChild(sourceFile, visit);
      }
    }
  }

  /* Pass 11(j) — an `<svg>` may not be sized to zero.
     ---------------------------------------------------------------------------
     `<svg class="h-0 w-0 overflow-visible">` is a tempting shape: a bare
     coordinate space with no box, whose children are positioned anywhere and
     spill out. It reads as correct, it type-checks, it builds — and it renders
     nothing at all. The SVG specification says a width or height of zero
     "disables rendering of the element", and that is the whole element, not the
     part outside the viewport; `overflow: visible` never gets a say.

     It cost this repository every line on the canvas: no edges, no arrowheads, no
     marquee, no connection preview, and no way to click an edge in order to
     delete it. Four separate bug reports, one cause, and not one of them visible
     to `tsc`, to a node-only vitest, or to a production build.

     Parser-adjudicated and scoped to className, on the same footing as 11(g)–(i):
     a `<div class="h-0">` is ordinary and only the SVG element carries the rule. */
  {
    const ZERO = /(?:^|\s)(?:h-0|w-0|size-0)(?:\s|$)/;

    for (const file of walkAll(uiSrc)) {
      if (!file.endsWith('.tsx') || /\.test\.tsx$/.test(file)) continue;
      const source = readFileSync(file, 'utf8');
      if (!source.includes('<svg')) continue;
      const ts = await loadTs();

      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
      const label = relative(root, file);

      const visit = (node: TS.Node): void => {
        if (ts.isJsxOpeningLikeElement(node) && node.tagName.getText(sourceFile) === 'svg') {
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr)) continue;
            if (attr.name.getText(sourceFile) !== 'className') continue;
            const text = attr.initializer ? attr.initializer.getText(sourceFile) : '';
            if (!ZERO.test(text)) continue;
            const line = source.slice(0, attr.getStart(sourceFile)).split('\n').length;
            fail(
              `${label}:${line}: this <svg> is sized to zero — the SVG specification disables ` +
                `rendering of an element whose width or height is 0, so it draws nothing at all ` +
                `and "overflow: visible" cannot rescue it. Give it a real box (absolute inset-0 ` +
                `h-full w-full) and put the transform on a <g> inside.`,
            );
          }
        }
        ts.forEachChild(node, visit);
      };
      ts.forEachChild(sourceFile, visit);
    }
  }
}
