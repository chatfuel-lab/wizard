// ---------------------------------------------------------------------------
// Pass 16 — SECURITY.md's scope section names mechanisms, and a name that no
//   longer exists is worse than no name: it tells a reporter the gate is there.
//   Every backticked file in the section must exist, every other backticked
//   token must appear in a file the same bullet names, and a bullet that names
//   a mechanism without a file is refused — attribution is the whole point.
//   A bare basename resolves under content/vite-plugin-proxy/src: the section
//   is about the proxy.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const PROXY_SRC = ['content', 'vite-plugin-proxy', 'src'];

export function checkSecurityScope(ctx: ValidateContext): void {
  const file = join(ctx.root, 'SECURITY.md');
  if (!existsSync(file)) {
    fail('SECURITY.md is missing — the scope section is the promise reporters read');
    return;
  }
  const text = readFileSync(file, 'utf8');
  const start = text.indexOf('In scope:');
  const end = text.indexOf('Out of scope:');
  if (start < 0 || end < 0 || end < start) {
    fail('SECURITY.md: the scope section must read "In scope:" … "Out of scope:" — the pass cannot find it');
    return;
  }
  const section = text.slice(start, end);
  // A bullet runs until the next one or a blank line; the trailing prose
  // paragraphs are blocks of their own and are held to the same rule.
  for (const block of section.split(/\n\s*\n|\n(?=- )/)) {
    const tokens = [...block.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    /* Everything this pass checks, it checks because the name was written in
       backticks. A bullet that names a bug class and no mechanism is fine —
       "exposure of the Chatfuel token anywhere in scaffolded output" is a
       promise about behaviour, not about a file. A file named in plain prose is
       not: it reads to a reporter exactly like the checked ones and is held to
       nothing, so the rename that deletes it leaves the claim standing. */
    for (const m of block.replace(/`[^`]*`/g, '').matchAll(/[\w/.-]+\.(?:ts|tsx|js|sql|json|md)\b/g)) {
      fail(
        `SECURITY.md: names ${m[0]} outside backticks — only backticked names are checked to exist, so write it as \`${m[0]}\``,
      );
    }
    if (tokens.length === 0) continue;
    const files = tokens.filter((t) => /\.(ts|tsx|js|sql|json|md)$/.test(t));
    const symbols = tokens.filter((t) => !files.includes(t));
    const resolved: string[] = [];
    for (const f of files) {
      const abs = f.includes('/') ? join(ctx.root, f) : join(ctx.root, ...PROXY_SRC, f);
      if (!existsSync(abs)) {
        fail(`SECURITY.md: names \`${f}\`, which does not exist — the scope claims a file the repo does not have`);
        continue;
      }
      resolved.push(abs);
    }
    if (symbols.length > 0 && resolved.length === 0) {
      fail(
        `SECURITY.md: names ${symbols.map((s) => `\`${s}\``).join(', ')} without naming a file — a mechanism in scope must say where it lives`,
      );
      continue;
    }
    for (const symbol of symbols) {
      // Whole-word: a rename that only appends to the old name leaves the old
      // name a substring of the new one, and a substring match would call that
      // mechanism present.
      const re = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      const found = resolved.some((abs) => re.test(readFileSync(abs, 'utf8')));
      if (!found) {
        fail(
          `SECURITY.md: names \`${symbol}\`, which appears in none of ${files.join(', ')} — the mechanism moved or was renamed`,
        );
      }
    }
  }
}
