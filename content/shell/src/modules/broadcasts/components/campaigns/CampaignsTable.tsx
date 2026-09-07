import { useMemo } from 'react';
import { DataTable, IconWarning, Tooltip, type DataTableColumn } from '~ui';
import { KIND_LABELS, templateNameOf, type CampaignRecord } from '../../lib/campaign';
import { formatCount, formatInstant } from '../../lib/format';
import { describeRepeat } from '../../lib/schedule';
import { CampaignStatusBadge } from '../CampaignStatusBadge';
import { CampaignRowMenu, type CampaignActions } from './CampaignRowMenu';

export interface CampaignsTableProps {
  rows: CampaignRecord[];
  selectedId: string | null;
  onOpen: (record: CampaignRecord) => void;
  zone: string;
  now: number;
  loading: boolean;
  /** Null hides the trailing menu — a role that may not edit sees the rows and nothing to do to them. */
  actions: CampaignActions | null;
  compact: boolean;
}

/**
 * The list. The message column is the template's name, because that is what
 * a campaign is about; the name column is what the person called it. "When"
 * is the next send for a scheduled campaign and the last read for a sent one.
 */
export function CampaignsTable({
  rows,
  selectedId,
  onOpen,
  zone,
  now,
  loading,
  actions,
  compact,
}: CampaignsTableProps) {
  const columns = useMemo<DataTableColumn<CampaignRecord>[]>(() => {
    const all: DataTableColumn<CampaignRecord>[] = [
      {
        key: 'name',
        header: 'Campaign',
        width: '18rem',
        render: (row) => (
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-text">{row.name}</span>
            {row.problems.length > 0 && row.status === 'draft' ? (
              <Tooltip label={`${row.problems.length} ${row.problems.length === 1 ? 'thing' : 'things'} to finish`}>
                <IconWarning size={14} className="shrink-0 text-warning" />
              </Tooltip>
            ) : null}
          </span>
        ),
      },
      { key: 'status', header: 'Status', width: '8rem', render: (row) => <CampaignStatusBadge status={row.status} /> },
      {
        key: 'message',
        header: 'Message',
        width: '14rem',
        render: (row) => <span className="truncate text-text-muted">{templateNameOf(row) ?? '—'}</span>,
      },
      {
        key: 'kind',
        header: 'Send',
        width: '10rem',
        render: (row) => (
          <span className="text-text-muted">
            {row.kind === 'recurring' && row.schedule ? describeRepeat(row.schedule, zone) : KIND_LABELS[row.kind]}
          </span>
        ),
      },
      {
        key: 'when',
        header: 'When',
        width: '11rem',
        render: (row) =>
          row.nextRunAt !== null ? (
            <span className="text-text">{formatInstant(row.nextRunAt, zone, now)}</span>
          ) : row.schedule && row.status === 'draft' ? (
            <span className="text-text-muted">{formatInstant(row.schedule.at, zone, now)}</span>
          ) : (
            <span className="text-text-faint">—</span>
          ),
      },
      {
        key: 'recipients',
        header: 'Recipients',
        width: '7rem',
        align: 'end',
        render: (row) => <span className="tabular-nums">{formatCount(row.sentToContactsCount)}</span>,
      },
    ];
    if (compact)
      return all.filter((column) => column.key === 'name' || column.key === 'status' || column.key === 'when');
    return all;
  }, [zone, now, compact]);

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.flowId}
      onRowClick={onOpen}
      selectedIds={selectedId ? [selectedId] : undefined}
      loading={loading}
      stickyHeader
      rowNavigation
      caption="Campaigns"
      rowActions={actions ? (row) => <CampaignRowMenu record={row} actions={actions} /> : undefined}
      empty={<span className="text-sm text-text-muted">No campaigns yet</span>}
    />
  );
}
