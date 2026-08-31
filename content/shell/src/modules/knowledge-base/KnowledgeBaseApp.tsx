import { useMemo, useRef } from 'react';
import { ModuleRoot, ToastProvider, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { KnowledgeBaseCatalogContext } from './KnowledgeBaseCatalogContext';
import { KnowledgeBaseContext } from './KnowledgeBaseContext';
import { KnowledgeBaseDraftContext } from './KnowledgeBaseDraftContext';
import { KnowledgeBaseStoreContext } from './KnowledgeBaseStoreContext';
import { KnowledgeBaseUndoContext, type KnowledgeUndoValue } from './KnowledgeBaseUndoContext';
import { KnowledgeBaseWorkspace } from './KnowledgeBaseWorkspace';
import { useCatalogStore } from './hooks/useCatalogStore';
import { useKnowledgeStore } from './hooks/useKnowledgeStore';
import { createDraftRegistry } from './lib/drafts';
import { UNDO_TTL_MS, undoLabel, type UndoEntry } from './lib/undo';

/**
 * Embeddable root of the Knowledge Base module - the rail of knowledge sources
 * beside the selected source's page.
 *
 * It owns the providers - the client, the Fuely record, the goods catalog and
 * specialists, the draft registry, the pending undo, the toasts - and nothing
 * else. `KnowledgeBaseWorkspace` owns the URL, the band, the keyboard, the
 * command palette and the unsaved-changes guard; everything below derives its
 * data from the contexts.
 *
 * The provider/consumer split is deliberate: a `useX()` hook in the component
 * that renders `<XContext.Provider>` throws, `tsc` cannot see it, and vitest is
 * node-only - validate pass 10b is the whole defence. Every hook called HERE
 * takes props, not context.
 *
 * Deep links: `?source=`, `&item=`, `&q=`, `&import=`, `&draft=`. An unknown
 * value falls back silently; the retired `?tab=` is read once and dropped.
 */
export function KnowledgeBaseApp({ botId, client, params, setParams, installedModules }: ModuleAppProps) {
  const context = useMemo(
    () => ({ client, botId, installedModules: installedModules ?? [] }),
    [client, botId, installedModules],
  );
  const store = useKnowledgeStore(client, botId);
  const catalog = useCatalogStore(client, botId);
  const drafts = useMemo(() => createDraftRegistry(), []);

  /* One undo entry, above every source (see KnowledgeBaseUndoContext). The
   * offer's lifecycle — one deep, cleared before it runs, expiring on its own —
   * is the shared `useUndoOffer`; the TTL stays this module's, so `isExpired`
   * and the live offer can never disagree. */
  const offer = useUndoOffer<UndoEntry>({ ttlMs: UNDO_TTL_MS });

  const undo: KnowledgeUndoValue = useMemo(
    () => ({
      entry: offer.entry,
      label: undoLabel(offer.entry),
      push: offer.push,
      run: offer.run,
      clear: offer.clear,
    }),
    [offer],
  );

  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <ToastProvider>
      <KnowledgeBaseContext.Provider value={context}>
        <KnowledgeBaseStoreContext.Provider value={store}>
          <KnowledgeBaseCatalogContext.Provider value={catalog}>
            <KnowledgeBaseDraftContext.Provider value={drafts}>
              <KnowledgeBaseUndoContext.Provider value={undo}>
                <ModuleRoot ref={rootRef}>
                  <KnowledgeBaseWorkspace rootRef={rootRef} params={params} setParams={setParams} />
                </ModuleRoot>
              </KnowledgeBaseUndoContext.Provider>
            </KnowledgeBaseDraftContext.Provider>
          </KnowledgeBaseCatalogContext.Provider>
        </KnowledgeBaseStoreContext.Provider>
      </KnowledgeBaseContext.Provider>
    </ToastProvider>
  );
}
