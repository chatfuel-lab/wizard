import { useCallback, type Dispatch } from 'react';
import { useToast } from '~ui';
import { GoodsProductCreateDocument } from '~api/generated/knowledge-base/graphql';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { useKnowledgeUndo } from '../KnowledgeBaseUndoContext';
import { announceImported } from '../lib/announce';
import { selectProducts } from '../lib/catalogStore';
import { isLimitError, messageFor } from '../lib/errors';
import { dominantCurrency, toFaqEntry, toProductInput } from '../lib/importMapping';
import { acceptedRows, rowLabel, type ApplyReport, type RowFailure } from '../lib/importPlan';
import type { ImportAction, ImportState } from '../lib/importStore';
import type { ImportTarget } from '../lib/knowledgeParams';
import { toFaqInput } from '../lib/knowledgeStore';
import { undoLabel, type UndoEntry } from '../lib/undo';

export interface ImportApplyArgs {
  state: ImportState;
  dispatch: Dispatch<ImportAction>;
  target: ImportTarget;
  /** Rows created so far — the progress the products bar moves on. */
  setDone: (done: number) => void;
}

/**
 * The write half of the import wizard: what pressing "Import N rows" does.
 * The stores and the API client come from context; the wizard hands over the
 * reducer state being applied and the progress setter its bar reads.
 */
export function useImportApply({ state, dispatch, target, setDone }: ImportApplyArgs): () => void {
  const { client, botId } = useKnowledgeBase();
  const store = useKnowledge();
  const catalog = useCatalog();
  const undo = useKnowledgeUndo();
  const toast = useToast();

  /**
   * FAQ: ONE replace-all write of the existing list plus the accepted rows.
   *
   * `saveFaqs` is given the baseline it was built from, so a list that moved
   * while the wizard was open refuses rather than overwriting somebody else's
   * edit. Undo writes the previous WHOLE list back — the only kind of undo the
   * API can express.
   */
  const applyFaqs = useCallback(async () => {
    const accepted = acceptedRows(state.rows);
    const previous = toFaqInput(store.state.faqs);
    const next = [...previous, ...accepted.map((row) => toFaqEntry(row.values))];
    dispatch({ type: 'busy', busy: true });
    try {
      const result = await store.saveFaqs(next, previous);
      if (!result.ok) {
        dispatch({
          type: 'error',
          error: 'The FAQ list changed somewhere else while this was open. Close the import, refresh, and try again.',
        });
        return;
      }
      const entry: UndoEntry = { kind: 'faqs', what: 'import', count: accepted.length, at: Date.now() };
      undo.push(entry, () => void store.saveFaqs(previous));
      dispatch({
        type: 'report',
        report: {
          target: 'faq',
          planned: accepted.length,
          created: accepted.length,
          failed: [],
          stoppedAtLimit: false,
        },
      });
      toast.show({
        title: announceImported(accepted.length, 'FAQ'),
        tone: 'success',
        action: { label: undoLabel(entry) ?? 'Undo', onClick: undo.run },
      });
    } catch (error) {
      dispatch({ type: 'error', error: messageFor(error) });
    }
  }, [state.rows, store, undo, toast, dispatch]);

  /**
   * Products: one `GoodsProductCreate` per row, in order.
   *
   * There is no bulk create, so a partial result is the normal case and this
   * has to be honest about it. A row the server refuses (a duplicate title, a
   * bad price) is recorded and the run CONTINUES; the knowledge base filling
   * up stops it, because every remaining call would fail the same way — and
   * the report then says how far it got rather than claiming success.
   */
  const applyProducts = useCallback(async () => {
    const accepted = acceptedRows(state.rows);
    const currency = dominantCurrency(selectProducts(catalog.state));
    const failed: RowFailure[] = [];
    let created = 0;
    let stoppedAtLimit = false;

    dispatch({ type: 'busy', busy: true });
    setDone(0);
    for (const row of accepted) {
      try {
        const data = await client.mutate(GoodsProductCreateDocument, {
          botID: botId,
          product: toProductInput(row.values, currency),
        });
        catalog.applyCatalog(data.goodsProductCreate.goodsCatalog);
        created += 1;
        setDone(created);
      } catch (error) {
        if (isLimitError(error)) {
          stoppedAtLimit = true;
          break;
        }
        failed.push({ label: rowLabel(row, 'products'), message: messageFor(error) });
      }
    }
    /* The creates moved `usage`; the header's budget meter reads it from the
       knowledge store, which was not part of any of those responses. */
    if (created > 0) store.refetch();
    const report: ApplyReport = { target: 'products', planned: accepted.length, created, failed, stoppedAtLimit };
    dispatch({ type: 'report', report });
    if (created > 0)
      toast.show({
        title: announceImported(created, 'Products'),
        tone: failed.length > 0 || stoppedAtLimit ? 'warning' : 'success',
      });
  }, [state.rows, catalog, client, botId, store, toast, dispatch, setDone]);

  const apply = useCallback(() => {
    dispatch({ type: 'goto', step: 'apply' });
    void (target === 'faq' ? applyFaqs() : applyProducts());
  }, [target, applyFaqs, applyProducts, dispatch]);

  return apply;
}
