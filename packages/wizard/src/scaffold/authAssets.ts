import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMigrations, README_SOURCE } from '../supabase/sql';
import type { WizardContext } from '../context';

/**
 * The SQL files the user owns: the migrations every selected module brings,
 * idempotent and re-runnable, in the order they must be applied. There is
 * nothing to seed — workspaces are created at sign-up, one per account. The PAT
 * path has already executed them; they are copied anyway, because the project is
 * the user's and re-running them in the SQL editor is the documented repair
 * path, and on the manual path it is the only way the schema ever gets there.
 *
 * Layout: standalone `<app>/supabase/{migrations/*.sql, README.md}`; embed
 * `<host>/supabase/chatfuel/…` (the host may already have a supabase/ of its
 * own — we never write into its migrations).
 */
export interface CopiedSql {
  /** Path inside the supabase directory that was written. */
  name: string;
  /** Where it came from, as a path in the content repository. */
  from: string;
  /** True when the wizard filled a placeholder in on the way out. */
  rendered: boolean;
}

export function copyAuthSql(ctx: WizardContext, supabaseDir: string): CopiedSql[] {
  // A --plan still reads and renders every migration, so the list it returns is
  // the list a real run would write; only the writes themselves are held back,
  // and the caller prints what is in it.
  const dry = ctx.flags.plan;
  const written: CopiedSql[] = [];
  if (!dry) mkdirSync(join(supabaseDir, 'migrations'), { recursive: true });

  for (const migration of loadMigrations(ctx)) {
    if (!dry) writeFileSync(join(supabaseDir, 'migrations', migration.name), migration.sql, 'utf8');
    written.push({ name: `migrations/${migration.name}`, from: migration.from, rendered: migration.rendered });
  }

  const readme = ctx.content.modulePath('auth', ...README_SOURCE);
  if (existsSync(readme)) {
    if (!dry) cpSync(readme, join(supabaseDir, 'README.md'));
    written.push({ name: 'README.md', from: `content/modules/auth/${README_SOURCE.join('/')}`, rendered: false });
  }
  return written;
}

/**
 * The proxy is vendored as a DIRECTORY (`vendor/chatfuel-proxy/`) since it
 * grew a prod server next to the Vite plugin. The import the wizard writes
 * into vite.config.ts points at the plugin entry — `vite.ts` in the split
 * layout, `index.ts` while the package is still a single file — so a scaffold
 * is runnable in both worlds.
 */
export const proxyPluginEntry = (vendorDir: string): string =>
  existsSync(join(vendorDir, 'vite.ts')) ? 'vite' : 'index';
