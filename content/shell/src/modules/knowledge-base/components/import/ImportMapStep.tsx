import { Alert, Select, Tag } from '~ui';
import { FIELDS, missingRequired, type ColumnMapping, type ImportField } from '../../lib/importMapping';
import type { ImportParse } from '../../lib/importParse';
import type { ImportTarget } from '../../lib/knowledgeParams';

export interface ImportMapStepProps {
  parse: ImportParse;
  mapping: ColumnMapping;
  target: ImportTarget;
  onMap: (field: ImportField, index: number | null) => void;
}

const UNMAPPED = '';

/**
 * Which column is which field.
 *
 * The guess comes from the header names in several languages
 * (`importMapping.guessMapping`), and it is shown as a set of pickers rather
 * than as a decision: a column named "Answer" in a file where the answers are
 * actually in column 3 is exactly the mistake nobody notices until a customer
 * gets the wrong reply.
 *
 * The sample under each picker is the FIRST row's value for that field — the
 * cheapest possible proof that the mapping is right.
 */
export function ImportMapStep({ parse, mapping, target, onMap }: ImportMapStepProps) {
  const missing = missingRequired(mapping, target);
  const firstRow = parse.rows[0];
  const options = [
    { value: UNMAPPED, label: 'Not imported' },
    ...parse.columns.map((column, index) => ({ value: String(index), label: column })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 ? (
        <Alert tone="warning" title="Two columns are needed before anything can be imported">
          {missing.map((field) => field.label).join(' and ')} {missing.length === 1 ? 'has' : 'have'} no column behind{' '}
          {missing.length === 1 ? 'it' : 'them'}.
        </Alert>
      ) : null}

      <ul className="flex flex-col gap-3">
        {FIELDS[target].map((field) => {
          const index = mapping[field.id];
          const sample = index === undefined ? '' : (firstRow?.cells[index] ?? '');
          return (
            <li key={field.id} className="flex flex-col gap-1.5 @compact:flex-row @compact:items-center @compact:gap-3">
              <div className="flex min-w-40 items-center gap-2">
                <span className="text-sm font-medium text-text">{field.label}</span>
                {field.required ? <Tag tone="neutral">required</Tag> : null}
              </div>
              <Select
                aria-label={`Column for ${field.label}`}
                value={index === undefined ? UNMAPPED : String(index)}
                onChange={(value) => onMap(field.id, value === UNMAPPED ? null : Number(value))}
                options={options}
                className="min-w-48"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-text-faint">
                {index === undefined
                  ? 'Nothing from the file'
                  : sample === ''
                    ? 'First row is empty here'
                    : `First row: ${sample}`}
              </span>
            </li>
          );
        })}
      </ul>

      {target === 'products' ? (
        <p className="text-xs text-text-faint">
          A price column that carries its own symbol — $29.99, 29,99 € — is split into an amount and a currency
          automatically. Photos are never imported.
        </p>
      ) : null}
    </div>
  );
}
