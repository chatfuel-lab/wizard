import { useCallback, useEffect, useMemo, useReducer, useRef, type Dispatch } from 'react';
import { useToast } from '~ui';
import { useDrafts } from '../KnowledgeBaseDraftContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { useKnowledgeUndo } from '../KnowledgeBaseUndoContext';
import { announceSaved } from '../lib/announce';
import { draftKey, type DraftHandle } from '../lib/drafts';
import { messageFor } from '../lib/errors';
import {
  baselineEntries,
  blankQuestions,
  draftEntries,
  faqDraftReducer,
  initialFaqDraftState,
  isDirty,
  type FaqDraftAction,
  type FaqDraftState,
} from '../lib/faqDraftStore';
import { toFaqInput } from '../lib/knowledgeStore';
import { undoLabel, type UndoEntry } from '../lib/undo';
import type { FaqRow } from '../types';

export interface FaqDraft {
  state: FaqDraftState;
  dispatch: Dispatch<FaqDraftAction>;
  dirty: boolean;
  /**
   * Write the whole list. REJECTS on a refusal or a conflict, because ⌘S and
   * the leave guard read a resolved promise as "saved" — and a guard that
   * navigates away from a conflict is how a draft disappears.
   */
  save: () => Promise<void>;
  discard: () => void;
  /** Offer to put `previous` back into the DRAFT — a local delete, reorder or add. */
  offerUndo: (what: 'add' | 'delete' | 'reorder' | 'import', count: number, previous: readonly FaqRow[]) => void;
}

/** What `saveFaqs` refusing looks like to the registry. Never shown; the bar owns the words. */
const CONFLICT_ERROR = 'The FAQ list changed elsewhere.';

/**
 * The FAQ page's draft: the reducer, the server sync, the save, the undo offer
 * and the registry membership, in one hook so `FaqView` stays a rendering
 * problem.
 *
 * The two things that are only true here, not in `faqDraftStore.ts`:
 *
 * - **Undo means two different things and both are honest.** A local delete or
 *   reorder has not been written, so undoing it restores the DRAFT — writing
 *   the old list back would silently save every other pending edit with it. A
 *   completed save HAS been written, so undoing that is a compensating forward
 *   mutation, exactly as `lib/undo.ts` describes.
 * - **The save toast lives here rather than in the view**, so ⌘S and the save
 *   bar behave identically. They are the same code path either way.
 */
export function useFaqDraft(): FaqDraft {
  const store = useKnowledge();
  const drafts = useDrafts();
  const undo = useKnowledgeUndo();
  const toast = useToast();
  const [state, dispatch] = useReducer(faqDraftReducer, initialFaqDraftState);

  /* The store's list is the only source. `serverChanged` decides adopt / keep /
     conflict; `state.faqs` is a new array only when something actually landed,
     so this does not fire on every store render. */
  useEffect(() => {
    dispatch({ type: 'serverChanged', rows: store.state.faqs });
  }, [store.state.faqs]);

  /* Read inside callbacks that outlive the render they were created in — a save
     fired from ⌘S runs against the registry's handle, not this closure. */
  const stateRef = useRef(state);
  stateRef.current = state;

  const offerUndo = useCallback<FaqDraft['offerUndo']>(
    (what, count, previous) => {
      const rows = [...previous];
      undo.push({ kind: 'faqs', what, count, at: Date.now() }, () => dispatch({ type: 'restored', rows }));
    },
    [undo],
  );

  const save = useCallback(async () => {
    const current = stateRef.current;
    if (!isDirty(current)) return;

    /* Blocked here rather than saved and then flagged: the API takes a
       question-less entry happily and the assistant can never match it. */
    const blanks = blankQuestions(current);
    if (blanks.length > 0) {
      const message =
        blanks.length === 1
          ? 'One entry still has no question. The assistant has no way to match it.'
          : `${blanks.length} entries still have no question. The assistant has no way to match them.`;
      dispatch({ type: 'saveFailed', message });
      throw new Error(message);
    }

    const previous = toFaqInput(current.baseline);
    const count = current.rows.length;
    dispatch({ type: 'saveStarted' });

    let result;
    try {
      result = await store.saveFaqs(draftEntries(current), baselineEntries(current));
    } catch (error) {
      dispatch({ type: 'saveFailed', message: messageFor(error) });
      throw error;
    }

    if (!result.ok) {
      dispatch({ type: 'conflicted', theirs: result.conflict });
      throw new Error(CONFLICT_ERROR);
    }

    dispatch({ type: 'saveCommitted' });

    /* A written list CAN be undone by writing the old one back — unconditionally,
       with no baseline: the person is asking for exactly this overwrite. */
    const entry: UndoEntry = { kind: 'faqs', what: 'edit', count, at: Date.now() };
    const run = async () => {
      try {
        await store.saveFaqs(previous);
      } catch (error) {
        toast.show({ tone: 'danger', title: 'Could not undo the save', description: messageFor(error) });
      }
    };
    undo.push(entry, run);
    toast.show({
      title: announceSaved(count === 1 ? '1 FAQ' : `${count} FAQs`),
      action: { label: undoLabel(entry) ?? 'Undo', onClick: undo.run },
    });
  }, [store, undo, toast]);

  const discard = useCallback(() => dispatch({ type: 'discarded' }), []);

  const dirty = isDirty(state);

  /* Registered through refs so the handle identity never changes: re-registering
     on every keystroke would notify the badge on every keystroke too. */
  const saveRef = useRef(save);
  saveRef.current = save;
  const discardRef = useRef(discard);
  discardRef.current = discard;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const handle: DraftHandle = {
      key: draftKey('faq', 'list'),
      source: 'faq',
      get dirty() {
        return dirtyRef.current;
      },
      save: () => saveRef.current(),
      discard: () => discardRef.current(),
    };
    return drafts.register(handle);
  }, [drafts]);

  useEffect(() => {
    drafts.touch();
  }, [drafts, dirty]);

  return useMemo(
    () => ({ state, dispatch, dirty, save, discard, offerUndo }),
    [state, dirty, save, discard, offerUndo],
  );
}
