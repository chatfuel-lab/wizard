import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from '~ui';
import { templatePreview } from '../../lib/templatePreview';
import type { CatalogTemplate } from '../../types';
import { TemplatePreviewCard } from '../TemplatePreviewCard';
import { TemplateStatusBadge } from '../TemplateStatusBadge';

export interface TemplatesTableProps {
  rows: CatalogTemplate[];
  selectedId: string | null;
  onOpen: (template: CatalogTemplate) => void;
  loading: boolean;
  compact: boolean;
}

/**
 * The catalog, one template per row with its first two lines. Every status
 * is listed; only an approved one can be used, and the badge says which.
 */
export function TemplatesTable({ rows, selectedId, onOpen, loading, compact }: TemplatesTableProps) {
  const columns = useMemo<DataTableColumn<CatalogTemplate>[]>(() => {
    const all: DataTableColumn<CatalogTemplate>[] = [
      {
        key: 'name',
        header: 'Template',
        width: '16rem',
        render: (row) => <span className="truncate font-medium text-text">{row.name}</span>,
      },
      { key: 'status', header: 'Status', width: '8rem', render: (row) => <TemplateStatusBadge status={row.status} /> },
      {
        key: 'message',
        header: 'Message',
        wrap: true,
        render: (row) => <TemplatePreviewCard preview={templatePreview(row)} compact />,
      },
      {
        key: 'category',
        header: 'Category',
        width: '8rem',
        render: (row) => <span className="text-text-muted">{row.category}</span>,
      },
      {
        key: 'language',
        header: 'Language',
        width: '8rem',
        render: (row) => <span className="text-text-muted">{row.language}</span>,
      },
    ];
    if (compact) return all.filter((column) => column.key === 'name' || column.key === 'status');
    return all;
  }, [compact]);

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={onOpen}
      selectedIds={selectedId ? [selectedId] : undefined}
      loading={loading}
      stickyHeader
      rowNavigation
      caption="WhatsApp templates"
      empty={<span className="text-sm text-text-muted">No templates on this number yet</span>}
    />
  );
}
