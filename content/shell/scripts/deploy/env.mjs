/**
 * What gets pushed to Vercel: the variable list, the .env reading that fills
 * it, and the checks that refuse a configuration already known to be broken.
 */

/**
 * The variables this deployment needs, in the order they are pushed.
 *
 * `secret: true` keeps Vercel's sensitive default (write-only). The rest go up
 * with --no-sensitive so they stay readable in the dashboard — a workspace id
 * or a project URL that nobody can look at is a debugging tax for no security.
 */
export const DEPLOY_ENV = [
  { name: 'CHATFUEL_TOKEN', secret: true },
  { name: 'CHATFUEL_API_BASE', secret: false },
  { name: 'CHATFUEL_WORKSPACE_ID', secret: false },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', secret: true },
  { name: 'VITE_SUPABASE_URL', secret: false },
  { name: 'VITE_SUPABASE_ANON_KEY', secret: false },
  { name: 'VITE_CHATFUEL_WORKSPACE_ID', secret: false },
  { name: 'VITE_APP_NAME', secret: false },
  { name: 'VITE_APP_LOGO', secret: false },
  { name: 'VITE_CHATFUEL_DASHBOARD_URL', secret: false },
  { name: 'PUBLISHING_MEDIA_BUCKET', secret: false },
  { name: 'PUBLISHING_MEDIA_QUOTA_MB', secret: false },
  { name: 'PUBLISHING_MEDIA_TTL_DAYS', secret: false },
  { name: 'PUBLISHING_SECRET', secret: true },
  { name: 'ADMIN_PASSWORD', secret: true },
  { name: 'ADMIN_COOKIE_SALT', secret: true },
  { name: 'ALLOWED_ORIGINS', secret: false },
  { name: 'ALLOWED_HOSTS', secret: false },
  { name: 'CHATFUEL_OPEN_PROXY', secret: false },
  { name: 'REST_MAX_CONCURRENT', secret: false },
  { name: 'GRAPHQL_MAX_CONCURRENT', secret: false },
  { name: 'GRAPHQL_MAX_BATCH', secret: false },
  { name: 'WS_MAX_SOCKETS', secret: false },
  { name: 'WS_PRE_AUTH_SOCKETS', secret: false },
  { name: 'TENANT_REQUESTS_PER_MINUTE', secret: false },
  { name: 'TENANT_MAX_SOCKETS', secret: false },
  { name: 'TRUST_FORWARDED_FOR', secret: false },
  { name: 'CHATFUEL_RESOURCE_FENCE', secret: false },
  { name: 'CHATFUEL_RESOURCE_STORE', secret: false },
  { name: 'CHATFUEL_OPERATION_ALLOWLIST', secret: false },
  { name: 'CHATFUEL_OPERATION_ALLOWLIST_EXTRA', secret: false },
  { name: 'CHATFUEL_OPERATION_ALLOWLIST_OFF', secret: false },
  { name: 'AUTH_RECOVERY_LINK_LOG', secret: false },
  { name: 'PUBLIC_URL', secret: false },
];

/**
 * Variables the proxy reads that this deploy deliberately does not push.
 *
 * Vercel sets the bypass secret itself, per project; pushing a value for it
 * would overwrite the platform's own. `PORT` and `NO_PROXY` belong to whatever
 * is running the process, not to this deployment's configuration.
 */
const NOT_DEPLOYED = new Set(['VERCEL_AUTOMATION_BYPASS_SECRET', 'PORT', 'NO_PROXY']);

/**
 * The variables the proxy reads and this deploy would silently leave behind.
 *
 * A variable missing from `DEPLOY_ENV` is not an error anyone sees: `.env` sets
 * it, the local dev server honours it, `deploy` skips it, and the deployment
 * runs on the default instead - a fence that is off, an allowlist that is not
 * applied, a per-tenant ceiling that never comes down. The list above is the
 * only place that knows, so it is checked against the source that does the
 * reading rather than against another list somebody has to remember to edit.
 *
 * @param {string} source - the text of proxyConfig.ts.
 * @returns {string[]} names the proxy reads, in sorted order, that this deploy does not push.
 */
export function undeployedProxyVars(source) {
  const pushed = new Set(DEPLOY_ENV.map((entry) => entry.name));
  const read = new Set((source.match(/\benv\.[A-Z][A-Z0-9_]*/g) ?? []).map((hit) => hit.slice(4)));
  return [...read].filter((name) => !pushed.has(name) && !NOT_DEPLOYED.has(name)).sort();
}

