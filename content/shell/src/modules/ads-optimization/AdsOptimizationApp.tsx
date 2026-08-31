import { useMemo, useRef } from 'react';
import { ModuleRoot, ToastProvider, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { AdsCatalogContext } from './AdsCatalogContext';
import { AdsContext } from './AdsContext';
import { AdsStoreContext } from './AdsStoreContext';
import { AdsUndoContext, type AdsUndoValue } from './AdsUndoContext';
import { AdsOptimizationWorkspace } from './AdsOptimizationWorkspace';
import { useCatalogStore } from './hooks/useCatalogStore';
import { useEventSetsStore } from './hooks/useEventSetsStore';

/**
 * Embeddable root of the Ads Optimization module — the rail of event sets and
 * the selected set beside it.
 *
 * It owns the providers and nothing else: the client, the one live store of
 * every set, the catalog (conversion names, and whether Meta can be reached at
 * all), the pending undo and the toasts. `AdsOptimizationWorkspace` owns the
 * address, the band, the keyboard and every dialog.
 *
 * The provider/consumer split is deliberate: a context hook called in the
 * component that renders the provider throws at runtime, `tsc` cannot see it
 * and the tests run without a browser. Every hook called HERE takes arguments,
 * not context.
 */
export function AdsOptimizationApp({ botId, client, view, setView, params, setParams }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);
  const store = useEventSetsStore(client, botId);
  const catalog = useCatalogStore(client, botId);

  /* The offer's whole lifecycle — one deep, cleared before it runs so the
     toast button and the keyboard cannot both fire the same compensating
     write, expiring with the toast — is the shared `useUndoOffer`. The entry
     is just the label: what to undo is the runner the surface handed over. */
  const offer = useUndoOffer<string>();
  const undo: AdsUndoValue = useMemo(() => ({ label: offer.entry, push: offer.push, run: offer.run }), [offer]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <ToastProvider>
      <AdsContext.Provider value={context}>
        <AdsStoreContext.Provider value={store}>
          <AdsCatalogContext.Provider value={catalog}>
            <AdsUndoContext.Provider value={undo}>
              <ModuleRoot ref={rootRef}>
                <AdsOptimizationWorkspace
                  rootRef={rootRef}
                  view={view}
                  setView={setView}
                  params={params}
                  setParams={setParams}
                />
              </ModuleRoot>
            </AdsUndoContext.Provider>
          </AdsCatalogContext.Provider>
        </AdsStoreContext.Provider>
      </AdsContext.Provider>
    </ToastProvider>
  );
}
