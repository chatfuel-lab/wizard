import { Button, Kbd } from '~ui';

export interface SectionSaveBarProps {
  dirty: boolean;
  saving?: boolean;
  /** Inline error from the last save. */
  error?: string | null;
  /** The record moved under the draft — "Changed elsewhere". */
  conflict?: boolean;
  /** Omit on a bar that only reports (a field row showing its own conflict). */
  onSave?: () => void;
  onCancel?: () => void;
  onUseTheirs?: () => void;
  onKeepMine?: () => void;
  canEdit: boolean;
  /** Replaces "Save" — the profile page says how many changes it is writing. */
  saveLabel?: string;
  /** Off under a single field, where the rule would cut the field in half. */
  divider?: boolean;
}

/**
 * The footer of a draft section: Save + Cancel while it is dirty, the inline
 * error under them, and the "Changed elsewhere · Use theirs / Keep mine"
 * banner when a refetch landed under an edit. Nothing renders while there is
 * nothing to say — a section whose value equals the server's has no footer.
 *
 * Same component, two jobs on these pages: one bar at the bottom of the
 * profile saving all seven of its drafts, and a bare conflict strip under an
 * individual field that lost a race. That is why every handler is optional —
 * the strip has nothing to save.
 *
 * `⌘S` is the workspace's (save every dirty draft); the bar only shows the
 * hint. Buttons run full width below `@compact`, side by side above it.
 */
export function SectionSaveBar({
  dirty,
  saving = false,
  error = null,
  conflict = false,
  onSave,
  onCancel,
  onUseTheirs,
  onKeepMine,
  canEdit,
  saveLabel = 'Save',
  divider = true,
}: SectionSaveBarProps) {
  if (!canEdit) return null;
  if (!dirty && !error && !conflict) return null;
  return (
    <div className={`flex flex-col gap-2 ${divider ? 'border-t border-border-subtle pt-3' : ''}`} data-section-save-bar>
      {conflict ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-xs @compact:flex-row @compact:items-center @compact:justify-between"
        >
          <span className="text-text">Changed elsewhere — this was saved somewhere else while you were editing.</span>
          {onUseTheirs && onKeepMine ? (
            <span className="flex shrink-0 items-center gap-1">
              <Button size="xs" variant="secondary" onClick={onUseTheirs}>
                Use theirs
              </Button>
              <Button size="xs" variant="ghost" onClick={onKeepMine}>
                Keep mine
              </Button>
            </span>
          ) : null}
        </div>
      ) : null}
      {dirty && onSave ? (
        <div className="flex flex-col gap-2 @compact:flex-row @compact:items-center">
          <Button size="sm" onClick={onSave} loading={saving} disabled={saving} className="w-full @compact:w-auto">
            {saveLabel}
          </Button>
          {onCancel ? (
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="w-full @compact:w-auto">
              Cancel
            </Button>
          ) : null}
          <span className="hidden items-center gap-1 text-micro text-text-faint @compact:ml-auto @compact:inline-flex">
            <Kbd keys={['mod', 'S']} /> saves every draft
          </span>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
