import { useMemo, useState } from 'react';
import { Alert, EmptyState, IconBook, IconSearch, Input, Spinner, filterItems } from '~ui';
import type { InboxWhatsAppTemplateFragment } from '~api/generated/livechat/graphql';
import type { WhatsAppTemplatesState } from '../hooks/useWhatsAppTemplates';
import { sendableTemplates, templatePreview, templateSearchTexts } from '../lib/templatePreview';
import { TemplatePreviewCard } from './TemplatePreviewCard';

export interface TemplatePickerProps {
  catalog: WhatsAppTemplatesState;
  onPick: (template: InboxWhatsAppTemplateFragment) => void;
}

/**
 * The dialog's first stage: what `sendableTemplates` allows — approved by
 * Meta AND supported in the inbox — with the body of each template shown as
 * it reads, blanks included, so the operator sees what a template SAYS before
 * committing to filling it. Search is `~ui`'s `filterItems` over the name and
 * the words of the message; there is no matcher here.
 *
 * The query is this stage's own state: picking a template or closing the
 * dialog unmounts the stage, so the next visit starts with a clean search.
 */
export function TemplatePicker({ catalog, onPick }: TemplatePickerProps) {
  const [query, setQuery] = useState('');

  const offered = useMemo(() => sendableTemplates(catalog.templates), [catalog.templates]);
  const matches = useMemo(
    () => filterItems(offered, query, templateSearchTexts).map((match) => match.item),
    [offered, query],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          type="search"
          aria-label="Search templates"
          placeholder="Search templates…"
          className="pl-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
      </div>

      {catalog.loading && !catalog.loaded ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : catalog.error ? (
        <Alert tone="danger" title="Could not load the templates">
          {catalog.error}
        </Alert>
      ) : offered.length === 0 ? (
        <EmptyState
          icon={<IconBook />}
          title="No templates to send"
          description="A template has to be approved by Meta and enabled for the inbox. Create and submit one in the Chatfuel dashboard."
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<IconSearch />}
          title="No template matches"
          description={`Nothing named or saying “${query}”.`}
        />
      ) : (
        /* Rows, not cards. The dialog is a surface, the row is a choice on
           it, and the preview is a line of the row — three borders deep
           was a box in a box in a box for one line of text. */
        <ul className="-mx-2">
          {matches.map((template) => (
            <TemplateRow key={template.id} template={template} onPick={() => onPick(template)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateRow({ template, onPick }: { template: InboxWhatsAppTemplateFragment; onPick: () => void }) {
  const preview = useMemo(() => templatePreview(template), [template]);
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="flex w-full flex-col gap-0.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:focus-ring"
      >
        <span className="flex w-full items-center gap-2">
          <span className="truncate text-sm font-medium text-text">{template.name}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-micro text-text-faint">
            <span>{template.category}</span>
            <span aria-hidden>·</span>
            <span>{template.language}</span>
          </span>
        </span>
        <TemplatePreviewCard preview={preview} compact />
      </button>
    </li>
  );
}
