import { Button, IconNavigate } from '~ui';
import type { AutomationRef } from '../types';
import { BASE_SET_NAME } from '../lib/summary';

interface InheritLineProps {
  /** The set this value is coming from, or null when it is the set's own. */
  inheritsFrom: AutomationRef | null;
  /** Parents this setting may be pointed back at. */
  canInheritFrom: readonly AutomationRef[];
  onOpen: (setId: string) => void;
  onRevert: (setId: string) => void;
  disabled?: boolean;
}

const refName = (ref: AutomationRef): string => (ref.isBase ? BASE_SET_NAME : ref.name?.trim() || 'Untitled set');

/**
 * Where a setting's value comes from, and the way back.
 *
 * Two states, and they are not symmetrical: a value that is inherited says so
 * and offers to open the parent; a value the set owns offers to follow a parent
 * again. Nothing renders when the setting can neither be inherited nor
 * reverted, which is the base set's whole life.
 */
export function InheritLine({ inheritsFrom, canInheritFrom, onOpen, onRevert, disabled }: InheritLineProps) {
  if (inheritsFrom) {
    return (
      <p className="flex items-center gap-1.5 text-meta text-text-muted">
        <IconNavigate size={14} />
        <span>Follows</span>
        <Button variant="ghost" size="xs" onClick={() => onOpen(inheritsFrom.id)}>
          {refName(inheritsFrom)}
        </Button>
      </p>
    );
  }

  const parent = canInheritFrom[0];
  if (!parent) return null;

  return (
    <p className="flex items-center gap-1.5 text-meta text-text-muted">
      <Button variant="ghost" size="xs" disabled={disabled} onClick={() => onRevert(parent.id)}>
        Follow {refName(parent)} again
      </Button>
    </p>
  );
}
