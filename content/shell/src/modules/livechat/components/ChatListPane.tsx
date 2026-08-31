import type { Dispatch, SetStateAction } from 'react';
import { Button, EmptyState, IconInbox, IconSearch, Spinner } from '~ui';
import type { ChatListState } from '../hooks/useChatListStore';
import { clearInboxFilter, describeInboxFilter, isInboxFilterEmpty, type InboxFilter } from '../lib/inboxFilter';
import { ChatListFilterBar } from './ChatListFilterBar';
import { ChatListRows } from './ChatListRows';

export interface ChatListPaneProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: InboxFilter;
  onFilterChange: Dispatch<SetStateAction<InboxFilter>>;
  /**
   * The wire filter the list was asked with. Its identity is what tells the
   * rows the question changed — see `ChatListBody`.
   */
  resetToken: unknown;
  list: ChatListState;
  /** What the filter matches server-side, or null while that is unknown. */
  count: number | null;
}

/**
 * The pane paints its OWN background rather than inheriting it from a wrapper.
 * SplitPane's `<aside>` supplies the width and the border, but below the
 * collapse band there is no `<aside>` at all — a background left on the parent
 * would disappear at exactly the width where this list is the entire screen.
 */
export function ChatListPane(props: ChatListPaneProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-raised">
      <ChatListBody {...props} />
    </div>
  );
}

/**
 * The filter bar, the list, and the count of what the filter matches.
 *
 * The filter and the list are OWNED ABOVE this pane, by `LivechatApp`. They
 * lived here until `j`/`k` needed the order of the rows and a
 * lifecycle answer from the thread needed to land on one of them — both from
 * outside this pane, and both from things (a window keydown, a mutation's
 * response) that have no way to reach into a sibling's state. Lifting the hook
 * one level was cheaper and more honest than a bus.
 *
 * **Search is server-side.** `ChatListFilter.textInputFilter` narrows the query
 * and the subscription; `~ui`'s `filterItems` narrows an array in memory. For a
 * list that pages, those are not two implementations of one feature, they are
 * two different features, and only one of them is this one:
 *
 * - the list holds a page. A client-side matcher can only search what has been
 *   loaded, so a contact on page four is unfindable and the list says "no
 *   results" — which is a lie, and the worst possible one for a support inbox;
 * - the count beside the filters comes from the server for the same filter. A
 *   client-side matcher would leave it counting the unsearched set;
 * - the subscription carries the same `textInputFilter`, so a contact who
 *   writes in and matches what is being searched for appears live. Filtering on
 *   render instead would leave the live channel delivering the unsearched set
 *   into a list that then silently disagrees with its own count.
 *
 * The shared matcher is still what runs, just on the other half of the problem:
 * `nameHighlight` uses `matchRanges` to mark WHY a row matched. There is no
 * second matcher in this module.
 *
 * The filter object's identity is load-bearing. `useChatListStore` keys its query,
 * its subscription and its stale-response epoch on it, so `toChatListFilter` is
 * memoised on a filter whose transitions return the same object when nothing
 * changed. Without both halves, every render would look like a new question and
 * the WebSocket would be torn down and re-established forever.
 */
function ChatListBody({ selectedId, onSelect, filter, onFilterChange, resetToken, list, count }: ChatListPaneProps) {
  const { chats, loading, error, hasMore, loadingMore, loadMore } = list;
  const filtered = !isInboxFilterEmpty(filter);

  return (
    <>
      {/* Outside every branch below, deliberately. A filter bar that disappears
          when the filter matched nothing leaves the reader looking at an empty
          inbox with no way to undo the thing that emptied it. */}
      <ChatListFilterBar filter={filter} onChange={onFilterChange} count={count} />
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        /* EmptyState fills its parent with `h-full`, so it needs a flex child
           of its own to fill — measured against the pane it would be a
           toolbar's height too tall and clip at the bottom. */
        <div className="min-h-0 flex-1">
          <EmptyState icon={<IconInbox />} title="Could not load chats" description={error} />
        </div>
      ) : chats.length === 0 ? (
        <div className="min-h-0 flex-1">
          {filtered ? (
            <EmptyState
              icon={<IconSearch />}
              title="No conversations match"
              /* Naming the filter is the difference between "your product is
                 empty" and "you asked a narrow question". */
              description={describeInboxFilter(filter)}
              action={
                <Button variant="secondary" size="sm" onClick={() => onFilterChange(clearInboxFilter)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconInbox />}
              title="No conversations yet"
              description="When contacts write to your bot, their chats appear here."
            />
          )}
        </div>
      ) : (
        <ChatListRows
          chats={chats}
          selectedId={selectedId}
          onSelect={onSelect}
          query={filter.q}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          resetToken={resetToken}
        />
      )}
    </>
  );
}
