/**
 * Global secret scrubber. Installed in bin.ts before anything else can write:
 * every stdout/stderr chunk THIS process writes - clack, stack traces, and a
 * child's output that the wizard pipes and relays itself - has known secret
 * shapes masked. The secrets themselves live only in memory and in the
 * scaffold's .env.
 *
 * What it does NOT cover, because the boundary is the file descriptor and not
 * the call: a child given `stdio: 'inherit'` writes to the terminal through the
 * same fd 1/2 this process never sees - `gh auth login`, `git` in the connect
 * step, the handed-off agent, the launched dev server. Those are the user's own
 * tools talking to the user's own terminal, and inheriting is what makes them
 * usable - but nothing masks what they print. A step that means to RELAY a
 * child pipes it and writes the output back through here, as the deploy step
 * does. So do not read this scrubber as covering a passthrough: pipe it, or
 * accept that whatever the child prints is what the terminal gets.
 *
 * Two layers, because a secret's shape is not guaranteed. The patterns catch
 * the shapes we know — the 64-hex dashboard token, Supabase personal access
 * tokens, secret keys and any JWT — and
 * `registerSecret()` masks the literal value the user actually pasted,
 * whatever the token page hands out.
 *
 * What must SURVIVE printing: the owner claim link and invite tokens. Those are
 * 24 random bytes as base64url (32 chars) precisely so that no mask can match
 * them — which is why the Supabase token hashes are base64, never 64-hex.
 *
 * The third thing it does is remember. `scrub()` sees one string; a stream sees
 * a sequence of them, and the kernel decides where the breaks fall. A JWT split
 * across two pipe reads matches nothing in either half — not the shapes, not
 * the registered literals — and both halves print in the clear, which is a
 * whole secret on the screen in two pieces. So the stream wrapper carries the
 * tail of what it last wrote and scans `tail + chunk`, emitting only the part
 * that is new. See createChunkScrubber.
 */

/** Below this, a "secret" is more likely a word that would corrupt the output. */
const MIN_SECRET_LENGTH = 12;

const MASK = '[chatfuel-token]';

const SCRUB_PATTERNS: Array<[RegExp, string]> = [
  // Chatfuel dashboard token (64 hex characters).
  [/[0-9a-f]{64}/gi, MASK],
  // Supabase personal access token (Management API).
  [/sbp_[A-Za-z0-9_]{20,}/g, '[supabase-pat]'],
  // Supabase secret (service-role replacement) key.
  [/sb_secret_[A-Za-z0-9_-]{10,}/g, '[supabase-secret-key]'],
  // Any JWT — the legacy anon/service_role keys and every access token.
  [/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g, '[jwt]'],
  // GitHub tokens. The repo step runs `gh` and a person pastes one when it asks;
  // a shape is a better rule than the length threshold below, which a token
  // could sit under and which cannot be lowered without masking ordinary words.
  [/\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{20,}/g, '[github-token]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g, '[github-token]'],
];

const registered = new Set<string>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mask this exact value on every output path from now on. Called with a secret
 * as soon as it is known — before any step can echo it.
 */
export function registerSecret(value: string): void {
  const secret = value.trim();
  if (secret.length < MIN_SECRET_LENGTH || registered.has(secret)) return;
  registered.add(secret);
  SCRUB_PATTERNS.push([new RegExp(escapeRegExp(secret), 'g'), MASK]);
}

export function scrub(text: string): string {
  let out = text;
  for (const [pattern, mask] of SCRUB_PATTERNS) out = out.replace(pattern, mask);
  return out;
}

/**
 * How much of what was already written is kept around to scan against the next
 * chunk. Long enough for the longest thing that has to match across a break: a
 * JWT runs to a few hundred characters, and a registered secret is whatever the
 * user pasted. Capped, because this is a per-stream buffer and not a log.
 */
const TAIL_LIMIT = 4096;

/**
 * A scrubber with a memory of the last few kilobytes it emitted.
 *
 * Nothing is held back — output is not delayed by a single write, which matters
 * because this wraps the same stream clack draws its prompts on. Instead the
 * previous tail is prepended before scanning and then subtracted again: what
 * comes back is exactly the new text, scrubbed with the seam included.
 *
 * When a secret DID span the break, the two scrubs disagree inside the tail —
 * the first half is already on the screen and cannot be recalled. Emission then
 * starts at the point where they diverge, so the mask and everything after it
 * are printed instead of the rest of the secret. Half a token on the screen is
 * a bad outcome; a whole one is the one worth preventing.
 */
export function createChunkScrubber(): (chunk: string) => string {
  let tail = '';
  return (chunk: string): string => {
    if (chunk === '') return '';
    const scrubbedTail = scrub(tail);
    const scrubbed = scrub(tail + chunk);
    let shared = 0;
    while (shared < scrubbedTail.length && scrubbed[shared] === scrubbedTail[shared]) shared += 1;
    tail = (tail + chunk).slice(-TAIL_LIMIT);
    return scrubbed.slice(shared);
  };
}

export function installScrubber(): void {
  for (const stream of [process.stdout, process.stderr] as const) {
    // A reader that stops reading is not an error. `wizard doctor | head` closes
    // the pipe after a few lines, and the next write raises EPIPE on a stream
    // nobody listens to — which Node turns into a thrown stack trace printed on
    // top of the output the person was reading. Swallow that one, so the
    // command ends on its own exit code instead; anything else still throws.
    stream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') throw err;
    });
    // One per stream: stdout and stderr are interleaved by whoever is watching,
    // not by this process, so a seam in one says nothing about the other.
    const scrubChunk = createChunkScrubber();
    const original = stream.write.bind(stream);
    stream.write = ((chunk: string | Uint8Array, ...rest: never[]) =>
      original(scrubChunk(String(chunk)), ...rest)) as typeof stream.write;
  }
}
