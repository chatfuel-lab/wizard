import { useRef } from 'react';
import { toggleSelection } from '../../lib/data/table';

export interface TableSelection {
  selectable: boolean;
  selectableIds: string[];
  selectedSet: Set<string>;
  selectedHere: number;
  onToggleRow: (id: string, shift: boolean) => void;
  onToggleAll: () => void;
}

export function useTableSelection<T>(options: {
  rows: T[];
  rowKey: (row: T) => string;
  isRowDisabled?: (row: T) => boolean;
  selectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;
}): TableSelection {
  const { rows, rowKey, isRowDisabled, selectedIds, onSelectionChange } = options;

  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;
  const anchorRef = useRef<string | null>(null);

  const selectableIds = rows.filter((row) => !isRowDisabled?.(row)).map(rowKey);
  const selectedSet = new Set(selectedIds ?? []);
  const selectedHere = selectableIds.filter((id) => selectedSet.has(id)).length;

  const onToggleRow = (id: string, shift: boolean) => {
    if (!selectable) return;
    const result = toggleSelection({
      ids: selectableIds,
      selected: selectedIds ?? [],
      id,
      anchor: anchorRef.current,
      shift,
    });
    anchorRef.current = result.anchor;
    onSelectionChange?.(result.selected);
  };

  const onToggleAll = () => {
    if (!selectable) return;
    anchorRef.current = null;
    onSelectionChange?.(selectedHere >= selectableIds.length ? [] : selectableIds);
  };

  return { selectable, selectableIds, selectedSet, selectedHere, onToggleRow, onToggleAll };
}
