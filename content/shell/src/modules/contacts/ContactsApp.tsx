import { type ReactNode, useCallback, useMemo, useRef, useState, type ComponentType, type RefObject } from 'react';
import { ModuleRoot, ShortcutsDialog, ToastProvider, useBand, useToast, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { ContactsContext } from './ContactsContext';
import { ContactsUndoContext, type UndoEntry } from './ContactsUndoContext';
import { ContactsViewsContext, type ContactsViewsValue } from './ContactsViewsContext';
import { ContactsCommandPalette } from './components/ContactsCommandPalette';
import { ContactsHeader } from './components/ContactsHeader';
import { useAttributeCatalog } from './hooks/useAttributeCatalog';
import { useContactsCommands } from './hooks/useContactsCommands';
import { useContactsTeam } from './hooks/useContactsTeam';
import { useContactsUrl } from './hooks/useContactsUrl';
import { useMyRole } from './hooks/useMyRole';
import { useSavedViews } from './hooks/useSavedViews';
import { useUndoToast } from './hooks/useUndoToast';
import type { ContactsView } from './lib/contactsParams';
import { DEFAULT_STARTER_FIELDS, findMatchingView, type StarterFieldNames } from './lib/savedViews';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';
import { AudienceView } from './views/AudienceView';
import { FieldsView } from './views/FieldsView';
import { ListView } from './views/ListView';
import { RecordPage } from './components/record/RecordPage';
import type { ContactsViewProps } from './views/types';

const VIEWS: Record<ContactsView, ComponentType<ContactsViewProps>> = {
  list: ListView,
  fields: FieldsView,
  audience: AudienceView,
};

/**
 * The module root: providers, the container, and nothing else.
 *
 * The split below is not stylistic. A component that renders a context provider
 * cannot also consume it — the hook runs while the provider is still only a
 * return value — and `tsc` cannot see that. `ModuleRoot` is the same rule once
 * more: it publishes the band it measures, so `useBand()` has to be called in a
 * child, and `ToastProvider` likewise. Validator pass 10b is what catches a
 * regression here; the split is what prevents one.
 */
export function ContactsApp({ botId, client, params, view, setView, navigate }: ModuleAppProps) {
  const value = useMemo(() => ({ client, botId }), [client, botId]);

  /* Created here because `ModuleRoot` is rendered here and forwards to the very
     element it observes. The workspace needs that handle for two things a band
     cannot answer: scoping `useHotkeys` to this module (so ⌘K inside a host
     app's own search box stays the host's) and finding the search input. */
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <ToastProvider>
      <ContactsContext.Provider value={value}>
        <ContactsUndoHost>
          {/* `relative` is load-bearing: the list's ActionBar is absolutely
              positioned and deliberately does not portal, so it needs a
              positioned ancestor that is the module rather than the page. */}
          <ModuleRoot ref={rootRef} className="relative">
            <ContactsWorkspace
              rootRef={rootRef}
              params={params}
              view={view}
              setLocation={setView}
              navigate={navigate}
            />
          </ModuleRoot>
        </ContactsUndoHost>
      </ContactsContext.Provider>
    </ToastProvider>
  );
}

/**
 * Where the one undo entry lives.
 *
 * It is its own component, below `ToastProvider`, for one reason: a
 * compensating mutation can fail, and the only place that can SAY so is a
 * component that can call `useToast`. Held in `ContactsApp` — above the
 * provider — a rejected undo resolved into nothing at all and the row simply
 * stayed where the user had just told it not to be.
 *
 * It renders the provider and therefore never consumes it (validator pass 10b);
 * `useToast` comes from a provider above, which is a different context.
 */
function ContactsUndoHost({ children }: { children: ReactNode }) {
  const toast = useToast();

  /* A rejected compensating call is reported here because the offer is already
     cleared — the toast is the one place left that can say so. */
  const reportUndoFailure = useCallback(
    (err: unknown) => {
      toast.show({
        tone: 'danger',
        title: 'Could not undo that',
        description: err instanceof Error ? err.message : 'The server refused the change back.',
      });
    },
    [toast],
  );

  const offer = useUndoOffer<UndoEntry>({ onError: reportUndoFailure });
  const { push: offerPush, run, clear } = offer;

  /* The module's entry folds label and run together; the shared offer keeps
     them apart, so the wrapper hands the entry's own runner over. */
  const push = useCallback((entry: UndoEntry | null) => offerPush(entry, () => entry?.run()), [offerPush]);

  const undoValue = useMemo(() => ({ entry: offer.entry, push, run, clear }), [offer.entry, push, run, clear]);

  return <ContactsUndoContext.Provider value={undoValue}>{children}</ContactsUndoContext.Provider>;
}

