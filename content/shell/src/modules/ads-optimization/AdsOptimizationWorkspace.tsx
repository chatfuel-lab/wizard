import { useCallback, useMemo, useState, type RefObject } from 'react';
import { Alert, Button, PageBody, ShortcutsDialog, Skeleton, SplitPane, useToast } from '~ui';
import type { ModuleAppProps } from '../types';
import { useCatalog } from './AdsCatalogContext';
import { useEventSets } from './AdsStoreContext';
import { useAdsUndo } from './AdsUndoContext';
import { AdsBlock } from './components/AdsBlock';
import { AdsCommandPalette } from './components/AdsCommandPalette';
import { AdsHeader } from './components/AdsHeader';
import { DeleteSetDialog } from './components/DeleteSetDialog';
import { DeliveryAlert } from './components/DeliveryAlert';
import { EventDialog } from './components/EventDialog';
import { EventsBlock } from './components/EventsBlock';
import { NewSetDialog } from './components/NewSetDialog';
import { SetHeader } from './components/SetHeader';
import { SetRail } from './components/SetRail';
import { useAdsCommands } from './hooks/useAdsCommands';
import { useAdsUrl } from './hooks/useAdsUrl';
import { useUndoToast } from './hooks/useUndoToast';
import { NEW_EVENT } from './lib/adsParams';
import { buildCoverage } from './lib/coverage';
import { draftToInput, emptyDraft } from './lib/eventDraft';
import { reorder, toEventInputs } from './lib/eventInput';
import type { TriggerId } from './lib/eventKinds';
import { MAX_EVENTS, MAX_SETS } from './lib/eventRules';
import { errorMessage, isEditLock } from './lib/errors';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';
import type { ConversionEvent, EventSetView } from './types';

type WorkspaceProps = Pick<ModuleAppProps, 'view' | 'setView' | 'params' | 'setParams'> & {
  rootRef: RefObject<HTMLElement | null>;
};

/**
 * The whole surface: the sets on the left, the selected one beside them.
 *
 * The address and the keyboard live in `useAdsUrl` / `useAdsCommands`; the
 * data comes from the contexts. Every write goes through one `run` helper so
 * that the edit lock, the toast and the busy flag are handled once rather
 * than in eight places.
 */
