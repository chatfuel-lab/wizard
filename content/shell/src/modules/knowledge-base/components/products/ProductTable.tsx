import type { ReactNode } from 'react';
import {
  DataTable,
  IconImage,
  IconTrash,
  MenuButton,
  Switch,
  Tag,
  Tooltip,
  type DataTableColumn,
  type MenuItem,
} from '~ui';
import { itemChars } from '../../lib/budget';
import type { Finding } from '../../lib/lint';
import { formatPrice } from '../../lib/productInput';
import type { CatalogProduct } from '../../types';
import { ItemFindings } from './ItemFindings';

export interface ProductTableProps {
  products: CatalogProduct[];
  findings: Map<string, Finding[]>;
  selected: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  canEdit: boolean;
  onEdit: (product: CatalogProduct) => void;
  onDelete: (product: CatalogProduct) => void;
  onAvailability: (product: CatalogProduct, isAvailable: boolean) => Promise<void>;
  /** Hide the columns that do not fit — the container's width, not the window's. */
  narrow: boolean;
  loading: boolean;
  empty: ReactNode;
}

/**
 * The dense half of the pair: everything the grid shows, minus the photo's
 * size, plus the ability to see forty rows at once.
 *
 * The same rows and the same actions as the grid, deliberately — a person who
 * switches layout to compare prices should not lose the switch or the menu.
 * Sorting is the toolbar's, not the header's: the sort is a persisted
 * preference shared with the grid, and a header that sorted only in one layout
 * would be a second, contradicting control.
 */
export function ProductTable({
  products,
  findings,
  selected,
  onSelectionChange,
  canEdit,
  onEdit,
  onDelete,
  onAvailability,
  narrow,
  loading,
  empty,
}: ProductTableProps) {
  const columns: DataTableColumn<CatalogProduct>[] = [
    {
      key: 'photo',
      header: '',
      width: '3rem',
      render: (product) =>
        product.images[0]?.url ? (
          <img
            src={product.images[0].url}
            alt=""
            className="h-8 w-8 rounded-control border border-border object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface-sunken text-text-faint">
            <IconImage size={14} />
          </span>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      minWidth: 160,
      render: (product) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium text-text">{product.title}</span>
          <ItemFindings findings={findings.get(product.id) ?? []} variant="dot" />
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      minWidth: 200,
      render: (product) => <span className="block truncate text-text-muted">{product.description || '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'end',
      width: '7rem',
      render: (product) => <span className="tabular-nums">{formatPrice(product.price)}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      width: '8rem',
      render: (product) =>
        canEdit ? (
          <Switch
            checked={product.isAvailable}
            onChange={(on) => onAvailability(product, on)}
            aria-label={`${product.title} availability`}
          />
        ) : product.isAvailable ? (
          <Tag tone="success">Yes</Tag>
        ) : (
          <Tag tone="warning">No</Tag>
        ),
    },
    {
      key: 'chars',
      header: 'Characters',
      align: 'end',
      width: '6.5rem',
      render: (product) => (
        <Tooltip label="Characters this product spends of the assistant's budget">
          <span className="tabular-nums text-text-muted">{itemChars(product)}</span>
        </Tooltip>
      ),
    },
  ];

  const rowActions = canEdit
    ? (product: CatalogProduct) => {
        const items: MenuItem[] = [
          { id: 'edit', label: 'Edit', onSelect: () => onEdit(product) },
          { kind: 'separator', id: 'sep' },
          {
            id: 'delete',
            label: 'Delete…',
            icon: <IconTrash size={14} />,
            tone: 'danger',
            onSelect: () => onDelete(product),
          },
        ];
        return <MenuButton items={items} label={`Actions for ${product.title}`} />;
      }
    : undefined;

  return (
    <DataTable
      columns={columns}
      rows={products}
      rowKey={(product) => product.id}
      /* No row click without the permission: the dialog is an editor, and a
         role that cannot save should not be handed a form. */
      onRowClick={canEdit ? onEdit : undefined}
      density="cozy"
      stickyHeader
      caption="Products"
      selectedIds={selected}
      onSelectionChange={onSelectionChange}
      hiddenColumns={narrow ? ['description', 'chars'] : undefined}
      rowActions={rowActions}
      loading={loading}
      empty={empty}
    />
  );
}
