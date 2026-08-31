import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { WizardError } from '../errors';

/** The span between the two markers, exclusive of both. Throws if either is missing. */
function markedBlockRange(source: string, filePath: string, marker: string): { start: number; end: number } {
  const open = new RegExp(`/\\* @chatfuel:${marker}[^*]*\\*/`);
  const close = `/* @chatfuel:end-${marker} */`;
  const openMatch = open.exec(source);
  const closeIndex = source.indexOf(close);
  if (!openMatch || closeIndex < 0) {
    throw new WizardError(`Marked block "${marker}" not found in ${filePath} — template drift?`);
  }
  return { start: openMatch.index + openMatch[0].length, end: closeIndex };
}

/**
 * Hand the content between /* @chatfuel:<marker> *\/ and
 * /* @chatfuel:end-<marker> *\/ to `transform` and write back what it returns
 * (markers kept). Deterministic string surgery.
 */
function transformMarkedBlock(filePath: string, marker: string, transform: (block: string) => string): void {
  const source = readFileSync(filePath, 'utf8');
  const { start, end } = markedBlockRange(source, filePath, marker);
  const next = source.slice(0, start) + transform(source.slice(start, end)) + source.slice(end);
  if (next !== source) writeFileSync(filePath, next, 'utf8');
}

/**
 * Replace a marked block wholesale — the template files carry the
 * workspace-mode content, the scaffold gets the vendored-mode content.
 */
export function rewriteMarkedBlock(filePath: string, marker: string, replacement: string): void {
  transformMarkedBlock(filePath, marker, () => `\n${replacement}\n`);
}

