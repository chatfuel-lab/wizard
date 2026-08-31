import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  EmptyState,
  IconImage,
  IconInstagram,
  IconPlay,
  IconRefresh,
  IconSearch,
  Input,
  SegmentedControl,
  Tag,
  useToast,
} from '~ui';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useInstagramMedia } from '../../hooks/useInstagramMedia';
import { useMediaLookup } from '../../hooks/useMediaLookup';
import {
  filterMedia,
  matchesKind,
  MEDIA_KIND_LABELS,
  mediaKindLabelOf,
  mediaKindOf,
  resolveMedia,
} from '../../lib/mediaLookup';
import type { InstagramMediaNode } from '../../types';
import { LoadMoreRow, MediaThumb, PickerFooter, PickerLoading, SelectedBadge, usePickerSelection } from './pickerParts';
import type { MediaKind, PickerDrawerProps } from './types';

/** A four-tile grid at 30rem, two at a phone's width. */
export const PICKER_DRAWER_WIDTH = '30rem';

const KIND_OPTIONS = (kind: MediaKind) => [
  { value: 'posts' as const, label: 'Posts & Reels', disabled: kind !== 'posts' },
  { value: 'stories' as const, label: 'Stories', disabled: kind !== 'stories' },
];

/**
 * The Instagram media picker (`PickerDrawerProps`): the account in the header,
 * caption search over the loaded pages, the kind the scope takes (the other
 * kind is shown disabled with the reason), "Refresh from Instagram", a
 * responsive thumbnail grid of `<button aria-pressed>` tiles, cursor paging,
 * and a footer that can get back to "All posts" — the production drawer cannot.
 * The drawer proposes; the editor owns the draft: `onChange` fires on Done.
 */
