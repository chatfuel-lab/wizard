import { useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { selectProducts } from '../lib/catalogStore';
import { importReducer, initialImportState, type ImportAction, type ImportState } from '../lib/importStore';
import type { ImportTarget } from '../lib/knowledgeParams';

export interface ImportStore {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
}

/**
 * The import wizard's state: `lib/importStore.ts` reduced under React, fed the
 * one piece of IO the plan needs — the questions or titles already saved,
 * read from the knowledge and catalog stores.
 */
export function useImportStore(target: ImportTarget, open: boolean): ImportStore {
  const store = useKnowledge();
  const catalog = useCatalog();

  /** Questions or titles already saved — what a duplicate is measured against. */
  const existing = useMemo(
    () =>
      target === 'faq'
        ? store.state.faqs.map((faq) => faq.question)
        : selectProducts(catalog.state).map((product) => product.title),
    [target, store.state.faqs, catalog.state],
  );

  const [state, dispatch] = useReducer(importReducer, target, (id) => initialImportState(id));

  /* Reset on every OPEN, not on every render of an open wizard: `existing` is
     read through a ref here so a background refetch cannot wipe a half-filled
     wizard. The effect below keeps the duplicate check current instead. */
  const existingRef = useRef(existing);
  existingRef.current = existing;
  useEffect(() => {
    if (!open) return;
    dispatch({ type: 'reset', target, existing: existingRef.current });
  }, [open, target]);

  useEffect(() => {
    if (open) dispatch({ type: 'existing', existing });
  }, [open, existing]);

  return useMemo(() => ({ state, dispatch }), [state, dispatch]);
}