const IMPORT_SPECIFIER = /(\bfrom\s*)(['"])[^'"]+\2/;

/**
 * Point a marked import at the vendored copy without touching what it imports.
 *
 * The names belong to the template, which is the file that uses them. A wizard
 * that wrote the list out again would be a second place to keep in step, and the
 * first time it fell behind, the scaffold would carry an import of three names
 * and calls to five — a ReferenceError on the first cold start, in generated
 * code nothing in this repository runs.
 *
 * Returns false when the file is not there, like its sibling below: the Vercel
 * function and the prod server entry are both optional in a scaffold.
 */
export function repointMarkedImport(filePath: string, marker: string, specifier: string): boolean {
  if (!existsSync(filePath)) return false;
  transformMarkedBlock(filePath, marker, (block) => {
    if (!IMPORT_SPECIFIER.test(block)) {
      throw new WizardError(`Marked block "${marker}" in ${filePath} imports from nowhere — template drift?`);
    }
    return block.replace(IMPORT_SPECIFIER, `$1'${specifier}'`);
  });
  return true;
}

/**
 * Drop the workspace fallback entries from tsconfig path arrays — every entry
 * that leaves the project. The scaffold's own entries are `./src/vendor/…`, so
 * the rule is the direction, not a depth: moving the template in the repo
 * changes how far up the fallbacks reach and must not change this.
 */
export function pruneTsconfigFallbacks(filePath: string): void {
  const source = readFileSync(filePath, 'utf8');
  writeFileSync(filePath, source.replace(/,\s*"\.\.\/[^"]*"/g, ''), 'utf8');
}

/**
 * Add the app's codegen entry point to the scripts type check.
 *
 * The template cannot ship it already listed. `codegen.ts` imports the shared
 * generator body from `scripts/codegen/`, and that is a different content tree
 * — in this repository the template directory does not contain it, so a
 * template that named the file here would fail its own type check. The app has
 * both trees side by side, which is what makes the entry true.
 */
export function includeCodegenInScriptsTsconfig(filePath: string): void {
  const source = readFileSync(filePath, 'utf8');
  const include = /"include":\s*\["scripts"\]/;
  if (!include.test(source)) {
    throw new WizardError(`${filePath} does not include exactly ["scripts"] — template drift?`);
  }
  writeFileSync(filePath, source.replace(include, '"include": ["scripts", "codegen.ts"]'), 'utf8');
}

/** Rename the scaffolded package after its directory. */
export function renamePackage(filePath: string, name: string): void {
  const pkg = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  pkg.name = name;
  delete pkg.description; // template-specific text
  writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

type ManifestLike = { app?: { embed?: { npmDependencies?: Record<string, string> } } };

/**
 * Drop the `npmDependencies` of UNSELECTED modules from the scaffold's
 * package.json — content/shell (the template) declares the union so the in-repo
 * dev app builds every module; a scaffold without auth must not carry
 * `@supabase/supabase-js`. A dependency that a SELECTED module also declares
 * is kept (union semantics — the manifests, not the module ids, decide).
 * Returns the removed package names.
 */
export function pruneModuleDependencies(
  filePath: string,
  unselected: ManifestLike[],
  selected: ManifestLike[] = [],
): string[] {
  const keep = new Set(selected.flatMap((m) => Object.keys(m.app?.embed?.npmDependencies ?? {})));
  const drop = new Set(
    unselected.flatMap((m) => Object.keys(m.app?.embed?.npmDependencies ?? {})).filter((name) => !keep.has(name)),
  );
  if (drop.size === 0) return [];
  const pkg = JSON.parse(readFileSync(filePath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const removed: string[] = [];
  for (const section of [pkg.dependencies, pkg.devDependencies]) {
    if (!section) continue;
    for (const name of drop) {
      if (name in section) {
        delete section[name];
        removed.push(name);
      }
    }
  }
  writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return removed;
}

/**
 * Merge an app preset's npmDependencies into the scaffold's package.json.
 * The app's declared range wins on a conflict — the preset was written and
 * tested against it — and the returned names are what changed, for the log.
 */
export function mergeAppDependencies(filePath: string, npmDependencies: Record<string, string>): string[] {
  const entries = Object.entries(npmDependencies);
  if (entries.length === 0) return [];
  const pkg = JSON.parse(readFileSync(filePath, 'utf8')) as { dependencies?: Record<string, string> };
  pkg.dependencies ??= {};
  const changed: string[] = [];
  for (const [name, range] of entries) {
    if (pkg.dependencies[name] === range) continue;
    pkg.dependencies[name] = range;
    changed.push(name);
  }
  if (changed.length > 0) writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return changed;
}

/** The object literal around `at`, found by counting braces outwards. */
function enclosingObject(block: string, at: number): { start: number; end: number } | null {
  let depth = 0;
  let start = at - 1;
  for (; start >= 0; start--) {
    const c = block[start];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) break;
      depth--;
    }
  }
  depth = 0;
  let end = at;
  for (; end < block.length; end++) {
    const c = block[end];
    if (c === '{') depth++;
    else if (c === '}') {
      if (depth === 0) break;
      depth--;
    }
  }
  if (start < 0 || end === block.length) return null;
  // Swallow the trailing comma and the rest of the line, then the indentation
  // that led into it, so removing an entry leaves no blank line behind.
  end++;
  if (block[end] === ',') end++;
  while (block[end] === ' ' || block[end] === '\t') end++;
  if (block[end] === '\n') end++;
  while (start > 0 && (block[start - 1] === ' ' || block[start - 1] === '\t')) start--;
  return { start, end };
}

/** Drop the `~ui` import specifiers the rest of the file no longer mentions. */
function pruneUiImports(source: string): string {
  const line = /^import \{([^}]*)\} from '~ui';$/m.exec(source);
  if (!line) return source;
  const rest = source.slice(0, line.index) + source.slice(line.index + line[0].length);
  const kept = line[1]
    .split(',')
    .map((spec) => spec.trim())
    .filter((spec) => spec.length > 0)
    // A type-only specifier is cheap to keep and its uses are easy to miss.
    .filter((spec) => spec.startsWith('type ') || new RegExp(`\\b${spec.split(/\s+/).pop()}\\b`).test(rest));
  if (kept.length === line[1].split(',').filter((s) => s.trim().length > 0).length) return source;
  const replacement = kept.length > 0 ? `import { ${kept.join(', ')} } from '~ui';\n` : '';
  return source.slice(0, line.index) + replacement + source.slice(line.index + line[0].length + 1);
}

/**
 * Filter the nav table down to the modules this app installed.
 *
 * The table is a curated superset in the template — it names every module,
 * in the order the menu should read. A scaffold gets a subset, and while
 * `buildNavGroups` skips ids it cannot resolve, a table naming pages that are
 * not there is a table nobody can trust. So: keep the selected ids in each
 * group, drop a group that empties out, and drop the icon import that leaves
 * with it. Returns the ids removed.
 */
export function pruneNavGroups(filePath: string, selectedIds: string[]): string[] {
  const keep = new Set(selectedIds);
  const removed: string[] = [];
  const source = readFileSync(filePath, 'utf8');
  const { start, end } = markedBlockRange(source, filePath, 'nav-groups');
  let block = source.slice(start, end);

  const groups = [...block.matchAll(/items: \[([^\]]*)\]/g)];
  if (groups.length === 0) {
    throw new WizardError(`No "items" list in the nav table of ${filePath} — template drift?`);
  }
  // Last to first: an edit must not move the offsets of the matches after it.
  for (const group of groups.reverse()) {
    const ids = [...group[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const kept = ids.filter((id) => keep.has(id));
    if (kept.length === ids.length) continue;
    removed.push(...ids.filter((id) => !keep.has(id)));
    const at = group.index!;
    if (kept.length > 0) {
      const items = `items: [${kept.map((id) => `'${id}'`).join(', ')}]`;
      block = block.slice(0, at) + items + block.slice(at + group[0].length);
    } else {
      const object = enclosingObject(block, at);
      if (!object) {
        throw new WizardError(`Unbalanced braces around the nav table of ${filePath} — template drift?`);
      }
      block = block.slice(0, object.start) + block.slice(object.end);
    }
  }

  if (removed.length === 0) return [];
  writeFileSync(filePath, pruneUiImports(source.slice(0, start) + block + source.slice(end)), 'utf8');
  return removed;
}

/** Text going into an HTML element or a double-quoted attribute. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Favicon media types, by the extensions the wizard accepts. */
export const FAVICON_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

/**
 * Write the app's name and mark into `index.html`.
 *
 * The tab is the one surface that cannot read the environment: `VITE_*` is
 * baked into the bundle, and the head is parsed before any of it runs. So the
 * two lines are rewritten on disk instead, once, while the app is being made.
 *
 * The tags are matched directly rather than through `/* @chatfuel:… *\/`
 * markers — HTML has no comment syntax the marker helpers understand, and a
 * second marker dialect would cost more than it saves. Missing tags still fail
 * loudly, which is the part that matters.
 */
export function applyBrandHtml(
  filePath: string,
  { title, href, type }: { title: string; href: string; type: string },
): void {
  const source = readFileSync(filePath, 'utf8');
  const icon = /<link rel="icon"[^>]*>/;
  const titleTag = /<title>[^<]*<\/title>/;
  if (!icon.test(source)) {
    throw new WizardError(`No <link rel="icon"> in ${filePath} — template drift?`);
  }
  if (!titleTag.test(source)) {
    throw new WizardError(`No <title> in ${filePath} — template drift?`);
  }
  const next = source
    .replace(icon, `<link rel="icon" type="${type}" href="${escapeHtml(href)}" />`)
    .replace(titleTag, `<title>${escapeHtml(title)}</title>`);
  if (next !== source) writeFileSync(filePath, next, 'utf8');
}
