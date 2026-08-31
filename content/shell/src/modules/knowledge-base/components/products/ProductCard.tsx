import type { MouseEvent } from 'react';
import { Checkbox, IconImage, IconTrash, MenuButton, Switch, Tag, Tooltip, type MenuItem } from '~ui';
import { itemChars } from '../../lib/budget';
import type { Finding } from '../../lib/lint';
import { formatPrice } from '../../lib/productInput';
import type { CatalogProduct } from '../../types';
import { ItemFindings } from './ItemFindings';

export interface ProductCardProps {
  product: CatalogProduct;
  /** The lint's verdict on this row. */
  findings: readonly Finding[];
  selected: boolean;
  onSelect: (event: MouseEvent<HTMLInputElement>) => void;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Reject to show the error under the switch and revert it. */
  onAvailability: (isAvailable: boolean) => Promise<void>;
}

/**
 * One product as a card: the photo (which is the point of the grid), title,
 * price, what the lint thinks of it, and the availability switch inline —
 * the one edit frequent enough not to deserve a dialog.
 *
 * The character cost sits in the footer because the budget is the constraint
 * this whole module is organised around, and "this row costs 84 characters"
 * is the only place a person can see where the number in the header goes.
 */
export function ProductCard({
  product,
  findings,
  selected,
  onSelect,
  canEdit,
  onEdit,
  onDelete,
  onAvailability,
}: ProductCardProps) {
  const photo = product.images[0]?.url || null;
  const items: MenuItem[] = [
    { id: 'edit', label: 'Edit', onSelect: onEdit },
    { kind: 'separator', id: 'sep' },
    { id: 'delete', label: 'Delete…', icon: <IconTrash size={14} />, tone: 'danger', onSelect: onDelete },
  ];

  const body = (
    <>
      <div className="relative h-28 w-full overflow-hidden bg-surface-sunken">
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-faint">
            <IconImage size={24} />
          </div>
        )}
        {!product.isAvailable ? (
          <span className="absolute right-2 top-2">
            <Tag tone="warning">Unavailable</Tag>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 text-left">
        <div className="truncate text-sm font-semibold text-text group-hover:text-accent">{product.title}</div>
        <div className="text-xs font-medium text-text">{formatPrice(product.price)}</div>
        {product.description ? <p className="line-clamp-2 text-xs text-text-muted">{product.description}</p> : null}
        <ItemFindings findings={findings} />
      </div>
    </>
  );

  return (
    <article
      aria-label={product.title}
      className={`flex flex-col overflow-hidden rounded-card border bg-surface-raised transition-colors duration-fast ease-standard ${selected ? 'border-accent' : 'border-border'} ${product.isAvailable ? '' : 'opacity-75'}`}
    >
      <div className="relative">
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${product.title}`}
            className="group flex w-full flex-col text-left focus-visible:focus-ring"
          >
            {body}
          </button>
        ) : (
          /* Not a button when there is nothing to open. The dialog is an
             editor, and a role without `Ai: Edit` opening one would be shown a
             form whose Save the server refuses. */
          <div className="flex w-full flex-col">{body}</div>
        )}
        {/* Over the photo rather than in the flow: the card is one big button,
            and a checkbox inside a button is not a checkbox. */}
        <span className="absolute left-2 top-2 rounded-control bg-surface-overlay/90 p-0.5">
          <Checkbox
            checked={selected}
            onChange={(_checked, event) => onSelect(event)}
            aria-label={`Select ${product.title}`}
          />
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <Switch
          checked={product.isAvailable}
          onChange={onAvailability}
          label={product.isAvailable ? 'Available' : 'Unavailable'}
          disabled={!canEdit}
        />
        <span className="flex items-center gap-1">
          <Tooltip label="Characters this product spends of the assistant's budget">
            <span className="text-micro tabular-nums text-text-faint">{itemChars(product)}</span>
          </Tooltip>
          {canEdit ? <MenuButton items={items} label={`Actions for ${product.title}`} /> : null}
        </span>
      </div>
    </article>
  );
}
