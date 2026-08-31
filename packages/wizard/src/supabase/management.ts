import { randomBytes } from 'node:crypto';
import { backoffDelay } from '@chatfuel/api-client';
import { outboundFetch, proxyHint } from '../net';
import type { AuthConfigView, AuthPatch, RecoveryTemplatePatch } from './authConfig';
import type { ManagementApiKey } from './keys';

/**
 * A thin, fetch-injectable client for the Supabase Management API
 * (https://api.supabase.com, `Authorization: Bearer <personal access token>`).
 * Only what the auth step needs: verify the token, list/create projects, wait
 * for health, read the API keys, run SQL, read/patch the Auth config. Every
 * call: 30 s timeout, ONE retry on 429/502/503/504 with the api-client's
 * jittered backoff, and errors that carry the HTTP status plus a human hint
 * for the two statuses users actually hit (401 bad token, 403 missing scope).
 *
 * Nothing here logs. Bodies may contain keys; callers print statuses only.
 */

const MANAGEMENT_BASE_URL = 'https://api.supabase.com';
export const PAT_HELP_URL = 'https://supabase.com/dashboard/account/tokens';
export const FINE_GRAINED_SCOPES =
  'projects read/write, secrets read (API keys), database write (migration), auth config write';

export const HINT_401 = `The access token was rejected. Mint a personal access token at ${PAT_HELP_URL} and pass it as SUPABASE_ACCESS_TOKEN (or --supabase-token).`;
export const HINT_403 = `The access token lacks a permission for this call. Fine-grained tokens need: ${FINE_GRAINED_SCOPES}. A classic (all-access) token also works.`;

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_MS = 5_000;
const DEFAULT_CAP_MS = 6 * 60_000;
const TERMINAL_FAILURES = new Set(['INIT_FAILED', 'REMOVED', 'RESTORE_FAILED', 'PAUSE_FAILED']);

export class SupabaseManagementError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body: unknown;
  readonly hint?: string;
  constructor(message: string, opts: { status: number; endpoint: string; body?: unknown; hint?: string }) {
    super(message);
    this.name = 'SupabaseManagementError';
    this.status = opts.status;
    this.endpoint = opts.endpoint;
    this.body = opts.body;
    this.hint = opts.hint;
  }
}

export interface Organization {
  /** The org slug — `id` in the v1 response, `slug` where present. */
  slug: string;
  name: string;
}

export interface Project {
  /** The project ref (`id` in the API). */
  ref: string;
  name: string;
  organizationSlug: string;
  region: string;
  status: string;
  createdAt?: string;
}

export interface RegionOption {
  code: string;
  name: string;
  /** smartGroup = Supabase picks a healthy region inside the group; specific = one AWS region. */
  type: 'smartGroup' | 'specific';
  recommended?: boolean;
}

export interface CreateProjectInput {
  name: string;
  organizationSlug: string;
  region: RegionOption;
  /** Random and forgotten by default — the app never talks to Postgres directly. */
  dbPass?: string;
}

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  status?: string;
  error?: string;
}

export interface ManagementClientOptions {
  token: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable for tests; defaults to the api-client's jittered backoff (1 s base, 4 s cap). */
  retryDelayMs?: (attempt: number) => number;
  /** Poll interval for the create/health waits. */
  pollMs?: number;
}

export interface WaitOptions {
  /** Deadline for the whole wait; default 6 minutes. */
  capMs?: number;
  onStatus?: (status: string) => void;
}

export interface ManagementClient {
  listOrganizations(): Promise<Organization[]>;
  listProjects(): Promise<Project[]>;
  getProject(ref: string): Promise<Project>;
  availableRegions(organizationSlug: string): Promise<RegionOption[]>;
  createProject(input: CreateProjectInput): Promise<Project>;
  waitForProject(ref: string, opts?: WaitOptions): Promise<Project>;
  waitForHealth(ref: string, services?: string[], opts?: WaitOptions): Promise<ServiceHealth[]>;
  getApiKeys(ref: string): Promise<ManagementApiKey[]>;
  /** `POST /v1/projects/{ref}/database/query` — returns the parsed response (rows of the last statement). */
  runQuery(ref: string, query: string, parameters?: unknown[]): Promise<unknown>;
  getAuthConfig(ref: string): Promise<AuthConfigView>;
  patchAuthConfig(ref: string, patch: AuthPatch | RecoveryTemplatePatch): Promise<AuthConfigView>;
}

/** 24 random bytes base64url — a database password nobody needs to remember. */
const randomDbPassword = (): string => randomBytes(24).toString('base64url');

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

function toOrganization(raw: unknown): Organization {
  const r = asRecord(raw);
  return { slug: str(r.slug) || str(r.id), name: str(r.name) || str(r.slug) || str(r.id) };
}

