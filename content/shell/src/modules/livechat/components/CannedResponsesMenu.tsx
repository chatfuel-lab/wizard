import { useMemo, useState } from 'react';
import { Alert, Button, IconBook, IconTrash, Input, Popover, Textarea } from '~ui';
import { useCannedResponses } from '../hooks/useCannedResponses';
import { MAX_CANNED_BODY_LENGTH, MAX_CANNED_TITLE_LENGTH, searchCannedResponses } from '../lib/cannedResponses';

export interface CannedResponsesMenuProps {
  disabled?: boolean;
  /** The body, to be inserted at the caret rather than sent. */
  onPick: (body: string) => void;
}

/**
 * The replies an operator sends every day, in the composer's `leftSlot`.
 *
 * Picking one INSERTS it. Sending it outright would be one keystroke shorter
 * and wrong: a canned reply is nearly always a canned reply plus a name, an
 * order number or a date, and a menu that sends before the operator can add
 * those is a menu they stop using.
 *
 * "Your" everywhere, and not by accident — `setUserStorageItem` is scoped to
 * the signed-in user, so these are personal snippets and the wording must not
 * suggest a shared library that does not exist.
 */
export function CannedResponsesMenu({ disabled, onPick }: CannedResponsesMenuProps) {
  const { responses, loading, full, error, save, remove } = useCannedResponses();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const results = useMemo(() => searchCannedResponses(responses, query), [responses, query]);

  const reset = () => {
    setQuery('');
    setAdding(false);
    setTitle('');
    setBody('');
  };

  const submit = () => {
    if (body.trim() === '') return;
    void save(title, body);
    setAdding(false);
    setTitle('');
    setBody('');
  };

  return (
    <Popover
      aria-label="Your saved replies"
      placement="top-start"
      onOpenChange={(open) => {
        if (!open) reset();
      }}
      className="w-80"
      trigger={(props) => (
        <Button {...props} iconOnly variant="ghost" disabled={disabled} aria-label="Saved replies">
          <IconBook />
        </Button>
      )}
    >
      {error ? (
        <Alert tone="danger" className="mb-2">
          {error}
        </Alert>
      ) : null}

      {responses.length > 0 ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your replies"
          aria-label="Search your replies"
          className="mb-2"
        />
      ) : null}

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <p className="py-4 text-center text-meta text-text-muted">Loading…</p>
        ) : responses.length === 0 ? (
          <p className="py-3 text-meta text-text-muted">
            No saved replies yet. They are yours alone — nobody else on the team sees them.
          </p>
        ) : results.length === 0 ? (
          <p className="py-4 text-center text-meta text-text-muted">Nothing matches.</p>
        ) : (
          <ul>
            {results.map((response) => (
              <li key={response.id} className="flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => onPick(response.body)}
                  className="min-w-0 flex-1 rounded-control px-2 py-1.5 text-left transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover"
                >
                  <span className="block truncate text-meta font-medium text-text">{response.title}</span>
                  <span className="mt-0.5 block truncate text-micro text-text-muted">{response.body}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void remove(response.id)}
                  aria-label={`Delete ${response.title}`}
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-text-faint transition-colors duration-fast ease-standard focus-visible:focus-ring hover:bg-surface-hover hover:text-danger"
                >
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 border-t border-border pt-2">
        {adding ? (
          <div className="flex flex-col gap-2">
            <Input
              value={title}
              maxLength={MAX_CANNED_TITLE_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name (optional)"
              aria-label="Reply name"
            />
            <Textarea
              value={body}
              rows={3}
              maxLength={MAX_CANNED_BODY_LENGTH}
              onChange={(event) => setBody(event.target.value)}
              placeholder="The reply itself"
              aria-label="Reply text"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={body.trim() === ''}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdding(true)}
            disabled={full}
            /* The list is capped, and a button that quietly does nothing is
               worse than one that says why it will not. */
            title={full ? 'You have reached the maximum number of saved replies.' : undefined}
          >
            New reply
          </Button>
        )}
      </div>
    </Popover>
  );
}