/**
 * Every environment a variable is written to. Development stays local, and so,
 * by default, does preview.
 *
 * `secret: true` above is about who can READ a value in the dashboard. This is
 * about who can USE it, which is the larger question: a preview build runs the
 * code of whatever branch triggered it, with the project's preview environment
 * in `process.env`. Give preview the production values and every branch — a
 * contributor's pull request included, once the repository is public — executes
 * unreviewed code holding the master Chatfuel token and a Supabase service-role
 * key, which is the one credential that switches RLS off entirely. Vercel's
 * Deployment Protection does not help: it gates who may open the preview URL,
 * not what the build may do with its own environment.
 *
 * So preview is opt-in, and the opt-in is meant for a deployment that has its
 * own Chatfuel and Supabase projects behind it. Set DEPLOY_PREVIEW_ENV=1 only
 * when the .env being pushed is a preview .env — never the production one.
 */
export const TARGETS = ['production'];

/**
 * The targets this run pushes to, with preview added only on an explicit ask.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string[]}
 */
export function targetsFor(env = process.env) {
  return env.DEPLOY_PREVIEW_ENV === '1' ? [...TARGETS, 'preview'] : [...TARGETS];
}

/** Answered by api/chatfuel.ts, reached through the rewrite in vercel.json. */
export const HEALTH_PATH = '/chatfuel/healthz';

/**
 * Read a .env into a Map.
 *
 * A commented line is NOT a value: the wizard writes `# NAME=` for a variable
 * it has nothing to fill, and reading that back as an empty string would push a
 * set-but-empty variable — which every reader downstream treats as configured.
 *
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseEnvFile(text) {
  const values = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (value === '') continue;
    values.set(match[1], value);
  }
  return values;
}

/** @typedef {{ name: string, secret: boolean, value: string }} DeployEntry */

/**
 * The DEPLOY_ENV entries this .env actually fills in, with their values.
 *
 * @param {Map<string, string>} values
 * @returns {DeployEntry[]}
 */
export function selectEnv(values) {
  return DEPLOY_ENV.filter((entry) => values.has(entry.name)).map((entry) => ({
    ...entry,
    // The filter above guarantees the name is present.
    value: /** @type {string} */ (values.get(entry.name)),
  }));
}

/**
 * Refuse to deploy a configuration that is already known to be broken.
 *
 * The Supabase pair is the one that matters: the proxy turns its auth gate on
 * when BOTH are set and off when NEITHER is, and answers every single request
 * with 500 ProxyAuthMisconfigured when exactly one is — so half a pair is a
 * deployment that builds, starts, and serves nothing.
 *
 * @param {Map<string, string>} values
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkEnv(values) {
  const errors = [];
  const warnings = [];

  if (!values.has('CHATFUEL_TOKEN')) {
    errors.push('CHATFUEL_TOKEN is missing from .env — the proxy has no token to reach Chatfuel with.');
  }

  const url = values.has('VITE_SUPABASE_URL');
  const anon = values.has('VITE_SUPABASE_ANON_KEY');
  if (url !== anon) {
    errors.push(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set together or not at all — with one of the two the proxy fails closed (ProxyAuthMisconfigured).',
    );
  }
  if (url && anon) {
    if (!values.has('SUPABASE_SERVICE_ROLE_KEY')) {
      errors.push(
        'SUPABASE_SERVICE_ROLE_KEY is missing — without it nobody can finish signing up (no bot is created).',
      );
    }
    if (!values.has('CHATFUEL_WORKSPACE_ID')) {
      errors.push(
        'CHATFUEL_WORKSPACE_ID is missing — the server has no Chatfuel workspace to create each account’s bot in.',
      );
    }
  } else {
    /* No Supabase pair is open mode, and a deployment is a public URL: the
       master token would answer whoever finds it. The proxy refuses to serve
       that shape unless it is asked for by name, so the deploy refuses it here
       - before the build, rather than after it, when the refusal would be a
       503 nobody can read from outside. */
    if (!url && !anon && values.get('CHATFUEL_OPEN_PROXY') !== '1') {
      errors.push(
        'No auth gate: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are both unset, so every caller that finds the deployment URL would drive Chatfuel under your master token. Install the auth module (npx @chatfuel/wizard --embed), or set CHATFUEL_OPEN_PROXY=1 in .env if that is what this deployment is for.',
      );
    }
    if (!values.has('VITE_CHATFUEL_WORKSPACE_ID')) {
      warnings.push('No VITE_CHATFUEL_WORKSPACE_ID: the app will open on whichever workspace the account lists first.');
    }
  }
  return { errors, warnings };
}
