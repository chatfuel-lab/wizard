/**
 * Reading the Vercel CLI's output, and shaping this script's own: URLs off
 * either stream, project names off a listing, masked values for the log.
 */

/**
 * The CLI writes colour and cursor escapes straight to its stream, including an
 * "erase the last two lines" it emits whether or not anybody is watching. None
 * of them are part of a URL.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex -- the escape byte is exactly what an ANSI sequence starts with
  return text.replace(/\u001B\[[0-9;]*[a-zA-Z]/g, '');
}

/** The label lines the CLI prints for a finished deployment, best first. */
const DEPLOY_LABELS = ['Aliased', 'Production', 'Preview'];

/**
 * The URL of the deployment that just finished, off whatever the CLI printed.
 *
 * The CLI promises nothing about WHERE the URL appears, and it has moved:
 *
 *   - the labelled lines ("Inspect", "Production", "Aliased") are written to
 *     stderr, so a script that captures stdout alone sees nothing at all;
 *   - when it decides it is talking to a program rather than a person, it
 *     answers on stdout with a JSON object instead — in two shapes, the
 *     deployment on its own or wrapped in a status envelope.
 *
 * So both streams are read, in the order of how much the answer can be trusted:
 * a parsed field, then a labelled line, then a bare URL on a line of its own.
 * "Aliased" is preferred because it is the public production domain; the URL on
 * the "Production" line is the deployment's own, which Deployment Protection
 * normally keeps behind an SSO wall (see stepPublicUrl). Either is usable —
 * they are aliases of the same deployment and the public one is resolved from
 * whichever one this returns.
 *
 * @param {string} [stdout]
 * @param {string} [stderr]
 * @returns {string | undefined}
 */
export function parseDeployUrl(stdout = '', stderr = '') {
  const out = stripAnsi(stdout);
  const err = stripAnsi(stderr);

  const trimmed = out.trim();
  if (trimmed.startsWith('{')) {
    try {
      const payload = JSON.parse(trimmed);
      const url = payload?.deployment?.url ?? payload?.url;
      if (typeof url === 'string' && url.startsWith('http')) return url;
    } catch {
      /* not JSON after all - fall through to reading it as text */
    }
  }

  const lines = `${err}\n${out}`.split('\n');
  for (const label of DEPLOY_LABELS) {
    const pattern = new RegExp(`^\\s*\\S?\\s*${label}\\s+(https://\\S+)`);
    for (const line of lines) {
      const match = pattern.exec(line);
      if (match) return match[1];
    }
  }

  // The last bare URL line: what the CLI used to print, and nothing else does.
  // vercel.com is excluded because the "Inspect" line is a dashboard link.
  for (const line of [...lines].reverse()) {
    const bare = /^(https?:\/\/\S+)$/.exec(line.trim());
    if (bare && !bare[1].includes('vercel.com')) return bare[1];
  }
  return undefined;
}

/**
 * What a value looks like in the log. Secrets never appear, not even in part —
 * and not their length either. For a token of fixed shape the length says
 * nothing, but ADMIN_PASSWORD is chosen by the operator, and knowing it is
 * seventeen characters narrows an offline search that already has a cookie to
 * work from.
 *
 * @param {string} value
 * @param {boolean} secret
 * @returns {string}
 */
export function maskValue(value, secret) {
  if (!secret) return value;
  return '•••• (set)';
}

/**
 * A Vercel project name: lowercase, [a-z0-9._-], no leading/trailing dash, <= 100 chars.
 *
 * @param {string | undefined} name
 * @returns {string}
 */
export function projectSlug(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+/, '')
    .slice(0, 100)
    .replace(/[-._]+$/, '');
  return slug === '' ? 'chatfuel-app' : slug;
}

/**
 * `--project my-app` / `--project=my-app`, or undefined.
 *
 * @param {string[]} argv
 * @returns {string | undefined}
 */
export function projectNameArg(argv) {
  const flag = argv.indexOf('--project');
  if (flag >= 0 && argv[flag + 1] && !argv[flag + 1].startsWith('-')) return argv[flag + 1];
  const inline = argv.find((arg) => arg.startsWith('--project='));
  return inline ? inline.slice('--project='.length) : undefined;
}

/**
 * The project names already in this Vercel account, off `vercel project ls`.
 *
 * Worth the extra call: `vercel link --yes --project X` does not refuse a name
 * that is taken — it LINKS to the existing project, and the next steps then
 * overwrite that project's environment variables and deploy over it. For
 * somebody running the wizard a second time, that is a live client app
 * replaced without a question.
 *
 * @param {string} listOutput
 * @returns {string[]}
 */
export function parseProjectNames(listOutput) {
  const names = [];
  for (const line of listOutput.split('\n')) {
    const match = /^\s{2,}([a-z0-9][a-z0-9._-]*)\s{2,}\S/.exec(line);
    if (match && match[1] !== 'Project') names.push(match[1]);
  }
  return names;
}

/**
 * Every https://….vercel.app (and custom domain) `vercel inspect` names, deduped.
 *
 * @param {string} inspectOutput
 * @returns {string[]}
 */
export function parseAliases(inspectOutput) {
  const seen = new Set();
  for (const match of inspectOutput.matchAll(/https:\/\/[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/gi)) {
    seen.add(match[0]);
  }
  // vercel.com links in the CLI's own chrome are not deployments.
  return [...seen].filter((u) => !u.includes('vercel.com')).sort((a, b) => a.length - b.length);
}

/**
 * The last line of a captured log that says anything - usually the one sentence that matters.
 *
 * @param {string} text
 * @returns {string | undefined}
 */
export function lastLine(text) {
  return stripAnsi(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .pop();
}
