import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, Input, Label } from '~ui';
import type { CatalogEntry } from '../../hooks/useAttributeCatalog';
import { useFieldDefault } from '../../hooks/useFieldDefault';
import { canApplyDefault, defaultAction, defaultConsequence, type DefaultAction } from '../../lib/fields';

export interface DefaultValueDialogProps {
  entry: CatalogEntry | null;
  /** Contacts on the bot, for the "how many would change" sentence. Null = unknown. */
  totalContacts: number | null;
  onClose: () => void;
  /** The catalog refetches so the row shows the new default. */
  onApplied: () => void;
}

const ACTION_LABELS: Record<DefaultAction, string> = {
  set: 'Set default',
  update: 'Change default',
  remove: 'Remove default',
};

/**
 * The most dangerous control in the module, behind the plainest sentence I can
 * write for it.
 *
 * A bot-wide default value is not a display setting: the API answers it for
 * every contact that has no value of its own, so the field reads as filled in
 * everywhere — in this list, in every saved view, and in every flow that
 * branches on "is empty". The deals module met the same trap from the other side, where
 * `botAttributeCreateDefaultVal` looked like a create-field API and would have
 * destroyed every IS_NOT_EMPTY heuristic on the bot.
 *
 * So the consequence is spelled out with the real number of contacts it moves
 * (`defaultConsequence`), the button stays disabled until the value actually
 * changes, and no undo is offered — an undo toast for a change to what every
 * filter MEANS is a promise this module cannot keep. Removing it later is its
 * own deliberate act, from this same dialog.
 */
export function DefaultValueDialog({ entry, totalContacts, onClose, onApplied }: DefaultValueDialogProps) {
  const [draft, setDraft] = useState('');
  const api = useFieldDefault();
  const name = entry?.name ?? null;
  const { clearError } = api;

  useEffect(() => {
    setDraft(entry?.defaultValue ?? '');
    clearError();
    // The draft belongs to the field that was opened, not to every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, clearError]);

  if (!entry) return null;

  const action = defaultAction(entry, draft);
  const armed = canApplyDefault(entry, draft) && !api.saving;

  const apply = async () => {
    const ok = await api.apply(entry, draft);
    if (!ok) return;
    onApplied();
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Default value for “${entry.name}”`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={action === 'remove' ? 'secondary' : 'primary'}
            disabled={!armed}
            loading={api.saving}
            onClick={() => void apply()}
          >
            {ACTION_LABELS[action]}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="contacts-default-value" hint="Leave empty to remove the default.">
            Default value
          </Label>
          <Input
            id="contacts-default-value"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. EUR"
            autoFocus
          />
        </div>

        <Alert tone={action === 'remove' ? 'info' : 'warning'} title="What this changes">
          {defaultConsequence(entry, totalContacts, draft)}
        </Alert>

        <p className="text-xs text-text-muted">
          There is no undo for this. The value can be changed or removed again from here, but while it is set every
          contact reads the field as filled in — including contacts nobody ever touched.
        </p>

        {api.error ? (
          <Alert tone="danger" title="The server refused the default value">
            {api.error}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
