import { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  IconInstagram,
  IconPlus,
  IconRefresh,
  MediaGrid,
  PageBody,
  SegmentedControl,
  Toolbar,
  Tooltip,
  openExternal,
  useToast,
} from '~ui';
import { usePostsQueue } from '../PublishingQueueContext';
import { useLibrary } from '../hooks/useLibrary';
import { errorMessage } from '../lib/errors';
import { NEW_POST, type LibraryKind } from '../lib/publishingParams';
import { LIBRARY_KIND_LABEL, LIBRARY_KINDS, filterByKind, toTile } from '../lib/libraryItems';
import { selectPosts } from '../lib/postsStore';
import type { PublishingViewProps } from './types';

const ALL = 'all';

/**
 * Everything already on the account — posts, carousels, reels, stories and ads
 * together, newest first.
 *
 * This is the only surface here that reads from Instagram rather than from the
 * app's own queue, which is why it fetches for itself while the calendar and
 * the queue share a store.
 *
 * The refresh action is not a convenience. The platform serves only what it has
 * already pulled down, so an account somebody also posts to from their phone
 * goes stale on its own — and nothing this app publishes appears in the list
 * until a pull has run either.
 *
 * A tile does two things and they are deliberately different gestures. Clicking
 * it opens the post on Instagram; the button that appears in its corner starts
 * a new post from it, which is written into the address in one go — the
 * composer is opened and told what to seed from by the same navigation.
 *
 * The queue is read here for one thing only: the ids of what this app has
 * published. Publishing puts nothing into the account's list on its own, so
 * those ids are how the hook knows it is behind and pulls the media down.
 */
export function LibraryView({ address, patch, onBusy, refreshToken, account }: PublishingViewProps) {
  const queue = usePostsQueue();
  const publishedMediaIds = useMemo(
    () =>
      selectPosts(queue.state)
        .filter((post) => post.status === 'published' && post.mediaId)
        .map((post) => post.mediaId as string),
    [queue.state],
  );
  const library = useLibrary(refreshToken, publishedMediaIds, account);
  const toast = useToast();

  const tiles = useMemo(() => filterByKind(library.nodes, address.kind).map(toTile), [library.nodes, address.kind]);

  useEffect(
    () => onBusy(library.loading || library.loadingMore || library.refreshing),
    [onBusy, library.loading, library.loadingMore, library.refreshing],
  );

  const refresh = useCallback(() => {
    library.refreshFromInstagram().catch((err: unknown) => {
      toast.show({
        tone: 'danger',
        title: 'Instagram could not be reached',
        description: errorMessage(err),
      });
    });
  }, [library, toast]);

  const options = useMemo(
    () => [
      { value: ALL, label: 'All' },
      ...LIBRARY_KINDS.map((kind) => ({ value: kind, label: LIBRARY_KIND_LABEL[kind] })),
    ],
    [],
  );

  return (
    <>
      <Toolbar>
        {/* Scrolls rather than wraps in a narrow container: the pill this
            control slides is measured from the buttons, and a set of options
            that reflows onto two lines leaves it under the wrong one.

            `data-publishing-filter` is the contract the `/` shortcut reaches
            this view's filter through — one attribute rather than a prop every
            view would have to thread up to the workspace and back. */}
        <div className="min-w-0 flex-1 overflow-x-auto" data-publishing-filter>
          <SegmentedControl
            aria-label="Media kind"
            size="sm"
            value={address.kind ?? ALL}
            onChange={(next) => patch({ kind: next === ALL ? null : (next as LibraryKind) })}
            options={options}
          />
        </div>
        {/* `data-publishing-pull` is the contract the palette's own row reaches
            this button through — the media is fetched here, so this is the only
            place that can ask for it again. */}
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          disabled={!library.canRefresh || library.refreshing}
          data-publishing-pull
        >
          <IconRefresh />
          Refresh from Instagram
        </Button>
      </Toolbar>

      {library.error ? (
        <div className="px-gutter pt-3">
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={library.reload}>
                Retry
              </Button>
            }
          >
            {library.error}
          </Alert>
        </div>
      ) : null}

      <PageBody>
        <MediaGrid
          aria-label="Instagram media"
          items={tiles}
          loading={library.loading && tiles.length === 0}
          loadingMore={library.loadingMore}
          onEndReached={library.loadMore}
          /* A tile whose `url` is empty has nowhere to go; the platform does
             not always give one back. Unknown media is already inert. */
          onActivate={(tile) => {
            if (tile.url) openExternal(tile.url);
          }}
          actions={(tile) =>
            tile.unknown ? null : (
              <Tooltip label="Reuse">
                <Button
                  iconOnly
                  size="sm"
                  variant="secondary"
                  aria-label="Reuse in a new post"
                  onClick={() => patch({ compose: NEW_POST, from: tile.id })}
                >
                  <IconPlus />
                </Button>
              </Tooltip>
            )
          }
          empty={
            address.kind ? (
              <EmptyState
                icon={<IconInstagram />}
                title={`No ${LIBRARY_KIND_LABEL[address.kind].toLowerCase()} yet`}
                action={
                  <Button variant="secondary" onClick={() => patch({ kind: null })}>
                    Show everything
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<IconInstagram />}
                title="Nothing on this account yet"
                action={
                  <Button variant="primary" onClick={refresh} disabled={!library.canRefresh || library.refreshing}>
                    Refresh from Instagram
                  </Button>
                }
              />
            )
          }
        />
      </PageBody>
    </>
  );
}
