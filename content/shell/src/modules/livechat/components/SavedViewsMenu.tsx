import { useState } from 'react';
import { Button, IconCheck, IconPin, IconTrash, Input, Popover } from '~ui';
import { useSavedViews } from '../hooks/useSavedViews';
import { isInboxFilterEmpty, type InboxFilter } from '../lib/inboxFilter';
import { describeSavedView, findMatchingView, MAX_NAME_LENGTH } from '../lib/inboxViews';

export interface SavedViewsMenuProps {
  filter: InboxFilter;
  onApply: (filter: InboxFilter) => void;
  /** UserAccountID → display name, for the caption under a view's name. */
  teamName: (id: string) => string;
}

/**
 * Saved views for the inbox.
 *
 * Two words are load-bearing in the labels and neither is decoration:
 * **"Your views"**. `setUserStorageItem` is scoped to the signed-in user, and
 * there is no team-scoped storage anywhere in this API — a saved view is not
 * shared, cannot be shared, and a label implying otherwise would have people
 * building a team's filter conventions on something only they can see.
 *
 * Saving is disabled on an empty filter. A view that narrows nothing is the
 * default state with a name attached, and offering it makes the list longer
 * without making it more useful.
 *
 * A failure never touches the list: the write is non-optimistic, so the list
 * on screen only moves once the server has it. But a WRITE failure is not
 * silent — saying nothing would leave someone believing a view exists that
 * does not.
 */
export function SavedViewsMenu({ filter, onApply, teamName }: SavedViewsMenuProps) {
  const { views, loading, full, error, save, remove, rename } = useSavedViews();
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const current = findMatchingView(views, filter);
  const canSave = !isInboxFilterEmpty(filter) && !full && name.trim() !== '';

  const commitSave = () => {
    if (!canSave) return;
    void save(name, filter);
    setName('');
  };

  const commitRename = (id: string) => {
    void rename(id, draft);
    setRenaming(null);
  };

  return (
    <Popover
      aria-label="Your saved views"
      placement="bottom-start"
      trigger={(props) => (
        <Button variant="ghost" size="sm" {...props}>
          <IconPin size={14} />
          {current ? current.name : 'Views'}
        </Button>
      )}
    >
      <div className="flex w-64 flex-col gap-2">
        <span className="text-label text-text-muted">Your views</span>

        {loading ? (
          <p className="text-meta text-text-faint">Loading…</p>
        ) : views.length === 0 ? (
          <p className="text-meta text-text-faint">Nothing saved yet. Narrow the inbox, then give the result a name.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {views.map((view) => (
              <li key={view.id}>
                {renaming === view.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      aria-label={`Rename ${view.name}`}
                      maxLength={MAX_NAME_LENGTH}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename(view.id);
                        if (event.key === 'Escape') setRenaming(null);
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={() => commitRename(view.id)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onApply(view.filter)}
                      className="flex min-w-0 flex-1 items-start gap-1.5 rounded-control px-1.5 py-1 text-left transition-colors hover:bg-surface-hover focus-visible:focus-ring"
                    >
                      <span className="mt-0.5 w-3.5 shrink-0 text-accent">
                        {current?.id === view.id ? <IconCheck size={14} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text">{view.name}</span>
                        <span className="block truncate text-micro text-text-muted">
                          {describeSavedView(view, teamName)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${view.name}`}
                      onClick={() => {
                        setRenaming(view.id);
                        setDraft(view.name);
                      }}
                      className="rounded-control px-1.5 py-1 text-micro text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${view.name}`}
                      onClick={() => void remove(view.id)}
                      className="flex size-6 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:focus-ring"
                    >
                      <IconTrash size={13} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-1 border-t border-border-subtle pt-2">
          <div className="flex items-center gap-1">
            <Input
              aria-label="Name for this view"
              placeholder="Save current filter as…"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              disabled={isInboxFilterEmpty(filter) || full}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitSave();
              }}
            />
            <Button variant="ghost" size="sm" disabled={!canSave} onClick={commitSave}>
              Save
            </Button>
          </div>
          {isInboxFilterEmpty(filter) ? (
            <span className="text-micro text-text-faint">
              Narrow the inbox first — a view of everything is the default.
            </span>
          ) : null}
          {full ? (
            <span className="text-micro text-text-faint">
              That is as many views as this can hold. Delete one to save another.
            </span>
          ) : null}
          {error ? <span className="text-micro text-danger">Could not save: {error}</span> : null}
        </div>
      </div>
    </Popover>
  );
}
