import { useState } from 'react';
import { Button, IconDownload, Spinner } from '~ui';
import type { Platform, SegmentInput } from '~api/generated/contacts/graphql';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import { useContactExport } from '../../hooks/useContactExport';
import { isTerminal } from '../../lib/csvColumns';
import { ExportDialog } from './ExportDialog';

export interface ExportButtonProps {
  /** The segment behind the current list, or null for "everything". */
  segment: SegmentInput | null;
  /** Selected contact ids — the by-ids export path, capped at 100 by the API. */
  selectedIds: readonly string[];
  catalog: AttributeCatalog;
  disabled?: boolean;
  /**
   * The channel filter behind the list. `csvContactExportStartBySegment` takes
   * `platforms` as a separate argument from the segment, so leaving it out
   * would export channels the list is not showing. Defaults to all five.
   */
  platforms?: readonly Platform[];
}

/**
 * Export, and everything that has to stay visible about it.
 *
 * The export outlives the dialog: a task keeps running when the dialog is
 * closed, and `bot.lastActiveCSVContactsExportTask` will hand it back after a
 * reload. So the *button* carries the state — a spinner while it runs, a
 * marker when a file is waiting — and the dialog is where the detail lives.
 * The alternative, a permanent status strip above the table, is chrome that is
 * empty almost all of the time.
 */
export function ExportButton({ segment, selectedIds, catalog, disabled = false, platforms }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const exporter = useContactExport();
  const running = exporter.progress !== null && !isTerminal(exporter.progress.phase);
  const ready = exporter.files.length > 0;

  return (
    <>
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        {running ? <Spinner size={14} /> : <IconDownload size={14} />}
        {running
          ? `Exporting${exporter.progress?.percent === null ? '…' : ` ${exporter.progress?.percent}%`}`
          : ready
            ? 'CSV ready'
            : 'Export'}
      </Button>
      <ExportDialog
        open={open}
        onClose={() => setOpen(false)}
        segment={segment}
        platforms={platforms}
        selectedIds={selectedIds}
        catalog={catalog}
        exporter={exporter}
      />
    </>
  );
}
