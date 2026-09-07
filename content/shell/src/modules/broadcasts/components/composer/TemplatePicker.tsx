import { useMemo, useState } from 'react';
import { Alert, EmptyState, IconBook, IconSearch, Input, Spinner, filterItems } from '~ui';
import { useCatalog } from '../../BroadcastsCampaignsContext';
import { sendableTemplates, templatePreview, templateSearchTexts } from '../../lib/templatePreview';
import type { CatalogTemplate } from '../../types';
import { TemplatePreviewCard } from '../TemplatePreviewCard';

export interface TemplatePickerProps {
  onPick: (template: CatalogTemplate) => void;
  disabled?: boolean;
}

/**
 * The message step's first stage: what `sendableTemplates` allows —
 * approved by Meta AND supported by the flow builder — with the body of each
 * shown as it reads, blanks included, so the person sees what a template
 * SAYS before committing to filling it. Search is `filterItems` over the
 * name and the words of the message. A copy of the livechat module's picker
 * over this module's catalog.
 */
export function TemplatePicker({ onPick, disabled = false }: TemplatePickerProps) {
  const catalog = useCatalog();
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
          placeholder="Search templates"
          className="pl-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {catalog.loading && !catalog.loaded ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : catalog.error ? (
        <Alert tone="danger" title="The templates could not be read">
          {catalog.error}
        </Alert>
      ) : offered.length === 0 ? (
        <EmptyState icon={<IconBook />} title="No approved templates" />
      ) : matches.length === 0 ? (
        <EmptyState icon={<IconSearch />} title="No template matches" />
      ) : (
        <ul className="-mx-2 max-h-[32rem] overflow-y-auto">
          {matches.map((template) => (
            <TemplateRow key={template.id} template={template} onPick={() => onPick(template)} disabled={disabled} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateRow({
  template,
  onPick,
  disabled,
}: {
  template: CatalogTemplate;
  onPick: () => void;
  disabled: boolean;
}) {
  const preview = useMemo(() => templatePreview(template), [template]);
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="flex w-full flex-col gap-0.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:focus-ring disabled:opacity-60"
      >
        <span className="flex w-full items-center gap-2">
          <span className="truncate text-label font-medium text-text">{template.name}</span>
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
