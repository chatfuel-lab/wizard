import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionBar,
  Alert,
  Button,
  Checkbox,
  CSV_BOM,
  downloadTextFile,
  DragLayer,
  EmptyState,
  IconDownload,
  IconMessageCircle,
  IconTrash,
  PageBody,
  Skeleton,
  headerCheckboxState,
  useDragSession,
  useToast,
  type MenuItem,
} from '~ui';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { FaqGhost } from '../components/faq/FaqGhost';
import { FaqRowItem } from '../components/faq/FaqRowItem';
import { FaqSaveBar } from '../components/faq/FaqSaveBar';
import { FaqToolbar } from '../components/faq/FaqToolbar';
import { useFaqDraft } from '../hooks/useFaqDraft';
import { announceDeleted, announceMoved, announceSelection } from '../lib/announce';
import { faqFileName, toCsv, toJson } from '../lib/faqCsv';
import {
  blankQuestions,
  canSave as canSaveDraft,
  dragKeys,
  indexOfRow,
  moveRows,
  nudgeTarget,
  selectedRows,
  type FaqField,
  type NudgeTo,
} from '../lib/faqDraftStore';
import {
  canReorder,
  duplicateMarks,
  faqDragSentence,
  findingsByRow,
  listFindings,
  rowsChars,
  visibleRows,
} from '../lib/faqList';
import { isInitialLoad, toFaqInput } from '../lib/knowledgeStore';
import { bySeverity, lintFaqs, type Severity } from '../lib/lint';
import type { FaqRow } from '../types';
import { ImportWizard } from '../components/import/ImportWizard';
import type { KnowledgeViewProps } from './types';

interface FaqDragPayload {
  keys: string[];
  leadKey: string;
}

/**
 * The drop target below the last row: "put it at the end".
 *
 * It cannot collide with a row key — those are minted as `faq-<number>` — and
 * it exists because the last row's own target only ever inserts BEFORE it once
 * the block came from above.
 */
const END_TARGET = 'faq-drop-end';

/** A list-wide finding is a banner; the row chips use their own softer tones. */
const BANNER_TONE: Record<Severity, 'danger' | 'warning' | 'info'> = {
  blocker: 'danger',
  warning: 'warning',
  tip: 'info',
};

const labelOf = (row: FaqRow | undefined): string =>
  row && row.question.trim() !== '' ? row.question : 'the entry with no question';

/**
 * The FAQ: question and answer pairs, in the order the assistant reads them.
 *
 * The page is a draft over one replace-all mutation. Everything visible here —
 * adding, editing, deleting, reordering — changes a LOCAL list, and the bar at
 * the bottom writes it; `lib/faqDraftStore.ts` holds that model and
 * `hooks/useFaqDraft.ts` wires it to the store, the draft registry and undo.
 * This file is the rendering, and it is deliberately the only untested part.
 *
 * Three behaviours worth finding here rather than in a diff:
 *
 * - **Findings come from the DRAFT while it is dirty.** `props.findings` are the
 *   lint over what the server holds, which is right until the moment somebody
 *   starts typing — after that a "no answer" chip on a row that now has one is
 *   just wrong. Same rules and the same finding ids either way (`lintFaqs`), so
 *   the two lists are identical whenever the draft matches the server.
 * - **`?draft=` is how the Gaps source hands a question over.** It opens a new
 *   entry with that text as the question and the caret in the answer, and it has
 *   to work from a cold link — so it waits for the first load and then clears
 *   the parameter, which is what stops a refresh from adding the row twice.
 * - **Export writes what is on screen, unsaved edits included.** Exporting the
 *   server's copy of a list somebody is halfway through editing would be a
 *   surprise; the toast says which one it was.
 */
