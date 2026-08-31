import { Button, IconWarning, Kbd } from '~ui';

export interface FaqSaveBarProps {
  dirty: boolean;
  saving: boolean;
  /** The last save failure, in the words `lib/errors.ts` chose. */
  error: string | null;
  conflict: boolean;
  /** Entries with no question — the one thing that blocks a write. */
  blocked: number;
  canSave: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onUseTheirs: () => void;
  onKeepMine: () => void;
  canEdit: boolean;
}

/**
 * The one write on this page.
 *
 * It is a footer rather than a per-row control because `fuelyConfigSetFAQs`
 * replaces the whole array: there is no such thing as saving one entry, and a
 * per-row Save would be a lie about what the request does.
 *
 * The conflict banner is the reason this component is not just a button. The
 * store re-reads the live list before every write and REFUSES it when somebody
 * else has edited in the meantime — so the choice ("their list, or mine over
 * theirs") has to be shown, with the draft still on screen behind it. A toast
 * here would be a toast that loses an afternoon of typing.
 */
export function FaqSaveBar({
  dirty,
  saving,
  error,
  conflict,
  blocked,
  canSave,
  onSave,
  onDiscard,
  onUseTheirs,
  onKeepMine,
  canEdit,
}: FaqSaveBarProps) {
  if (!canEdit) return null;
  if (!dirty && !error && !conflict) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface-raised px-gutter py-2">
      {conflict ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-xs @compact:flex-row @compact:items-center @compact:justify-between"
        >
          <span className="flex items-start gap-2 text-text">
            <IconWarning size={14} className="mt-0.5 shrink-0 text-warning" />
            <span>
              Changed elsewhere — somebody saved a different FAQ list while you were editing. Your edits are still here.
            </span>
          </span>
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
          <Button size="sm" onClick={onSave} loading={saving} disabled={!canSave} className="w-full @compact:w-auto">
            Save the FAQ
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard} disabled={saving} className="w-full @compact:w-auto">
            Discard changes
          </Button>
          {blocked > 0 ? (
            <span className="text-micro text-warning">
              {blocked === 1 ? 'One entry has no question' : `${blocked} entries have no question`} — the assistant has
              no way to match {blocked === 1 ? 'it' : 'them'}.
            </span>
          ) : (
            <span className="hidden items-center gap-1 text-micro text-text-faint @compact:ml-auto @compact:inline-flex">
              <Kbd keys={['mod', 'S']} /> saves every draft
            </span>
          )}
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