function toProject(raw: unknown): Project {
  const r = asRecord(raw);
  return {
    ref: str(r.id) || str(r.ref),
    name: str(r.name),
    organizationSlug: str(r.organization_slug) || str(r.organization_id),
    region: str(r.region),
    status: str(r.status, 'UNKNOWN'),
    createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/**
 * `GET /v1/projects/available-regions` — tolerant of the shapes the API has
 * used. What it answers today is
 * `{ recommendations: { smartGroup: {…}, specific: [{…}] },
 *    all: { smartGroup: [...], specific: [...] } }` — the lists live under
 * `all`, and the key is SINGULAR. Also accepted, from older shapes: the two
 * lists at the top level under `smartGroups`/`smart_groups` and
 * `specific`/`regions`, a `recommendation`/`recommended` marker, and a bare
 * array of region codes or objects (treated as specific).
 *
 * An unparsed payload is not cosmetic: the create-project step refuses with
 * "Supabase returned no regions for this organization" and the wizard stops.
 */
export function parseRegions(raw: unknown): RegionOption[] {
  const out: RegionOption[] = [];
  const push = (item: unknown, type: RegionOption['type'], recommendedCode?: string) => {
    if (typeof item === 'string') {
      out.push({ code: item, name: item, type, recommended: item === recommendedCode });
      return;
    }
    const r = asRecord(item);
    const code = str(r.code) || str(r.id) || str(r.region);
    if (!code) return;
    out.push({
      code,
      name: str(r.name) || str(r.displayName) || code,
      type,
      recommended: r.recommended === true || code === recommendedCode,
    });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) push(item, 'specific');
    return out;
  }
  const top = asRecord(raw);
  // Today's shape nests the lists under `all`; older ones had them at the top.
  const r = { ...top, ...asRecord(top.all) };
  const rec = asRecord(top.recommendations ?? top.recommendation ?? top.recommended);
  const recSmartRaw = rec.smartGroup ?? rec.smart_group;
  const recSmart = str(recSmartRaw) || str(asRecord(recSmartRaw).code);
  const recSpecificRaw = Array.isArray(rec.specific) ? rec.specific[0] : (rec.specific ?? rec.region);
  const recSpecific = str(recSpecificRaw) || str(asRecord(recSpecificRaw).code);
  const smart = r.smartGroup ?? r.smartGroups ?? r.smart_groups ?? [];
  const specific = r.specific ?? r.regions ?? [];
  if (Array.isArray(smart)) for (const item of smart) push(item, 'smartGroup', recSmart);
  if (Array.isArray(specific)) for (const item of specific) push(item, 'specific', recSpecific);
  return out;
}

/** The region the picker preselects: the recommended smart group, else the first smart group, else the first region. */
export function defaultRegion(regions: RegionOption[]): RegionOption | undefined {
  return (
    regions.find((r) => r.type === 'smartGroup' && r.recommended) ??
    regions.find((r) => r.type === 'smartGroup') ??
    regions.find((r) => r.recommended) ??
    regions[0]
  );
}

/** ACTIVE_HEALTHY first, then the rest alphabetically by name; paused (INACTIVE) last. */
export function sortProjects(projects: Project[]): Project[] {
  const rank = (p: Project) => (p.status === 'ACTIVE_HEALTHY' ? 0 : p.status === 'INACTIVE' ? 2 : 1);
  return [...projects].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function projectStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE_HEALTHY':
      return 'active';
    case 'INACTIVE':
      return 'paused — restore it in the dashboard first';
    case 'COMING_UP':
    case 'RESTORING':
    case 'RESTARTING':
    case 'UPGRADING':
    case 'RESIZING':
      return `${status.toLowerCase().replace(/_/g, ' ')} — may need a minute`;
    default:
      return status.toLowerCase().replace(/_/g, ' ');
  }
}

