import { Tag, type TagProps } from '~ui';
import { STATUS_LABELS, type CampaignStatus } from '../lib/campaign';

const TONES: Record<CampaignStatus, TagProps['tone']> = {
  draft: 'neutral',
  scheduled: 'accent',
  sending: 'warning',
  sent: 'success',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Tag tone={TONES[status]}>{STATUS_LABELS[status]}</Tag>;
}
