import { SegmentedControl, Select, Switch, Tag } from '~ui';
import { noteText, type Delimiter, type ImportFormat, type ImportParse } from '../../lib/importParse';

export interface ImportParseStepProps {
  parse: ImportParse;
  sourceLabel: string;
  onFormat: (format: ImportFormat) => void;
  onDelimiter: (delimiter: Delimiter) => void;
  onHeader: (headerUsed: boolean) => void;
}

const DELIMITER_OPTIONS = [
  { value: ',', label: 'Comma  ,' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon  ;' },
  { value: '|', label: 'Pipe  |' },
];

/** First rows only — this is a "did we read it right?" screen, not the review. */
const PREVIEW_ROWS = 5;

/**
 * What the parser made of the text, with every guess exposed as a control.
 *
 * The delimiter, the header and table-versus-prose are all detected, and all
 * three are sometimes wrong; a person who can see the guess can fix it in one
 * click, and a person who cannot gets a review table full of nonsense and no
 * idea why.
 */
export function ImportParseStep({ parse, sourceLabel, onFormat, onDelimiter, onHeader }: ImportParseStepProps) {
  const preview = parse.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <span className="font-medium text-text">{sourceLabel}</span>
        <Tag tone={parse.rows.length > 0 ? 'accent' : 'warning'}>
          {parse.rows.length === 1 ? '1 row found' : `${parse.rows.length} rows found`}
        </Tag>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-label font-medium text-text">Read it as</span>
          <SegmentedControl
            aria-label="How to read the text"
            value={parse.format}
            onChange={onFormat}
            options={[
              { value: 'table', label: 'A table' },
              { value: 'qa', label: 'Questions and answers' },
            ]}
          />
        </div>

        {parse.format === 'table' ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-label font-medium text-text">Separated by</span>
              <Select
                aria-label="Column separator"
                value={parse.delimiter ?? ','}
                onChange={(value) => onDelimiter(value as Delimiter)}
                options={DELIMITER_OPTIONS}
              />
            </div>
            <Switch checked={parse.headerUsed} onChange={onHeader} label="First row is a header" />
          </>
        ) : null}
      </div>

      {parse.rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          Nothing readable came out of that. Try the other reading above, or go back and paste the text instead.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-border">
          <table className="w-full min-w-max border-collapse text-sm">
            <caption className="sr-only">The first rows, as they were read</caption>
            <thead>
              <tr>
                {parse.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="border-b border-border bg-surface-sunken px-3 py-2 text-left text-label font-semibold text-text"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.id}>
                  {row.cells.map((cell, index) => (
                    <td
                      key={index}
                      className="max-w-72 truncate border-b border-border-subtle px-3 py-2 text-text-muted"
                    >
                      {cell || <span className="text-text-faint">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview.some((row) => row.note) ? (
        <ul className="flex flex-col gap-1 text-xs text-text-muted">
          {preview
            .filter((row) => row.note)
            .map((row) => (
              <li key={row.id}>{noteText(row.note!)}</li>
            ))}
        </ul>
      ) : null}

      {parse.rows.length > PREVIEW_ROWS ? (
        <p className="text-xs text-text-faint">
          Showing the first {PREVIEW_ROWS} of {parse.rows.length} rows.
        </p>
      ) : null}
    </div>
  );
}
