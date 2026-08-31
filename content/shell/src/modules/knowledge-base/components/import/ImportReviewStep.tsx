import { useMemo } from 'react';
import { Alert, Button, DataTable, Input, Tag, Textarea, type DataTableColumn } from '~ui';
import { FIELDS, type ImportField } from '../../lib/importMapping';
import { noteText } from '../../lib/importParse';
import { planCounts, type PlanRow } from '../../lib/importPlan';
import type { ImportTarget } from '../../lib/knowledgeParams';

export interface ImportReviewStepProps {
  rows: readonly PlanRow[];
  target: ImportTarget;
  /** The AI's current character total, so the cost of this import is shown against something real. */
  usedChars: number | null;
  onEdit: (id: string, field: ImportField, value: string) => void;
  onSkip: (id: string, skip: boolean) => void;
  onSkipAll: (skip: boolean) => void;
}

/** Which fields get a multi-line editor rather than a single line. */
const MULTILINE: ReadonlySet<ImportField> = new Set<ImportField>(['answer', 'description']);

/**
 * Everything that will be created, before any of it is.
 *
 * Three things this screen owes a person, and they are the reason it is a
 * table and not a summary line:
 *
 *   1. every row, editable — a typo is fixed here, not by importing it and
 *      then hunting for it in a list of two hundred;
 *   2. every duplicate flagged and OFF by default, whether it repeats
 *      something already saved or an earlier row of the same file;
 *   3. the character cost, because the knowledge base has a budget the server
 *      enforces by refusing writes, and "the import failed halfway" is a much
 *      worse way to learn that.
 */
export function ImportReviewStep({ rows, target, onEdit, onSkip, onSkipAll }: ImportReviewStepProps) {
  const counts = useMemo(() => planCounts(rows, target), [rows, target]);

  /* Selection IS "will be imported": the table's own checkbox column carries
     the skip flag, so there is no second control meaning the same thing. */
  const selectedIds = useMemo(
    () => rows.filter((row) => !row.skip && row.problems.length === 0).map((row) => row.id),
    [rows],
  );

  const columns = useMemo<DataTableColumn<PlanRow>[]>(() => {
    const fieldColumns = FIELDS[target].map((field): DataTableColumn<PlanRow> => ({
      key: field.id,
      header: field.label,
      wrap: true,
      width: field.id === 'question' || field.id === 'title' ? '18rem' : undefined,
      render: (row) =>
        MULTILINE.has(field.id) ? (
          <Textarea
            aria-label={`${field.label} for row ${row.id}`}
            rows={2}
            maxRows={6}
            autoGrow
            value={row.values[field.id] ?? ''}
            onChange={(event) => onEdit(row.id, field.id, event.target.value)}
          />
        ) : (
          <Input
            aria-label={`${field.label} for row ${row.id}`}
            value={row.values[field.id] ?? ''}
            onChange={(event) => onEdit(row.id, field.id, event.target.value)}
          />
        ),
    }));

    return [
      ...fieldColumns,
      {
        key: 'notes',
        header: 'Notes',
        wrap: true,
        width: '14rem',
        render: (row) => (
          <div className="flex flex-col gap-1">
            {row.duplicate ? (
              <Tag tone="warning">
                {row.duplicate.kind === 'existing' ? 'Already in the knowledge base' : 'Repeats an earlier row'}
              </Tag>
            ) : null}
            {row.problems.map((problem) => (
              <span key={problem} className="text-xs text-danger">
                {problem}
              </span>
            ))}
            {row.warnings.map((warning) => (
              <span key={warning} className="text-xs text-warning">
                {warning}
              </span>
            ))}
            {row.note ? <span className="text-xs text-text-faint">{noteText(row.note)}</span> : null}
          </div>
        ),
      },
    ];
  }, [target, onEdit]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="accent">
          {counts.accepted === 1 ? '1 row will be created' : `${counts.accepted} rows will be created`}
        </Tag>
        {counts.duplicates > 0 ? (
          <Tag tone="warning">
            {counts.duplicates} duplicate{counts.duplicates === 1 ? '' : 's'}
          </Tag>
        ) : null}
        {counts.invalid > 0 ? <Tag tone="danger">{counts.invalid} cannot be imported</Tag> : null}
        <span className="flex-1" />
        <Button size="xs" variant="ghost" onClick={() => onSkipAll(false)}>
          Select all
        </Button>
        <Button size="xs" variant="ghost" onClick={() => onSkipAll(true)}>
          Select none
        </Button>
      </div>

      {counts.invalid > 0 ? (
        <Alert tone="info">
          Rows missing a required field cannot be turned on. Fill the empty cell in and the checkbox comes back.
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        rows={[...rows]}
        rowKey={(row) => row.id}
        caption={`Rows to import into ${target === 'faq' ? 'FAQ' : 'Products'}`}
        density="cozy"
        stickyHeader
        selectedIds={selectedIds}
        onSelectionChange={(ids) => {
          const next = new Set(ids);
          for (const row of rows) {
            const skip = !next.has(row.id);
            if (skip !== row.skip) onSkip(row.id, skip);
          }
        }}
        /* A row that cannot be created is not a row a person can turn on. */
        isRowDisabled={(row) => row.problems.length > 0}
        empty={<span className="text-sm text-text-muted">Nothing came out of that file.</span>}
      />
    </div>
  );
}
