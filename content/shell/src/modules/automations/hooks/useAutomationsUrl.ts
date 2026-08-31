import { useCallback, useMemo, useState } from 'react';
import type { ModuleAppProps } from '../../types';
import { parseAutomationsParams, writeAutomationsParams, type AutomationsParams } from '../lib/automationsParams';

export interface AutomationsUrlArgs {
  params: URLSearchParams;
  setParams: ModuleAppProps['setParams'];
  /** Live count of unsaved drafts: what the guard consults before a leave. */
  dirtyCount: () => number;
}

export interface AutomationsUrlApi {
  parsed: AutomationsParams;
  /** The guarded writer: leaving the scope / card with unsaved drafts asks first. */
  patch: (next: Partial<AutomationsParams>) => void;
  /** The raw writer: never asks. */
  patchNow: (next: Partial<AutomationsParams>) => void;
  /** A navigation the dirty guard is holding back until the person decides. */
  guarded: Partial<AutomationsParams> | null;
  setGuarded: (next: Partial<AutomationsParams> | null) => void;
}

/**
 * The address bar and its dirty guard, as one seam.
 *
 * Everything here reads the URL (`parsed`) or writes it through the two
 * writers. The guard is inseparable from the writer: `patch` is how every
 * surface navigates, so "are you leaving unsaved work?" has to be asked inside
 * it — the held navigation comes back out as `guarded` for the dialog to
 * resume or drop through `patchNow`.
 */
export function useAutomationsUrl({ params, setParams, dirtyCount }: AutomationsUrlArgs): AutomationsUrlApi {
  const [guarded, setGuarded] = useState<Partial<AutomationsParams> | null>(null);

  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand the view a new object.
  const query = params.toString();
  const parsed = useMemo(() => parseAutomationsParams(new URLSearchParams(query)), [query]);

  const patchNow = useCallback(
    (next: Partial<AutomationsParams>) => setParams(writeAutomationsParams(params, { ...parsed, ...next })),
    [params, parsed, setParams],
  );

  /* The dirty guard: leaving the scope / card with unsaved drafts asks first
   * (Save / Discard / Stay). Same-scope patches that keep the automation (a
   * consumed `?setting=`) never ask. */
  const patch = useCallback(
    (next: Partial<AutomationsParams>) => {
      const leaves =
        (next.scope !== undefined && next.scope !== parsed.scope) ||
        (next.automation !== undefined && next.automation !== parsed.automation && parsed.automation !== null);
      if (leaves && dirtyCount() > 0) {
        setGuarded(next);
        return;
      }
      patchNow(next);
    },
    [parsed.scope, parsed.automation, dirtyCount, patchNow],
  );

  return { parsed, patch, patchNow, guarded, setGuarded };
}
