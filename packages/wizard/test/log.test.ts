import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';
import { createChunkScrubber, registerSecret, scrub } from '../src/log';
import { createContext } from '../src/run';

/**
 * The scrubber is the last line of defence: anything that reaches stdout goes
 * through it, including stack traces and whatever a dependency decides to
 * print. Two halves, and the second one is the one that bites — the invite
 * tokens MUST survive, or the wizard prints a link nobody can use.
 */

/**
 * A JWT, assembled rather than written down.
 *
 * The scrubber's tests need JWT-shaped input to prove a JWT is redacted, and a
 * JWT-shaped literal in a tracked file is exactly what a secret scanner stops a
 * push over — a fixture that opens nothing, blocking a repo that contains no
 * secret. So the shape is built here instead: the header and payload are real
 * base64url of ordinary JSON, which is where the `eyJ` prefix the scrubber
 * matches on comes from, and the signature is random bytes of the right length.
 * Nothing signed it and nothing accepts it.
 */
const b64url = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const demoJwt = (): string =>
  [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ role: 'anon', iss: 'supabase' }),
    randomBytes(32).toString('base64url'),
  ].join('.');

describe('scrub masks secrets', () => {
  it('masks the Chatfuel dashboard token (64 hex)', () => {
    expect(scrub(`token=${'a1b2c3d4'.repeat(8)}`)).toBe('token=[chatfuel-token]');
  });

  it('masks a Supabase personal access token', () => {
    const pat = `sbp_${'0123456789abcdef'.repeat(2)}0000`;
    expect(scrub(`Authorization: Bearer ${pat}`)).toBe('Authorization: Bearer [supabase-pat]');
  });

  it('masks a Supabase secret key', () => {
    expect(scrub('key sb_secret_abcdefghij1234 here')).toBe('key [supabase-secret-key] here');
  });

  it('masks JWTs — the legacy anon/service_role keys and every access token', () => {
    const jwt = demoJwt();
    expect(scrub(`anon: ${jwt}`)).toBe('anon: [jwt]');
  });

  it('masks several secrets in one chunk', () => {
    const line = `pat=sbp_00000000000000000000 secret=sb_secret_0123456789 token=${'f'.repeat(64)}`;
    expect(scrub(line)).toBe('pat=[supabase-pat] secret=[supabase-secret-key] token=[chatfuel-token]');
  });
});

describe('scrub leaves the things the wizard must print', () => {
  it('never touches a invite link', () => {
    for (let i = 0; i < 200; i += 1) {
      const token = randomBytes(24).toString('base64url');
      const link = `http://localhost:5173/sign-up?claim=${token}`;
      expect(scrub(link)).toBe(link);
    }
  });

  it('never touches an invite link', () => {
    const token = randomBytes(24).toString('base64url');
    const link = `https://app.example.com/invite/${token}`;
    expect(scrub(link)).toBe(link);
  });

  it('leaves a uuid and the project ref readable', () => {
    const tenantId = '674d9188-67cf-5fff-803c-90960f925a86';
    expect(scrub(`tenant ${tenantId}`)).toContain(tenantId);
    expect(scrub('ref abcdefghijklmnopqrst')).toContain('abcdefghijklmnopqrst');
  });

  it('leaves a base64 token hash alone (that is why hashes are not hex)', () => {
    const hash = createHash('sha256').update('anything').digest('base64');
    expect(scrub(hash)).toBe(hash);
  });

  it('leaves an anon/publishable key readable — it is public by design', () => {
    expect(scrub('sb_publishable_abcdefghij')).toBe('sb_publishable_abcdefghij');
  });

  it('leaves ordinary prose alone', () => {
    const text = 'Applying migration 0001_chatfuel_auth (idempotent — safe to re-run)';
    expect(scrub(text)).toBe(text);
  });
});

describe('registered secrets', () => {
  it('masks a registered token of any shape, including regex metacharacters', () => {
    const token = 'cf-tok_9zQx.Ab-Cd~2026+/=';
    expect(scrub(token)).toBe(token);
    registerSecret(token);
    expect(scrub(`Authorization: Bearer ${token}`)).toBe('Authorization: Bearer [chatfuel-token]');
  });

  it('ignores a short value — masking common words would corrupt the output', () => {
    registerSecret('  short  ');
    expect(scrub('a short line')).toBe('a short line');
  });
});

