import { useEffect, useRef } from 'react';
import { Button, EmptyState, IconSearch, IconAssistant, Input, Spinner } from '~ui';
import type { RailGroup, RailRow } from '../../lib/chatListStore';
import { ConversationRow } from './ConversationRow';

export interface ConversationRailProps {
  /** In display order, already searched. What `j`/`k` walks. */
  rows: readonly RailRow[];
  /** Date headings, or null while a search is running — see below. */
  groups: readonly RailGroup[] | null;
  query: string;
  onQueryChange: (query: string) => void;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onRename: (conversationId: string) => void;
  onPin: (conversationId: string, pinned: boolean) => void;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * The rail: a search box, date headings, and the rows.
 *
 * Presentational, and deliberately so. The query, the ranking and the grouping
 * are all owned by the surface above, because `j`/`k` needs the order of the
 * rows and the ⌘K palette needs the list of them — both from outside this
 * component, and both from things (a window keydown, a palette item) that have
 * no way to reach into a sibling's state. That is livechat's lesson, and it
 * applies here for the same reason.
 *
 * **Headings disappear while searching.** Today / Yesterday / Earlier is a way
 * of reading a list in recency order; a ranked list of hits is not in recency
 * order, so the headings would be lying about what they group. The rows say
 * "pinned" for themselves in that mode instead.
 */
export function ConversationRail({
  rows,
  groups,
  query,
  onQueryChange,
  loading,
  error,
  selectedId,
  onSelect,
  onNewChat,
  onRename,
  onPin,
  hasMore,
  loadMore,
}: ConversationRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* Keep the selection on screen when something other than a click moved it —
     `j`/`k`, the palette, a deep link. `block: 'nearest'` so a row that is
     already visible is not scrolled to the top of the pane under the reader. */
  useEffect(() => {
    if (selectedId === null) return;
    const row = scrollerRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const searching = query.trim() !== '';

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised">
      {/* Outside every branch below, deliberately: a search box that disappears
          when the search matched nothing leaves the reader looking at an empty
          rail with no way to undo the thing that emptied it. */}
      <div className="shrink-0 p-2">
        <div className="relative">
          <IconSearch
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <Input
            type="search"
            aria-label="Search your chats"
            placeholder="Search chats…"
            className="pl-8"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            /* The `/` shortcut and the palette's "Search your chats" reach this
               box through the DOM rather than a ref threaded down two surfaces.
               The attribute is the contract. */
            data-coworker-search
          />
        </div>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : error && rows.length === 0 ? (
          /* A failed first load is an empty state, not a toast: there is
             nothing behind it to go back to, and a toast about it is gone by
             the time anybody reads the blank pane. */
          <EmptyState
            icon={<IconAssistant />}
            title="Could not load your chats"
            description={error}
            action={
              <Button variant="secondary" size="sm" onClick={onNewChat}>
                Start one anyway
              </Button>
            }
          />
        ) : rows.length === 0 && searching ? (
          <EmptyState
            icon={<IconSearch />}
            title="No chat matches"
            /* The search only sees loaded chats — the API has no server-side
               search for these conversations — so the way out of an empty
               result is loading more of them, and the action offers exactly
               that. */
            action={
              hasMore ? (
                <Button variant="secondary" size="sm" onClick={loadMore}>
                  Load more chats
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => onQueryChange('')}>
                  Clear search
                </Button>
              )
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconAssistant />}
            title="No chats yet"
            description="Ask the Coworker a question, or pick one of its suggestions."
            action={
              <Button variant="secondary" size="sm" onClick={onNewChat}>
                New chat
              </Button>
            }
          />
        ) : groups === null ? (
          <ul>
            {rows.map((row) => (
              <Row
                key={row.state.id}
                row={row}
                selectedId={selectedId}
                onSelect={onSelect}
                onRename={onRename}
                onPin={onPin}
                showPinned
              />
            ))}
          </ul>
        ) : (
          groups.map((group) => (
            <section key={group.id}>
              <h3 className="sticky top-0 z-sticky bg-surface-raised px-3 pb-1 pt-3 text-micro font-medium uppercase tracking-wide text-text-faint">
                {group.label}
              </h3>
              <ul>
                {group.rows.map((row) => (
                  <Row
                    key={row.state.id}
                    row={row}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onRename={onRename}
                    onPin={onPin}
                  />
                ))}
              </ul>
            </section>
          ))
        )}

        {rows.length > 0 && hasMore ? (
          <div className="flex justify-center p-2">
            <Button variant="ghost" size="sm" onClick={loadMore}>
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  row,
  selectedId,
  onSelect,
  onRename,
  onPin,
  showPinned = false,
}: {
  row: RailRow;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  showPinned?: boolean;
}) {
  return (
    <ConversationRow
      row={row}
      selected={row.state.id === selectedId}
      onSelect={() => onSelect(row.state.id)}
      onRename={() => onRename(row.state.id)}
      onPin={(pinned) => onPin(row.state.id, pinned)}
      showPinned={showPinned}
    />
  );
}