export function InstagramMediaDrawer({
  open,
  onClose,
  selected,
  onChange,
  maxItems,
  scope,
  canEdit,
}: PickerDrawerProps) {
  const catalog = useCatalog();
  const toast = useToast();
  const instagram = catalog.channels.find((c) => c.platform === 'Instagram');
  const connected = Boolean(instagram?.connected);
  const kind = mediaKindOf(scope);
  const emptyMeaning = kind === 'stories' ? 'All stories' : 'All posts';

  const media = useInstagramMedia({ enabled: open && connected });
  const pick = usePickerSelection(open, selected, maxItems);
  const lookup = useMediaLookup([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Every loaded tile is an answer the lookup would otherwise ask for one by one.
  useEffect(() => {
    for (const node of media.nodes) lookup.prime(resolveMedia(node.id, node));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.nodes]);

  const visible = useMemo(
    () =>
      filterMedia(
        media.nodes.filter((node) => matchesKind(node, kind)),
        query,
      ),
    [media.nodes, kind, query],
  );
  const otherKindCount = media.nodes.length - media.nodes.filter((node) => matchesKind(node, kind)).length;

  const refresh = async () => {
    if (!instagram?.accountId) return;
    try {
      await media.refreshFromInstagram(instagram.accountId);
      toast.show({
        title: 'Refreshed from Instagram',
        description: 'The latest 30 media were pulled in.',
        tone: 'success',
        duration: 3000,
      });
    } catch {
      /* the hook set its inline error */
    }
  };

  const done = () => {
    onChange(pick.list());
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={kind === 'stories' ? 'Pick Instagram stories' : 'Pick Instagram posts'}
      width={PICKER_DRAWER_WIDTH}
      padded={false}
      footer={
        <PickerFooter
          count={pick.selected.size}
          maxItems={maxItems}
          emptyMeaning={emptyMeaning}
          canEdit={canEdit && connected}
          onClear={pick.clear}
          onDone={done}
          onClose={onClose}
        />
      }
    >
      <div className="@container flex min-h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex items-center gap-3">
            {instagram?.avatarUrl || instagram?.handle ? (
              <Avatar src={instagram?.avatarUrl} name={instagram?.handle ?? 'Instagram'} size={32} />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-channel-instagram-soft text-channel-instagram">
                <IconInstagram size={16} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">{instagram?.handle ?? 'Instagram'}</div>
              <div className="text-xs text-text-muted">{connected ? 'Connected account' : 'Not connected'}</div>
            </div>
            {connected && canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refresh()}
                disabled={media.refreshing || media.loading}
                aria-label="Refresh from Instagram"
              >
                <IconRefresh size={14} className={media.refreshing ? 'motion-safe:animate-spin' : ''} />
                <span className="hidden @min-[24rem]:inline">Refresh from Instagram</span>
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 @min-[24rem]:flex-row @min-[24rem]:items-center">
            <SegmentedControl
              value={kind}
              onChange={() => undefined}
              options={KIND_OPTIONS(kind)}
              size="sm"
              aria-label="Media kind"
            />
            <div className="relative min-w-0 flex-1">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search captions…"
                aria-label="Search captions"
                className="h-field-sm pl-8 text-xs"
                disabled={!connected}
              />
            </div>
          </div>
          <p className="text-xs text-text-faint">
            {kind === 'stories'
              ? 'A story-replies rule takes stories only; posts and reels are picked from a post-comments rule.'
              : 'A post rule takes posts, reels and ads; stories are picked from a story-replies rule.'}
            {otherKindCount > 0 ? ` ${otherKindCount} of the loaded media are the other kind and are hidden.` : ''}
          </p>
        </div>

        <div className="flex-1 p-4">
          {!connected ? (
            <EmptyState
              icon={<IconInstagram />}
              title="Instagram is not connected"
              description="Connect an Instagram account to this bot to pick posts and stories. Until then the list stays as it is."
            />
          ) : media.error && media.nodes.length === 0 ? (
            <Alert
              tone="danger"
              title="Could not load Instagram media"
              action={
                <Button variant="secondary" size="sm" onClick={media.reload}>
                  Retry
                </Button>
              }
            >
              {media.error}
            </Alert>
          ) : media.loading ? (
            <PickerLoading label="Loading media…" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconImage />}
              title={query.trim() ? 'No captions match' : kind === 'stories' ? 'No stories yet' : 'No posts yet'}
              description={
                query.trim()
                  ? 'Only the loaded pages are searched — load more, or clear the search.'
                  : 'Try "Refresh from Instagram" — the list is a copy and can lag behind the account.'
              }
              action={
                query.trim() ? (
                  <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              {media.error ? (
                <Alert tone="warning" className="mb-3">
                  {media.error}
                </Alert>
              ) : null}
              <div
                className="grid grid-cols-2 gap-2 @min-[22rem]:grid-cols-3 @min-[28rem]:grid-cols-4"
                role="group"
                aria-label={kind === 'stories' ? 'Stories' : 'Posts and reels'}
              >
                {visible.map((node) => (
                  <MediaTile
                    key={node.id}
                    node={node}
                    selected={pick.isSelected(node.id)}
                    locked={!canEdit || node.isUnknown}
                    full={pick.full}
                    onToggle={() => pick.toggle(node.id)}
                  />
                ))}
              </div>
              {pick.full ? (
                <p className="mt-2 text-xs text-warning">Up to {maxItems} — remove one to pick another.</p>
              ) : null}
              <LoadMoreRow hasNext={media.hasNext} loading={media.loadingMore} onLoadMore={media.loadMore} />
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}

/** `locked`: cannot change at all (read-only, unavailable). `full`: the ceiling — an unselected tile is disabled, a selected one can still be un-picked. */
function MediaTile({
  node,
  selected,
  locked,
  full,
  onToggle,
}: {
  node: InstagramMediaNode;
  selected: boolean;
  locked: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const kind = node.isUnknown ? 'unknown' : mediaKindLabelOf(node.__typename);
  const caption = node.caption?.trim() || (node.isUnknown ? 'No longer available' : `Media ${node.id}`);
  const disabled = locked || (full && !selected);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${MEDIA_KIND_LABELS[kind]}: ${caption}`}
      disabled={disabled}
      onClick={onToggle}
      className={`group relative flex flex-col overflow-hidden rounded-card border text-left transition-colors duration-fast ease-standard focus-visible:focus-ring ${
        selected ? 'border-accent ring-1 ring-accent' : 'border-border'
      } ${disabled ? 'cursor-not-allowed' : 'hover:border-border-strong'} ${node.isUnknown ? 'opacity-70' : ''}`}
    >
      <MediaThumb
        src={node.thumbnailPreview?.url}
        alt=""
        glyph={kind === 'reel' ? <IconPlay size={20} /> : <IconImage size={20} />}
        className="aspect-square w-full"
      />
      {selected ? <SelectedBadge /> : null}
      <span className="absolute left-1.5 top-1.5">
        <Tag tone={node.isUnknown ? 'warning' : 'neutral'}>
          {node.isUnknown ? 'Unavailable' : MEDIA_KIND_LABELS[kind]}
        </Tag>
      </span>
      {/* The clamp sits inside the padding: `line-clamp` clips at the padding edge and would show a third line's top in the gap otherwise. */}
      <span className="px-2 py-1.5">
        <span className="line-clamp-2 text-xs leading-snug text-text-muted">{caption}</span>
      </span>
    </button>
  );
}
