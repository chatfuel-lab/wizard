import { useCallback, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  DataTable,
  IconLock,
  MenuButton,
  Tag,
  type DataTableColumn,
  type DataTableDensity,
  type MenuItem,
  type SelectOption,
  type SortState,
} from '~ui';
import { AttributeDataType } from '~api/generated/contacts/graphql';
import type { ContactRow, TeamMember } from '../../types';
import { phoneOf, usernameOf } from '../../types';
import { currentAssignee, fieldValue, type RowAction } from '../../lib/bulk';
import type { Density } from '../../lib/contactsParams';
import { platformOf } from '../../lib/platforms';
import {
  STAGE_META,
  STAGE_ORDER,
  assigneeLabel,
  attributeCell,
  attributeEntry,
  contactName,
  type ColumnSpec,
} from '../../lib/tableColumns';
import { isRestrictedRow, nextRowId } from '../../lib/tableSelection';
import { shortTime } from '../../lib/time';
import { attributeValueToInput } from '../../lib/attributeValue';
import { ContactCards } from './ContactCards';
import { EditableCell } from './EditableCell';

/** Which cell is open for editing. One at a time, for the whole table. */
export interface EditingCell {
  rowId: string;
  columnKey: string;
}

export interface ContactsTableProps {
  rows: ContactRow[];
  /** Resolved specs, in display order, already narrowed for the band. */
  columns: ColumnSpec[];
  density: Density;
  loading: boolean;
  canEdit: boolean;
  team: TeamMember[];
  /** Off under the chats engine, which has no `orderBy` at all. */
  sortable: boolean;
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onOpen: (contactId: string) => void;
  onEdit: (row: ContactRow, action: RowAction) => void;
  onRowContextMenu: (row: ContactRow, event: ReactMouseEvent) => void;
  rowMenu: (row: ContactRow) => MenuItem[];
  widths: Readonly<Record<string, number>>;
  onWidthsChange: (widths: Record<string, number>) => void;
  editing: EditingCell | null;
  onEditingChange: (cell: EditingCell | null) => void;
  /** Rows whose optimistic edit was rolled back, and rows that arrived live. */
  flash: Readonly<Record<string, number>>;
  arrived: Readonly<Record<string, number>>;
  /** True below the narrow band: rows become cards. */
  cards: boolean;
  empty: ReactNode;
}

/** The module's three densities are `DataTable`'s three. */
const DENSITY: Record<Density, DataTableDensity> = {
  compact: 'compact',
  cozy: 'cozy',
  comfortable: 'comfortable',
};

const UNASSIGNED = '';
const AI = 'ai';

const EM_DASH = '—';

const dash = <span className="text-text-faint">{EM_DASH}</span>;

/**
 * The rows.
 *
 * Column *definitions* are data (`lib/tableColumns.ts`) and what a selection
 * may be acted on with is `lib/tableSelection.ts`; this file only decides what
 * a cell looks like and which control it becomes when someone clicks it.
 *
 * Selection, shift-range, the header's tri-state box and row navigation are
 * `DataTable`'s, not this file's: passing `selectedIds` and `onSelectionChange`
 * is what turns them on, and `isRowDisabled` is what keeps restricted contacts
 * out of every range without this file knowing what a range is.
 *
 * There is deliberately **no virtualization**. The auto-page cap in
 * `contactsStore.ts` bounds the row count instead, which keeps find-in-page,
 * the browser's own scroll anchoring and a plain Ctrl+F working. If that trade
 * ever stops paying, the cap is the number to look at first.
 */
