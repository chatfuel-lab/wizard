import { useEffect, useRef, useState, type RefObject } from 'react';
import type { AvailabilityEntry } from '../types';
import type { WizardStep } from '../lib/wizardStore';

/**
 * Each wizard step lands focus on its first control, and content that arrives
 * later (the catalog, the slots) re-runs the search — without ever stealing a
 * focus the operator already moved.
 */
export function useWizardFocus({
  open,
  step,
  catalogLoaded,
  availabilityEntries,
}: {
  open: boolean;
  step: WizardStep;
  catalogLoaded: boolean;
  availabilityEntries: AvailabilityEntry[] | null;
}): { setBodyEl: (el: HTMLDivElement | null) => void; firstControlRef: RefObject<HTMLElement | null> } {
  /* `firstControlRef` is what the overlay's focus trap focuses when it arms
   * (a commit after this body mounts — see `useFocusTrap`), and what each step
   * change focuses itself. Set synchronously in the effect, not in a frame:
   * the trap reads it on its own commit, and a frame could land either side. */
  /* The body as STATE (a callback ref), not a ref: the overlay mounts it a
   * commit or two after `open` flips, so an effect keyed on `open` alone runs
   * before there is anything to focus and never runs again. */
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const firstControlRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = bodyEl;
    if (!open || !root) return;
    // Content that arrives later (the catalog, the slots) re-runs this; a focus the operator already moved is left alone.
    const active = root.ownerDocument.activeElement;
    if (active && active !== root && root.contains(active)) return;
    const target =
      root.querySelector<HTMLElement>('[aria-label="Pick a day"] [tabindex="0"]') ??
      root.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
      root.querySelector<HTMLElement>('[role="radio"], input:not([disabled]), [role="combobox"]') ??
      root;
    firstControlRef.current = target;
    target.focus({ preventScroll: true });
  }, [open, bodyEl, step, catalogLoaded, availabilityEntries]);

  return { setBodyEl, firstControlRef };
}
