import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copy some text, and remember for a moment that it worked.
 *
 * ## Why it is a hook here rather than a button in a module
 *
 * There are three hand-rolled copy buttons in `content/shell` already — bookings,
 * account and the token gallery — and they disagree on all three of the things
 * that are actually hard: how long "Copied" stays up, what happens when the
 * clipboard is not available, and whether the timer is cleared when the button
 * unmounts (two of the three leak it, which sets state on a dead component the
 * moment a panel closes on a click).
 *
 * It is a hook and not a `CopyButton` component because the affordance differs
 * everywhere it appears: a code block wants an icon button in its header, a
 * JSON viewer wants one on hover, a token chip wants the whole chip to be the
 * button. What they share is the state machine, and that is all this is.
 *
 * ## The two ways a clipboard is unavailable
 *
 * `navigator.clipboard` exists only in a secure context, and this design system
 * is vendored into apps that get embedded in someone else's page. An iframe
 * without `clipboard-write` in its `allow` list has the API and rejects every
 * call to it. So there are two failures — no API, and an API that refuses —
 * and both fall back to the same place: a hidden textarea and
 * `document.execCommand('copy')`, which is deprecated, synchronous, and the
 * only thing that works in an iframe nobody thought to grant permission to.
 *
 * When even that fails, `failed` goes true rather than nothing happening. A
 * copy button that silently does nothing is the one thing worse than not
 * having one: the person walks away believing they have the value.
 */

export interface UseCopyToClipboardOptions {
  /** How long `copied` stays true. Default 1500ms. */
  resetAfterMs?: number;
}

export interface UseCopyToClipboardResult {
  /** Fire and forget; the state below is the whole result. */
  copy: (text: string) => void;
  /** The last copy succeeded, and recently enough to still say so. */
  copied: boolean;
  /** The last copy did not work. Cleared by the next attempt. */
  failed: boolean;
}

function writeWithSelection(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const area = document.createElement('textarea');
  area.value = text;
  /* Off-screen rather than `display: none`: a hidden element cannot be
     selected, and an unselected textarea copies an empty string. `readOnly`
     keeps the mobile keyboard from opening for the two frames it exists. */
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-9999px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

export function useCopyToClipboard({ resetAfterMs = 1500 }: UseCopyToClipboardOptions = {}): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  /* One timer, cleared on unmount. Without this a copy button inside a popover
     sets state after the popover has gone, which React warns about and which
     is a real leak on a list that mounts one of these per row. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const settle = useCallback(
    (ok: boolean) => {
      setCopied(ok);
      setFailed(!ok);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setCopied(false);
        setFailed(false);
      }, resetAfterMs);
    },
    [resetAfterMs],
  );

  const copy = useCallback(
    (text: string) => {
      const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
      if (clipboard?.writeText) {
        /* The promise rejects in an iframe without the permission, which is
           the case the fallback exists for — so the fallback runs in the
           rejection handler rather than instead of the API. */
        clipboard.writeText(text).then(
          () => settle(true),
          () => settle(writeWithSelection(text)),
        );
        return;
      }
      settle(writeWithSelection(text));
    },
    [settle],
  );

  return { copy, copied, failed };
}