/**
 * A stream is a sequence of chunks, and the kernel picks where the breaks fall.
 *
 * `scrub` sees one string at a time, so a JWT that arrives half in one read and
 * half in the next matches nothing in either half — and both halves print in
 * the clear, which is the whole secret on the screen in two pieces. A child
 * process piped through the wizard produces exactly this at 64KB boundaries.
 */
describe('a secret that lands across two writes', () => {
  const JWT = demoJwt();

  it('does not let the second half through unmasked', () => {
    const scrubChunk = createChunkScrubber();
    const at = 30;
    const printed = scrubChunk(`anon: ${JWT.slice(0, at)}`) + scrubChunk(`${JWT.slice(at)}\n`);

    expect(printed).toContain('[jwt]');
    expect(printed).not.toContain(JWT.slice(at));
  });

  /* Split at every offset, because the one that matters is whichever one the
     kernel picks. What is already on the screen when the match completes cannot
     be recalled — so the promise is that the REST of the secret never follows
     it, and the mask appears in its place. */
  it('catches a registered secret split at every possible point', () => {
    const secret = 'cf-tok_9zQx-Ab-Cd-2026-abcdefgh';
    registerSecret(secret);
    for (let at = 1; at < secret.length; at += 1) {
      const scrubChunk = createChunkScrubber();
      const printed = scrubChunk(secret.slice(0, at)) + scrubChunk(secret.slice(at));
      expect(printed).toBe(`${secret.slice(0, at)}[chatfuel-token]`);
      expect(printed).not.toContain(secret);
    }
  });

  /* The other half of carrying a tail: what is already on the screen must not
     be written again. A scrubber that re-emits its own memory turns every
     progress line into a stutter. */
  it('never prints what it has already printed', () => {
    const scrubChunk = createChunkScrubber();
    const chunks = ['Applying migration ', '0001_chatfuel_auth', ' (idempotent)\n', 'Done.\n'];
    expect(chunks.map(scrubChunk).join('')).toBe(chunks.join(''));
  });

  it('holds nothing back — a prompt with no newline is written as it arrives', () => {
    const scrubChunk = createChunkScrubber();
    expect(scrubChunk('Supabase project URL: ')).toBe('Supabase project URL: ');
  });

  it('keeps up with a stream longer than the tail it remembers', () => {
    const scrubChunk = createChunkScrubber();
    const line = 'x'.repeat(1000);
    let printed = '';
    for (let i = 0; i < 20; i += 1) printed += scrubChunk(`${line}\n`);
    expect(printed).toBe(`${line}\n`.repeat(20));
    // And it is still scrubbing after all that.
    expect(scrubChunk(`token=${'a'.repeat(64)}`)).toContain('[chatfuel-token]');
  });
});

describe('a reader that stops reading', () => {
  it('ends the command quietly instead of printing a stack trace over its own output', async () => {
    // The scrubber replaces stream.write, so an EPIPE on a closed pipe reaches a
    // stream with no error listener — and Node turns that into a thrown stack
    // trace on top of what the person was reading. Driven through a real shell
    // pipeline because that is the only place the failure exists.
    const wizardDir = join(__dirname, '..');
    const { stderr } = await execa('sh', ['-c', 'node --import tsx src/bin.ts doctor | head -2'], {
      cwd: wizardDir,
      reject: false,
    });
    expect(stderr).not.toContain('EPIPE');
    expect(stderr).not.toContain('Unhandled');
  }, 60_000);
});

/*
 * The shapes above catch a Supabase PAT as it is issued today. The literal a
 * run was handed is the rule that does not depend on that: the interactive path
 * registers the token the moment it is typed (steps/authSetupProject.ts), and
 * `--supabase-token` / SUPABASE_ACCESS_TOKEN reached the same Management API
 * calls having registered nothing — so a token of any other shape came back
 * unmasked in whatever the run printed.
 */
describe('a token handed in rather than typed', () => {
  it('is masked from the moment the context is built', () => {
    const token = `access-token-${'x'.repeat(24)}`;
    expect(scrub(token)).toBe(token);
    createContext({ yes: true, dryRun: false, verbose: false, dir: process.cwd(), supabaseToken: token });
    expect(scrub(`Authorization: Bearer ${token}`)).toBe('Authorization: Bearer [chatfuel-token]');
  });
});
