import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface UseThemeOptions {
  /**
   * Element that carries the `data-theme` attribute. Defaults to
   * document.documentElement.
   *
   * EMBED HOSTS: pass the embed root instead — the host owns <html>, and the
   * token stylesheet's attribute selector is deliberately not :root-scoped so
   * this works on any ancestor.
   */
  target?: HTMLElement | null;
  /** localStorage key, namespaced so it cannot collide with a host's own. */
  storageKey?: string;
  /** Pass false in embed mode to skip persistence entirely. */
  persist?: boolean;
}

export interface UseThemeResult {
  /** What the user chose. 'system' means "follow the OS". */
  preference: ThemePreference;
  /** What is actually rendering right now, with 'system' resolved. */
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
}

const DEFAULT_STORAGE_KEY = 'chatfuel-ui-theme';
const QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/* localStorage throws in private mode and in sandboxed iframes — never let a
 * theme preference take the app down with it. */
function readStored(key: string): ThemePreference | null {
  try {
    const raw = window.localStorage.getItem(key);
    return isPreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: ThemePreference) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore — the in-memory preference still applies for this session */
  }
}

/*
 * The preference lives in a module-level store rather than component state.
 * It has to: the choice stamps one shared DOM attribute, so a toggle in the
 * topbar and a swatch grid deeper in the page must observe the same value.
 * Per-component useState would leave the second one showing a stale theme.
 */
let preference: ThemePreference | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPreference(): ThemePreference {
  return preference ?? 'system';
}

function subscribeToSystem(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(QUERY).matches ? 'dark' : 'light';
}

/**
 * Theme preference with the system setting as the default.
 *
 * The stylesheet already handles 'system' on its own — the dark @media rule is
 * scoped to `:root:not([data-theme])`. So this hook writes `data-theme` only
 * for an explicit light/dark choice and REMOVES it for 'system', handing
 * control back to the media query rather than trying to out-guess it.
 *
 * Safe to call from as many components as you like; they share one preference.
 * The first caller to mount decides the storage key.
 */
export function useTheme(options?: UseThemeOptions): UseThemeResult {
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
  const persist = options?.persist ?? true;
  const target = options?.target;

  if (preference === undefined) preference = persist ? (readStored(storageKey) ?? 'system') : 'system';

  const current = useSyncExternalStore(subscribe, getPreference, () => 'system' as const);
  const systemTheme = useSyncExternalStore(subscribeToSystem, getSystemTheme, () => 'light' as const);
  const resolved: ResolvedTheme = current === 'system' ? systemTheme : current;

  /* Remember which element we stamped, so a changing `target` cleans up the
   * old one instead of leaving a stale data-theme behind. */
  const stampedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = target ?? document.documentElement;
    const previous = stampedRef.current;
    if (previous && previous !== element) delete previous.dataset.theme;
    stampedRef.current = element;

    if (current === 'system') delete element.dataset.theme;
    else element.dataset.theme = current;
  }, [current, target]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      preference = next;
      if (persist) writeStored(storageKey, next);
      for (const listener of listeners) listener();
    },
    [persist, storageKey],
  );

  return { preference: current, resolved, setPreference };
}
