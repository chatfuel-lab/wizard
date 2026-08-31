import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DropdownMenu,
  IconChevronDown,
  IconLayoutList,
  Input,
  Spinner,
  useToast,
  type MenuItem,
} from '~ui';
import { useContactsViews } from '../../ContactsViewsContext';
import type { ContactsFilter } from '../../lib/contactsFilter';
import type { Density } from '../../lib/contactsParams';
import { describeDays } from '../../lib/filterLabels';
import {
  describeSavedView,
  detectRolling,
  findMatchingView,
  resolveSavedFilter,
  type ContactsListLayout,
} from '../../lib/savedViews';

export interface SavedViewsMenuProps {
  filter: ContactsFilter;
  /**
   * Apply a saved view. The second argument carries what a `ContactsFilter`
   * cannot: the density and the list's column layout. It is optional so the
   * original one-argument seam still type-checks — a caller that ignores it
   * simply restores the filter alone.
   */
  onApply: (filter: ContactsFilter, extras?: { density: Density; layout: ContactsListLayout | null }) => void;
  /** The list's current density, so a saved view can carry it. */
  density?: Density;
  /** The list's current columns, order and widths. Saved verbatim. */
  layout?: ContactsListLayout | null;
}

/**
 * "Your views", over the only persistence this API has.
 *
 * `setUserStorageItem` is scoped to the **signed-in user**. There is no team
 * scope, no sharing, and `byStoredSegment` — the API's own server-side segment
 * store — fails live, so there is no way to build one either. Every string here
 * says "your views" and the save dialog states plainly that a teammate will not
 * see them. Implying otherwise would be the one bug in this feature nobody can
 * find by looking at it.
 *
 * A view carries the whole filter *including the field conditions a URL cannot
 * hold*, which is most of why it is worth saving at all — plus the density and
 * the columns, because a view that restores the filter and not the layout
 * restores half a workspace.
 */
export function SavedViewsMenu({ filter, onApply, density = 'cozy', layout = null }: SavedViewsMenuProps) {
  const views = useContactsViews();
  const toast = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [name, setName] = useState('');
  const [rolling, setRolling] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  const current = useMemo(() => findMatchingView(views.views, filter), [views.views, filter]);

  /* Offered only when there IS one time value to move. Detected rather than
     asked for: someone who picked "last 7 days" means the last seven days, not
     the seven days ending on the afternoon they pressed Save. */
  const rollable = useMemo(() => detectRolling(filter), [filter]);

  useEffect(() => {
    if (!saveOpen) return;
    setName(current?.name ?? '');
    setRolling(current ? current.rolling !== null : true);
  }, [saveOpen, current]);

  const commit = async () => {
    const saved = await views.save({
      name,
      filter,
      density,
      layout,
      rolling: rollable && rolling ? rollable : null,
    });
    if (!saved) return;
    setSaveOpen(false);
    toast.show({
      title: `Saved “${saved.name}”`,
      description: 'Only you can see it — this API stores views per user.',
      tone: 'success',
    });
  };

  const items: MenuItem[] = [{ kind: 'label', id: 'heading', label: 'Your views · only you see these' }];

  if (views.loading) {
    items.push({ id: 'loading', label: 'Loading…', disabled: true, onSelect: () => undefined });
  } else if (views.error !== null) {
    items.push({ id: 'error', label: 'Could not load — retry', onSelect: views.reload });
  } else if (views.views.length === 0) {
    items.push({ id: 'empty', label: 'No views yet', disabled: true, onSelect: () => undefined });
  } else {
    for (const entry of views.views) {
      items.push({
        id: entry.id,
        label: entry.name,
        checked: entry.id === current?.id,
        onSelect: () => onApply(resolveSavedFilter(entry), { density: entry.density, layout: entry.layout }),
      });
    }
  }

  items.push({ kind: 'separator', id: 'sep' });
  items.push({
    id: 'save',
    label: current ? `Update “${current.name}”…` : 'Save this view…',
    onSelect: () => setSaveOpen(true),
  });
  if (views.views.length > 0) {
    items.push({ id: 'manage', label: 'Rename or delete…', onSelect: () => setManageOpen(true) });
  }

  return (
    <>
      <DropdownMenu
        items={items}
        aria-label="Your saved views"
        trigger={(props) => (
          <Button {...props} variant="ghost" size="sm">
            <IconLayoutList size={14} />
            {current ? current.name : 'Views'}
            <IconChevronDown size={14} />
          </Button>
        )}
      />

      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={current ? 'Update this view' : 'Save this view'}
        size="sm"
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void commit()} disabled={name.trim() === '' || views.saving}>
              {views.saving ? <Spinner size={14} /> : null}
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            ref={nameRef}
            aria-label="View name"
            placeholder="Berlin leads with no phone"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') void commit();
            }}
          />

          {rollable ? (
            <Checkbox
              checked={rolling}
              onChange={setRolling}
              label={`Keep the ${describeDays(rollable.days)} window rolling`}
            />
          ) : null}

          <p className="text-meta text-text-muted">
            Saves the filters, the row density and the columns. Views live in your own user storage — the only
            persistence this API offers — so a teammate signed into the same bot will not see them.
          </p>

          {views.error !== null ? (
            <Alert tone="danger" title="Could not save">
              {views.error}
            </Alert>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Your saved views"
        size="md"
        footer={<Button onClick={() => setManageOpen(false)}>Done</Button>}
      >
        <ul className="flex flex-col gap-3">
          {views.views.map((entry) => {
            const draft = drafts[entry.id] ?? entry.name;
            return (
              <li key={entry.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Name of ${entry.name}`}
                    className="flex-1"
                    value={draft}
                    onChange={(event) => setDrafts((previous) => ({ ...previous, [entry.id]: event.target.value }))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={draft.trim() === '' || draft === entry.name || views.saving}
                    onClick={() => void views.rename(entry.id, draft)}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={views.saving}
                    onClick={() => void views.remove(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
                <p className="text-meta text-text-muted">{describeSavedView(entry)}</p>
              </li>
            );
          })}
          {views.views.length === 0 ? <li className="text-body text-text-muted">Nothing saved yet.</li> : null}
        </ul>
        {views.error !== null ? (
          <Alert tone="danger" title="Could not write to your storage" className="mt-3">
            {views.error}
          </Alert>
        ) : null}
      </Dialog>
    </>
  );
}
