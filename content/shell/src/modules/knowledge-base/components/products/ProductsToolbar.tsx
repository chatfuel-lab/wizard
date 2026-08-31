import {
  Button,
  DropdownMenu,
  IconChevronDown,
  IconDownload,
  IconFile,
  IconFilter,
  IconLayoutGrid,
  IconLayoutList,
  IconSearch,
  IconSortAsc,
  Input,
  SegmentedControl,
  type MenuItem,
} from '~ui';
import {
  AVAILABILITY_FILTERS,
  AVAILABILITY_LABELS,
  PRODUCT_SORTS,
  SORT_LABELS,
  type AvailabilityFilter,
  type ProductSort,
} from '../../lib/productFilter';
import type { ProductLayout } from '../../lib/prefs';
import { EXPORT_ATTRIBUTE, SEARCH_ATTRIBUTE } from '../../lib/searchTargets';

export interface ProductsToolbarProps {
  query: string;
  onQuery: (query: string) => void;
  availability: AvailabilityFilter;
  onAvailability: (filter: AvailabilityFilter) => void;
  sort: ProductSort;
  onSort: (sort: ProductSort) => void;
  layout: ProductLayout;
  onLayout: (layout: ProductLayout) => void;
  /** Rows shown, rows there are, and what all of them cost the assistant. */
  shown: number;
  total: number;
  chars: number;
  /** Opens the import wizard. `i` and the palette reach the same handler. */
  onImport: () => void;
  /** False on a read-only role: importing writes. */
  canImport: boolean;
  onExportCsv: () => void;
  onExportJson: () => void;
  /** Nothing to write out. The control stays, disabled, rather than appearing and vanishing. */
  exportDisabled: boolean;
}

/**
 * Search, filter, sort, layout and export, in the order they are reached for.
 *
 * Two DOM contracts run through here, both owned by `KnowledgeBaseWorkspace`:
 * the search box carries `data-knowledge-search`, which is what `/` and the
 * palette focus; the export button carries `data-knowledge-export`, which the
 * palette's Export command clicks — opening the menu, rather than this file
 * guessing whether CSV or JSON was meant.
 *
 * Filter and sort are labelled buttons and not icon-only menus: their CURRENT
 * value is the thing a person needs to see, because "where did my products
 * go?" is nearly always the filter.
 */
export function ProductsToolbar({
  query,
  onQuery,
  availability,
  onAvailability,
  sort,
  onSort,
  layout,
  onLayout,
  shown,
  total,
  onImport,
  canImport,
  onExportCsv,
  onExportJson,
  exportDisabled,
}: ProductsToolbarProps) {
  const filterItems: MenuItem[] = AVAILABILITY_FILTERS.map((value) => ({
    id: value,
    label: AVAILABILITY_LABELS[value],
    checked: availability === value,
    onSelect: () => onAvailability(value),
  }));

  const sortItems: MenuItem[] = PRODUCT_SORTS.map((value) => ({
    id: value,
    label: SORT_LABELS[value],
    checked: sort === value,
    onSelect: () => onSort(value),
  }));

  const exportItems: MenuItem[] = [
    { id: 'csv', label: 'CSV — opens in a spreadsheet', onSelect: onExportCsv, disabled: exportDisabled },
    { id: 'json', label: 'JSON — ids and file references', onSelect: onExportJson, disabled: exportDisabled },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-gutter py-2">
      <span className="relative min-w-40 flex-1">
        <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-faint">
          <IconSearch size={14} />
        </span>
        <Input
          {...{ [SEARCH_ATTRIBUTE]: true }}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className="pl-7"
        />
      </span>

      <DropdownMenu
        items={filterItems}
        aria-label="Filter by availability"
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant={availability === 'all' ? 'ghost' : 'outline'} size="sm">
            <IconFilter size={14} />
            {AVAILABILITY_LABELS[availability]}
            <IconChevronDown size={12} />
          </Button>
        )}
      />

      <DropdownMenu
        items={sortItems}
        aria-label="Sort products"
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant="ghost" size="sm">
            <IconSortAsc size={14} />
            {SORT_LABELS[sort]}
            <IconChevronDown size={12} />
          </Button>
        )}
      />

      <SegmentedControl
        value={layout}
        onChange={onLayout}
        size="sm"
        iconOnly
        aria-label="Layout"
        options={[
          { value: 'grid', label: 'Cards', icon: <IconLayoutGrid size={14} /> },
          { value: 'table', label: 'Table', icon: <IconLayoutList size={14} /> },
        ]}
      />

      {canImport ? (
        /* Import lived only behind `i` and the palette, which is another way of
           saying it did not exist for anybody who had not read the shortcut
           sheet. */
        <Button variant="ghost" size="sm" onClick={onImport}>
          <IconFile size={14} /> Import
        </Button>
      ) : null}

      <DropdownMenu
        items={exportItems}
        aria-label="Export products"
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            {...{ [EXPORT_ATTRIBUTE]: true }}
            variant="ghost"
            size="sm"
            disabled={exportDisabled}
          >
            <IconDownload size={14} /> Export
          </Button>
        )}
      />

      <span className="text-xs text-text-muted">
        {shown === total ? `${total} ${total === 1 ? 'product' : 'products'}` : `${shown} of ${total}`}
      </span>
    </div>
  );
}
