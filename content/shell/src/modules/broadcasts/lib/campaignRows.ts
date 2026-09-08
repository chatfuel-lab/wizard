import { filterItems } from '~ui';
import type { CampaignStatus } from './campaign';
import { templateNameOf, type CampaignRecord } from './campaign';

/**
 * The rows the list shows for an address: the status filter, then the
 * search over the name and the template name. One function, so the table
 * and the `[` / `]` keys walk the same rows.
 */
export function visibleCampaigns(
  campaigns: readonly CampaignRecord[],
  status: CampaignStatus | null,
  q: string,
): CampaignRecord[] {
  const byStatus = status ? campaigns.filter((record) => record.status === status) : [...campaigns];
  if (!q) return byStatus;
  return filterItems(byStatus, q, (record) => [record.name, templateNameOf(record) ?? '']).map((match) => match.item);
}
