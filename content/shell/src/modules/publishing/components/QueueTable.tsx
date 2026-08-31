import type { ReactNode } from 'react';
import {
  Checkbox,
  DataCards,
  DataTable,
  DropdownMenu,
  IconExternal,
  IconImage,
  IconMore,
  IconRefresh,
  IconTrash,
  Tag,
  bandAtLeast,
  toggleSelection,
  type Band,
  type DataTableColumn,
  type MenuItem,
  type SortState,
} from '~ui';
import {
  KIND_LABEL,
  NARROW_HIDDEN,
  QUEUE_COLUMNS,
  STATUS_META,
  postTitle,
  thumbnailOf,
  whenLabel,
  type QueueColumnSpec,
} from '../lib/queueColumns';
import {
  isDestructive,
  rowActionLabel,
  rowActions,
  type QueueActionId,
  type QueueCapabilities,
} from '../lib/queueRows';
import type { QueuedPost } from '../types';

export interface QueueTableProps {
  rows: QueuedPost[];
  band: Band;
  loading: boolean;
  /** Read once per render by the view, so every relative time agrees. */
  now: number;
  caps: QueueCapabilities;
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** A click on the row itself — the composer, or Instagram. */
  onActivate: (post: QueuedPost) => void;
  onAction: (action: QueueActionId, post: QueuedPost) => void;
  widths: Record<string, number>;
  onWidthsChange: (next: Record<string, number>) => void;
  empty: ReactNode;
}

const ACTION_ICON: Partial<Record<QueueActionId, ReactNode>> = {
  permalink: <IconExternal size={14} />,
  retry: <IconRefresh size={14} />,
  delete: <IconTrash size={14} />,
  remove: <IconTrash size={14} />,
};

/**
 * The queue as rows, or as cards where a container is too narrow for seven
 * columns.
 *
 * Both are built from the SAME column specs — `DataCards` takes the table's own
 * `DataTableColumn[]` — so a column cannot exist on one and quietly not on the
 * other. The only difference is the identity cell, which carries the checkbox
 * in card mode because `DataCards` has no column of its own for one and bulk
 * actions would otherwise be unreachable without a wide screen.
 *
 * Nothing here decides anything. Which actions a row offers, what they are
 * called and how a time reads all come out of `lib/queueRows.ts` and
 * `lib/queueColumns.ts`, which have tests; this file only draws them.
 */
export function QueueTable({
  rows,
  band,
  loading,
  now,
  caps,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onActivate,
  onAction,
  widths,
  onWidthsChange,
  empty,
}: QueueTableProps) {
  const menuItems = (post: QueuedPost): MenuItem[] =>
    rowActions(post, caps).map((action) => ({
      id: action,
      label: rowActionLabel(action, post),
      ...(ACTION_ICON[action] === undefined ? {} : { icon: ACTION_ICON[action] }),
      ...(isDestructive(action) ? { tone: 'danger' as const } : {}),
      onSelect: () => onAction(action, post),
    }));

  const rowMenu = (post: QueuedPost): ReactNode => (
    <span onClick={(event) => event.stopPropagation()}>
      <DropdownMenu
        aria-label={`Actions for ${postTitle(post)}`}
        items={menuItems(post)}
        trigger={(props) => (
          <button
            {...props}
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
          >
            <IconMore />
          </button>
        )}
      />
    </span>
  );

  const identity = (post: QueuedPost, withCheckbox: boolean): ReactNode => (
    <span className="flex min-w-0 items-center gap-2.5">
      {withCheckbox ? (
        <span onClick={(event) => event.stopPropagation()} className="flex shrink-0 items-center">
          <Checkbox
            checked={selectedIds.includes(post.id)}
            aria-label={`Select ${postTitle(post)}`}
            onChange={() =>
              onSelectionChange(
                toggleSelection({
                  ids: rows.map((each) => each.id),
                  selected: selectedIds,
                  id: post.id,
                  anchor: null,
                }).selected,
              )
            }
          />
        </span>
      ) : null}
      <Thumbnail post={post} />
      {/* A real button, not just the row's click handler: opening a post is the
          primary action of this whole view and a `<tr onClick>` is reachable
          with a mouse and nothing else. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onActivate(post);
        }}
        className="min-w-0 flex-1 truncate rounded text-left font-medium focus-visible:focus-ring"
      >
        {postTitle(post)}
      </button>
    </span>
  );

  const cell = (spec: QueueColumnSpec, withCheckbox: boolean): ((post: QueuedPost) => ReactNode) => {
    switch (spec.key) {
      case 'post':
        return (post) => identity(post, withCheckbox);
      case 'kind':
        return (post) => <Tag>{KIND_LABEL[post.kind]}</Tag>;
      case 'status':
        return (post) => <Tag tone={STATUS_META[post.status].tone}>{STATUS_META[post.status].label}</Tag>;
      case 'scheduledAt':
        return (post) => {
          const when = whenLabel(post.scheduledAt, now);
          if (!when.text) return null;
          return (
            <span title={when.title} className="text-text-muted">
              {when.text}
            </span>
          );
        };
      case 'attempts':
        return (post) => (post.attempts === 0 ? null : <span className="tabular-nums">{post.attempts}</span>);
      case 'error':
      default:
        /* Instagram's own words. InstagramCarouselSizeInvalid names the field
           that is wrong better than any rewrite of it would. */
        return (post) => (post.error ? <span className="text-danger">{post.error}</span> : null);
    }
  };

  /* Rebuilt every render rather than memoised: every renderer closes over the
     selection, the clock and the row list, so a cache keyed on all three would
     be a cache that never hits. */
  const columns = (withCheckbox: boolean): DataTableColumn<QueuedPost>[] =>
    QUEUE_COLUMNS.map((spec) => ({
      key: spec.key,
      header: spec.label,
      width: spec.width,
      sortable: spec.sortable,
      resizable: true,
      minWidth: 72,
      ...(spec.align ? { align: spec.align } : {}),
      ...(spec.wrap ? { wrap: true } : {}),
      render: cell(spec, withCheckbox),
    }));

  if (band === 'compact') {
    return (
      <DataCards<QueuedPost>
        className="p-gutter"
        columns={[
          ...columns(true),
          /* A column with no header is a control: DataCards puts it beside the
             heading rather than on a labelled line of its own. */
          { key: 'actions', header: '', render: rowMenu },
        ]}
        rows={rows}
        rowKey={(post) => post.id}
        empty={empty}
      />
    );
  }

  return (
    <DataTable<QueuedPost>
      stickyHeader
      pinFirstColumn={!bandAtLeast(band, 'wide')}
      columns={columns(false)}
      hiddenColumns={bandAtLeast(band, 'wide') ? undefined : [...NARROW_HIDDEN]}
      rows={rows}
      rowKey={(post) => post.id}
      columnWidths={widths}
      onColumnWidthsChange={onWidthsChange}
      loading={loading}
      skeletonRows={8}
      sort={sort}
      onSortChange={onSortChange}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      rowActions={rowMenu}
      rowNavigation
      onRowClick={onActivate}
      caption="Posts this app has queued. Arrow keys move between rows, Enter opens, Space selects."
      empty={empty}
    />
  );
}

function Thumbnail({ post }: { post: QueuedPost }) {
  const src = thumbnailOf(post);
  const base = 'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-control';
  if (!src) {
    return (
      <span className={`${base} bg-surface-sunken text-text-faint [&_svg]:h-4 [&_svg]:w-4`}>
        <IconImage />
      </span>
    );
  }
  return (
    <span className={`${base} bg-surface-sunken`}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}
