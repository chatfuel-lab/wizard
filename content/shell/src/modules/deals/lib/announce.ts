/**
 * What a screen reader hears.
 *
 * A multi-card drag is N sequential `contactSetSalesStage` round trips — there
 * is no bulk mutation in this API — so a partial failure is a normal outcome,
 * not an edge case, and the announcement has to be able to say so. Getting that
 * wording right is the whole reason this is a tested pure function rather than
 * a template literal in a component.
 */

const MAX_NAMES = 3;

/** "Maria Demo", "Maria and Jonas", "Maria, Jonas and 4 more". Empty in, empty out. */
export function nameList(names: readonly string[]): string {
  const cleaned = names.map((name) => name.trim() || 'Unnamed');
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0]!;
  if (cleaned.length <= MAX_NAMES) {
    return `${cleaned.slice(0, -1).join(', ')} and ${cleaned.at(-1)}`;
  }
  return `${cleaned.slice(0, MAX_NAMES).join(', ')} and ${cleaned.length - MAX_NAMES} more`;
}

export interface DragPhrase {
  phase: 'start' | 'over' | 'drop' | 'cancel';
  names: readonly string[];
  /** The column under the pointer, or null when there is none. */
  stageLabel: string | null;
}

export function dragAnnouncement({ phase, names, stageLabel }: DragPhrase): string {
  const subject = names.length > 1 ? `${names.length} deals` : nameList(names);
  if (subject === '') return '';

  switch (phase) {
    case 'start':
      return `Picked up ${subject}. Move to a column, or press Escape to cancel.`;
    case 'over':
      return stageLabel === null ? 'Not over a column.' : `Over ${stageLabel}.`;
    case 'drop':
      return stageLabel === null ? `Returned ${subject}.` : `Dropped ${subject} on ${stageLabel}.`;
    case 'cancel':
      return `Cancelled. ${subject} stayed put.`;
  }
}

/**
 * Spoken once after the whole batch settles, never once per card.
 *
 * An empty result says nothing at all — "0 deals moved" is noise, and it is
 * exactly what a same-column drop would otherwise produce.
 */
export function moveResultPhrase(moved: readonly string[], failed: readonly string[], stageLabel: string): string {
  const total = moved.length + failed.length;
  if (total === 0) return '';

  if (failed.length === 0) {
    return moved.length === 1
      ? `${nameList(moved)} moved to ${stageLabel}.`
      : `${moved.length} deals moved to ${stageLabel}.`;
  }

  if (moved.length === 0) {
    return failed.length === 1
      ? `${nameList(failed)} could not be moved and stayed put.`
      : `${failed.length} deals could not be moved and stayed put.`;
  }

  return `${moved.length} of ${total} moved to ${stageLabel}; ${nameList(failed)} returned.`;
}