export function ContactsTable({
  rows,
  columns,
  density,
  loading,
  canEdit,
  team,
  sortable,
  sort,
  onSortChange,
  selectedIds,
  onSelectionChange,
  onOpen,
  onEdit,
  onRowContextMenu,
  rowMenu,
  widths,
  onWidthsChange,
  editing,
  onEditingChange,
  flash,
  arrived,
  cards,
  empty,
}: ContactsTableProps) {
  const now = Date.now();
  const order = rows.map((row) => row.id);

  const ownerOptions: SelectOption[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    { value: AI, label: 'Fuely AI' },
    ...team.map((member) => ({ value: `u:${member.user.id}`, label: member.user.name })),
  ];

  const isEditing = (row: ContactRow, spec: ColumnSpec): boolean =>
    editing?.rowId === row.id && editing.columnKey === spec.key;

  /** Enter commits and opens the same column on the next row; blur just closes. */
  const commit = useCallback(
    (row: ContactRow, spec: ColumnSpec, action: RowAction, moveDown: boolean) => {
      onEdit(row, action);
      const next = moveDown ? nextRowId(order, row.id) : null;
      onEditingChange(next === null ? null : { rowId: next, columnKey: spec.key });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEdit, onEditingChange, order.join(' ')],
  );

  const cellFor = (spec: ColumnSpec, row: ContactRow): ReactNode => {
    const restricted = isRestrictedRow(row);
    const editable = canEdit && spec.editable && !restricted;
    const shared = {
      editing: isEditing(row, spec),
      editable,
      onStart: () => onEditingChange({ rowId: row.id, columnKey: spec.key }),
      onCancel: () => onEditingChange(null),
    };

    if (spec.kind === 'attribute' && spec.attribute) {
      const name = spec.attribute;
      const entry = attributeEntry(row, name);
      const cell = attributeCell(entry, now);
      const options =
        spec.dataType === AttributeDataType.Boolean
          ? [
              { value: '', label: EM_DASH },
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]
          : undefined;
      return (
        <EditableCell
          {...shared}
          label={`${name} of ${contactName(row)}`}
          value={options ? fieldValue(row, name) : attributeValueToInput(entry?.value)}
          options={options}
          placeholder={spec.dataType === AttributeDataType.Datetime ? 'A date, or a ms timestamp' : undefined}
          display={
            cell.text === '' ? (
              dash
            ) : (
              <span title={cell.title} className={cell.title ? 'text-text-faint' : undefined}>
                {cell.text}
              </span>
            )
          }
          onCommit={(value, moveDown) =>
            commit(
              row,
              spec,
              value.trim() === '' ? { kind: 'clearField', name } : { kind: 'setField', name, value },
              moveDown,
            )
          }
        />
      );
    }

    switch (spec.key) {
      case 'fixed:name': {
        if (restricted) {
          return (
            <span className="flex items-center gap-2 text-text-faint">
              <IconLock size={14} />
              Restricted contact
            </span>
          );
        }
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={contactName(row)} src={row.profilePictureUrl ?? undefined} size={22} />
            <span className="min-w-0 flex-1">
              <EditableCell
                {...shared}
                label={`Name of ${contactName(row)}`}
                value={row.name}
                placeholder="Unnamed"
                display={
                  row.name.trim() === '' ? (
                    <span className="text-text-faint">Unnamed</span>
                  ) : (
                    <span className="font-medium">{row.name}</span>
                  )
                }
                onCommit={(value, moveDown) => commit(row, spec, { kind: 'rename', name: value }, moveDown)}
              />
            </span>
            {/* DataTable owns the `<tr>` and offers no per-row tone, so a rolled
                back edit is marked here rather than by tinting the row. */}
            {flash[row.id] ? <Tag tone="danger">Not saved</Tag> : null}
            {arrived[row.id] ? <Tag tone="accent">New</Tag> : null}
          </span>
        );
      }

      case 'fixed:channel': {
        const meta = platformOf(row.__typename);
        return <Tag tone={meta.tone}>{meta.label}</Tag>;
      }

      case 'fixed:phone': {
        const phone = phoneOf(row);
        const handle = usernameOf(row);
        if (phone) return <span className="tabular-nums">{phone}</span>;
        /* Instagram and TikTok carry a handle instead; showing it here is
           honest, and an empty column would look like missing data. */
        return handle ? <span className="text-text-muted">@{handle}</span> : dash;
      }

      case 'fixed:stage':
        return (
          <EditableCell
            {...shared}
            label={`Stage of ${contactName(row)}`}
            value={row.salesStageV2 ?? ''}
            options={[
              /* No option for "no stage": `contactSetSalesStage` takes a
                 non-null `SalesStageV2!`, so a stage cannot be taken away
                 again once it is set. */
              ...(row.salesStageV2 ? [] : [{ value: '', label: 'No stage' }]),
              ...STAGE_ORDER.map((stage) => ({ value: stage, label: STAGE_META[stage].label })),
            ]}
            display={
              row.salesStageV2 ? (
                <Tag tone={STAGE_META[row.salesStageV2].tone}>{STAGE_META[row.salesStageV2].label}</Tag>
              ) : (
                dash
              )
            }
            onCommit={(value, moveDown) => {
              if (value === '' || value === row.salesStageV2) {
                onEditingChange(null);
                return;
              }
              commit(row, spec, { kind: 'stage', stage: value as (typeof STAGE_ORDER)[number] }, moveDown);
            }}
          />
        );

      case 'fixed:assignee': {
        const current = currentAssignee(row);
        return (
          <EditableCell
            {...shared}
            label={`Owner of ${contactName(row)}`}
            value={current.kind === 'user' ? `u:${current.userAccountId}` : current.kind === 'ai' ? AI : UNASSIGNED}
            options={ownerOptions}
            display={
              row.assignee ? (
                row.assignee.__typename === 'FuelyAIAssignee' ? (
                  <Tag tone="accent">Fuely AI</Tag>
                ) : (
                  <span className={row.assignee.isUnknown ? 'text-text-faint' : undefined}>{assigneeLabel(row)}</span>
                )
              ) : (
                <span className="text-text-faint">Unassigned</span>
              )
            }
            onCommit={(value, moveDown) => {
              const to =
                value === UNASSIGNED
                  ? ({ kind: 'none' } as const)
                  : value === AI
                    ? ({ kind: 'ai' } as const)
                    : ({
                        kind: 'user' as const,
                        userAccountId: value.slice(2),
                        name: team.find((member) => `u:${member.user.id}` === value)?.user.name ?? 'Owner',
                      } as const);
              commit(row, spec, { kind: 'assign', to }, moveDown);
            }}
          />
        );
      }

      case 'fixed:unread':
        return row.unreadMessagesCount > 0 ? <Badge count={row.unreadMessagesCount} tone="muted" /> : null;

      case 'fixed:lastActive': {
        /* `lastConversationMessageTime` is null for every contact that has
           never chatted — an import, or a contact created by hand — and
           `updatedAt` is the only other time the row carries. Saying which one
           is being shown is the difference between a date and a claim. */
        const chatted = row.lastConversationMessageTime;
        return chatted ? (
          <span className="text-text-muted">{shortTime(chatted, now)}</span>
        ) : (
          <span
            className="text-text-faint"
            title="This contact has never messaged; showing when the record last changed."
          >
            {shortTime(row.updatedAt, now)}
          </span>
        );
      }

      case 'fixed:note':
        return (
          <EditableCell
            {...shared}
            label={`Note on ${contactName(row)}`}
            value={row.note ?? ''}
            placeholder="Add a note"
            display={row.note ? <span className="text-text-muted">{row.note}</span> : dash}
            onCommit={(value, moveDown) => commit(row, spec, { kind: 'note', note: value }, moveDown)}
          />
        );

      default:
        return null;
    }
  };

  const rowActions = (row: ContactRow): ReactNode => {
    if (isRestrictedRow(row)) return null;
    return (
      <span className="flex items-center justify-end gap-0.5">
        <MenuButton items={rowMenu(row)} label={`Actions for ${contactName(row)}`} />
      </span>
    );
  };

  if (cards) {
    return (
      <ContactCards
        rows={rows}
        columns={columns}
        loading={loading}
        cell={cellFor}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        onOpen={onOpen}
        onRowContextMenu={onRowContextMenu}
        rowMenu={rowMenu}
        empty={empty}
      />
    );
  }

  const tableColumns: DataTableColumn<ContactRow>[] = columns.map((spec) => ({
    key: spec.key,
    header: spec.header,
    width: spec.width,
    minWidth: 72,
    resizable: true,
    sortable: sortable && spec.sortable,
    /* A cell holding a control must be allowed to wrap: nowrap clips an input
       to a sliver of its own width. */
    wrap: spec.editable,
    render: (row) => cellFor(spec, row),
  }));

  return (
    <DataTable<ContactRow>
      columns={tableColumns}
      rows={rows}
      rowKey={(row) => row.id}
      density={DENSITY[density]}
      stickyHeader
      pinFirstColumn
      rowNavigation
      columnWidths={widths}
      onColumnWidthsChange={onWidthsChange}
      loading={loading}
      skeletonRows={8}
      sort={sort}
      onSortChange={onSortChange}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      isRowDisabled={isRestrictedRow}
      onRowClick={(row) => onOpen(row.id)}
      onRowContextMenu={onRowContextMenu}
      rowActions={rowActions}
      caption="Contacts. Arrow keys move between rows, Enter opens the record, Space selects."
      empty={empty}
    />
  );
}
