import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  ChipInput,
  Drawer,
  EmptyState,
  IconExternal,
  IconFacebook,
  IconImage,
  IconSearch,
  Input,
  Label,
  Tag,
  safeHref,
} from '~ui';
import { useCatalog } from '../../AutomationsCatalogContext';
import { useFacebookPosts } from '../../hooks/useFacebookPosts';
import type { FacebookPostNode } from '../../types';
import { PICKER_DRAWER_WIDTH } from './InstagramMediaDrawer';
import { LoadMoreRow, MediaThumb, PickerFooter, PickerLoading, SelectedBadge, usePickerSelection } from './pickerParts';
import type { PickerDrawerProps } from './types';

const POST_ID_MAX_LENGTH = 60;

const filterPosts = (nodes: readonly FacebookPostNode[], query: string): FacebookPostNode[] => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [...nodes];
  return nodes.filter((node) => node.message.toLocaleLowerCase().includes(needle) || node.id.includes(needle));
};

const postDate = (iso: string): string => {
  const at = Date.parse(iso);
  return Number.isNaN(at)
    ? ''
    : new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * The Facebook page posts picker (`PickerDrawerProps`) over `facebookPage.posts`
 * — the Instagram drawer's shape with the page's fields: message clamped, the
 * image, a permalink icon, an "Expired" tag. No `FacebookContactScope` in the
 * answer → "Connect a Facebook page" AND a paste-ids fallback, because the
 * setter is unverified against page post ids.
 */
export function FacebookPostsDrawer({ open, onClose, selected, onChange, maxItems, canEdit }: PickerDrawerProps) {
  const catalog = useCatalog();
  const facebook = catalog.channels.find((c) => c.platform === 'Facebook');
  const posts = useFacebookPosts({ enabled: open });
  const pick = usePickerSelection(open, selected, maxItems);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const visible = useMemo(() => filterPosts(posts.nodes, query), [posts.nodes, query]);
  const connected = posts.connected;
  const done = () => {
    onChange(pick.list());
    onClose();
  };
  const pageName = posts.page?.name ?? facebook?.handle ?? 'Facebook page';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Pick Facebook posts"
      width={PICKER_DRAWER_WIDTH}
      padded={false}
      footer={
        <PickerFooter
          count={pick.selected.size}
          maxItems={maxItems}
          emptyMeaning="All posts"
          canEdit={canEdit}
          onClear={pick.clear}
          onDone={done}
          onClose={onClose}
        />
      }
    >
      <div className="@container flex min-h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex items-center gap-3">
            {facebook?.avatarUrl ? (
              <Avatar src={facebook.avatarUrl} name={pageName} size={32} />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-channel-facebook-soft text-channel-facebook">
                <IconFacebook size={16} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">{pageName}</div>
              <div className="text-xs text-text-muted">
                {connected === false ? 'No page connected' : connected ? 'Connected page' : 'Checking the connection…'}
              </div>
            </div>
          </div>
          {connected ? (
            <div className="relative">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                aria-label="Search posts"
                className="h-field-sm pl-8 text-xs"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {posts.error && posts.nodes.length === 0 && connected !== false ? (
            <Alert
              tone="danger"
              title="Could not load the page's posts"
              action={
                <Button variant="secondary" size="sm" onClick={posts.reload}>
                  Retry
                </Button>
              }
            >
              {posts.error}
            </Alert>
          ) : posts.loading && connected === null ? (
            <PickerLoading label="Loading posts…" />
          ) : connected === false ? (
            <>
              <EmptyState
                icon={<IconFacebook />}
                title="Connect a Facebook page"
                description="This bot has no Facebook page, so there is nothing to pick from. You can still paste post ids below."
              />
              <PasteFallback pick={pick} maxItems={maxItems} canEdit={canEdit} />
            </>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconImage />}
              title={query.trim() ? 'No posts match' : 'No posts on this page yet'}
              description={
                query.trim()
                  ? 'Only the loaded pages are searched — load more, or clear the search.'
                  : 'Published posts show here once the page has some.'
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
              {posts.error ? <Alert tone="warning">{posts.error}</Alert> : null}
              <div
                className="grid grid-cols-2 gap-2 @min-[22rem]:grid-cols-3 @min-[28rem]:grid-cols-4"
                role="group"
                aria-label="Page posts"
              >
                {visible.map((node) => (
                  <PostTile
                    key={node.id}
                    node={node}
                    selected={pick.isSelected(node.id)}
                    locked={!canEdit}
                    full={pick.full}
                    onToggle={() => pick.toggle(node.id)}
                  />
                ))}
              </div>
              {pick.full ? (
                <p className="text-xs text-warning">Up to {maxItems} — remove one to pick another.</p>
              ) : null}
              <LoadMoreRow hasNext={posts.hasNext} loading={posts.loadingMore} onLoadMore={posts.loadMore} />
              <p className="text-xs text-text-faint">
                Facebook post ids in this filter are checked on save — if a save is refused, correct the id it flags and
                try again.
              </p>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function PasteFallback({
  pick,
  maxItems,
  canEdit,
}: {
  pick: ReturnType<typeof usePickerSelection>;
  maxItems: number;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        hint={`Up to ${maxItems}, each up to ${POST_ID_MAX_LENGTH} characters. Facebook post ids are checked on save — if a save is refused, correct the id it flags and try again.`}
      >
        Paste post ids
      </Label>
      <ChipInput
        value={pick.list()}
        onChange={(next) => {
          pick.clear();
          pick.add(next);
        }}
        placeholder="Post id, comma or Enter…"
        maxItems={maxItems}
        maxLength={POST_ID_MAX_LENGTH}
        normalize={(item) => item.trim()}
        disabled={!canEdit}
        aria-label="Post ids"
      />
    </div>
  );
}

function PostTile({
  node,
  selected,
  locked,
  full,
  onToggle,
}: {
  node: FacebookPostNode;
  selected: boolean;
  locked: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const message = node.message.trim() || `Post ${node.id}`;
  const disabled = locked || (full && !selected);
  /* The permalink is Facebook's own field, arriving over the wire, so it goes
     through `safeHref` before it becomes a link; without one the card keeps
     the date and drops the arrow. */
  const permalink = safeHref(node.permalinkURL);
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-card border transition-colors duration-fast ease-standard ${selected ? 'border-accent ring-1 ring-accent' : 'border-border'} ${disabled ? '' : 'hover:border-border-strong'} ${node.isExpired ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Post: ${message}`}
        disabled={disabled}
        onClick={onToggle}
        className="flex flex-col text-left focus-visible:focus-ring disabled:cursor-not-allowed"
      >
        <MediaThumb src={node.image?.url} alt="" glyph={<IconFacebook size={20} />} className="aspect-square w-full" />
        {selected ? <SelectedBadge /> : null}
        {node.isExpired ? (
          <span className="absolute left-1.5 top-1.5">
            <Tag tone="warning">Expired</Tag>
          </span>
        ) : null}
        <span className="px-2 pt-1.5">
          <span className="line-clamp-2 text-xs leading-snug text-text-muted">{message}</span>
        </span>
      </button>
      <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5 text-micro text-text-faint">
        <span>{postDate(node.createdTime)}</span>
        {permalink ? (
          <a
            href={permalink}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Open the post on Facebook"
            className="rounded-control p-0.5 hover:text-text focus-visible:focus-ring"
          >
            <IconExternal size={12} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
