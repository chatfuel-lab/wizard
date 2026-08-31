import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { ContextMenu, IconDownload, IconExternal, IconLink, type ContextMenuPoint, type MenuItem } from '~ui';
import { STAGES, STAGE_META } from '../lib/stages';
import { contactName } from '../lib/tableColumns';
import { stageShortcutKey } from '../lib/tableSelection';
import type { DealsTableRow } from '../types';

export interface TableRowMenuProps {
  point: ContextMenuPoint | null;
  onPointChange: (point: ContextMenuPoint | null) => void;
  /**
   * What the menu acts on — already resolved by `actionTargets`, so this is the
   * whole selection when the right-clicked row was part of it and that one row
   * otherwise.
   */
  targets: readonly DealsTableRow[];
  canEdit: boolean;
  onOpen: (contactId: string) => void;
  onStage: (rows: readonly DealsTableRow[], to: SalesStageV2) => void;
  onCopyLink: (row: DealsTableRow) => void;
  onExport: (rows: readonly DealsTableRow[]) => void;
}

/**
 * One menu for the whole table, in controlled mode.
 *
 * Mounting a `ContextMenu` per row is what the uncontrolled API asks for and it
 * is impossible here: a `<tr>` cannot be wrapped in a render-prop component
 * without breaking the table's own markup, and 150 mounted surfaces would be
 * absurd anyway. So the table reports a point and this renders once.
 *
 * Two entries are single-target only. "Open" on three deals means nothing —
 * only one panel exists — and a copied link points at one `deal=` id, so
 * offering either for a multi-selection would be a control that cannot do what
 * it says. They are omitted rather than disabled.
 *
 * The `1`–`6` hints are real: `TABLE_ROW_BINDINGS` binds the same keys to the
 * selection in `TableView`, and both sides read the key off `BOARD_BINDINGS`.
 */
export function TableRowMenu({
  point,
  onPointChange,
  targets,
  canEdit,
  onOpen,
  onStage,
  onCopyLink,
  onExport,
}: TableRowMenuProps) {
  const count = targets.length;
  const single = count === 1 ? targets[0] : undefined;
  const noun = count === 1 ? 'deal' : `${count} deals`;

  const items: MenuItem[] = [];

  if (single) {
    items.push({ kind: 'label', id: 'target', label: contactName(single) });
    items.push({
      id: 'open',
      label: 'Open the deal',
      icon: <IconExternal size={14} />,
      shortcut: ['enter'],
      onSelect: () => onOpen(single.id),
    });
  } else if (count > 1) {
    items.push({ kind: 'label', id: 'target', label: `${count} deals selected` });
  }

  if (canEdit && count > 0) {
    items.push({ kind: 'separator', id: 'stages' });
    for (const [index, stage] of STAGES.entries()) {
      const key = stageShortcutKey(index);
      items.push({
        id: `stage-${stage}`,
        label: `Move to ${STAGE_META[stage].label}`,
        /* A check rather than a disabled row: the stage a single deal is
           already in is a state worth showing, and choosing it is a no-op the
           report simply reports as nothing moved. */
        checked: single ? single.salesStageV2 === stage : undefined,
        shortcut: key === null ? undefined : [key],
        onSelect: () => onStage(targets, stage),
      });
    }
  }

  if (count > 0) {
    items.push({ kind: 'separator', id: 'share' });
    if (single) {
      items.push({
        id: 'copy',
        label: 'Copy link to this deal',
        icon: <IconLink size={14} />,
        onSelect: () => onCopyLink(single),
      });
    }
    items.push({
      id: 'export',
      label: `Export ${noun} as CSV`,
      icon: <IconDownload size={14} />,
      onSelect: () => onExport(targets),
    });
  }

  return <ContextMenu point={point} onPointChange={onPointChange} items={items} aria-label="Deal actions" />;
}
