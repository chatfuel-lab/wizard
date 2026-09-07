import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { Tag, type TagProps } from '~ui';

interface StatusMeta {
  label: string;
  tone: TagProps['tone'];
}

/**
 * Meta's review states in the words the catalog uses. `Approved` is the only
 * one a campaign can go out with; the rest say why not.
 */
const META: Record<WhatsAppTemplateStatus, StatusMeta> = {
  [WhatsAppTemplateStatus.Approved]: { label: 'Approved', tone: 'success' },
  [WhatsAppTemplateStatus.Pending]: { label: 'In review', tone: 'warning' },
  [WhatsAppTemplateStatus.InAppeal]: { label: 'In appeal', tone: 'warning' },
  [WhatsAppTemplateStatus.Rejected]: { label: 'Rejected', tone: 'danger' },
  [WhatsAppTemplateStatus.Paused]: { label: 'Paused', tone: 'danger' },
  [WhatsAppTemplateStatus.Disabled]: { label: 'Disabled', tone: 'danger' },
  [WhatsAppTemplateStatus.Deleted]: { label: 'Deleted', tone: 'neutral' },
  [WhatsAppTemplateStatus.PendingDeletion]: { label: 'Being deleted', tone: 'neutral' },
  [WhatsAppTemplateStatus.LimitExceeded]: { label: 'Limit exceeded', tone: 'danger' },
  [WhatsAppTemplateStatus.Archived]: { label: 'Archived', tone: 'neutral' },
};

export const templateStatusLabel = (status: WhatsAppTemplateStatus): string => META[status]?.label ?? status;

export function TemplateStatusBadge({ status }: { status: WhatsAppTemplateStatus }) {
  const meta = META[status] ?? { label: status, tone: 'neutral' as const };
  return <Tag tone={meta.tone}>{meta.label}</Tag>;
}
