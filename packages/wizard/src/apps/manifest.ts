import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AppManifest } from '@chatfuel/module-manifest';
import packageJson from '../../package.json';
import { WizardError } from '../errors';

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const ENV_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * A package name npm would accept, and a version range that is a range.
 *
 * Both are copied from `module.schema.json`, which bans the same shapes for a
 * module's embed and says why: the wizard joins name and version into one npm
 * install argument and runs it, with install scripts, inside the user's own
 * project — the directory where it has just written a live Chatfuel token and
 * often a Supabase PAT. A value carrying `:` or `/` — `file:`, `link:`,
 * `portal:`, `workspace:`, `npm:`, `git+ssh://`, `https://`, or a bare
 * `user/repo` — names a source no manifest is allowed to choose.
 *
 * They are written out here rather than only in `app.schema.json` because the
 * schema is the catalog repository's gate and this is the wizard's: an `npx`
 * run validates no schema at all, and an app manifest arrives over the network
 * from a catalog whose default clone nobody confirmed.
 */
const NPM_NAME_PATTERN = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const NPM_RANGE_PATTERN =
  /^(?:[a-z][a-z0-9-]*|[~^<>=]{0,2}[0-9xX*][0-9A-Za-z.+-]*(?:\s*(?:\|\|)?\s*[~^<>=]{0,2}[0-9xX*][0-9A-Za-z.+-]*)*)$/;

const bad = (source: string, problem: string, hint?: string): WizardError =>
  new WizardError(`${source}: ${problem}`, hint);

function requireString(source: string, raw: Record<string, unknown>, field: string, maxLength: number): string {
  const value = raw[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw bad(source, `"${field}" must be a non-empty string`);
  }
  if (value.length > maxLength) throw bad(source, `"${field}" is over ${maxLength} characters`);
  return value;
}

/** 3-part numeric compare; positive when a > b. Hand-rolled — no semver dep. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/**
 * Structural validation of a fetched app.json. app.schema.json in the catalog
 * repo is the authority and its CI runs ajv; this re-check exists because the
 * manifest arrived over the network and the failure has to read like a wizard
 * error, not a schema trace. Unknown top-level fields are ignored on purpose —
 * a newer catalog must not break an older wizard — and `minWizardVersion` is
 * the loud gate for changes that actually need a newer one.
 */
export function parseAppManifest(raw: unknown, source: string): AppManifest {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw bad(source, 'app.json is not a JSON object');
  }
  const record = raw as Record<string, unknown>;

  const minWizardVersion = record.minWizardVersion;
  if (minWizardVersion !== undefined) {
    if (typeof minWizardVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(minWizardVersion)) {
      throw bad(source, '"minWizardVersion" must be a three-part version like 0.3.0');
    }
    if (compareVersions(minWizardVersion, packageJson.version) > 0) {
      throw bad(
        source,
        `this app needs wizard ${minWizardVersion}; this is ${packageJson.version}`,
        'Re-run with npx @chatfuel/wizard@latest.',
      );
    }
  }

  const id = requireString(source, record, 'id', 64);
  if (!ID_PATTERN.test(id)) throw bad(source, `"id" ${JSON.stringify(id)} must match ${ID_PATTERN}`);
  const name = requireString(source, record, 'name', 60);
  const tagline = requireString(source, record, 'tagline', 120);
  const description = requireString(source, record, 'description', 300);

  const category = record.category;
  const categories = ['instagram', 'whatsapp', 'facebook', 'website', 'other'] as const;
  if (typeof category !== 'string' || !categories.includes(category as (typeof categories)[number])) {
    throw bad(source, `"category" must be one of ${categories.join(', ')}`);
  }

  const status = record.status;
  if (status !== 'draft' && status !== 'published') {
    throw bad(source, '"status" must be "draft" or "published"');
  }

  const modules = record.modules;
  if (!Array.isArray(modules) || modules.length === 0 || !modules.every((m) => typeof m === 'string')) {
    throw bad(source, '"modules" must be a non-empty array of module ids');
  }

  const brand = record.brand;
  if (typeof brand !== 'object' || brand === null) throw bad(source, '"brand" must be an object');
  const brandRecord = brand as Record<string, unknown>;
  const appName = requireString(`${source} brand`, brandRecord, 'appName', 60);
  const logo = brandRecord.logo;
  if (logo !== undefined && typeof logo !== 'string') throw bad(source, '"brand.logo" must be a path string');

  const env = record.env;
  if (env !== undefined) {
    if (!Array.isArray(env)) throw bad(source, '"env" must be an array');
    for (const entry of env) {
      if (typeof entry !== 'object' || entry === null) throw bad(source, 'every "env" entry must be an object');
      const e = entry as Record<string, unknown>;
      if (typeof e.name !== 'string' || !ENV_NAME_PATTERN.test(e.name)) {
        throw bad(source, `env name ${JSON.stringify(e.name)} must match ${ENV_NAME_PATTERN}`);
      }
      // The narrow shape is a security boundary, not pedantry: `secret` and
      // `resolve` name wizard steps and token handling an app must not hook.
      for (const key of Object.keys(e)) {
        if (!['name', 'default', 'optional'].includes(key)) {
          throw bad(source, `env "${e.name}" declares "${key}" — apps may only set name, default, optional`);
        }
      }
      if (e.default !== undefined && typeof e.default !== 'string') {
        throw bad(source, `env "${e.name}": "default" must be a string`);
      }
      if (e.optional !== undefined && typeof e.optional !== 'boolean') {
        throw bad(source, `env "${e.name}": "optional" must be a boolean`);
      }
    }
  }

  const npmDependencies = record.npmDependencies;
  if (npmDependencies !== undefined) {
    if (typeof npmDependencies !== 'object' || npmDependencies === null || Array.isArray(npmDependencies)) {
      throw bad(source, '"npmDependencies" must be an object of package → version range');
    }
    for (const [dep, range] of Object.entries(npmDependencies)) {
      if (dep.length > 214 || !NPM_NAME_PATTERN.test(dep)) {
        throw bad(source, `npmDependencies key ${JSON.stringify(dep)} is not an npm package name`);
      }
      if (typeof range !== 'string') throw bad(source, `npmDependencies["${dep}"] must be a version range string`);
      if (range.length === 0 || range.length > 100 || !NPM_RANGE_PATTERN.test(range)) {
        throw bad(
          source,
          `npmDependencies["${dep}"] is ${JSON.stringify(range)}, which is not a semver range or a dist-tag`,
          'An app preset may name a version of a package, not where the package comes from.',
        );
      }
    }
  }

  const playbook = record.playbook;
  if (playbook !== undefined && typeof playbook !== 'string') throw bad(source, '"playbook" must be a path string');

  return {
    id,
    name,
    tagline,
    description,
    category: category as AppManifest['category'],
    status,
    minWizardVersion,
    modules: modules as string[],
    brand: { appName, logo: logo as string | undefined },
    env: env as AppManifest['env'],
    npmDependencies: npmDependencies as Record<string, string> | undefined,
    playbook: playbook as string | undefined,
    // The wizard never reads the listing; keep whatever shape the catalog sent.
    listing: (record.listing ?? { icon: '', screenshots: [] }) as AppManifest['listing'],
  };
}

/** The app directories a catalog clone offers — for the unknown-slug error. */
export function listAppSlugs(repoDir: string): string[] {
  try {
    return readdirSync(join(repoDir, 'apps'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}
