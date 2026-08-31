import { Combobox, Tag, type ComboboxOption } from '~ui';
import type { ColumnDraft, MappingIssue } from '../../lib/importPlan';

export interface ImportColumnsProps {
  drafts: readonly ColumnDraft[];
  /** Attribute names from the bot catalog, in the catalog's own order. */
  options: readonly ComboboxOption[];
  issues: readonly MappingIssue[];
  onChange: (index: number, attributeName: string | null) => void;
  disabled?: boolean;
}

/**
 * The mapping: one row per column of the file, showing what is in it and where
 * it will be written.
 *
 * The preview is the load-bearing half. `columnPreview` is the file's first
 * row, and it is the only way a person can tell column 4 from column 5 — the
 * import gives no header names of its own, so a list of "Column 1 … Column 9"
 * with attribute pickers beside it would be unmappable.
 *
 * Every picker is `clearable`, and clearing means **skip this column**. That
 * is a real and common choice — a CSV exported from another CRM carries ids,
 * timestamps and internal flags that have no business becoming contact
 * attributes — so it has to be reachable, not only implied by "leave it".
 *
 * The picker offers `onCreate`, because writing an attribute is what creates
 * it in this API: a name that no contact carries yet is a legitimate mapping
 * target, and the import is exactly the operation that will fill it.
 */
export function ImportColumns({ drafts, options, issues, onChange, disabled = false }: ImportColumnsProps) {
  return (
    <div className="flex flex-col gap-2">
      {drafts.map((draft) => {
        const columnIssues = issues.filter((issue) => issue.columnIndex === draft.index);
        return (
          <div
            key={draft.index}
            className="flex flex-col gap-1.5 rounded-card border border-border bg-surface-raised p-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-micro tabular-nums text-text-faint">Column {draft.index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-body text-text" title={draft.preview}>
                {draft.preview.trim() === '' ? (
                  <span className="text-text-faint">empty in the first row</span>
                ) : (
                  draft.preview
                )}
              </span>
              <Combobox
                className="w-56 shrink-0"
                aria-label={`Attribute for column ${draft.index + 1}`}
                value={draft.attributeName}
                onChange={(value) => onChange(draft.index, value)}
                options={options}
                onCreate={(label) => onChange(draft.index, label)}
                createLabel={(query) => `Write to a new field “${query}”`}
                clearable
                disabled={disabled}
                placeholder="Skip this column"
              />
            </div>
            {draft.attributeName === null ? <span className="text-micro text-text-faint">Not imported.</span> : null}
            {columnIssues.map((issue) => (
              <span key={issue.text} className="flex items-start gap-1.5 text-meta text-danger">
                <Tag tone="danger">fix</Tag>
                {issue.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
