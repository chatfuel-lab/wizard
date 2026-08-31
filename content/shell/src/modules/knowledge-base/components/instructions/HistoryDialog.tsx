import { Alert, Button, Dialog, EmptyState, IconClock, IconUndo } from '~ui';
import { versionAge, versionPreview, type Version } from '../../lib/instructionsHistory';

export interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  versions: readonly Version[];
  /** Loads the old text into the editor as an unsaved draft. Never writes. */
  onRestore: (version: Version) => void;
  /** Supplied by the caller so the ages are stable for one open of the dialog. */
  now: number;
}

/**
 * Earlier versions of the prompt, from this session.
 *
 * The honesty here is the whole feature. There is no history API — the server
 * keeps one string and overwrites it — so this list exists only in the page,
 * empties on reload, and cannot show anything from before the page was opened.
 * Saying that in a banner is cheaper than a person finding it out by needing
 * it. See `lib/instructionsHistory.ts`.
 */
export function HistoryDialog({ open, onClose, versions, onRestore, now }: HistoryDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Earlier versions" size="lg">
      <Alert tone="info" title="This session only">
        Chatfuel keeps no history of these instructions, so the module keeps its own while the page is open. Reloading
        empties this list. Restoring loads the old text into the editor without saving it.
      </Alert>

      {versions.length === 0 ? (
        <EmptyState icon={<IconClock />} title="Nothing saved yet in this session" />
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border-subtle">
          {versions.map((version) => (
            <li
              key={`${version.at}-${version.value.length}`}
              className="flex flex-col gap-2 py-3 first:pt-0 @compact:flex-row @compact:items-start @compact:gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-muted">{versionAge(version.at, now)}</p>
                <p className="mt-0.5 text-sm text-text">{versionPreview(version.value)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0 self-start"
                onClick={() => {
                  onRestore(version);
                  onClose();
                }}
              >
                <IconUndo />
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
