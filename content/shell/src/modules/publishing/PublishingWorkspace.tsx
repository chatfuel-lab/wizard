import { useCallback, useState, type RefObject } from 'react';
import { Alert, Button, EmptyState, IconInstagram, ShortcutsDialog, Spinner, navigateExternal, useBand } from '~ui';
import { InstagramConnectUrlDocument, InstagramPermissionGroupName } from '~api/generated/publishing/graphql';
import { usePublishing } from './PublishingContext';
import { usePostsQueue } from './PublishingQueueContext';
import { useAccount } from './hooks/useAccount';
import { usePublishingCommands } from './hooks/usePublishingCommands';
import { usePublishingUrl } from './hooks/usePublishingUrl';
import { DEFAULT_VIEW, NEW_POST, type PublishingView } from './lib/publishingParams';
import { errorMessage } from './lib/errors';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';
import type { PublishingViewProps } from './views/types';
import { CalendarView } from './views/CalendarView';
import { QueueView } from './views/QueueView';
import { LibraryView } from './views/LibraryView';
import { ComposerModal } from './components/composer/ComposerModal';
import { PublishingCommandPalette } from './components/PublishingCommandPalette';
import { PublishingHeader } from './components/PublishingHeader';

const VIEW_COMPONENTS: Record<PublishingView, (props: PublishingViewProps) => React.ReactElement> = {
  calendar: CalendarView,
  queue: QueueView,
  library: LibraryView,
};

export interface PublishingWorkspaceProps {
  view: string;
  setView: (view: string, params?: URLSearchParams, options?: { replace?: boolean }) => void;
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
  /** The module root: what every shortcut in here is scoped against. */
  rootRef: RefObject<HTMLElement | null>;
}

/**
 * Everything the three views share: the address, the band, the account gate and
 * the composer.
 *
 * The account gate is answered HERE and not per view, because all three views
 * are the same nothing when there is no account, and because the answer decides
 * whether a compose button exists at all. A composer that opens onto an account
 * that may not publish is a form that fails on submit.
 *
 * The keyboard is here too, for the keys that mean the same thing on all three.
 * The calendar's own period keys are the calendar's, and the composer's are the
 * composer's — see `lib/shortcuts.ts` for why each set lives where it does.
 */
export function PublishingWorkspace({ view, setView, params, setParams, rootRef }: PublishingWorkspaceProps) {
  const { client, botId } = usePublishing();
  const band = useBand();
  const [refreshToken, setRefreshToken] = useState(0);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const { address, patch, onCompose, closeCompose } = usePublishingUrl({ view, setView, params, setParams });
  /* The one `useAccount` in the module. The hook has no cache, so a second
     mount anywhere would be a second query — and only one of the two would hear
     the header's refresh. Everything below reads this answer instead. */
  const { gate, reload } = useAccount(client, botId, refreshToken);
  const queue = usePostsQueue();

  /**
   * Send somebody to Instagram to grant what is missing. `Full` is the only
   * group that carries the publish permission, so both the first connect and a
   * re-grant ask for the same one.
   */
  const connect = useCallback(() => {
    setConnecting(null);
    client
      .mutate(InstagramConnectUrlDocument, { permGroup: InstagramPermissionGroupName.Full, state: null })
      .then((data) => {
        /* The address is the platform's, and this leaves in the SAME tab —
           OAuth brings the person back by redirect. So the scheme is checked
           before we go: `href` gets that check from react-dom and a bare
           navigation gets none, and `javascript:` here would run in this
           origin, where the session is. A refusal is the deployment's
           problem and not something a retry mends, so it is said out loud. */
        if (!navigateExternal(data.instagramOAuthMakeUrl)) {
          setConnecting('Instagram sent back an address this app will not open. Ask support to check the connection.');
        }
      })
      .catch((err: unknown) => setConnecting(errorMessage(err)));
  }, [client]);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
    reload();
    queue.refresh();
  }, [reload, queue]);

  const commands = usePublishingCommands({
    rootRef,
    address,
    band,
    accountReady: gate.state === 'ready',
    patch,
    onCompose,
    refresh,
  });

  const View = VIEW_COMPONENTS[address.view] ?? VIEW_COMPONENTS[DEFAULT_VIEW];

  return (
    <>
      <PublishingHeader
        view={address.view}
        onViewChange={(next) => patch({ view: next })}
        band={band}
        busy={busy}
        onRefresh={refresh}
        canCompose={gate.state === 'ready'}
        onCompose={() => onCompose(NEW_POST)}
        onOpenPalette={() => commands.setPaletteOpen(true)}
      />
      {gate.state === 'loading' ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : gate.state === 'error' ? (
        <div className="p-gutter">
          <Alert
            tone="danger"
            title="Instagram could not be read"
            action={
              <Button size="sm" onClick={refresh}>
                Try again
              </Button>
            }
          >
            {gate.message}
          </Alert>
        </div>
      ) : gate.state === 'absent' ? (
        <EmptyState
          icon={<IconInstagram />}
          title="No Instagram account is connected"
          action={
            <Button variant="primary" onClick={connect}>
              Connect Instagram
            </Button>
          }
        />
      ) : gate.state === 'unpermitted' ? (
        <EmptyState
          icon={<IconInstagram />}
          title={`@${gate.account.username} cannot publish`}
          action={
            <Button variant="primary" onClick={connect}>
              Grant publishing
            </Button>
          }
        />
      ) : (
        <View
          band={band}
          address={address}
          patch={patch}
          onCompose={onCompose}
          onBusy={setBusy}
          refreshToken={refreshToken}
          rootRef={rootRef}
          account={gate.account}
        />
      )}
      {/* Over whichever view is open, and reached by the address alone — a
          composer is a place, so a link to one opens it. */}
      {gate.state === 'ready' ? (
        <ComposerModal
          target={address.compose}
          at={address.at}
          from={address.from}
          account={gate.account}
          onClose={closeCompose}
        />
      ) : null}
      {connecting ? (
        <div className="p-gutter">
          <Alert tone="danger" title="Instagram could not be reached">
            {connecting}
          </Alert>
        </div>
      ) : null}
      {/* Both are portalled, so whichever is open holds the focus — and every
          binding in this module is scoped to the root, which is how the bare
          letters stand down while somebody is typing into the palette. */}
      <PublishingCommandPalette
        open={commands.paletteOpen}
        onClose={() => commands.setPaletteOpen(false)}
        context={commands.commandContext}
        handlers={commands.commandHandlers}
      />
      {/* Rendered straight from `lib/shortcuts.ts`, so the sheet cannot drift
          from the handlers — `shortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={commands.shortcutsOpen}
        onClose={() => commands.setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
    </>
  );
}
