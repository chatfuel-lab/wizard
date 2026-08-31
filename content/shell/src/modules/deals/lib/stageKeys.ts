import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { STAGES } from './stages';

/**
 * The keyboard path to a stage change, and the reason the per-card `<Select>`
 * could finally be deleted.
 *
 * `1`–`6` sets the stage outright; `[` and `]` step one column. This beats
 * emulating a drag with arrow keys: it works on a multi-selection for free, and
 * it is one keystroke rather than a journey.
 */

export const STAGE_KEY_HINT = '1–6 sets the stage · [ and ] step';

/**
 * Returns the stage the key asks for, or null if the key means nothing here.
 *
 * `[` and `]` deliberately do NOT wrap: stepping off New straight into Lost on
 * one keypress is a destructive surprise, and Lost is not a neighbour of New in
 * any sense a salesperson would recognise.
 */
export function stageForKey(key: string, current: SalesStageV2 | null | undefined): SalesStageV2 | null {
  if (key >= '1' && key <= '6') return STAGES[Number(key) - 1] ?? null;
  if (key !== '[' && key !== ']') return null;
  if (!current) return null;

  const at = STAGES.indexOf(current);
  if (at === -1) return null;
  const next = at + (key === ']' ? 1 : -1);
  return STAGES[next] ?? null;
}
