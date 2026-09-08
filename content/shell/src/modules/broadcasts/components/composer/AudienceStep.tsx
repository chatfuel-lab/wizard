import { useState } from 'react';
import { Alert, SegmentedControl, Tag } from '~ui';
import { useAudience } from '../../hooks/useAudience';
import { EMPTY_AUDIENCE, addGroup } from '../../lib/audienceFilter';
import type { CampaignRecord } from '../../lib/campaign';
import { formatCount } from '../../lib/format';
import { FilterGroupBuilder } from '../audience/FilterGroupBuilder';
import { StepFrame } from './StepFrame';

export interface AudienceStepProps {
  record: CampaignRecord; // the draft
  zone: string;
  canEdit: boolean;
  /** Called with the count the step last read, or null while unknown. */
  onCount: (count: number | null) => void;
}

type Mode = 'everyone' | 'filtered';

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'filtered', label: 'Contacts who…' },
];

/**
 * Who receives the campaign, and how many that is.
 *
 * "Everyone" is a segment with no filters — the entry point's default, and
 * the count with it equals the count with no segment at all. "Contacts
 * who…" opens the builder. The figure is `contactsTotalCount` for the
 * segment as it stands; while a newer count is on its way the figure dims
 * rather than vanishing, so the page never flashes to nothing between two
 * keystrokes. The hook writes every valid change to the draft, so leaving
 * the step loses nothing.
 */
export function AudienceStep({ record, zone, canEdit, onCount }: AudienceStepProps) {
  const audience = useAudience(record, onCount);
  const { filter, setFilter, passthrough, removePassthrough, issues, count, counting, error, catalog } = audience;

  const hasRows = filter.groups.length > 0 || passthrough.length > 0;
  const [picked, setPicked] = useState<Mode>(hasRows ? 'filtered' : 'everyone');
  // Rows that arrived from the campaign win over a stale pick.
  const mode: Mode = hasRows ? 'filtered' : picked;

  const onMode = (next: Mode) => {
    if (!canEdit) return;
    setPicked(next);
    if (next === 'everyone') {
      if (filter.groups.length > 0) setFilter({ ...EMPTY_AUDIENCE, groupOperator: filter.groupOperator });
      for (const entry of passthrough) removePassthrough(entry.id);
    } else if (filter.groups.length === 0) {
      setFilter(addGroup(filter));
    }
  };

  const figure = (
    <div className="@wide:pt-1 @wide:text-right">
      <p
        className={`text-title-2 font-semibold tabular-nums text-text transition-opacity duration-base ease-standard ${
          counting ? 'opacity-60' : ''
        }`}
      >
        {formatCount(count)}
      </p>
      <p className="text-label text-text-muted">recipients</p>
    </div>
  );

  return (
    <StepFrame title="Audience" aside={figure}>
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          {canEdit ? (
            <SegmentedControl aria-label="Who receives it" value={mode} onChange={onMode} options={MODE_OPTIONS} />
          ) : (
            <Tag>{MODE_OPTIONS.find((option) => option.value === mode)?.label}</Tag>
          )}
        </div>
        {mode === 'filtered' ? (
          <FilterGroupBuilder
            filter={filter}
            onFilterChange={setFilter}
            catalog={catalog}
            issues={issues}
            zone={zone}
            passthrough={passthrough}
            onRemovePassthrough={removePassthrough}
            readOnly={!canEdit}
          />
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </StepFrame>
  );
}
