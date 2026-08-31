import { useMemo, useRef } from 'react';
import { ModuleRoot, ToastProvider, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { AutomationsCatalogContext } from './AutomationsCatalogContext';
import { AutomationsContext } from './AutomationsContext';
import { AutomationsDraftContext } from './AutomationsDraftContext';
import { AutomationsStoreContext } from './AutomationsStoreContext';
import { AutomationsUndoContext, type AutomationsUndoValue } from './AutomationsUndoContext';
import { AutomationsWorkspace } from './AutomationsWorkspace';
import { useAutomationsStore } from './hooks/useAutomationsStore';
import { useBootstrap } from './hooks/useBootstrap';
import { createDraftRegistry } from './lib/drafts';
import { UNDO_TTL_MS, undoLabel, type UndoEntry } from './lib/undo';

/**
 * Embeddable root of the AI Automations module — the rail of 18 automation
 * sources, the selected source's page (Default rules + custom rules, all 15
 * settings) and the always-open Test panel beside it.
 *
 * It owns the providers — the client, the one store (every automation, live),
 * the catalog (connected channels, team, attributes, knowledge-base facts),
 * the draft registry, the pending undo, the toasts — and nothing else.
 * `AutomationsWorkspace` owns the URL, the band, the keyboard, the Test
 * panel's target and the New-rule dialog; everything below derives its data
 * from the contexts.
 *
 * The provider/consumer split is deliberate: a `useX()` hook in the component
 * that renders `<XContext.Provider>` throws, `tsc` cannot see it, and vitest is
 * node-only — validate pass 10b is the whole defence. Every hook called HERE
 * takes props, not context.
 *
 * Deep links: `?scope=`, `&automation=`, `&setting=`, `&new=`. An unknown
 * value falls back silently; the retired keys (`view`, `test`, …) are
 * ignored and dropped on the next write.
 */
export function AutomationsApp({ botId, client, params, setParams }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);
  const store = useAutomationsStore(client, botId);
  const catalog = useBootstrap(client, botId);
  const drafts = useMemo(() => createDraftRegistry(), []);

  /* One undo entry, above every section (see AutomationsUndoContext). The
   * offer's lifecycle — one deep, cleared before it runs, expiring on its own —
   * is the shared `useUndoOffer`; the TTL stays this module's, so the toast
   * copy ("for a minute afterwards") and the live offer can never disagree. */
  const offer = useUndoOffer<UndoEntry>({ ttlMs: UNDO_TTL_MS });

  const undo: AutomationsUndoValue = useMemo(
    () => ({ entry: offer.entry, label: undoLabel(offer.entry), push: offer.push, run: offer.run, clear: offer.clear }),
    [offer],
  );

  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <ToastProvider>
      <AutomationsContext.Provider value={context}>
        <AutomationsStoreContext.Provider value={store}>
          <AutomationsCatalogContext.Provider value={catalog}>
            <AutomationsDraftContext.Provider value={drafts}>
              <AutomationsUndoContext.Provider value={undo}>
                <ModuleRoot ref={rootRef}>
                  <AutomationsWorkspace rootRef={rootRef} params={params} setParams={setParams} />
                </ModuleRoot>
              </AutomationsUndoContext.Provider>
            </AutomationsDraftContext.Provider>
          </AutomationsCatalogContext.Provider>
        </AutomationsStoreContext.Provider>
      </AutomationsContext.Provider>
    </ToastProvider>
  );
}
