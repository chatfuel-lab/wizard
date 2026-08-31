import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import type { WizardContext } from '../context';

export const ALLOWED_ORIGINS_ENV = 'ALLOWED_ORIGINS';

/**
 * Who, besides the app itself, may call the proxy from a browser.
 *
 * This is the one setting that decides how far the master Chatfuel token
 * reaches. The proxy forwards under CHATFUEL_TOKEN and never sees the caller's
 * own credentials, so a request from a page listed here is a request that page
 * gets to make with the deployment's Chatfuel account. Same-origin is the
 * default and needs no list; a listed origin is a second front end somebody
 * decided to run; `*` is every page on the internet, and — because the proxy
 * answers a reflected origin with `access-control-allow-credentials: true` —
 * every page on the internet with the browser's cookies attached.
 *
 * It was previously only ever set by hand in `.env`, which meant the choice was
 * made by whoever read the comment in `.env.example`, `*` included. Asking here
 * puts it in front of the person who is actually deciding.
 */

/** One origin, normalized: scheme + host + port, no trailing slash, lowercased. */
function normalizeOrigin(entry: string): string {
  let parsed: URL;
  try {
    parsed = new URL(entry);
  } catch {
    throw new WizardError(
      `"${entry}" is not an origin`,
      'An origin is scheme + host + port, with no path: https://app.example.com',
    );
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new WizardError(`"${entry}" is not an http(s) origin`, 'A browser sends Origin only for http and https.');
  }
  /* Everything after the origin is dropped by the browser before it sends the
     header, so a listed path would never match anything and would read as a
     restriction that is not there. Refused rather than trimmed. */
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new WizardError(
      `"${entry}" carries more than an origin`,
      'A browser sends only scheme + host + port. Drop the path, the query and any credentials.',
    );
  }
  return parsed.origin.toLowerCase();
}

/**
 * The written form of the answer: the value ALLOWED_ORIGINS gets, or undefined
 * for "same-origin only". Exported for the tests and for the flag check.
 */
export function parseAllowedOrigins(value: string): string | undefined {
  const entries = value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return undefined;
  if (entries.includes('*')) {
    /* '*' anywhere in the list is what the proxy reads as "any origin", so a
       list that also names origins is a list whose names mean nothing. Said
       here rather than silently honoured, because the shape usually means the
       person believed the named ones were the limit. */
    if (entries.length > 1) {
      throw new WizardError(
        `${ALLOWED_ORIGINS_ENV} mixes '*' with named origins`,
        "'*' already allows every origin — the names next to it change nothing. Use one or the other.",
      );
    }
    return '*';
  }
  return [...new Set(entries.map(normalizeOrigin))].join(',');
}

/**
 * The flag's shape, judged before anybody is asked anything — the same contract
 * as the other assert*Flags.
 */
export function assertAllowedOriginsFlag(ctx: WizardContext): void {
  const given = ctx.flags.allowedOrigins;
  if (given === undefined) return;
  try {
    parseAllowedOrigins(given);
  } catch (err) {
    throw new WizardError(
      '--allowed-origins cannot be used',
      err instanceof WizardError ? `${err.message}${err.hint ? ` — ${err.hint}` : ''}` : undefined,
    );
  }
}

/** Said wherever `*` was chosen, by whichever route. */
function warnAnyOrigin(): void {
  p.log.warn(
    [
      "ALLOWED_ORIGINS='*' lets any page on the internet call this proxy, and the proxy calls Chatfuel",
      'with your master token. The gate still requires a signed-in user, but a page you did not write can',
      'drive the API as that user from their browser — which is why the server refuses to start with this',
      'value on any host but loopback, gate or no gate. It is a local-development setting, not a deployment',
      "one. The admin panel is served to this app's own origin only in every case, whatever this says,",
      'because it reaches past both the gate and the bot fence.',
    ].join('\n'),
  );
}

/**
 * Ask for the list, or take it from the flag / the environment.
 *
 * Non-interactive with nothing given leaves it unset: same-origin only is the
 * answer that cannot go wrong unattended, and a run that needs a second origin
 * can name one on the command line.
 */
export async function originsSetup(ctx: WizardContext): Promise<void> {
  assertAllowedOriginsFlag(ctx);
  const given = ctx.flags.allowedOrigins ?? process.env[ALLOWED_ORIGINS_ENV];
  if (given !== undefined) {
    const source =
      ctx.flags.allowedOrigins !== undefined ? '--allowed-origins' : `${ALLOWED_ORIGINS_ENV} (environment)`;
    const value = parseAllowedOrigins(given);
    if (value === undefined) {
      p.log.info(`${source} is empty: the proxy will answer its own origin only.`);
      return;
    }
    ctx.answers.env[ALLOWED_ORIGINS_ENV] = value;
    if (value === '*') warnAnyOrigin();
    else p.log.info(`Origins allowed to call the proxy, from ${source}: ${value}`);
    return;
  }
  if (ctx.flags.yes) return;

  p.note(
    [
      'The proxy holds your master Chatfuel token and calls Chatfuel with it. A page allowed to',
      'reach the proxy from a browser is a page that gets to make those calls.',
      '',
      "By default only the app's own origin may — which is what a normal deployment needs.",
      'Add origins here only if another front end you run has to call this one.',
    ].join('\n'),
    'Who may call the proxy',
  );
  const choice = await p.select({
    message: 'Which browser origins may call the proxy?',
    options: [
      { value: 'same', label: "Only this app's own origin (recommended)" },
      { value: 'list', label: 'Its own origin plus origins I name' },
      { value: 'any', label: 'Any origin — * (local development only; a deployed app refuses to start)' },
    ],
    initialValue: 'same',
  });
  if (p.isCancel(choice)) throw new WizardError('Cancelled.');
  if (choice === 'same') return;

  if (choice === 'any') {
    warnAnyOrigin();
    const sure = await p.confirm({ message: "Really allow every origin ('*')?", initialValue: false });
    if (p.isCancel(sure)) throw new WizardError('Cancelled.');
    if (sure) {
      ctx.answers.env[ALLOWED_ORIGINS_ENV] = '*';
      return;
    }
    p.log.info("Left at the app's own origin.");
    return;
  }

  const answer = await p.text({
    message: 'Origins, comma-separated:',
    placeholder: 'https://app.example.com, https://admin.example.com',
    validate: (value) => {
      try {
        const parsed = parseAllowedOrigins(value ?? '');
        return parsed === undefined ? 'Name at least one origin, or go back and pick same-origin.' : undefined;
      } catch (err) {
        return err instanceof Error ? err.message : 'Not a list of origins';
      }
    },
  });
  if (p.isCancel(answer)) throw new WizardError('Cancelled.');
  const value = parseAllowedOrigins(answer);
  if (value) ctx.answers.env[ALLOWED_ORIGINS_ENV] = value;
}
