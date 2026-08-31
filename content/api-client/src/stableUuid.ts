/**
 * Deterministic UUIDs derived from a caller-chosen key.
 *
 * Two API facts force this file to exist:
 *
 * 1. **Ids the schema documents as "UUID string" are enforced.** A segment or
 *    filter whose `id` is a readable slug (`contacts-inline`, `p1`) fails the
 *    whole query with a generic API error, and nothing in the response
 *    says which field was wrong.
 * 2. **The id has to be stable across renders.** `crypto.randomUUID()` per
 *    render makes every request a new variables object, so a list that watches
 *    its variables refetches forever.
 *
 * So: hash the caller's own stable key into a v4-shaped UUID. Same key, same
 * uuid, every time, in every process — which also means a test can assert the
 * exact variables a filter produces.
 *
 * FNV-1a is used rather than anything cryptographic because this is an
 * identity, not a secret: 128 bits of "different keys look different" is the
 * whole requirement, and it has to run in a browser with no dependency.
 */

const OFFSET = 0x811c9dc5;
const PRIME = 0x01000193;

/** FNV-1a over the key with a salt mixed into the initial state. */
function fnv1a(key: string, salt: number): number {
  let hash = (OFFSET ^ salt) >>> 0;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, PRIME) >>> 0;
  }
  return hash >>> 0;
}

const hex8 = (n: number): string => n.toString(16).padStart(8, '0');

/**
 * A stable RFC-4122-shaped v4 UUID derived from `key`.
 *
 * The version nibble (4) and the variant bits (10xx) are forced, because a
 * server that validates the format at all is likely to validate those too.
 * That nibble is where one of the four hashes' 32 bits goes: a uuid holds 32
 * hex digits and one of them is spoken for, so `b`'s fifth digit has nowhere
 * to be written. It is dropped rather than folded in — a hair of an identity's
 * spread, and nothing this value is for depends on the difference.
 *
 * ⚠ NOT a secret and not unguessable. The whole derivation is public, cheap
 * and reversible by search: anyone holding the id can find the key, and anyone
 * holding the key can produce the id. Use it for something that has to be the
 * same value twice — a filter id, a segment id, a request-scoped handle. For a
 * value whose safety rests on nobody being able to guess it — a token, an
 * invite code, an unlisted url — use `crypto.randomUUID()` (see `newClientId`)
 * or `crypto.getRandomValues`.
 */
export function stableUuid(key: string): string {
  const a = hex8(fnv1a(key, 0));
  const b = hex8(fnv1a(key, 0x9e3779b9));
  const c = hex8(fnv1a(key, 0x85ebca6b));
  const d = hex8(fnv1a(key, 0xc2b2ae35));

  const timeLow = a;
  const timeMid = b.slice(0, 4);
  // version 4
  const timeHi = `4${b.slice(5, 8)}`;
  // variant 10xx — force the two top bits of the first nibble
  const variantNibble = ((parseInt(c[0], 16) & 0x3) | 0x8).toString(16);
  const clockSeq = `${variantNibble}${c.slice(1, 4)}`;
  const node = `${c.slice(4)}${d}`;

  return `${timeLow}-${timeMid}-${timeHi}-${clockSeq}-${node}`;
}

/** Shape check used by the tests and by callers' own assertions. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isUuid = (value: string): boolean => UUID_RE.test(value);
