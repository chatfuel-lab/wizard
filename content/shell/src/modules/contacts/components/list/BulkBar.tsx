import { useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Combobox,
  Dialog,
  DropdownMenu,
  IconChevronDown,
  IconClose,
  IconTrash,
  Input,
  Label,
  Progress,
  type MenuItem,
} from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import type { ContactRow, TeamMember } from '../../types';
import {
  MAX_BULK,
  describeAction,
  planBulk,
  planCaveat,
  planSummary,
  type BulkAction,
  type BulkPlan,
  type BulkProgress,
} from '../../lib/bulk';
import { STAGE_META, STAGE_ORDER } from '../../lib/tableColumns';

export interface BulkBarProps {
  selected: ContactRow[];
  canEdit: boolean;
  team: TeamMember[];
  catalog: AttributeCatalog;
  /** Non-null while a run is in flight. */
  progress: BulkProgress | null;
  onStop: () => void;
  onRun: (plan: BulkPlan) => void;
  onClear: () => void;
  /** Offered only when the filter matches more than is already selected. */
  selectAll: { label: string; onSelect: () => void } | null;
}

/**
 * What N selected contacts can be done to.
 *
 * **Why this is not `~ui`'s `ActionBar`.** That component takes a flat
 * `MenuItem[]`, renders every entry as a button in one horizontal row and drops
 * group labels entirely. The five kinds of bulk action here — six stages, three
 * or more owners, set a field, clear a field, export — would be eleven buttons
 * in a horizontal scroller with no way to tell which group a button belongs to.
 * It also has no slot for the progress row, and a run of 300 sequential
 * requests must be visible and stoppable from the same place it was started.
 * The positioning, the layer and the "not portalled" rule are copied from it
 * exactly, so an embed still bounds the bar inside the module.
 *
 * Every action goes through `planBulk` before anything happens, so the dialog
 * can say how many requests it is about to make and what it is skipping. That
 * matters here more than in most tables: this API has no bulk mutation, so
 * "move 300 contacts to Won" is 300 round trips and the user is entitled to
 * know that before, not after.
 *
 * **Export is not one of these buttons**, and that is a mount decision rather
 * than an omission: `ExportButton` owns an export task and a subscription to
 * it, so a second copy down here would run both twice and the bar's copy would
 * unmount — killing its own task — the moment the selection emptied. The
 * toolbar's single instance already takes `selectedIds`, so "export what I
 * picked" happens there.
 */
