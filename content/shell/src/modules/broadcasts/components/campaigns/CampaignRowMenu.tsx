import { IconCopy, IconStop, IconTrash, MenuButton, type MenuItem } from '~ui';
import type { CampaignRecord } from '../../lib/campaign';

export interface CampaignActions {
  onEdit: (record: CampaignRecord) => void;
  onUnschedule: (record: CampaignRecord) => void;
  onDuplicate: (record: CampaignRecord) => void;
  onDelete: (record: CampaignRecord) => void;
}

/**
 * What a campaign can still be asked to do, by status. A one-time campaign
 * that has started cannot be edited or stopped — the send is with the
 * platform — so those rows offer only a copy and a delete.
 */
export function campaignMenuItems(record: CampaignRecord, actions: CampaignActions): MenuItem[] {
  const items: MenuItem[] = [];
  if (record.status === 'draft') items.push({ id: 'edit', label: 'Edit', onSelect: () => actions.onEdit(record) });
  if (record.status === 'scheduled') {
    items.push({ id: 'edit', label: 'Edit', onSelect: () => actions.onEdit(record) });
    items.push({
      id: 'unschedule',
      label: 'Take off the schedule',
      icon: <IconStop />,
      onSelect: () => actions.onUnschedule(record),
    });
  }
  items.push({ id: 'duplicate', label: 'Duplicate', icon: <IconCopy />, onSelect: () => actions.onDuplicate(record) });
  if (record.status !== 'sending') {
    items.push({ kind: 'separator', id: 'sep' });
    items.push({
      id: 'delete',
      label: 'Delete',
      icon: <IconTrash />,
      tone: 'danger',
      onSelect: () => actions.onDelete(record),
    });
  }
  return items;
}

export function CampaignRowMenu({ record, actions }: { record: CampaignRecord; actions: CampaignActions }) {
  return <MenuButton items={campaignMenuItems(record, actions)} label={`Actions for ${record.name}`} />;
}
