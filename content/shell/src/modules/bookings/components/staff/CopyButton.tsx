import { useEffect, useState } from 'react';
import { Button, IconCheck, IconCopy } from '~ui';

export interface CopyButtonProps {
  /** What lands on the clipboard. */
  value: string;
  /** Names the button; "Copied" replaces it briefly after a click. */
  label?: string;
  size?: 'xs' | 'sm';
  className?: string;
}

const COPIED_MS = 1500;

/**
 * Copy-to-clipboard with a short "Copied" acknowledgement. Falls back to a
 * selection-free no-op when the Clipboard API is unavailable (an insecure
 * embed) — the value is always visible beside it, so a person can still
 * select and copy by hand.
 */
export function CopyButton({ value, label = 'Copy', size = 'xs', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
    } catch {
      /* no clipboard: the value is on screen */
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => void copy()}
      aria-label={copied ? 'Copied' : label}
      className={className}
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      {copied ? 'Copied' : label}
    </Button>
  );
}
