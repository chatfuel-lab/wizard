/**
 * Opening a URL the app did not write.
 *
 * `href={…}` needs no guard of its own: react-dom refuses to render a
 * `javascript:` URL into an attribute and substitutes a throwing stub. A
 * `window.open` call is not an attribute and gets no such treatment — it is a
 * plain function taking a plain string, and in this product that string came
 * off the wire. An attachment somebody sent to the inbox, a permalink a
 * channel returned, the address of an export the platform stored: none of
 * them are ours, and one `javascript:` among them runs in this origin, where
 * the session lives.
 *
 * So the rule that guards a link the assistant wrote guards this one too —
 * `safeHref`, the same scheme allowlist, the same control-character strip.
 *
 * `noopener,noreferrer` rides on every open, and the second half is not
 * decoration: an operator can be on `/reset-password?token_hash=…` and the
 * recovery token has no business travelling in a `Referer` to whoever hosts
 * the file.
 */
import { safeHref } from '../markdown/href';

/**
 * Open `raw` in a new tab, or refuse it.
 *
 * Returns false when the URL was refused, so a caller with somewhere to say so
 * can say it. Most callers have nowhere — a tile whose "open" does nothing is
 * the honest outcome for a target that may not be opened.
 */
export function openExternal(raw: string): boolean {
  const href = safeHref(raw);
  if (href === null) return false;
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Leave the app for `raw` in the SAME tab, or refuse it.
 *
 * The one flow that needs this is an OAuth hand-off: the provider brings the
 * person back by redirect, and a new tab would strand the return leg in a
 * window the app is not in. Everything else that leaves belongs in
 * `openExternal`.
 */
export function navigateExternal(raw: string): boolean {
  const href = safeHref(raw);
  if (href === null) return false;
  window.location.assign(href);
  return true;
}
