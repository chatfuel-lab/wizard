import { useSyncExternalStore } from 'react';

export interface KbdProps {
  /**
   * Key names, in press order. `mod` renders ⌘ on Apple platforms and Ctrl
   * everywhere else — write shortcuts once and let the component localise them.
   */
  keys: readonly string[];
  className?: string;
}

const NEVER_CHANGES = () => () => {};

function readIsApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Server snapshot is `false` on purpose. Embed mode can land inside Next.js,
 * and reading navigator during render would be a hydration mismatch;
 * useSyncExternalStore renders the non-Apple form first and corrects it in the
 * commit, which React handles without a warning.
 */
function useIsApple(): boolean {
  return useSyncExternalStore(NEVER_CHANGES, readIsApple, () => false);
}

const SYMBOLS: Record<string, { glyph: string; label: string }> = {
  shift: { glyph: '⇧', label: 'Shift' },
  enter: { glyph: '↵', label: 'Enter' },
  return: { glyph: '↵', label: 'Enter' },
  backspace: { glyph: '⌫', label: 'Backspace' },
  tab: { glyph: '⇥', label: 'Tab' },
  esc: { glyph: 'Esc', label: 'Escape' },
  escape: { glyph: 'Esc', label: 'Escape' },
  up: { glyph: '↑', label: 'Arrow up' },
  down: { glyph: '↓', label: 'Arrow down' },
  left: { glyph: '←', label: 'Arrow left' },
  right: { glyph: '→', label: 'Arrow right' },
  space: { glyph: 'Space', label: 'Space' },
};

function render(key: string, isApple: boolean): { glyph: string; label: string } {
  const lower = key.toLowerCase();
  if (lower === 'mod') {
    return isApple ? { glyph: '⌘', label: 'Command' } : { glyph: 'Ctrl', label: 'Control' };
  }
  if (lower === 'alt' || lower === 'option') {
    return isApple ? { glyph: '⌥', label: 'Option' } : { glyph: 'Alt', label: 'Alt' };
  }
  return SYMBOLS[lower] ?? { glyph: key.length === 1 ? key.toUpperCase() : key, label: key };
}

/**
 * Keyboard shortcut hint.
 *
 * The glyphs are decorative — a screen reader announcing "⇧ ⌘ K" is useless —
 * so the whole group carries one spelled-out aria-label and the caps are hidden.
 */
export function Kbd({ keys, className = '' }: KbdProps) {
  const isApple = useIsApple();
  const parts = keys.map((key) => render(key, isApple));

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      aria-label={parts.map((part) => part.label).join(' ')}
    >
      {parts.map((part, index) => (
        <kbd
          key={`${part.label}-${index}`}
          aria-hidden
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-chip border border-border bg-translucent px-1 font-sans text-micro font-medium text-text-muted"
        >
          {part.glyph}
        </kbd>
      ))}
    </span>
  );
}