export function createManagementClient(options: ManagementClientOptions): ManagementClient {
  const fetchImpl = options.fetch ?? outboundFetch;
  const baseUrl = (options.baseUrl ?? MANAGEMENT_BASE_URL).replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const retryDelayMs =
    options.retryDelayMs ?? ((attempt: number) => backoffDelay(attempt, { baseMs: 1000, capMs: 4000 }));
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;

  async function request<T = unknown>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${path}`;
    let lastError: SupabaseManagementError | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${options.token}`,
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        throw new SupabaseManagementError(
          timedOut
            ? `Supabase Management API did not answer within ${Math.round(timeoutMs / 1000)} s (${method} ${path})`
            : `Could not reach the Supabase Management API (${method} ${path}): ${err instanceof Error ? err.message : String(err)}`,
          {
            status: 0,
            endpoint: `${method} ${path}`,
            hint: proxyHint(new URL(baseUrl).host) ?? 'Check your network connection and retry.',
          },
        );
      }
      const text = await response.text();
      let parsed: unknown = undefined;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = text;
        }
      }
      if (response.ok) return parsed as T;

      const message =
        str(asRecord(parsed).message) || str(asRecord(parsed).error) || (typeof parsed === 'string' ? parsed : '');
      const hint = response.status === 401 ? HINT_401 : response.status === 403 ? HINT_403 : undefined;
      lastError = new SupabaseManagementError(
        `Supabase Management API ${method} ${path} → ${response.status}${message ? `: ${message.slice(0, 300)}` : ''}`,
        { status: response.status, endpoint: `${method} ${path}`, body: parsed, hint },
      );
      if (!RETRY_STATUSES.has(response.status) || attempt === 1) throw lastError;
      await sleep(retryDelayMs(attempt));
    }
    throw lastError!;
  }

  const enc = encodeURIComponent;

  async function waitUntil<T>(
    label: string,
    poll: () => Promise<{ done: boolean; value: T; status: string }>,
    opts: WaitOptions,
  ): Promise<T> {
    const capMs = opts.capMs ?? DEFAULT_CAP_MS;
    const started = Date.now();
    let lastStatus = '';
    for (;;) {
      const { done, value, status } = await poll();
      if (status !== lastStatus) {
        lastStatus = status;
        opts.onStatus?.(status);
      }
      if (done) return value;
      if (Date.now() - started >= capMs) {
        throw new SupabaseManagementError(
          `Timed out after ${Math.round(capMs / 60_000)} min waiting for ${label} (last status: ${status})`,
          {
            status: 0,
            endpoint: label,
            hint: 'The project may still come up — check https://supabase.com/dashboard and re-run with --supabase-project <ref>.',
          },
        );
      }
      await sleep(pollMs);
    }
  }

  const getProject = async (ref: string): Promise<Project> =>
    toProject(await request<unknown>('GET', `/v1/projects/${enc(ref)}`));

  return {
    async listOrganizations() {
      const raw = await request<unknown>('GET', '/v1/organizations');
      return Array.isArray(raw) ? raw.map(toOrganization) : [];
    },
    async listProjects() {
      const raw = await request<unknown>('GET', '/v1/projects');
      return Array.isArray(raw) ? raw.map(toProject) : [];
    },
    getProject,
    async availableRegions(organizationSlug) {
      const raw = await request<unknown>(
        'GET',
        `/v1/projects/available-regions?organization_slug=${enc(organizationSlug)}`,
      );
      return parseRegions(raw);
    },
    async createProject(input) {
      const raw = await request<unknown>('POST', '/v1/projects', {
        name: input.name,
        organization_slug: input.organizationSlug,
        db_pass: input.dbPass ?? randomDbPassword(),
        region_selection: { type: input.region.type, code: input.region.code },
      });
      return toProject(raw);
    },
    async waitForProject(ref, opts = {}) {
      return waitUntil<Project>(
        `project ${ref} to become ACTIVE_HEALTHY`,
        async () => {
          const project = await getProject(ref);
          if (TERMINAL_FAILURES.has(project.status)) {
            throw new SupabaseManagementError(`Project ${ref} ended in ${project.status}`, {
              status: 0,
              endpoint: `GET /v1/projects/${ref}`,
              hint: 'Delete it in the dashboard and re-run, or pick another project with --supabase-project.',
            });
          }
          return { done: project.status === 'ACTIVE_HEALTHY', value: project, status: project.status };
        },
        opts,
      );
    },
    async waitForHealth(ref, services = ['auth', 'db', 'rest'], opts = {}) {
      const path = `/v1/projects/${enc(ref)}/health?services=${services.map(enc).join(',')}`;
      return waitUntil<ServiceHealth[]>(
        `project ${ref} services (${services.join(', ')}) to be healthy`,
        async () => {
          const raw = await request<unknown>('GET', path);
          const list: ServiceHealth[] = (Array.isArray(raw) ? raw : []).map((item) => {
            const r = asRecord(item);
            return {
              name: str(r.name),
              healthy: r.healthy === true,
              status: typeof r.status === 'string' ? r.status : undefined,
              error: typeof r.error === 'string' ? r.error : undefined,
            };
          });
          const pending = list.filter((s) => !s.healthy).map((s) => `${s.name}:${s.status ?? 'unknown'}`);
          const allPresent = services.every((name) => list.some((s) => s.name === name));
          return {
            done: allPresent && pending.length === 0,
            value: list,
            status: pending.length === 0 && allPresent ? 'healthy' : pending.join(' ') || 'waiting',
          };
        },
        opts,
      );
    },
    async getApiKeys(ref) {
      const raw = await request<unknown>('GET', `/v1/projects/${enc(ref)}/api-keys?reveal=true`);
      return Array.isArray(raw) ? (raw as ManagementApiKey[]) : [];
    },
    async runQuery(ref, query, parameters) {
      return request<unknown>('POST', `/v1/projects/${enc(ref)}/database/query`, {
        query,
        ...(parameters ? { parameters } : {}),
      });
    },
    async getAuthConfig(ref) {
      return asRecord(await request<unknown>('GET', `/v1/projects/${enc(ref)}/config/auth`)) as AuthConfigView;
    },
    async patchAuthConfig(ref, patch) {
      return asRecord(await request<unknown>('PATCH', `/v1/projects/${enc(ref)}/config/auth`, patch)) as AuthConfigView;
    },
  };
}
