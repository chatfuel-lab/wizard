import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  DataTable,
  MenuButton,
  EmptyState,
  Input,
  PageBody,
  SegmentedControl,
  Tag,
  Toolbar,
  type DataTableColumn,
  type MenuItem,
  type SortState,
} from '~ui';
import type { CatalogEntry } from '../hooks/useAttributeCatalog';
import { useContacts } from '../ContactsContext';
import { formatCount } from '../lib/audience';
import {
  FIELD_SCOPES,
  FIELD_SCOPE_LABELS,
  dataTypeLabel,
  hasDefault,
  visibleFields,
  type FieldScope,
} from '../lib/fields';
import { attributeColumnKey } from '../lib/tableColumns';
import { filterForAttribute } from '../lib/contactsFilter';
import { DefaultValueDialog } from '../components/fields/DefaultValueDialog';
import type { ContactsViewProps } from './types';

/**
 * The bot's fields, administered.
 *
 * Everything on this screen comes from the catalog the module already loads for
 * its column picker, so the table itself costs no extra request; only the
 * drawer's flow list and the default-value writes touch the network.
 *
 * Two things this surface must keep saying, because nothing else in the product
 * does: a field is created by writing a value on a contact and dies when the
 * last value is deleted, and a bot-wide default silently changes what every
 * "is empty" filter means.
 */
export function FieldsView({
  filter,
  onFilterChange,
  catalog,
  canEdit,
  onCount,
  onBusy,
  onGoToList,
}: ContactsViewProps) {
  const { botId } = useContacts();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<FieldScope>('all');
  const [sort, setSort] = useState<SortState | null>({ key: 'usersCount', dir: 'desc' });
  const [defaultName, setDefaultName] = useState<string | null>(null);

  const rows = useMemo(
    () => visibleFields(catalog.entries, { query, scope, sort }),
    [catalog.entries, query, scope, sort],
  );

  /* The denominator for "how much of the address book carries this field".
     The biggest usersCount is a floor, not the truth, but it is the only total
     this surface has without a counting query of its own — and it is honest as
     a floor because no field can be carried by more contacts than exist. */
  const totalContacts = useMemo(
    () => catalog.entries.reduce((best, entry) => Math.max(best, entry.usersCount ?? 0), 0) || null,
    [catalog.entries],
  );

  const editing = defaultName === null ? null : (catalog.byName.get(defaultName) ?? null);

  useEffect(() => {
    onCount({ shown: rows.length, server: catalog.entries.length });
  }, [rows.length, catalog.entries.length, onCount]);

  useEffect(() => {
    onBusy(catalog.loading);
  }, [catalog.loading, onBusy]);

  const goToList = (options: { addColumn?: string } = {}) => onGoToList(options);

  const filterByField = (entry: CatalogEntry) => {
    /* Both halves: the model the list reads from props, and the address the
       list is about to be mounted at. */
    onFilterChange({ ...filter, ...filterForAttribute(entry.name), platforms: filter.platforms });
    goToList();
  };

  const addColumn = (entry: CatalogEntry) => {
    goToList({ addColumn: attributeColumnKey(entry.name) });
  };

  /* A menu rather than a panel. The catalog answers everything this surface
     can say in the row itself — how many contacts carry the field, how many
     flows read it, what its default is — so a side panel would have been a
     second place to read the same six values. What is left are the three
     things a person can DO with a field, and those fit in a menu. */
  const rowActions = (entry: CatalogEntry): MenuItem[] => [
    { id: 'filter', label: 'Filter contacts by this', onSelect: () => filterByField(entry) },
    { id: 'column', label: 'Add as a column', onSelect: () => addColumn(entry) },
    {
      id: 'default',
      label: hasDefault(entry) ? 'Change the default…' : 'Set a default…',
      disabled: !canEdit,
      onSelect: () => setDefaultName(entry.name),
    },
  ];

  const columns: DataTableColumn<CatalogEntry>[] = [
    {
      key: 'name',
      header: 'Field',
      width: '18rem',
      sortable: true,
      render: (entry) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-text">{entry.name}</span>
          {hasDefault(entry) ? <Tag tone="warning">default</Tag> : null}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '7rem',
      sortable: true,
      render: (entry) => <Tag tone={entry.type === 'custom' ? 'accent' : 'neutral'}>{entry.type}</Tag>,
    },
    {
      key: 'dataType',
      header: 'Stored as',
      width: '8rem',
      sortable: true,
      render: (entry) => dataTypeLabel(entry.dataType),
    },
    {
      key: 'usersCount',
      header: 'Contacts',
      width: '7rem',
      align: 'end',
      sortable: true,
      render: (entry) => formatCount(entry.usersCount),
    },
    {
      key: 'flowsCount',
      header: 'Flows',
      width: '6rem',
      align: 'end',
      sortable: true,
      render: (entry) => (entry.flowsCount === 0 ? <span className="text-text-faint">—</span> : entry.flowsCount),
    },
    {
      key: 'defaultValue',
      header: 'Default',
      width: '12rem',
      sortable: true,
      render: (entry) =>
        entry.defaultValue === null || entry.defaultValue === '' ? (
          <span className="text-text-faint">—</span>
        ) : (
          <span className="truncate">{entry.defaultValue}</span>
        ),
    },
  ];

  return (
    <PageBody padded={false}>
      <Toolbar>
        <Input
          className="w-72 min-w-0"
          placeholder="Search fields…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search fields"
        />
        <SegmentedControl
          size="sm"
          value={scope}
          onChange={setScope}
          options={FIELD_SCOPES.map((value) => ({ value, label: FIELD_SCOPE_LABELS[value] }))}
          aria-label="Which fields to show"
        />
      </Toolbar>

      {catalog.error ? (
        <div className="px-gutter pb-2">
          <Alert tone="danger" title="Could not read the field catalog">
            {catalog.error}
          </Alert>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(entry) => entry.name}
        stickyHeader
        pinFirstColumn
        rowNavigation
        caption={`Contact fields on bot ${botId}`}
        loading={catalog.loading}
        sort={sort}
        onSortChange={setSort}
        rowActions={(entry) => <MenuButton items={rowActions(entry)} label={`Actions for ${entry.name}`} />}
        empty={
          <EmptyState
            title={query === '' ? 'No fields yet' : 'No field matches that'}
            description={
              query === ''
                ? 'A field appears here the moment one contact carries a value for it — there is no create-field API.'
                : 'Fields are matched by name and by their localized aliases.'
            }
          />
        }
      />

      <DefaultValueDialog
        entry={editing}
        totalContacts={totalContacts}
        onClose={() => setDefaultName(null)}
        onApplied={catalog.refresh}
      />
    </PageBody>
  );
}
