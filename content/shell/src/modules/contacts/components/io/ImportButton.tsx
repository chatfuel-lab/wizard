import { useState } from 'react';
import { Button, IconFile } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import { ImportWizard } from './ImportWizard';

export interface ImportButtonProps {
  catalog: AttributeCatalog;
  /** The list refetches when an import finishes. */
  onImported: () => void;
  disabled?: boolean;
}

/**
 * The whole CSV import behind one button.
 *
 * The wizard is mounted only while it is open, which is what keeps its five
 * queries — the scope check, the resume query, the errors file — off the cost
 * of rendering the contacts table. The one thing that outlives it is the
 * import itself: it runs server-side, and reopening the dialog re-reads it
 * through `latestCSVContactsImport`.
 */
export function ImportButton({ catalog, onImported, disabled = false }: ImportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <IconFile size={14} />
        Import
      </Button>
      {open ? (
        <ImportWizard open={open} onClose={() => setOpen(false)} catalog={catalog} onImported={onImported} />
      ) : null}
    </>
  );
}
