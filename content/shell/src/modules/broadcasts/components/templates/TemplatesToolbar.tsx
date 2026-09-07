import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { Button, IconExternal, IconRefresh, IconSearch, Input, Select } from '~ui';
import { templateStatusLabel } from '../TemplateStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Every status' },
  ...Object.values(WhatsAppTemplateStatus).map((status) => ({ value: status, label: templateStatusLabel(status) })),
];

export interface TemplatesToolbarProps {
  q: string;
  onQ: (q: string) => void;
  status: WhatsAppTemplateStatus | null;
  onStatus: (status: WhatsAppTemplateStatus | null) => void;
  refreshing: boolean;
  onRefresh: () => void;
  /** The WhatsApp Manager door, or null when no number is connected. */
  managerUrl: string | null;
  onOpenManager: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Search, a status filter, a refresh that asks Meta, and the door to WhatsApp
 * Manager — where a template is written, because nothing in this API writes
 * one.
 */
export function TemplatesToolbar({
  q,
  onQ,
  status,
  onStatus,
  refreshing,
  onRefresh,
  managerUrl,
  onOpenManager,
  searchRef,
}: TemplatesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-gutter py-2">
      <div className="relative w-56 max-w-full">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          ref={searchRef}
          type="search"
          aria-label="Search templates"
          placeholder="Search"
          className="pl-8 text-xs"
          value={q}
          onChange={(event) => onQ(event.target.value)}
        />
      </div>
      <Select
        aria-label="Status"
        className="w-40"
        value={status ?? ''}
        onChange={(value) => onStatus((value as WhatsAppTemplateStatus) || null)}
        options={STATUS_OPTIONS}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} loading={refreshing}>
          <IconRefresh />
          Check with Meta
        </Button>
        {managerUrl ? (
          <Button variant="secondary" size="sm" onClick={onOpenManager}>
            <IconExternal />
            New template in WhatsApp Manager
          </Button>
        ) : null}
      </div>
    </div>
  );
}
