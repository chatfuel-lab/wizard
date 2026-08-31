import { SalesStageV2 } from '~api/generated/deals/graphql';
import type { TagProps } from '~ui';

/** The 6 fixed kanban columns, board order. */
export const STAGES: SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
  SalesStageV2.Won,
  SalesStageV2.Lost,
];

/** Everything still in play — what a pipeline rollup should cover. */
export const OPEN_STAGES: SalesStageV2[] = [
  SalesStageV2.New,
  SalesStageV2.Sorting,
  SalesStageV2.Ready,
  SalesStageV2.WorkingOn,
];

/**
 * `dot` is the column's identity colour, taken from the S0 pipeline ramp.
 *
 * It exists because `tone` cannot tell the six columns apart: `TagProps['tone']`
 * has no `info`, so Ready and WorkingOn both come out `warning` and render
 * identically. Fixing that through `Tag` would mean editing a vendored
 * `content/ui` file; a dot from the ramp gives six distinct colours with no
 * change there at all, and the ramp was added for exactly this.
 */
export const STAGE_META: Record<SalesStageV2, { label: string; tone: NonNullable<TagProps['tone']>; dot: string }> = {
  [SalesStageV2.New]: { label: 'New', tone: 'accent', dot: 'bg-pipeline-1' },
  [SalesStageV2.Sorting]: { label: 'Sorting', tone: 'neutral', dot: 'bg-pipeline-2' },
  [SalesStageV2.Ready]: { label: 'Ready', tone: 'warning', dot: 'bg-pipeline-3' },
  [SalesStageV2.WorkingOn]: { label: 'Working on', tone: 'warning', dot: 'bg-pipeline-4' },
  [SalesStageV2.Won]: { label: 'Won', tone: 'success', dot: 'bg-success' },
  [SalesStageV2.Lost]: { label: 'Lost', tone: 'danger', dot: 'bg-danger' },
};
