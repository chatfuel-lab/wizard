import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  IconDownload,
  Input,
  Progress,
  RadioGroup,
  SegmentedControl,
  Separator,
  Spinner,
  Tag,
  safeHref,
} from '~ui';
import type { Platform, SegmentInput } from '~api/generated/contacts/graphql';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import type { ContactExportState } from '../../hooks/useContactExport';
import {
  MAX_EXPORT_IDS,
  canExport,
  cancelNote,
  columnsLabel,
  csvColumnOptions,
  defaultCsvSelection,
  effectiveExportScope,
  exportAttributes,
  exportStatusLabel,
  isTerminal,
  scopeDescription,
  toggleCsvColumn,
  type ColumnMode,
  type ExportScope,
} from '../../lib/csvColumns';

/**
 * CSV export: which contacts, which columns, and then the task.
 *
 * The dialog's whole job is to make the two choices *different* rather than
 * interchangeable, because the API's two start mutations are:
 *
 * - `csvContactExportStartByIDsList` covers the selection exactly, and takes
 *   at most 100 ids — so a bigger selection is several exports and several
 *   files, which is said here before the button is pressed rather than
 *   discovered when two downloads appear.
 * - `csvContactExportStartBySegment` covers everything the *server-side*
 *   filter matches. Filters this module applies client-side cannot narrow it,
 *   and with no segment at all it is the entire address book.
 *
 * And an empty `attributes` list means **all** attributes, so "everything" and
 * "no boxes ticked" cannot be the same request: the second is refused.
 */

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  segment: SegmentInput | null;
  platforms?: readonly Platform[];
  selectedIds: readonly string[];
  catalog: AttributeCatalog;
  exporter: ContactExportState;
}

