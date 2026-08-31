import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  IconDownload,
  Progress,
  RadioGroup,
  SegmentedControl,
  Separator,
  Spinner,
  Tag,
  safeHref,
} from '~ui';
import type { DealExportState } from '../hooks/useDealExport';
import {
  canExport,
  columnsLabel,
  csvColumnOptions,
  defaultCsvSelection,
  exportAttributes,
  exportStatusLabel,
  isTerminal,
  toggleCsvColumn,
  type ColumnMode,
} from '../lib/csvColumns';
import type { DealFieldBindings } from '../lib/dealFieldBinding';

/**
 * CSV export — the two starts the API offers, and the difference between them
 * stated rather than smoothed over.
 *
 * `csvContactExportStartByIDsList` takes the ids this view has loaded, so it
 * exports exactly these deals and nothing else — which is why the loaded count
 * is on screen and why "load the rest" is offered here too.
 *
 * `csvContactExportStartBySegment` cannot be limited to deals at all:
 * `SegmentInput` has no sales-stage predicate (the same limitation that costs
 * the table's attribute engine its deal isolation). So that option exports
 * every contact on the bot, and says so instead of implying it is filtered.
 *
 * An empty `attributes` list means **all** attributes, which is why "every
 * attribute" and "no columns ticked" cannot be the same request.
 */

export type ExportScope = 'deals' | 'contacts';

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  bindings: DealFieldBindings;
  /** Ids of every loaded deal — what a by-ids export can cover. */
  loadedIds: readonly string[];
  /** Server truth for the window, so the dialog can say what is missing. */
  totalDeals: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadRest: () => void;
  exporter: DealExportState;
}

export function ExportDialog({
  open,
  onClose,
  bindings,
  loadedIds,
  totalDeals,
  hasMore,
  loadingMore,
  onLoadRest,
  exporter,
}: ExportDialogProps) {
  const [scope, setScope] = useState<ExportScope>('deals');
  const [mode, setMode] = useState<ColumnMode>('selected');
  const options = useMemo(() => csvColumnOptions(bindings), [bindings]);
  const [selected, setSelected] = useState<string[]>(() => defaultCsvSelection(bindings));

  const attributes = exportAttributes(mode, selected, options);
  const { progress } = exporter;
  /* The address arrived from the server, so it goes through `safeHref`
     before it becomes a link — the rule content/ui already lives by. A
     rejected address leaves the button out rather than rendering a link that
     does something else. */
  const fileHref = progress?.fileUrl ? safeHref(progress.fileUrl) : null;
  const ready = canExport(mode, attributes) && (scope === 'contacts' || loadedIds.length > 0);

  const start = () => {
    if (scope === 'contacts') void exporter.startBySegment(attributes);
    else void exporter.startByIds(loadedIds, attributes);
  };

  const footer = progress ? (
    <>
      {isTerminal(progress.phase) ? null : (
        <Button variant="ghost" onClick={() => void exporter.cancel()} disabled={exporter.cancelling}>
          {exporter.cancelling ? 'Cancelling…' : 'Cancel export'}
        </Button>
      )}
      {isTerminal(progress.phase) ? (
        <Button variant="secondary" onClick={exporter.clear}>
          Start another
        </Button>
      ) : null}
      <Button onClick={onClose}>Close</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={start} disabled={!ready || exporter.starting}>
        {exporter.starting ? <Spinner size={14} /> : <IconDownload size={16} />}
        Export CSV
      </Button>
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Export CSV" size="md" footer={footer}>
      {exporter.error ? (
        <Alert tone="danger" title="The export ran into a problem" className="mb-3">
          {exporter.error}
        </Alert>
      ) : null}

      {progress ? (
        <div className="flex flex-col gap-3">
          {exporter.restored ? (
            <Alert tone="info" title="Picked up where you left off">
              This export was already running on this bot, so it was restored instead of started again.
            </Alert>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-text">{exportStatusLabel(progress)}</span>
              {progress.percent === null ? null : (
                <span className="text-xs tabular-nums text-text-muted">{progress.percent}%</span>
              )}
            </div>
            <Progress
              label={exportStatusLabel(progress)}
              value={progress.percent ?? undefined}
              tone={progress.phase === 'failed' ? 'danger' : progress.phase === 'done' ? 'success' : 'accent'}
            />
            {progress.percent === null && !isTerminal(progress.phase) ? (
              <p className="mt-1.5 text-xs text-text-muted">
                The server has not published a total yet, so this bar cannot show a percentage.
              </p>
            ) : null}
          </div>

          {progress.phase === 'done' && fileHref ? (
            <a
              href={fileHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-field w-fit items-center gap-1.5 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:focus-ring"
            >
              <IconDownload size={16} />
              Download the file
            </a>
          ) : null}

          {progress.phase === 'failed' ? (
            <Alert tone="danger" title="The export failed">
              The server ended the task without producing a file. Starting it again is safe.
            </Alert>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <RadioGroup
            legend="What to export"
            value={scope}
            onChange={setScope}
            options={[
              {
                value: 'deals',
                label: `These deals (${loadedIds.length.toLocaleString()} loaded)`,
                description:
                  loadedIds.length === 0
                    ? 'No deals are loaded yet.'
                    : hasMore
                      ? `Exports the ${loadedIds.length.toLocaleString()} deals loaded so far, of ${totalDeals.toLocaleString()} in this window. Load the rest to include them all.`
                      : `Exports all ${loadedIds.length.toLocaleString()} loaded deals — every deal in this window.`,
                disabled: loadedIds.length === 0,
              },
              {
                value: 'contacts',
                label: 'Every contact on this bot',
                description:
                  'Not just deals: the segment export has no sales-stage predicate, so it cannot be narrowed to the pipeline.',
              },
            ]}
          />

          {scope === 'deals' && hasMore ? (
            <Button variant="ghost" size="sm" onClick={onLoadRest} disabled={loadingMore} className="w-fit">
              {loadingMore ? <Spinner size={12} /> : null}
              {loadingMore ? 'Loading…' : 'Load the rest first'}
            </Button>
          ) : null}

          <Separator />

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text">Columns</span>
              <SegmentedControl
                aria-label="Which attributes to export"
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'selected', label: 'Deal fields' },
                  { value: 'all', label: 'Everything' },
                ]}
              />
            </div>

            {mode === 'all' ? (
              <p className="text-xs text-text-muted">
                An empty attribute list exports every attribute the contact has — including ones this module never
                wrote. The file will be wider than the pipeline.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {options.map((option) => (
                  <div key={option.name} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.includes(option.name)}
                      onChange={() => setSelected((current) => toggleCsvColumn(current, option.name))}
                      label={option.label}
                    />
                    {option.bound ? null : <Tag tone="neutral">not on this bot yet</Tag>}
                  </div>
                ))}
                {attributes.length === 0 ? (
                  <p className="mt-1 text-xs text-warning">
                    Pick at least one column. An empty list is how the API is told to export
                    <em> everything</em>, so it cannot be sent as “nothing”.
                  </p>
                ) : null}
              </div>
            )}

            <p className="mt-2 text-xs text-text-faint">{columnsLabel(mode, attributes)}</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
