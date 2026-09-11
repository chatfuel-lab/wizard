/**
 * Whether this Vercel account can be handed a GitHub repository at all — asked
 * of the account, before anything has been pushed to GitHub.
 *
 * Redeploy-on-push needs a Login Connection: the GitHub authorisation that
 * lives on the Vercel ACCOUNT, granted once, in a browser. Without it
 * `vercel git connect` answers `You need to add a Login Connection to your
 * GitHub account first.` — and that is the end of a chain that has already
 * created a repository, pushed the source into it and deployed the app. The
 * one sentence that would have changed what somebody did arrives after every
 * step it could have changed.
 *
 * So the same question is asked early, where the deploy has the CLI signed in,
 * and the answer is read again later off the failure when it happens anyway.
 */
import { stripAnsi } from './output.mjs';

/** @typedef {import('./runners.mjs').Runner} Runner */

/**
 * The Git namespaces this account may read repositories from.
 *
 * The trailing EMPTY `teamId=` is load bearing and is not a typo. Left out, the
 * CLI appends the current team scope by itself, and this endpoint refuses any
 * team scope at all: `Invalid request: specifying \`teamId\` or \`slug\` is not
 * supported by this endpoint.` A Login Connection belongs to a person's
 * account and never to a team, so the empty value is what asks the question
 * this endpoint answers.
 */
export const GIT_NAMESPACES_PATH = '/v1/integrations/git-namespaces?provider=github&teamId=';

/** The fragment that says which warning this is — a sentence, because it is also read by a person. */
export const NO_GITHUB_CONNECTION = 'Vercel has no GitHub connection';

/**
 * What that answer means, in three values.
 *
 * An empty array is Vercel saying it can see no GitHub account for this person:
 * `missing`, and the only one of the three that does anything. A non-empty list
 * is `connected`, and it is the one assumption in this design — that a
 * namespace Vercel will name is a connection `git connect` can use.
 *
 * EVERYTHING else is `unknown`: a non-zero exit, a body that is not JSON, an
 * object where an array was promised, a timeout, a CLI too old to have an `api`
 * subcommand. `unknown` behaves exactly as this script behaved before the probe
 * existed — one warning fewer and nothing else — so every doubt is spelled that
 * way rather than as `missing`.
 *
 * What `missing` costs is the reason for that care. Nothing the probe answers
 * ever stops this deploy or changes a step of it: here, `missing` is one
 * printed line. But the line leaves the building. The wizard reads it off this
 * stream (`missingGithubConnection` in `packages/wizard/src/steps/deploy.ts`),
 * and its GitHub step then skips the redeploy-on-push question and the
 * `connect-git` run altogether, printing the browser fix instead. So a wrong
 * `missing` does not add a question — it takes away a feature that would have
 * worked, and leaves somebody doing by hand what one confirm would have done.
 *
 * @param {{ status: number | null, stdout?: string, stderr?: string }} result
 * @returns {'connected' | 'missing' | 'unknown'}
 */
export function parseNamespaces(result) {
  if (result.status !== 0) return 'unknown';
  const text = stripAnsi(result.stdout ?? '');
  // A version banner or a hint line can sit in front of the body, so the body
  // is found rather than assumed to start at the first character.
  const start = text.search(/[[{]/);
  if (start === -1) return 'unknown';
  let payload;
  try {
    payload = JSON.parse(text.slice(start));
  } catch {
    return 'unknown';
  }
  if (!Array.isArray(payload)) return 'unknown';
  return payload.length > 0 ? 'connected' : 'missing';
}

/**
 * Ask the account, through the CLI that is already signed in.
 *
 * One HTTPS GET to api.vercel.com, a host every deploy talks to anyway: a
 * path-form `vercel api` call sends the request and nothing else, no API
 * description is fetched. The timeout is there for the CLI that one day decides
 * otherwise.
 *
 * The throw is the Windows path, and it is an answer rather than a failure. The
 * runner refuses arguments carrying characters `cmd.exe` reads as syntax, and a
 * query string is two of them — so there the probe says `unknown` and the
 * deploy carries on exactly as it did before, which is what `unknown` is for.
 *
 * @param {Runner} run
 * @returns {'connected' | 'missing' | 'unknown'}
 */
export function githubLoginConnection(run) {
  try {
    /* `api` is also a directory in this app, and the CLI's default command is
       `deploy`, which reads its first non-flag argument as a path — so on a CLI
       too old to have the `api` SUBCOMMAND, this line has to be something that
       cannot be read as "deploy ./api". Two things make sure of that, both
       checked against the CLI (59.13.1) in an empty directory outside any
       repository with no project linked:

         vercel ./api '/v1/...?provider=github&teamId=' --raw
           Error: unknown or unexpected option: --raw          (exit 1)

       `--raw` is not a deploy flag, and the argument parser refuses an unknown
       option before the command runs at all — before the sign-in, before the
       directory is read, before anything is uploaded. Take `--raw` away and the
       second guard answers:

         Error: Can't deploy more than one path.               (exit 1)

       because the endpoint travels as a second positional argument. Both are
       non-zero exits, which `parseNamespaces` reads as `unknown`. */
    return parseNamespaces(
      run(['api', GIT_NAMESPACES_PATH, '--raw'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 }),
    );
  } catch {
    return 'unknown';
  }
}

/**
 * Whether a refused `vercel git connect` was refused for want of that connection.
 *
 * Two words, case-insensitively, and not the whole sentence — because there is
 * no one whole sentence. The server answers `Failed to link <repo>. You need to
 * add a Login Connection to your GitHub account first.`, with the repository
 * name interpolated and coloured; the CLI has a second branch of its own, keyed
 * on its `Add a Login Connection` action string and formatted differently
 * again. `Login Connection` is what all of them have in common, and no other
 * refusal contains it.
 *
 * @param {string} output
 * @returns {boolean}
 */
export function isLoginConnectionFailure(output) {
  return /login connection/i.test(stripAnsi(output ?? ''));
}