export function ExportDialog({ open, onClose, segment, platforms, selectedIds, catalog, exporter }: ExportDialogProps) {
  const options = useMemo(() => csvColumnOptions(catalog.entries), [catalog.entries]);
  /* Null = "the user has not chosen"; the default is derived, never seeded.
     This dialog is mounted with the toolbar and outlives every opening, so a
     `useState` read from the selection would freeze at "segment" before
     anything was ticked — see `effectiveExportScope`. */
  const [chosenScope, setChosenScope] = useState<ExportScope | null>(null);
  const [mode, setMode] = useState<ColumnMode>('all');
  const [selected, setSelected] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');

  /* Null until the catalog has loaded: defaulting to [] would tick nothing and
     then never correct itself once the attributes arrived. */
  const ticked = selected ?? defaultCsvSelection(options);
  const request = exportAttributes(mode, ticked, options);
  const { progress, files } = exporter;
  /* Every download address arrived from the server, so each one goes through
     `safeHref` before it becomes a link. `files` itself is left alone: the
     counts below compare against what the export produced, not against what
     survived this check. */
  const downloads = files.flatMap((file) => {
    const href = safeHref(file.url);
    return href === null ? [] : [{ ...file, href }];
  });

  const effectiveScope = effectiveExportScope(chosenScope, selectedIds.length);
  const ready = canExport(mode, request) && !exporter.starting;
  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle === '' ? options : options.filter((option) => option.name.toLowerCase().includes(needle));
  }, [options, query]);

  const start = () => {
    if (effectiveScope === 'ids') void exporter.startByIds(selectedIds, request.names);
    else void exporter.startBySegment(segment, request.names, platforms);
  };

  const note = cancelNote(progress, exporter.cancelRequested);

  const footer = progress ? (
    <>
      {isTerminal(progress.phase) ? (
        <Button variant="secondary" onClick={exporter.clear}>
          Export something else
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => void exporter.cancel()} disabled={exporter.cancelling}>
          {exporter.cancelling ? 'Cancelling…' : 'Cancel export'}
        </Button>
      )}
      <Button onClick={onClose}>Close</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={start} disabled={!ready}>
        {exporter.starting ? <Spinner size={14} /> : <IconDownload size={16} />}
        Export CSV
      </Button>
    </>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Export contacts" size="md" footer={footer}>
      {exporter.error ? (
        <Alert tone="danger" title="The export ran into a problem" className="mb-3">
          {exporter.error}
        </Alert>
      ) : null}

      {progress ? (
        <div className="flex flex-col gap-3">
          {exporter.restored ? (
            <Alert tone="info" title="Picked up where you left off">
              An export was already running on this bot, so it was adopted instead of started again.
            </Alert>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-body font-medium text-text">
                {exportStatusLabel(progress)}
                {exporter.chunkCount > 1 ? ` · part ${exporter.chunkIndex} of ${exporter.chunkCount}` : ''}
              </span>
              {progress.percent === null ? null : (
                <span className="text-meta tabular-nums text-text-muted">{progress.percent}%</span>
              )}
            </div>
            <Progress
              label={exportStatusLabel(progress)}
              value={progress.percent ?? undefined}
              tone={progress.phase === 'failed' ? 'danger' : progress.phase === 'done' ? 'success' : 'accent'}
            />
            {progress.percent === null && !isTerminal(progress.phase) ? (
              <p className="mt-1.5 text-meta text-text-muted">
                The server has not published a row total yet, so this bar cannot show a percentage.
              </p>
            ) : null}
          </div>

          {note ? <p className="text-meta text-text-muted">{note}</p> : null}

          {files.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {downloads.map((file) => (
                <a
                  key={file.url}
                  href={file.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-field w-fit items-center gap-1.5 rounded-control bg-accent px-4 text-body font-medium text-accent-fg transition-colors duration-fast ease-standard hover:bg-accent-hover focus-visible:focus-ring"
                >
                  <IconDownload size={16} />
                  Download {file.label}
                </a>
              ))}
              {exporter.chunkCount > 1 && files.length < exporter.chunkCount ? (
                <p className="text-meta text-text-muted">
                  {exporter.chunkCount - files.length} more file
                  {exporter.chunkCount - files.length === 1 ? '' : 's'} to come — the API exports at most{' '}
                  {MAX_EXPORT_IDS} contacts per file.
                </p>
              ) : null}
            </div>
          ) : null}

          {progress.phase === 'done' && !progress.fileUrl && files.length === 0 ? (
            <Alert tone="warning" title="Finished without a file">
              The task ended but carried no downloadable file. Starting it again is safe.
            </Alert>
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
            legend="Which contacts"
            value={effectiveScope}
            onChange={setChosenScope}
            options={[
              {
                value: 'ids',
                label: `The selection (${selectedIds.length.toLocaleString()})`,
                description: scopeDescription('ids', selectedIds.length, segment !== null),
                disabled: selectedIds.length === 0,
              },
              {
                value: 'segment',
                label: segment ? 'Everything this filter matches' : 'Every contact on this bot',
                description: scopeDescription('segment', selectedIds.length, segment !== null),
              },
            ]}
          />

          <Separator />

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-body font-medium text-text">Columns</span>
              <SegmentedControl
                aria-label="Which attributes to export"
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'all', label: 'Everything' },
                  { value: 'selected', label: 'Pick fields' },
                ]}
              />
            </div>

            {mode === 'all' ? null : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Find a field…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Filter the field list"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(visibleOptions.map((option) => option.name))}
                  >
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                    None
                  </Button>
                </div>

                <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-card border border-border p-2">
                  {catalog.loading ? <Spinner size={14} /> : null}
                  {visibleOptions.map((option) => (
                    <div key={option.name} className="flex items-center gap-2">
                      <Checkbox
                        checked={ticked.includes(option.name)}
                        onChange={() => setSelected((current) => toggleCsvColumn(current ?? ticked, option.name))}
                        label={option.name}
                      />
                      {(option.usersCount ?? 0) === 0 ? <Tag tone="neutral">no contact has a value</Tag> : null}
                    </div>
                  ))}
                  {!catalog.loading && visibleOptions.length === 0 ? (
                    <p className="text-meta text-text-faint">No field matches that.</p>
                  ) : null}
                </div>

                {request.names.length === 0 ? (
                  <p className="text-meta text-warning">
                    Pick at least one field. An empty list is how the API is told to export <em>everything</em>, so it
                    cannot also mean “nothing”.
                  </p>
                ) : null}
                {request.dropped.length > 0 ? (
                  <p className="text-meta text-text-muted">
                    {request.dropped.length} picked field
                    {request.dropped.length === 1 ? ' is' : 's are'} no longer in the catalog and will be left out.
                  </p>
                ) : null}
              </div>
            )}

            <p className="mt-2 text-micro text-text-faint">{columnsLabel(mode, request)}</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}
