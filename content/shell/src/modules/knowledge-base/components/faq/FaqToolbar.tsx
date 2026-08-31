import {
  Button,
  DropdownMenu,
  IconChevronDown,
  IconClose,
  IconDownload,
  IconFile,
  IconSearch,
  Input,
  Select,
  Toolbar,
  Tooltip,
  type MenuItem,
} from '~ui';
import { FAQ_SORTS, canReorder, summaryLine, type FaqSort } from '../../lib/faqList';
import { CREATE_ATTRIBUTE, EXPORT_ATTRIBUTE, SEARCH_ATTRIBUTE } from '../../lib/searchTargets';

export interface FaqToolbarProps {
  query: string;
  onQuery: (query: string) => void;
  sort: FaqSort;
  onSort: (sort: FaqSort) => void;
  total: number;
  shown: number;
  chars: number;
  canEdit: boolean;
  /** Adds an entry. The header button, `n` and the palette all reach it through this one. */
  onCreate: () => void;
  /** Opens the import wizard. `i` and the palette reach the same handler. */
  onImport: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  /** How many rows an export would write — the selection when there is one. */
  exportCount: number;
  exportsSelection: boolean;
}

/**
 * The list's own strip: search, reading order, what is in the list, and export.
 *
 * Two DOM contracts run through here, both the workspace's: `/` and the palette
 * focus `[data-knowledge-search]`, and `e` clicks the export MENU's trigger — so
 * the key opens the menu rather than guessing CSV or JSON on the person's behalf.
 *
 * The create control is the third contract and is deliberately `hidden`: the
 * page header already renders a visible "Add an FAQ" and presses this one. Two
 * identical buttons on screen is worse than one invisible proxy, and an
 * `sr-only` proxy would put a second "Add an FAQ" in the accessibility tree.
 */
export function FaqToolbar({
  query,
  onQuery,
  sort,
  onSort,
  total,
  shown,
  canEdit,
  onCreate,
  onImport,
  onExportCsv,
  onExportJson,
  exportCount,
  exportsSelection,
}: FaqToolbarProps) {
  const exportItems: MenuItem[] = [
    { id: 'csv', label: exportsSelection ? `Download ${exportCount} as CSV` : 'Download CSV', onSelect: onExportCsv },
    {
      id: 'json',
      label: exportsSelection ? `Download ${exportCount} as JSON` : 'Download JSON',
      onSelect: onExportJson,
    },
  ];

  return (
    <Toolbar>
      <div className="relative min-w-0 flex-1 @compact:max-w-80">
        <IconSearch
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search questions and answers"
          aria-label="Search the FAQ"
          className="pl-8 pr-8"
          {...{ [SEARCH_ATTRIBUTE]: true }}
        />
        {query !== '' ? (
          <button
            type="button"
            onClick={() => onQuery('')}
            aria-label="Clear the search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-control p-1 text-text-faint transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring"
          >
            <IconClose size={14} />
          </button>
        ) : null}
      </div>

      <Tooltip
        label={
          canReorder(sort)
            ? 'The order the assistant reads them in — drag a row to change it'
            : 'A reading order only. Switch back to reorder.'
        }
      >
        <Select
          value={sort}
          onChange={(next) => onSort(next as FaqSort)}
          options={FAQ_SORTS.map((option) => ({ value: option.id, label: option.label }))}
          aria-label="Sort the FAQ"
          className="shrink-0"
        />
      </Tooltip>

      <span className="ml-auto shrink-0 text-meta tabular-nums text-text-muted">{summaryLine(total, shown)}</span>

      {canEdit ? (
        /* Import lived only behind `i` and the palette, which is another way of
           saying it did not exist for anybody who had not read the shortcut
           sheet. */
        <Button variant="ghost" size="sm" onClick={onImport}>
          <IconFile />
          <span className="hidden @compact:inline">Import</span>
        </Button>
      ) : null}

      <DropdownMenu
        items={exportItems}
        aria-label="Export the FAQ"
        trigger={(props) => (
          <Button {...props} variant="ghost" size="sm" {...{ [EXPORT_ATTRIBUTE]: true }}>
            <IconDownload />
            <span className="hidden @compact:inline">Export</span>
            <IconChevronDown size={12} />
          </Button>
        )}
      />

      {canEdit ? (
        /* See the component note: pressed by the header, `n` and the palette. */
        <button type="button" hidden aria-hidden tabIndex={-1} onClick={onCreate} {...{ [CREATE_ATTRIBUTE]: true }}>
          Add an FAQ
        </button>
      ) : null}
    </Toolbar>
  );
}
