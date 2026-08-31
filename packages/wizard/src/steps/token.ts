import * as p from '@clack/prompts';
import pc from 'picocolors';
import { ChatfuelAuthError, createChatfuelClient, BATCH_THROTTLE } from '@chatfuel/api-client';
import { CurrentUserDocument } from '@chatfuel/api-client/generated/core';
import { stepArt } from '../art';
import { ApiWizardError, WizardError } from '../errors';
import { registerSecret } from '../log';
import { outboundFetch, proxyHint } from '../net';
import type { WizardContext } from '../context';

const TOKEN_PAGE = 'https://panel.chatfuel.com/integration/auth/token';
const ATTEMPTS = 3;

/**
 * What to say when the call did not get an answer. A proxy is named, because a
 * proxy that blocks the API fails exactly like a bad token and the difference
 * is invisible from here. Otherwise the transport's own reason is repeated —
 * it is the only thing that distinguishes DNS from TLS from a timeout.
 */
export function unreachableHint(err: unknown): string | undefined {
  return proxyHint(new URL(TOKEN_PAGE).host) ?? (err instanceof Error ? err.message : undefined);
}

/** No shape is promised any more — the token page decides. Reject only what cannot be a token. */
function isPlausibleToken(value: string): boolean {
  return value.length > 0 && !/\s/.test(value);
}

/**
 * Token intake: how-to note, masked input, remote CurrentUser check. That
 * remote check is the only real gate, so a rejected token re-prompts instead of
 * ending the run. The token stays in ctx.answers (memory) until the scaffold
 * step writes it to the app's .env (0600).
 */
export async function token(ctx: WizardContext): Promise<void> {
  p.log.message(stepArt('token'));
  const fromEnv = process.env.CHATFUEL_TOKEN?.trim();
  let noted = false;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (attempt === 1 && fromEnv && isPlausibleToken(fromEnv)) {
      p.log.info('Using CHATFUEL_TOKEN from the environment.');
      ctx.answers.token = fromEnv;
    } else {
      // Nothing here can be answered without somebody at the keyboard, and a
      // prompt that nobody can answer is worse than an error: clack closes the
      // process on end-of-input, so a scripted run whose token has expired
      // reports success and leaves no app behind. Say so instead.
      if (ctx.flags.yes || !process.stdin.isTTY) {
        throw new WizardError(
          fromEnv ? 'The Chatfuel API did not accept CHATFUEL_TOKEN' : 'CHATFUEL_TOKEN is not set',
          `A run with no questions needs a working token in the environment. Generate one at ${TOKEN_PAGE}.`,
        );
      }
      if (!noted) {
        p.note(
          [
            'Generate a token on this page, then paste it below:',
            '',
            `  ${pc.bold(pc.cyan(pc.underline(TOKEN_PAGE)))}`,
            '',
            'The token is checked with Chatfuel, and goes to your host when you deploy. It never reaches the browser.',
          ].join('\n'),
          'Chatfuel token',
        );
        noted = true;
      }
      const entered = await p.password({
        message: 'Paste your Chatfuel token:',
        validate: (value) => (isPlausibleToken(value.trim()) ? undefined : 'Paste the token from the page — no spaces'),
      });
      if (p.isCancel(entered)) throw new WizardError('Cancelled.');
      ctx.answers.token = entered.trim();
    }
    registerSecret(ctx.answers.token);

    const spinner = p.spinner();
    spinner.start('Checking the token against the API…');
    const client = createChatfuelClient({ token: ctx.answers.token, throttle: BATCH_THROTTLE, fetch: outboundFetch });
    try {
      const data = await client.query(CurrentUserDocument, {});
      spinner.stop(`Authenticated as ${data.currentUser?.email ?? data.currentUser?.name ?? 'unknown user'}`);
      ctx.client = client;
      return;
    } catch (err) {
      spinner.stop('Token check failed');
      // Only Unauthorized is worth retyping; a network or server error would fail the same way again.
      if (!(err instanceof ChatfuelAuthError)) {
        throw new ApiWizardError('Could not reach the Chatfuel API', err, unreachableHint(err));
      }
      if (attempt === ATTEMPTS) {
        throw new WizardError(
          'The token was rejected (Unauthorized).',
          `Generate a fresh token at ${TOKEN_PAGE} and retry.`,
        );
      }
      p.log.warn('The token was rejected (Unauthorized) — try again.');
      ctx.answers.token = undefined;
    }
  }
}
