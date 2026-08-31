import { Alert, Button, IconDownload, Progress, Spinner, safeHref } from '~ui';
import type { DealExportState } from '../hooks/useDealExport';
import { exportStatusLabel, isTerminal } from '../lib/csvColumns';

export interface TableExportStatusProps {
  exporter: DealExportState;
}

/**
 * The table's export, while it runs.
 *
 * `ExportDialog` belongs to the forecast, where the choice being made is *what*
 * to export — every contact, or the loaded window, and which columns. The table
 * has already answered that question: the selection is the set, and the deal
 * fields are the columns. All that is left is the part an export cannot do
 * without, which is somewhere to see the progress and reach the file.
 *
 * It renders nothing until an export exists, so the row is not a permanent
 * strip of chrome above a table that mostly is not exporting anything.
 */
export function TableExportStatus({ exporter }: TableExportStatusProps) {
  const { progress, error } = exporter;
  /* The address arrived from the server, so it goes through `safeHref`
     before it becomes a link — the rule content/ui already lives by. A
     rejected address leaves the button out rather than rendering a link that
     does something else. */
  const fileHref = progress?.fileUrl ? safeHref(progress.fileUrl) : null;
  if (error === null && progress === null) return null;

  return (
    <div className="px-gutter pt-3">
      {error ? (
        <Alert tone="danger" title="The export ran into a problem">
          {error}
        </Alert>
      ) : null}

      {progress ? (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface-raised px-3 py-2 animate-slide-in-top">
          <span className="shrink-0 text-sm text-text">{exportStatusLabel(progress)}</span>

          {isTerminal(progress.phase) ? null : (
            <span className="min-w-24 flex-1">
              <Progress label={exportStatusLabel(progress)} value={progress.percent ?? undefined} />
            </span>
          )}

          <span className="ml-auto flex shrink-0 items-center gap-1">
            {progress.phase === 'done' && fileHref ? (
              <a
                href={fileHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-field-sm items-center gap-1.5 rounded-control bg-accent px-3 text-sm font-medium text-accent-fg transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:focus-ring"
              >
                <IconDownload size={14} />
                Download
              </a>
            ) : null}

            {isTerminal(progress.phase) ? (
              <Button variant="ghost" size="sm" onClick={exporter.clear}>
                Dismiss
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => void exporter.cancel()} disabled={exporter.cancelling}>
                {exporter.cancelling ? <Spinner size={12} /> : null}
                {exporter.cancelling ? 'Cancelling…' : 'Cancel'}
              </Button>
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