interface WorkspaceProps {
  rootRef: RefObject<HTMLDivElement | null>;
  params: URLSearchParams;
  /** The view segment of the address ('' at the module's root). */
  view: string;
  /** The shell's writer: view segment and params in one move. */
  setLocation: ModuleAppProps['setView'];
  navigate: ModuleAppProps['navigate'];
}

function ContactsWorkspace({ rootRef, params, view: viewSeg, setLocation, navigate }: WorkspaceProps) {
  const band = useBand();
  const role = useMyRole();
  const catalog = useAttributeCatalog();
  const { team } = useContactsTeam();

  /* What the list was showing, so the record page's ←/→ can step through it
     after the list has been unmounted. A view reports it; nothing else reads
     it. */
  const [order, setOrder] = useState<readonly string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [count, setCount] = useState<{ shown: number; server: number | null } | null>(null);
  const [busy, setBusy] = useState(false);

  /* The starter set filters on two system attributes by name, and an unknown
     name matches nobody in silence. The catalog is what turns "whatsapp phone"
     from a guess into the name this bot actually uses. */
  const starterFields = useMemo<StarterFieldNames>(
    () => ({
      phone: catalog.phoneNames[0] ?? DEFAULT_STARTER_FIELDS.phone,
      lastSeen: DEFAULT_STARTER_FIELDS.lastSeen,
    }),
    [catalog.phoneNames],
  );
  const saved = useSavedViews(starterFields);

  const {
    parsed,
    filter,
    write,
    setFilter,
    setView,
    goToList,
    openContact,
    closeContact,
    applySavedView,
    lastApplied,
  } = useContactsUrl({ params, viewSeg, setLocation, navigate, savedViews: saved.views });

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  const viewsValue = useMemo<ContactsViewsValue>(
    () => ({ ...saved, apply: applySavedView, lastApplied }),
    [saved, applySavedView, lastApplied],
  );

  useUndoToast();

  const appliedView = useMemo(() => findMatchingView(saved.views, filter), [saved.views, filter]);

  const { paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen, commandContext, commandHandlers } =
    useContactsCommands({
      rootRef,
      parsed,
      filter,
      write,
      setFilter,
      setView,
      closeContact,
      applySavedView,
      refresh,
      team,
      savedViews: saved.views,
      appliedView,
    });

  const View = VIEWS[parsed.view];

  const viewProps: ContactsViewProps = {
    filter,
    onFilterChange: setFilter,
    onOrderChange: setOrder,
    density: parsed.density,
    onDensityChange: (density) => write({ density }),
    band,
    canEdit: role.canEdit,
    team,
    catalog,
    onOpenContact: openContact,
    refreshToken,
    onCount: setCount,
    onBusy: setBusy,
    navigate,
    onGoToList: goToList,
  };

  return (
    <ContactsViewsContext.Provider value={viewsValue}>
      {parsed.contact ? (
        <RecordPage
          contactId={parsed.contact}
          tab={parsed.tab}
          onTabChange={(tab) => write({ tab })}
          onClose={closeContact}
          canEdit={role.canEdit}
          team={team}
          catalog={catalog}
          band={band}
          /* The order the list was showing when it handed the record over. It
             survives here because opening a record unmounts the list, and
             ←/→ has to keep meaning "the next one in what I was looking at". */
          order={order}
          onOpenContact={openContact}
          navigate={navigate}
        />
      ) : (
        <>
          <ContactsHeader
            count={count}
            busy={busy}
            view={parsed.view}
            onSelectView={setView}
            onOpenPalette={() => setPaletteOpen(true)}
            onRefresh={refresh}
          />
          <View {...viewProps} />
        </>
      )}

      <ContactsCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        context={commandContext}
        handlers={commandHandlers}
      />
      {/* Rendered straight from `lib/shortcuts.ts`, so the sheet cannot drift
          from the handlers — `shortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </ContactsViewsContext.Provider>
  );
}