export function FaqView({ role, params, onParams, band, onBusy, findings, canEditHere }: KnowledgeViewProps) {
  const store = useKnowledge();
  const toast = useToast();
  const draft = useFaqDraft();
  const { state, dispatch } = draft;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  const canEdit = canEditHere && role.canEdit;
  const loading = isInitialLoad(store.state);
  const query = params.q;

  useEffect(() => onBusy(state.saving), [onBusy, state.saving]);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const rowFindings = useMemo(
    () => (draft.dirty ? bySeverity(lintFaqs(state.rows)) : findings),
    [draft.dirty, state.rows, findings],
  );
  const byRow = useMemo(() => findingsByRow(rowFindings), [rowFindings]);
  const wide = useMemo(() => listFindings(rowFindings), [rowFindings]);
  const marks = useMemo(() => duplicateMarks(state.rows), [state.rows]);

  const shown = useMemo(() => visibleRows(state.rows, state.sort, query), [state.rows, state.sort, query]);
  const shownKeys = useMemo(() => shown.map((row) => row.key), [shown]);
  const chars = useMemo(() => rowsChars(state.rows), [state.rows]);
  const chosen = useMemo(() => selectedRows(state), [state]);
  const reorderable = canEdit && canReorder(state.sort);

  const selectedShown = useMemo(
    () => shownKeys.filter((key) => state.selection.includes(key)).length,
    [shownKeys, state.selection],
  );

  const empty = state.rows.length === 0;
  const narrowed = !empty && shown.length === 0;

  // -------------------------------------------------------------------------
  // Deep links: ?draft= from the Gaps source, ?item= from a finding
  // -------------------------------------------------------------------------

  const seededDraft = useRef<string | null>(null);
  useEffect(() => {
    if (store.state.kb === null || params.draft === null || seededDraft.current === params.draft) return;
    seededDraft.current = params.draft;
    dispatch({ type: 'added', question: params.draft, field: 'answer' });
    /* Cleared so a refresh does not add the same question a second time — and
       with it any search, which would hide the row that was just handed over. */
    onParams({ draft: null, q: '' });
  }, [store.state.kb, params.draft, dispatch, onParams]);

  const openedItem = useRef<string | null>(null);
  useEffect(() => {
    if (store.state.kb === null || params.item === null || openedItem.current === params.item) return;
    openedItem.current = params.item;
    /* Checked against the STORE's list, not the draft: this effect runs in the
       same commit as the adopt, and the draft has not re-rendered yet. */
    if (store.state.faqs.some((row) => row.key === params.item)) {
      dispatch({ type: 'editingSet', key: params.item, field: 'question' });
    }
    onParams({ item: null });
  }, [store.state.kb, store.state.faqs, params.item, dispatch, onParams]);

  // -------------------------------------------------------------------------
  // Edits
  // -------------------------------------------------------------------------

  const create = useCallback(() => {
    /* A new entry has no question yet, so a live search would filter away the
       very row the person just asked for and the click would look ignored. */
    if (query.trim() !== '') onParams({ q: '' });
    dispatch({ type: 'added', question: '', field: 'question' });
  }, [query, onParams, dispatch]);

  const remove = useCallback(
    (keys: readonly string[]) => {
      if (keys.length === 0) return;
      const previous = state.rows;
      const first = previous.find((row) => row.key === keys[0]);
      draft.offerUndo('delete', keys.length, previous);
      dispatch({ type: 'removed', keys });
      setAnnouncement(announceDeleted(keys.length === 1 ? labelOf(first) : `${keys.length} FAQs`, true));
    },
    [state.rows, draft, dispatch],
  );

  const applyMove = useCallback(
    (keys: readonly string[], target: string | null) => {
      const previous = state.rows;
      const next = moveRows(previous, keys, target);
      if (next === previous) return;
      draft.offerUndo('reorder', keys.length, previous);
      dispatch({ type: 'moved', keys, target });
      const lead = keys[0]!;
      setAnnouncement(
        announceMoved(
          keys.length === 1 ? labelOf(previous.find((row) => row.key === lead)) : `${keys.length} FAQs`,
          indexOfRow(previous, lead),
          indexOfRow(next, lead),
          next.length,
        ),
      );
    },
    [state.rows, draft, dispatch],
  );

  const nudge = useCallback(
    (key: string, to: NudgeTo) => {
      const previous = state.rows;
      const from = indexOfRow(previous, key);
      const target = nudgeTarget(previous, key, to);
      const label = labelOf(previous.find((row) => row.key === key));
      if (from === -1 || from === target) {
        setAnnouncement(announceMoved(label, from, from, previous.length));
        return;
      }
      draft.offerUndo('reorder', 1, previous);
      dispatch({ type: 'nudged', key, to });
      setAnnouncement(announceMoved(label, from, target, previous.length));
    },
    [state.rows, draft, dispatch],
  );

  const toggleSelect = useCallback(
    (key: string, shift: boolean) => {
      dispatch({ type: 'selectionToggled', key, ids: shownKeys, shift });
    },
    [dispatch, shownKeys],
  );

  /* Announced from the state that actually landed, not from the click: a
     shift-click takes a span whose size nobody counted on the way in. Skipped
     on the first render, or every arrival would open with "Nothing selected". */
  const lastCount = useRef(state.selection.length);
  useEffect(() => {
    if (lastCount.current === state.selection.length) return;
    lastCount.current = state.selection.length;
    setAnnouncement(announceSelection(state.selection.length, state.rows.length));
  }, [state.selection.length, state.rows.length]);

  const toggleAll = useCallback(
    (checked: boolean) =>
      dispatch({
        type: 'selectionSet',
        keys: checked
          ? [...new Set([...state.selection, ...shownKeys])]
          : state.selection.filter((key) => !shownKeys.includes(key)),
      }),
    [dispatch, state.selection, shownKeys],
  );

  const consumeFocus = useCallback(() => dispatch({ type: 'focusConsumed' }), [dispatch]);

  const showDuplicate = useCallback(
    (key: string) => {
      /* Same trap as `create`: the pair is only useful if the OTHER half can
         actually be seen, and a live search may be hiding it. */
      if (query.trim() !== '') onParams({ q: '' });
      dispatch({ type: 'editingSet', key, field: 'question' });
    },
    [query, onParams, dispatch],
  );

  // -------------------------------------------------------------------------
  // Drag
  // -------------------------------------------------------------------------

  const session = useDragSession<FaqDragPayload>({
    disabled: !reorderable,
    scrollRef,
    getAnnouncement: ({ phase, data, targetId }) => {
      const label = labelOf(state.rows.find((row) => row.key === data.leadKey));
      const target =
        targetId === null
          ? null
          : targetId === END_TARGET
            ? 'the end of the list'
            : labelOf(state.rows.find((row) => row.key === targetId));
      return faqDragSentence(phase, data.keys.length, label, target);
    },
    onDrop: (payload, targetId) => applyMove(payload.keys, targetId === END_TARGET ? null : targetId),
  });

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const exportRows = chosen.length > 0 ? chosen : state.rows;

  const runExport = useCallback(
    (kind: 'csv' | 'json') => {
      const entries = toFaqInput(exportRows);
      if (entries.length === 0) {
        toast.show({ tone: 'warning', title: 'Nothing to export', description: 'The FAQ is empty.' });
        return;
      }
      const text = kind === 'csv' ? CSV_BOM + toCsv(entries) : toJson(entries);
      downloadTextFile(
        faqFileName(kind, entries.length),
        text,
        kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      );
      toast.show({
        title: `Exported ${entries.length === 1 ? '1 FAQ' : `${entries.length} FAQs`}`,
        description: draft.dirty ? 'The list as you have it now, including the changes you have not saved.' : undefined,
      });
    },
    [exportRows, toast, draft.dirty],
  );

  // -------------------------------------------------------------------------
  // The bulk bar
  // -------------------------------------------------------------------------

  const barActions = useMemo<MenuItem[]>(() => {
    const actions: MenuItem[] = [];
    if (canEdit) {
      actions.push({
        id: 'delete',
        label: 'Delete',
        icon: <IconTrash size={14} />,
        tone: 'danger',
        onSelect: () => remove(state.selection),
      });
    }
    actions.push({
      id: 'export',
      label: 'Export CSV',
      icon: <IconDownload size={14} />,
      onSelect: () => runExport('csv'),
    });
    return actions;
  }, [canEdit, state.selection, remove, runExport]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <FaqToolbar
        query={query}
        onQuery={(next) => onParams({ q: next })}
        sort={state.sort}
        onSort={(sort) => dispatch({ type: 'sortSet', sort })}
        total={state.rows.length}
        shown={shown.length}
        chars={chars}
        canEdit={canEdit}
        onCreate={create}
        onImport={() => onParams({ import: 'faq' })}
        onExportCsv={() => runExport('csv')}
        onExportJson={() => runExport('json')}
        exportCount={exportRows.length}
        exportsSelection={chosen.length > 0}
      />

      {/* An empty list already says so in its own words below — a banner over
          the EmptyState saying it again is one message too many. */}
      {!loading && !empty && wide.length > 0 ? (
        <div className="px-gutter pt-3">
          <Alert tone={BANNER_TONE[wide[0]!.severity]} title={wide[0]!.title}>
            {wide[0]!.detail}
          </Alert>
        </div>
      ) : null}

      {/* `relative` is load-bearing twice over: ActionBar is absolutely
          positioned and deliberately not portalled, so an embed's bulk bar stays
          inside the module rather than stretching across the host's viewport —
          and it is on THIS wrapper rather than the page, so the bar floats over
          the list instead of on top of the save bar. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <PageBody ref={scrollRef} padded={false}>
          {loading ? (
            <div className="flex flex-col gap-2 p-gutter" aria-busy="true" aria-label="Loading the FAQ">
              <Skeleton variant="block" height="3rem" />
              <Skeleton variant="block" height="3rem" />
              <Skeleton variant="block" height="3rem" />
              <Skeleton variant="block" height="3rem" />
            </div>
          ) : empty ? (
            <EmptyState
              icon={<IconMessageCircle />}
              title="No FAQs yet"
              action={canEdit ? <Button onClick={create}>Add the first one</Button> : undefined}
            />
          ) : narrowed ? (
            <EmptyState
              icon={<IconMessageCircle />}
              title="Nothing matches"
              description={`No question or answer contains “${query}”.`}
              action={
                <Button variant="ghost" onClick={() => onParams({ q: '' })}>
                  Clear the search
                </Button>
              }
            />
          ) : (
            <>
              <div className="sticky top-0 z-sticky flex items-center gap-2 border-b border-border-strong bg-surface px-2 py-1.5">
                <Checkbox
                  checked={headerCheckboxState(selectedShown, shownKeys.length)}
                  onChange={toggleAll}
                  aria-label={selectedShown === shownKeys.length ? 'Clear the selection' : 'Select every entry shown'}
                />
                <span className="text-micro font-medium uppercase tracking-wide text-text-faint">
                  Question and answer
                </span>
                <span className="ml-auto hidden pr-2 text-micro font-medium uppercase tracking-wide text-text-faint @compact:inline">
                  Characters
                </span>
              </div>

              <ul aria-label="FAQ entries">
                {shown.map((row) => (
                  <FaqRowItem
                    key={row.key}
                    row={row}
                    position={indexOfRow(state.rows, row.key) + 1}
                    total={state.rows.length}
                    query={query}
                    selected={state.selection.includes(row.key)}
                    editing={state.editing === row.key}
                    canEdit={canEdit}
                    reorderable={reorderable}
                    findings={byRow.get(row.key) ?? []}
                    duplicate={marks.get(row.key)}
                    focusField={state.focus !== null && state.focus.key === row.key ? state.focus.field : null}
                    onFocusConsumed={consumeFocus}
                    onToggleSelect={(shift) => toggleSelect(row.key, shift)}
                    onToggleEditing={() =>
                      dispatch({ type: 'editingSet', key: state.editing === row.key ? null : row.key })
                    }
                    onPatch={(field: FaqField, value: string) =>
                      dispatch({ type: 'patched', key: row.key, field, value })
                    }
                    onDelete={() => remove([row.key])}
                    onNudge={(to) => nudge(row.key, to)}
                    onShowDuplicate={showDuplicate}
                    dragProps={
                      reorderable && state.editing !== row.key
                        ? session.draggableProps(row.key, {
                            keys: dragKeys(state.selection, row.key),
                            leadKey: row.key,
                          })
                        : null
                    }
                    dropProps={session.dropTargetProps(row.key)}
                    dragging={session.activeId === row.key || (session.activeData?.keys.includes(row.key) ?? false)}
                  />
                ))}
              </ul>

              {reorderable ? (
                <div
                  {...session.dropTargetProps(END_TARGET)}
                  className={`m-2 rounded-card border border-dashed transition-colors duration-fast ease-standard ${
                    session.isDragging
                      ? 'border-border-strong p-3 text-center text-micro text-text-faint'
                      : 'border-transparent p-0'
                  }`}
                >
                  {session.isDragging ? 'Drop here to move it to the end' : null}
                </div>
              ) : null}
            </>
          )}
        </PageBody>

        <ActionBar
          count={state.selection.length}
          noun={{ one: 'FAQ', many: 'FAQs' }}
          actions={barActions}
          onClear={() => dispatch({ type: 'selectionCleared' })}
        />
      </div>

      <FaqSaveBar
        dirty={draft.dirty}
        saving={state.saving}
        error={state.error}
        conflict={state.conflict !== null}
        blocked={blankQuestions(state).length}
        canSave={canSaveDraft(state)}
        onSave={() => void draft.save().catch(() => undefined)}
        onDiscard={draft.discard}
        onUseTheirs={() => dispatch({ type: 'useTheirs' })}
        onKeepMine={() => dispatch({ type: 'keepMine' })}
        canEdit={canEdit}
      />

      <DragLayer session={session}>
        {(payload) => (
          <FaqGhost
            question={labelOf(state.rows.find((row) => row.key === payload.leadKey))}
            count={payload.keys.length}
          />
        )}
      </DragLayer>

      {/* Rendered unconditionally: it returns null unless `?import=faq` is set,
          which is what makes a cold deep link into the wizard work. */}
      <ImportWizard target="faq" params={params} onParams={onParams} band={band} canEdit={canEditHere} />

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
