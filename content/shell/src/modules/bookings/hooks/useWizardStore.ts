import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import {
  openWizard,
  wizardReducer,
  type WizardAction,
  type WizardOpenInput,
  type WizardState,
} from '../lib/wizardStore';

/** A `reset` for the reducer: the state a fresh open computes. Kept out of the store — it is wiring, not a rule. */
export type WizardResetAction = { type: 'reset'; state: WizardState };

const reducer = (state: WizardState, action: WizardAction | WizardResetAction): WizardState =>
  action.type === 'reset' ? action.state : wizardReducer(state, action);

/**
 * `wizardReducer` bound to the wizard's open/close lifecycle: every open
 * resets the state from the prefill (before paint), a catalog that lands
 * after a deep-link open re-opens an UNTOUCHED wizard from the same prefill,
 * and the bot's country is adopted by a pristine draft.
 *
 * The two suppressed effect dependencies below are deliberate, not stale:
 * re-deriving on every `openInput` change while open would wipe the
 * operator's progress, so the reset effects key on exactly the events that
 * may reset — the open itself, and the catalog's arrival.
 *
 * This lifecycle belongs to the wizard alone: `AttachCustomer` in
 * `components/panel/CustomerSection.tsx` binds `wizardReducer` PLAINLY on
 * purpose — it is one-shot per mount and has no open/reset/touched protocol.
 */
export function useWizardStore(
  open: boolean,
  openInput: () => WizardOpenInput,
  catalogLoaded: boolean,
  countryCode: string | null,
): { state: WizardState; dispatch: (action: WizardAction | WizardResetAction) => void } {
  const [state, rawDispatch] = useReducer(reducer, null, () => openWizard(openInput()));

  /* Whether the operator has done anything since the last reset. A deep link
   * (`?new=1&service=`) opens before the catalog has answered, so the prefill
   * cannot resolve the service yet; once the catalog lands, an untouched wizard
   * is re-opened from the same prefill — a touched one is left alone. */
  const touchedRef = useRef(false);
  const dispatch = useCallback((action: WizardAction | WizardResetAction) => {
    if (action.type === 'reset') touchedRef.current = false;
    else if (action.type !== 'countryDefaulted') touchedRef.current = true;
    rawDispatch(action);
  }, []);

  // Every open starts over from the prefill — before paint, so the old state never shows.
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) dispatch({ type: 'reset', state: openWizard(openInput()) });
    wasOpen.current = open;
    // Re-deriving on every prefill change while open would wipe the operator's progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && catalogLoaded && !touchedRef.current) dispatch({ type: 'reset', state: openWizard(openInput()) });
    // Only the catalog's arrival re-opens; see the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoaded]);

  // The bot's country may land after a deep-link open; a pristine draft adopts it.
  useEffect(() => {
    if (countryCode) dispatch({ type: 'countryDefaulted', countryCode });
  }, [countryCode, dispatch]);

  return { state, dispatch };
}
