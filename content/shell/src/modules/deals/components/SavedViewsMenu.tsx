import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DropdownMenu,
  IconChevronDown,
  IconLayoutList,
  Input,
  Spinner,
  useToast,
  type MenuItem,
} from '~ui';
import { useSavedViews } from '../hooks/useSavedViews';
import type { DealsFilter } from '../lib/dealsFilter';
import type { DealsView } from '../lib/dealsParams';
import { describeSavedView, findMatchingView } from '../lib/savedViews';

export interface SavedViewsMenuProps {
  view: DealsView;
  filter: DealsFilter;
  onApply: (view: DealsView, filter: DealsFilter) => void;
}

/**
 * Saved views, over the only persistence this API has.
 *
 * `setUserStorageItem` / `currentUser.userStorageItem` is scoped to the
 * **signed-in user**. There is no team scope, no sharing and no way to build
 * one, so every string here says "your views" and the menu states plainly that
 * a teammate will not see them. Implying otherwise would be the one bug in this
 * feature that cannot be found by looking at it.
 *
 * A saved view carries the whole `DealsFilter` *and* which view it was saved
 * from — including the attribute predicates a URL cannot carry, which is most
 * of why it is worth saving at all.
 */
export function SavedViewsMenu({ view, filter, onApply }: SavedViewsMenuProps) {
  const saved = useSavedViews();
  const toast = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  const current = useMemo(() => findMatchingView(saved.views, view, filter), [saved.views, view, filter]);

  // Opening the dialog over an already-saved view offers to update it.
  useEffect(() => {
    if (saveOpen) setName(current?.name ?? '');
  }, [saveOpen, current]);

  const commit = async () => {
    const result = await saved.save(name, view, filter);
    if (!result) return;
    setSaveOpen(false);
    toast.show({
      title: `Saved “${result.name}”`,
      description: 'Only you can see it — this API stores views per user.',
      tone: 'success',
    });
  };

  const items: MenuItem[] = [{ kind: 'label', id: 'heading', label: 'Your views · only you see these' }];

  if (saved.loading) {
    items.push({ id: 'loading', label: 'Loading…', disabled: true, onSelect: () => undefined });
  } else if (saved.error !== null) {
    items.push({ id: 'error', label: 'Could not load — retry', onSelect: saved.reload });
  } else if (saved.views.length === 0) {
    items.push({ id: 'empty', label: 'No saved views yet', disabled: true, onSelect: () => undefined });
  } else {
    for (const entry of saved.views) {
      items.push({
        id: entry.id,
        label: entry.name,
        checked: entry.id === current?.id,
        onSelect: () => onApply(entry.view, entry.filter),
      });
    }
  }

  items.push({ kind: 'separator', id: 'sep' });
  items.push({
    id: 'save',
    label: current ? `Update “${current.name}”…` : 'Save this view…',
    onSelect: () => setSaveOpen(true),
  });
  if (saved.views.length > 0) {
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
            <Button onClick={() => void commit()} disabled={name.trim() === '' || saved.saving}>
              {saved.saving ? <Spinner size={14} /> : null}
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            ref={nameRef}
            aria-label="View name"
            placeholder="Open deals over €10k"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim() !== '') void commit();
            }}
          />
          <p className="text-xs text-text-muted">
            Saves the current filters and the {view} view. Saved views live in your own user storage, which is the only
            persistence this API offers — a teammate signed into the same bot will not see them.
          </p>
          {saved.error !== null ? (
            <Alert tone="danger" title="Could not save">
              {saved.error}
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
          {saved.views.map((entry) => {
            const draft = drafts[entry.id] ?? entry.name;
            return (
              <li key={entry.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Name of ${entry.name}`}
                    value={draft}
                    onChange={(event) => setDrafts((current_) => ({ ...current_, [entry.id]: event.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={draft.trim() === '' || draft === entry.name || saved.saving}
                    onClick={() => void saved.rename(entry.id, draft)}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={saved.saving}
                    onClick={() => void saved.remove(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
                <p className="text-xs text-text-muted">{describeSavedView(entry)}</p>
              </li>
            );
          })}
          {saved.views.length === 0 ? <li className="text-sm text-text-muted">Nothing saved yet.</li> : null}
        </ul>
        {saved.error !== null ? (
          <Alert tone="danger" title="Could not write to your storage" className="mt-3">
            {saved.error}
          </Alert>
        ) : null}
      </Dialog>
    </>
  );
}
