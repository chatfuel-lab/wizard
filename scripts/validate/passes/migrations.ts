// ---------------------------------------------------------------------------
// Pass 12 — Supabase migration hygiene (modules/*/supabase/migrations/*.sql)
//   The migration is re-run on shared agency projects and by users from the
//   SQL editor, and PostgREST exposes every public function to anon unless
//   execute is revoked — each of these is a rule the file must keep visibly.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

export function checkMigrations(ctx: ValidateContext): void {
  const { root, modulesDir, manifests } = ctx;
  let checked = 0;
  for (const [id] of manifests) {
    const supabaseDir = join(modulesDir, id, 'supabase');
    const migDir = join(supabaseDir, 'migrations');
    // Most modules bring no SQL at all, and that is not this pass's business.
    // A module with a `supabase/` and nothing under `migrations/` is: the
    // wizard copies that directory into the user's project and applies what is
    // in it, so an empty one is a module whose tables are never created.
    if (!existsSync(supabaseDir)) continue;
    if (!existsSync(migDir)) {
      fail(
        `${relative(root, supabaseDir)}: has no migrations/ — the wizard copies this tree and applies what is in it`,
      );
      continue;
    }
    const files = readdirSync(migDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    if (files.length === 0) {
      fail(`${relative(root, migDir)}: holds no .sql — every rule below is checked against nothing`);
    }
    for (const name of files) {
      const file = join(migDir, name);
      const rel = relative(root, file);
      const sql = readFileSync(file, 'utf8');
      // The line the match is on, not the line the first match was on: a file
      // with two offending statements used to point at the first one twice.
      const where = (index: number): number => sql.slice(0, index).split('\n').length;
      /* `^[ \t]*` and not `^`: the DDL these rules are about is written at the
         left margin today, but a `do $$ … end $$;` block indents its body, and
         four of them are already in the publishing migration — a `create table`
         inside one was seen by none of these rules. Still anchored to the start
         of a line, so a `-- create table …` comment and a statement quoted
         inside another one are not statements here. */
      for (const m of sql.matchAll(/^[ \t]*create\s+table\s+(?!if\s+not\s+exists)/gim)) {
        fail(
          `${rel}:${where(m.index)}: "create table" without "if not exists" — the migration must be re-runnable (${m[0].trim()})`,
        );
      }
      /* An index is re-created by the same hand re-running the same file, and
         `create index` without the guard fails the second run — the whole
         reason this pass exists. Twelve of them are written correctly today by
         habit; this is the rule that makes the thirteenth. `concurrently` may
         sit between, and a unique index is the same statement. */
      for (const m of sql.matchAll(
        /^[ \t]*create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?!if\s+not\s+exists)/gim,
      )) {
        fail(`${rel}:${where(m.index)}: "${m[0].trim()}" without "if not exists" — the migration must be re-runnable`);
      }
      for (const re of [
        /^[ \t]*create\s+(?!or\s+replace\s+)function/gim,
        /^[ \t]*create\s+(?!or\s+replace\s+)trigger/gim,
      ]) {
        for (const m of sql.matchAll(re))
          fail(
            `${rel}:${where(m.index)}: "${m[0].trim()}" must be "create or replace" — the migration must be re-runnable`,
          );
      }
      for (const m of sql.matchAll(/^[ \t]*create\s+policy\s+(\S+)/gim)) {
        if (!new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${m[1]}\\b`, 'i').test(sql)) {
          fail(
            `${rel}:${where(m.index)}: policy ${m[1]} is created without a preceding "drop policy if exists" — re-runs would fail`,
          );
        }
      }
      /* Every function: security definer + set search_path = '' + execute
         revoked from public.

         The three checks below read one shape of name and one shape of body,
         and a function written any other way used to pass all of them by being
         invisible: quoted, schema-less or in some other schema for the name;
         and, for the body, `language sql as 'select 1'` — no dollar quote at
         all. The second one was the worse of the two, because the search for
         the opening dollar quote did not stop at the end of the statement: it
         ran on into the NEXT function's body, and the three checks then read
         that function's header and passed. So each statement is cut at the
         start of the next one, nothing is read across that line, and a shape
         these checks cannot read is named rather than skipped — unchecked is
         the one outcome this gate must not have. */
      const heads = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([^\s(]+)/gi)];
      for (const [i, m] of heads.entries()) {
        const at = where(m.index);
        const declared = m[1];
        if (!/^public\.\w+$/.test(declared)) {
          fail(
            `${rel}:${at}: function ${declared} is not written as public.<name> — the security-definer, search_path and revoke checks cannot read it`,
          );
          continue;
        }
        const fn = declared.slice('public.'.length);
        const stmt = sql.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : sql.length);
        /* The body opens with a dollar quote, and the tag between the dollars
           is the author's to choose: `$$` is what every function here uses
           today, and a `$body$` — legal, ordinary, and what somebody reaches
           for when the body contains a `$$` — is read the same way. */
        const opens = /\$\w*\$/.exec(stmt);
        if (!opens) {
          fail(
            `${rel}:${at}: function ${fn} has no dollar-quoted body — the security-definer, search_path and revoke checks read the header up to the body's opening quote, and cannot find one here`,
          );
          continue;
        }
        const head = stmt.slice(0, opens.index + opens[0].length);
        if (!/security\s+definer/i.test(head))
          fail(`${rel}:${at}: function ${fn} is not "security definer" — RPC-only tables need it`);
        if (!/set\s+search_path\s*=\s*''/i.test(head))
          fail(
            `${rel}:${at}: function ${fn} lacks "set search_path = ''" — a security-definer function without it is hijackable`,
          );
        // The default EXECUTE grant is handed out per role, so revoking it from
        // the PUBLIC pseudo-role leaves anon and authenticated holding theirs.
        // Read the whole statement, not just its opening.
        const revoked = new RegExp(
          `revoke\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^;]*\\)\\s*from([^;]*);`,
          'i',
        ).exec(sql);
        if (!revoked) {
          fail(
            `${rel}:${at}: function ${fn} has no "revoke execute on function public.${fn}(…) from public, anon, authenticated" — Supabase default-grants EXECUTE to anon`,
          );
        } else {
          const missing = ['anon', 'authenticated'].filter(
            (role) => !new RegExp(`\\b${role}\\b`, 'i').test(revoked[1]),
          );
          if (missing.length > 0) {
            fail(
              `${rel}:${at}: function ${fn} revokes execute from ${revoked[1].trim()} — ${missing.join(' and ')} keep${missing.length === 1 ? 's' : ''} the default grant and can still call it`,
            );
          }
        }
      }
      if (/\b[0-9a-f]{64}\b/i.test(sql))
        fail(`${rel}: a 64-hex literal — the wizard's log scrubber masks any 64-hex string; use base64/base64url`);
      if (!/notify\s+pgrst\s*,\s*'reload schema'/i.test(sql))
        fail(`${rel}: missing "notify pgrst, 'reload schema'" — new RPCs 404 until the PostgREST schema cache reloads`);
      checked += 1;
    }
  }
  /* This pass is the only thing standing between a module's SQL and a table
     anon can read. It is also the pass whose subject is the easiest to lose —
     every module is allowed to have no migrations, so "found none anywhere"
     and "checked them all" printed the same nothing. */
  if (checked === 0) {
    fail('no module migration was read — this pass checked nothing, and it is the only check on that SQL');
  }
}