export function AdsOptimizationWorkspace({ view, setView, params, setParams, rootRef }: WorkspaceProps) {
  const store = useEventSets();
  const catalog = useCatalog();
  const undo = useAdsUndo();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [newSetName, setNewSetName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EventSetView | null>(null);

  const { sets, active, events, showing, setShowing, draft, setDraft, selectSet, openEvent } = useAdsUrl({
    view,
    setView,
    params,
    setParams,
  });

  const coverage = useMemo(() => buildCoverage(sets), [sets]);

  useUndoToast();

  /**
   * One write, with the busy flag and the failure toast around it.
   *
   * It answers whether the write landed rather than rethrowing: every caller
   * here fires it from an event handler, and a rejected promise nobody awaits
   * is an unhandled rejection in the console and a dialog that closes over work
   * that was never saved.
   */
  const run = useCallback(
    async (work: () => Promise<void>, failure: string): Promise<boolean> => {
      setBusy(true);
      try {
        await work();
        return true;
      } catch (err) {
        toast.show({
          tone: 'danger',
          title: failure,
          description: errorMessage(err),
          /* The edit lock clears on its own, so it is worth another try; every
             other failure needs the value changed first. */
          duration: isEditLock(err) ? undefined : 0,
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  /* Every write sends the whole list, so an event this build cannot rebuild
     would be deleted by saving. Refuse instead. */
  const refuseUnsupported = useCallback(() => {
    toast.show({
      tone: 'danger',
      title: 'These events cannot be saved from here',
      description: 'One of them is of a kind this app does not know yet, and saving would drop it.',
      duration: 0,
    });
  }, [toast]);

  const writeEvents = useCallback(
    async (setId: string, next: readonly ConversionEvent[], failure: string): Promise<boolean> => {
      const { inputs, unsupported } = toEventInputs(next);
      if (unsupported.length > 0) {
        refuseUnsupported();
        return false;
      }
      return run(() => store.setEvents(setId, inputs), failure);
    },
    [run, store, refuseUnsupported],
  );

  const saveDraft = useCallback(async () => {
    if (!active || !draft) return;
    const input = draftToInput(draft);
    if (!input) return;
    const { inputs, unsupported } = toEventInputs(events);
    if (unsupported.length > 0) {
      refuseUnsupported();
      return;
    }
    const index = draft.id ? events.findIndex((event) => event.id === draft.id) : -1;
    const next = index >= 0 ? inputs.map((entry, at) => (at === index ? input : entry)) : [...inputs, input];
    const saved = await run(() => store.setEvents(active.id, next), 'The event was not saved');
    if (!saved) return;
    /* A name invented here has to reach the picker before the next event is
       added, and the server is the only place that knows the full list. */
    if (draft.name?.kind === 'custom') catalog.reloadNames();
    openEvent(null);
  }, [active, draft, events, run, store, catalog, openEvent, refuseUnsupported]);

  const deleteEvent = useCallback(
    async (event: ConversionEvent) => {
      if (!active) return;
      const before = events;
      const deleted = await writeEvents(
        active.id,
        events.filter((candidate) => candidate.id !== event.id),
        'The event was not deleted',
      );
      if (!deleted) return;
      openEvent(null);
      undo.push('Event deleted', async () => {
        await writeEvents(active.id, before, 'The event was not restored');
      });
    },
    [active, events, writeEvents, openEvent, undo],
  );

  const moveEvent = useCallback(
    (from: number, to: number) => {
      if (!active) return;
      void writeEvents(active.id, reorder(events, from, to), 'The order was not saved');
    },
    [active, events, writeEvents],
  );

  const createSet = useCallback(
    async (name: string) => {
      let createdId: string | null = null;
      const ok = await run(async () => {
        createdId = (await store.create(name)).id;
      }, 'The set was not created');
      if (!ok || !createdId) return;
      setNewSetName(null);
      setView(createdId);
    },
    [run, store, setView],
  );

  const removeSet = useCallback(
    async (set: EventSetView) => {
      const removed = await run(() => store.remove(set.id), 'The set was not deleted');
      if (removed) setDeleting(null);
    },
    [run, store],
  );

  const addEvent = useCallback(
    (trigger?: TriggerId) => {
      if (!active || events.length >= MAX_EVENTS) return;
      setDraft({ ...emptyDraft(), trigger: trigger ?? null });
      openEvent(NEW_EVENT);
    },
    [active, events.length, setDraft, openEvent],
  );

  const step = useCallback(
    (delta: number) => {
      if (!active) return;
      const at = sets.findIndex((set) => set.id === active.id);
      const next = sets[at + delta];
      /* Through `selectSet`, so stepping leaves no `?e=` behind: an event id
         from the set just left names nothing in the one being opened. */
      if (next) selectSet(next.id);
    },
    [active, sets, selectSet],
  );

  const newSet = useCallback(() => setNewSetName(''), []);

  /* The base set is never one of the 30, so the ceiling counts the rest. */
  const customCount = sets.filter((set) => !set.isBase).length;
  const canCreateSet = customCount < MAX_SETS;

  const { paletteOpen, setPaletteOpen, helpOpen, setHelpOpen, commandContext, commandHandlers } = useAdsCommands({
    rootRef,
    sets,
    active,
    events,
    canCreateSet,
    selectSet,
    addEvent,
    step,
    newSet,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AdsHeader
        set={active}
        loading={store.loading}
        canCreateSet={canCreateSet}
        onCreate={newSet}
        onRefresh={store.reload}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenShortcuts={() => setHelpOpen(true)}
      />

      <SplitPane
        side={<SetRail sets={sets} activeId={active?.id ?? null} loading={store.loading} onSelect={selectSet} />}
        sideLabel="Event sets"
        sideWidth="sidenav"
        collapseBelow="wide"
        showing={showing}
        onShowingChange={setShowing}
      >
        <PageBody measure="form">
          <div className="flex flex-col gap-4">
            <DeliveryAlert state={catalog.delivery} />
            {store.error ? (
              <Alert
                tone="danger"
                title="The event sets could not be loaded"
                action={
                  <Button variant="secondary" size="sm" onClick={store.reload}>
                    Try again
                  </Button>
                }
              >
                {store.error}
              </Alert>
            ) : null}

            {!active ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                <SetHeader
                  set={active}
                  busy={busy}
                  onRename={(name) => void run(() => store.rename(active.id, name), 'The name was not saved')}
                  onToggle={(enabled) =>
                    void run(() => store.setEnabled(active.id, enabled), 'That could not be changed')
                  }
                  onDelete={() => setDeleting(active)}
                />

                {active.ads ? (
                  <AdsBlock
                    set={active}
                    sets={sets}
                    coverage={coverage}
                    busy={busy}
                    onSave={(adIDs) => void run(() => store.setAds(active.id, adIDs), 'The ads were not saved')}
                    onRevert={(parentId) =>
                      void run(() => store.inheritAds(active.id, parentId), 'That could not be changed')
                    }
                    onOpenSet={selectSet}
                  />
                ) : null}

                <EventsBlock
                  set={active}
                  busy={busy}
                  onAdd={() => addEvent()}
                  onEdit={openEvent}
                  onDelete={(event) => void deleteEvent(event)}
                  onReorder={moveEvent}
                  onRevert={(parentId) =>
                    void run(() => store.inheritEvents(active.id, parentId), 'That could not be changed')
                  }
                  onOpenSet={selectSet}
                />
              </>
            )}
          </div>
        </PageBody>
      </SplitPane>

      {draft ? (
        <EventDialog
          open
          draft={draft}
          onDraft={setDraft}
          siblings={events}
          busy={busy}
          onSave={() => void saveDraft()}
          onDelete={
            draft.id
              ? () => {
                  const event = events.find((candidate) => candidate.id === draft.id);
                  if (event) void deleteEvent(event);
                }
              : null
          }
          onClose={() => openEvent(null)}
        />
      ) : null}

      <NewSetDialog name={newSetName} onName={setNewSetName} busy={busy} onCreate={(name) => void createSet(name)} />

      <DeleteSetDialog
        set={deleting}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onDelete={(set) => void removeSet(set)}
      />

      <AdsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      {/* Rendered straight from `lib/shortcuts.ts`, so the sheet cannot drift
          from the handlers — `shortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </div>
  );
}
