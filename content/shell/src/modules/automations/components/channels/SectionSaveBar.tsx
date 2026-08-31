import { Button, Kbd } from '~ui';

export interface SectionSaveBarProps {
  dirty: boolean;
  saving: boolean;
  /** Inline error from validation or the last save. */
  error: string | null;
  /** The server moved under the draft — "Changed elsewhere". */
  conflict: boolean;
  onSave: () => void;
  onCancel: () => void;
  onUseTheirs: () => void;
  onKeepMine: () => void;
  canEdit: boolean;
}

/**
 * The footer of every draft section: Save (primary) + Cancel (ghost) while
 * the draft is dirty, the inline error under them, and the conflict banner
 * ("Changed elsewhere · Use theirs / Keep mine") when a live update landed
 * under an edit. Nothing renders while there is nothing to say — a section
 * whose value equals the server's has no footer.
 *
 * `⌘S` is the workspace's (save every dirty draft); the bar only shows the
 * hint. Buttons run full width below `@compact`, side by side above it.
 */
export function SectionSaveBar({
  dirty,
  saving,
  error,
  conflict,
  onSave,
  onCancel,
  onUseTheirs,
  onKeepMine,
  canEdit,
}: SectionSaveBarProps) {
  if (!canEdit) return null;
  if (!dirty && !error && !conflict) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle pt-3" data-section-save-bar>
      {conflict ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-xs @compact:flex-row @compact:items-center @compact:justify-between"
        >
          <span className="text-text">Changed elsewhere — someone saved this setting while you were editing.</span>
          <span className="flex shrink-0 items-center gap-1">
            <Button size="xs" variant="secondary" onClick={onUseTheirs}>
              Use theirs
            </Button>
            <Button size="xs" variant="ghost" onClick={onKeepMine}>
              Keep mine
            </Button>
          </span>
        </div>
      ) : null}
      {dirty ? (
        <div className="flex flex-col gap-2 @compact:flex-row @compact:items-center">
          <Button size="sm" onClick={onSave} loading={saving} disabled={saving} className="w-full @compact:w-auto">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="w-full @compact:w-auto">
            Cancel
          </Button>
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