export function BulkBar({
  selected,
  canEdit,
  team,
  catalog,
  progress,
  onStop,
  onRun,
  onClear,
  selectAll,
}: BulkBarProps) {
  const [pending, setPending] = useState<BulkPlan | null>(null);
  const [fieldDialog, setFieldDialog] = useState<'set' | 'clear' | null>(null);

  const propose = (action: BulkAction) => {
    const plan = planBulk(action, selected);
    /* A one-row change is not worth a dialog; a run that is long enough to be
       interrupted, or that the cap will truncate, always is. */
    if (plan.targets.length === 0 || plan.capped || plan.targets.length > 1) {
      setPending(plan);
      return;
    }
    onRun(plan);
  };

  const stageItems = useMemo<MenuItem[]>(
    () =>
      STAGE_ORDER.map((stage) => ({
        id: `stage-${stage}`,
        label: STAGE_META[stage].label,
        onSelect: () => propose({ kind: 'stage', stage }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  );

  const ownerItems = useMemo<MenuItem[]>(
    () => [
      { id: 'owner-ai', label: 'Fuely AI', onSelect: () => propose({ kind: 'assign', to: { kind: 'ai' } }) },
      { id: 'owner-none', label: 'Unassign', onSelect: () => propose({ kind: 'assign', to: { kind: 'none' } }) },
      ...(team.length > 0 ? [{ kind: 'separator' as const, id: 'owner-sep' }] : []),
      ...team.map((member) => ({
        id: `owner-${member.user.id}`,
        label: member.user.name,
        onSelect: () =>
          propose({
            kind: 'assign',
            to: { kind: 'user', userAccountId: member.user.id, name: member.user.name },
          }),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [team, selected],
  );

  if (progress) {
    return (
      <Shell>
        <span className="shrink-0 whitespace-nowrap px-1.5 text-body font-medium tabular-nums">
          {progress.stopping ? 'Stopping…' : 'Working…'}
        </span>
        <Progress
          value={progress.done}
          max={progress.total}
          label={`${progress.done} of ${progress.total} contacts updated`}
          size="sm"
          tone={progress.failures.length > 0 ? 'warning' : 'accent'}
          className="w-40 shrink-0"
        />
        <span className="shrink-0 whitespace-nowrap text-meta tabular-nums text-text-muted">
          {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
          {progress.failures.length > 0 ? ` · ${progress.failures.length} failed` : ''}
        </span>
        <Button variant="secondary" size="sm" onClick={onStop} disabled={progress.stopping}>
          Stop
        </Button>
      </Shell>
    );
  }

  if (selected.length === 0) return null;

  return (
    <>
      <Shell>
        <span className="shrink-0 whitespace-nowrap px-1.5 text-body font-medium tabular-nums">
          {selected.length.toLocaleString()} selected
        </span>

        {selectAll ? (
          <Button variant="ghost" size="sm" onClick={selectAll.onSelect}>
            {selectAll.label}
          </Button>
        ) : null}

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />

        {canEdit ? (
          <>
            <DropdownMenu
              items={stageItems}
              placement="top-start"
              aria-label="Set the stage"
              trigger={(props) => (
                <Button {...props} variant="ghost" size="sm">
                  Stage
                  <IconChevronDown size={12} />
                </Button>
              )}
            />
            <DropdownMenu
              items={ownerItems}
              placement="top-start"
              aria-label="Assign an owner"
              trigger={(props) => (
                <Button {...props} variant="ghost" size="sm">
                  Owner
                  <IconChevronDown size={12} />
                </Button>
              )}
            />
            <Button variant="ghost" size="sm" onClick={() => setFieldDialog('set')}>
              Set a field
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFieldDialog('clear')}>
              <IconTrash size={14} />
              Clear a field
            </Button>
          </>
        ) : null}

        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
        <Button iconOnly variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          <IconClose />
        </Button>
      </Shell>

      <ConfirmRun
        plan={pending}
        onCancel={() => setPending(null)}
        onConfirm={(plan) => {
          setPending(null);
          onRun(plan);
        }}
      />

      <FieldDialog
        mode={fieldDialog}
        catalog={catalog}
        onClose={() => setFieldDialog(null)}
        onSubmit={(action) => {
          setFieldDialog(null);
          propose(action);
        }}
      />
    </>
  );
}

/**
 * The bar's frame.
 *
 * Deliberately not portalled, exactly as `ActionBar` is not: an embed occupies
 * one panel of somebody else's page, and a `position: fixed` bar hung off the
 * body would stretch across the host's whole viewport. It sits at `z-rail`,
 * above the sticky table header and below every dropdown opened from it.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-rail flex justify-center px-4">
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-card border border-border bg-surface-overlay px-2 py-1.5 shadow-overlay animate-slide-in-bottom"
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmRun({
  plan,
  onCancel,
  onConfirm,
}: {
  plan: BulkPlan | null;
  onCancel: () => void;
  onConfirm: (plan: BulkPlan) => void;
}) {
  const caveat = plan ? planCaveat(plan) : null;
  const nothing = plan !== null && plan.targets.length === 0;

  return (
    <Dialog
      open={plan !== null}
      onClose={onCancel}
      title={plan ? describeAction(plan.action) : ''}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {nothing ? 'Close' : 'Cancel'}
          </Button>
          {nothing || !plan ? null : (
            <Button size="sm" onClick={() => onConfirm(plan)}>
              {describeAction(plan.action)}
            </Button>
          )}
        </>
      }
    >
      {plan ? (
        <div className="flex flex-col gap-2">
          <p className="text-body text-text">{planSummary(plan)}</p>
          {caveat ? <p className="text-meta text-text-muted">{caveat}</p> : null}
        </div>
      ) : null}
    </Dialog>
  );
}

/**
 * Set or clear one attribute across the selection.
 *
 * The field is a combobox over the catalog that also accepts a name nobody has
 * used yet, because on this API writing an attribute CREATES it — instantly,
 * as `type: custom, dataType: string`, and filterable straight away. Refusing
 * an unknown name would be refusing the only way this product has of adding a
 * field.
 */
function FieldDialog({
  mode,
  catalog,
  onClose,
  onSubmit,
}: {
  mode: 'set' | 'clear' | null;
  catalog: AttributeCatalog;
  onClose: () => void;
  onSubmit: (action: BulkAction) => void;
}) {
  const [name, setName] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const options = useMemo(
    () =>
      catalog.entries.map((entry) => ({
        value: entry.name,
        label: entry.name,
        description:
          entry.usersCount === null ? entry.type : `${entry.type} · ${entry.usersCount.toLocaleString()} contacts`,
      })),
    [catalog.entries],
  );

  const ready = name !== null && name.trim() !== '';

  return (
    <Dialog
      open={mode !== null}
      onClose={onClose}
      title={mode === 'clear' ? 'Clear a field' : 'Set a field'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!ready}
            onClick={() => {
              if (!ready || name === null) return;
              onSubmit(mode === 'clear' ? { kind: 'clearField', name } : { kind: 'setField', name, value });
              setName(null);
              setValue('');
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>Field</Label>
          <Combobox
            value={name}
            onChange={setName}
            options={options}
            placeholder="Choose or type a field name"
            onCreate={(label) => setName(label)}
            createLabel={(query) => `Create the field “${query}”`}
            clearable
            aria-label="Field"
          />
          <p className="text-meta text-text-faint">
            A name that does not exist yet is created by the first write, as a custom text field.
          </p>
        </div>

        {mode === 'set' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="bulk-field-value">Value</Label>
            <Input
              id="bulk-field-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="The same value on every selected contact"
            />
            <p className="text-meta text-text-faint">
              Leaving this empty deletes the field on those contacts — the API stores every attribute as a string and
              has no empty value, so clearing is the only way to make it unset.
            </p>
          </div>
        ) : (
          <p className="text-meta text-text-muted">
            The field is removed from every selected contact. When the last contact carrying it loses its value, the
            field disappears from the bot's catalog too.
          </p>
        )}

        <p className="text-meta text-text-faint">At most {MAX_BULK.toLocaleString()} contacts per run.</p>
      </div>
    </Dialog>
  );
}
