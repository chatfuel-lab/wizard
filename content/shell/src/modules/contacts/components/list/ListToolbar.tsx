import type { Dispatch, SetStateAction } from 'react';
import { Button, IconPlus, Select, Toolbar } from '~ui';
import type { AttributeCatalog } from '../../hooks/useAttributeCatalog';
import type { ContactsFilter } from '../../lib/contactsFilter';
import type { Density } from '../../lib/contactsParams';
import type { QueryPlan } from '../../lib/queryPlan';
import { DENSITY_LABELS, type ColumnLayout, type ListPreferences } from '../../lib/tableColumns';
import type { TeamMember } from '../../types';
import { FilterBar } from '../filters/FilterBar';
import { SavedViewsMenu } from '../filters/SavedViewsMenu';
import { ExportButton } from '../io/ExportButton';
import { ImportButton } from '../io/ImportButton';
import { ColumnPicker } from './ColumnPicker';

export interface ListToolbarProps {
  filter: ContactsFilter;
  onFilterChange: (filter: ContactsFilter) => void;
  catalog: AttributeCatalog;
  team: TeamMember[];
  search: string;
  onSearchChange: (search: string) => void;
  /** The menu's apply: the filter plus the extras only the list holds. */
  onApplySavedView: (next: ContactsFilter, extras?: { density: Density; layout: ColumnLayout | null }) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  layout: ColumnLayout;
  preferences: ListPreferences;
  onPreferencesChange: Dispatch<SetStateAction<ListPreferences>>;
  canEdit: boolean;
  onImported: () => void;
  onNewContact: () => void;
  /** The routing decision, for the export's segment and platforms. */
  plan: QueryPlan;
  selection: string[];
  exportDisabled: boolean;
}

/** The list's toolbar: filters, saved views, columns, density, import/export. */
export function ListToolbar({
  filter,
  onFilterChange,
  catalog,
  team,
  search,
  onSearchChange,
  onApplySavedView,
  density,
  onDensityChange,
  layout,
  preferences,
  onPreferencesChange,
  canEdit,
  onImported,
  onNewContact,
  plan,
  selection,
  exportDisabled,
}: ListToolbarProps) {
  const exportButton = (
    <ExportButton
      segment={plan.segmentVars?.segment ?? null}
      selectedIds={selection}
      catalog={catalog}
      /* `csvContactExportStartBySegment` takes the platforms BESIDE the
         segment rather than inside it, so an export that omits them writes
         out the channels the list is not showing. The plan already answered
         the question; under the chats engine there is no segment and the
         filter's own list is the answer. */
      platforms={plan.segmentVars?.platforms ?? filter.platforms}
      disabled={exportDisabled}
    />
  );

  return (
    <Toolbar>
      <FilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        catalog={catalog}
        team={team}
        search={search}
        onSearchChange={onSearchChange}
      />
      <SavedViewsMenu filter={filter} onApply={onApplySavedView} density={density} layout={layout} />

      <span className="ml-auto flex flex-wrap items-center gap-2">
        <ColumnPicker preferences={preferences} onChange={onPreferencesChange} catalog={catalog} />
        <Select
          value={density}
          onChange={(value) => onDensityChange(value as typeof density)}
          options={Object.entries(DENSITY_LABELS).map(([value, label]) => ({ value, label }))}
          aria-label="Row height"
          className="h-field-sm text-xs"
        />
        <ImportButton catalog={catalog} onImported={onImported} disabled={!canEdit} />
        {/* One instance, always mounted: it owns an export task and a
            subscription to it, and a second copy in the bulk bar would run
            both twice. It already takes the selection, so it covers "export
            what I picked" and "export this whole segment" from one place. */}
        {exportButton}
        {canEdit ? (
          <Button size="sm" onClick={onNewContact}>
            <IconPlus size={14} />
            New contact
          </Button>
        ) : null}
      </span>
    </Toolbar>
  );
}
