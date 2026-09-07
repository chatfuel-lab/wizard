import { IconSearch, Input, SegmentedControl } from '~ui';
import { CAMPAIGN_STATUSES, STATUS_LABELS, type CampaignStatus } from '../../lib/campaign';

type StatusFilter = CampaignStatus | 'all';

const OPTIONS = [
  { value: 'all' as const, label: 'All' },
  ...CAMPAIGN_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

export interface CampaignFiltersProps {
  status: CampaignStatus | null;
  onStatus: (status: CampaignStatus | null) => void;
  q: string;
  onQ: (q: string) => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function CampaignFilters({ status, onStatus, q, onQ, searchRef }: CampaignFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-gutter py-2">
      <SegmentedControl<StatusFilter>
        aria-label="Status"
        size="sm"
        value={status ?? 'all'}
        onChange={(value) => onStatus(value === 'all' ? null : value)}
        options={OPTIONS}
      />
      <div className="relative ml-auto w-56 max-w-full">
        <IconSearch
          size={14}
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
        />
        <Input
          ref={searchRef}
          type="search"
          aria-label="Search campaigns"
          placeholder="Search"
          className="pl-8 text-xs"
          value={q}
          onChange={(event) => onQ(event.target.value)}
        />
      </div>
    </div>
  );
}
