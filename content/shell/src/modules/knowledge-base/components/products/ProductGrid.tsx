import type { MouseEvent } from 'react';
import type { Finding } from '../../lib/lint';
import type { CatalogProduct } from '../../types';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: readonly CatalogProduct[];
  /** Findings keyed by the row they name. */
  findings: Map<string, Finding[]>;
  selected: readonly string[];
  onSelect: (id: string, event: MouseEvent<HTMLInputElement>) => void;
  canEdit: boolean;
  onEdit: (product: CatalogProduct) => void;
  onDelete: (product: CatalogProduct) => void;
  onAvailability: (product: CatalogProduct, isAvailable: boolean) => Promise<void>;
}

/** One column on a phone, two from 600px, three from 900px, four from 1280px — of the CONTAINER, never the window. */
const GRID = 'grid grid-cols-1 gap-3 @compact:grid-cols-2 @wide:grid-cols-3 @inline:grid-cols-4';

/** The card layout over the products. All of the arrangement, none of the decisions. */
export function ProductGrid({
  products,
  findings,
  selected,
  onSelect,
  canEdit,
  onEdit,
  onDelete,
  onAvailability,
}: ProductGridProps) {
  const chosen = new Set(selected);
  return (
    <div className={GRID}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          findings={findings.get(product.id) ?? []}
          selected={chosen.has(product.id)}
          onSelect={(event) => onSelect(product.id, event)}
          canEdit={canEdit}
          onEdit={() => onEdit(product)}
          onDelete={() => onDelete(product)}
          onAvailability={(isAvailable) => onAvailability(product, isAvailable)}
        />
      ))}
    </div>
  );
}
