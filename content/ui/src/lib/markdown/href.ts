/**
 * Schemes a link may use, and the only ones.
 *
 * An allowlist rather than a `javascript:` denylist: a denylist has to
 * anticipate a tab inside the scheme, mixed case, `data:text/html`, `vbscript:`
 * and whatever the next one is, and it only has to be wrong once.
 */
const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** C0 and C1 control characters, which the URL parser tolerates and we do not. */
// eslint-disable-next-line no-control-regex -- control characters are the very thing this strips
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/**
 * The href a link may actually carry, or null if it may not carry one.
 *
 * Called on every link target, and the whole reason `Markdown` can render a
 * link the model wrote at all. A rejected target is not an error — the link
 * text renders as plain text, so the words survive and only the navigation is
 * dropped.
 *
 * Relative targets are rejected too, deliberately. In this product a relative
 * URL resolves against the dashboard's own origin, so a model that emits
 * `/settings/billing?confirm=1` would produce a link that acts on the
 * operator's account. Assistant prose gets to point outwards; moving the
 * operator around the app is what the `navigate` frontend action is for, and
 * that one travels as a named destination the shell resolves.
 */
export function safeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  /* Control characters are how a scheme gets smuggled past a naive check —
     a tab in the middle of "javascript:" is ignored by the parser. */
  const cleaned = trimmed.replace(CONTROL_CHARS, '');
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }
  return SAFE_SCHEMES.has(url.protocol) ? url.href : null;
}

/* Two separators of either shape at the front: what the parser resolves against
   another origin. One backslash is not one of these — `\contacts` is a path. */
const CROSS_ORIGIN_PREFIX = /^[/\\][/\\]/;

/**
 * The same guard for a link the APP built rather than one a model wrote.
 *
 * The difference is the relative path, and only that. A breadcrumb, a nav item
 * and a row link are in-app destinations — `/contacts/42` is the normal case
 * and `safeHref` rejects it on purpose, because in assistant prose a relative
 * URL is a way to aim the operator at their own settings. Here it is the point.
 *
 * What stays rejected is a scheme. A protocol-relative `//evil.example` is
 * rejected with it: it reads as a path and navigates to another origin, which
 * is the one way a "relative" target is not one. A backslash counts as one of
 * the two slashes — the URL parser reads `/\evil.example`, `\\evil.example`
 * and `\/evil.example` as that same other origin, which is why the auth
 * module's own decodeReturnTo has always said so.
 *
 * This is a guard on a value a component was handed, not a router. Callers
 * still own where their own hrefs come from; this is what keeps a string that
 * arrived from somewhere else out of a same-tab navigation.
 */
export function safeAppHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const cleaned = trimmed.replace(CONTROL_CHARS, '');
  if (CROSS_ORIGIN_PREFIX.test(cleaned)) return null;
  if (cleaned.startsWith('/') || cleaned.startsWith('#') || cleaned.startsWith('?')) return cleaned;
  return safeHref(cleaned);
}
