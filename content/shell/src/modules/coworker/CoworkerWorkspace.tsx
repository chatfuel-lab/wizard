import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, EmptyState, IconPlus, IconAssistant, Kbd, PageHeader, ShortcutsDialog, SplitPane } from '~ui';
import { useCoworker } from './CoworkerContext';
import { useCoworkerChrome } from './hooks/useCoworkerChrome';
import { useMyRole } from './hooks/useMyRole';
import { CoworkerCommandPalette } from './components/CoworkerCommandPalette';
import { CoworkerComposer } from './components/composer/CoworkerComposer';
import { ThreadEmpty } from './components/thread/ThreadEmpty';
import { ConversationRail } from './components/rail/ConversationRail';
import { RenameDialog } from './components/rail/RenameDialog';
import { ThreadPane } from './components/ThreadPane';
import { parseCoworkerParams, writeCoworkerParams } from './lib/params';
import { SHORTCUT_ROWS, SHORTCUT_SECTIONS } from './lib/shortcuts';

export interface CoworkerWorkspaceProps {
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
}

/**
 * The page: the rail beside the thread — or beside an empty one, which is what an
 * empty conversation is.
 *
 * The open conversation is derived from `params` on every render, never seeded
 * into state at mount. The assistant can move this app itself — a `navigate`
 * frontend action writes the address — and a surface that read its params once
 * would ignore that and quietly show the wrong thread.
 *
 * **No `?c=` means an empty thread, not "pick something".** That is the same screen a
 * fresh account lands on and the one "New chat" goes back to: one question and
 * the box, ready to type into (see `ThreadEmpty`). A "Pick a conversation"
 * placeholder was the old answer and it asked the operator to do the work of
 * finding something to say.
 */
export function CoworkerWorkspace({ params, setParams }: CoworkerWorkspaceProps) {
  const { runtime } = useCoworker();
  const role = useMyRole();

  /* The module root is `ModuleRoot`'s, one component up, and `CoworkerApp` is
     providers-only and does not forward its ref. So the keyboard and the two
     DOM lookups (the search box, the message box) scope to this element, which
     is the whole page below the providers — the same thing, one div deeper. */
  const rootRef = useRef<HTMLDivElement>(null);

  const query = params.toString();
  const parsed = useMemo(() => parseCoworkerParams(new URLSearchParams(query)), [query]);
  const selectedId = parsed.conversationId;

  /* Which pane is showing while the panes are stacked. Real state, NOT
     `selectedId ? 'detail' : 'side'`: that expression makes the back control
     useless — it sets 'side' while selectedId is still set, and the next render
     derives 'detail' again and throws the reader straight back into the thread.
     Seeded from the selection AT MOUNT so a ?c=<id> deep link opens the thread
     at every width, 360px included. */
  const [showing, setShowing] = useState<'side' | 'detail'>(() => (selectedId ? 'detail' : 'side'));

  const select = useCallback(
    (conversationId: string | null) => {
      setParams(writeCoworkerParams(params, { conversationId }));
      /* An empty thread is the detail pane too, so it is worth
         switching to below the collapse band — "New chat" that left the reader
         staring at the rail would have done nothing they can see. */
      setShowing('detail');
    },
    [params, setParams],
  );

  const chrome = useCoworkerChrome({
    conversationId: selectedId,
    onSelect: select,
    rootRef,
  });

  /* The runtime decides whether to act on a navigation the assistant sends, and
     "is the operator actually looking at that conversation" is the question it
     cannot answer on its own. */
  useEffect(() => {
    runtime.setVisibleConversation(selectedId);
    return () => runtime.setVisibleConversation(null);
  }, [runtime, selectedId]);

  if (!role.loading && !role.canUse) {
    return (
      <EmptyState
        icon={<IconAssistant />}
        title="No access to the Coworker"
        description="You need the Bot: View permission to chat with the assistant."
      />
    );
  }

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      {/* The module names itself — as an embed there is no shell chrome above
          this line, and in the shell the nav rail is a drawer on a phone.

          "New chat" rides up here from the rail's own header row. The row of
          height this header costs is paid back exactly, so the list starts
          where it always did, and the action survives the stacked layout:
          below the collapse band the rail is not on screen while you are
          reading a thread, and the only way to start a second chat used to be
          to go back first. */}
      <PageHeader
        title="Coworker"
        actions={
          <>
            <button
              type="button"
              onClick={() => chrome.setPaletteOpen(true)}
              aria-label="Open the command palette"
              className="hidden items-center gap-1.5 rounded-control border border-border px-2 py-1 text-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring @compact:inline-flex"
            >
              Commands
              <Kbd keys={['mod', 'k']} />
            </button>
            <Button size="sm" variant="ghost" onClick={chrome.newChat}>
              <IconPlus size={14} />
              New chat
            </Button>
          </>
        }
      />
      <SplitPane
        side={
          <ConversationRail
            rows={chrome.rows}
            groups={chrome.groups}
            query={chrome.query}
            onQueryChange={chrome.setQuery}
            loading={chrome.list.loading}
            error={chrome.list.error}
            selectedId={selectedId}
            onSelect={select}
            onNewChat={chrome.newChat}
            onRename={chrome.startRename}
            onPin={chrome.list.setPinned}
            hasMore={chrome.list.hasMore}
            loadMore={chrome.list.loadMore}
          />
        }
        sideWidth="list"
        sideLabel="Chats"
        collapseBelow="wide"
        showing={showing}
        onShowingChange={setShowing}
      >
        {selectedId === null ? (
          <ThreadEmpty
            composer={
              <CoworkerComposer
                conversationId={null}
                onSendText={(text) => chrome.send(text, 'typed')}
                busy={false}
                onStop={() => {}}
                ensureConversation={chrome.ensureConversation}
              />
            }
          />
        ) : (
          <ThreadPane conversationId={selectedId} ensureConversation={chrome.ensureConversation} />
        )}
      </SplitPane>

      <CoworkerCommandPalette
        open={chrome.paletteOpen}
        onClose={() => chrome.setPaletteOpen(false)}
        context={chrome.commandContext}
        handlers={chrome.commandHandlers}
      />
      {/* Rendered straight from `lib/shortcuts.ts`, so the sheet cannot drift
          from the handlers — `shortcuts.test.ts` pins the two sides. */}
      <ShortcutsDialog
        open={chrome.shortcutsOpen}
        onClose={() => chrome.setShortcutsOpen(false)}
        sections={SHORTCUT_SECTIONS}
        rows={SHORTCUT_ROWS}
      />
      <RenameDialog
        open={chrome.renaming !== null}
        currentTitle={chrome.renaming?.currentTitle ?? ''}
        operatorTitle={chrome.renaming?.operatorTitle ?? null}
        onClose={chrome.closeRename}
        onSubmit={chrome.setTitle}
      />
    </div>
  );
}
