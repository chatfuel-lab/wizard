import { useEffect, useRef } from 'react';
import {
  Alert,
  Avatar,
  DURATION,
  EASING,
  Field,
  Select,
  Separator,
  Skeleton,
  Tag,
  prefersReducedMotion,
  shortTime,
} from '~ui';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { useDealDetail } from '../hooks/useDealDetail';
import { useDealDetailMutations } from '../hooks/useDealDetailMutations';
import { useDealTeam } from '../hooks/useDealTeam';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import { attributeMap } from '../lib/dealFieldValue';
import { DEAL_FIELDS } from '../lib/dealFields';
import { platformOf } from '../lib/platforms';
import { STAGE_META, STAGES } from '../lib/stages';
import { DealAssigneeRow } from './DealAssigneeRow';
import { DealFieldRow } from './DealFieldRow';

export interface DealPanelProps {
  contactId: string;
  bindings: DealFieldBindings;
  fieldNames: string[];
  canEdit: boolean;
  /** Re-read the attribute catalog after a write may have created an attribute. */
  onFieldCreated: () => void;
}

/**
 * The body of the deal panel — host-agnostic on purpose. It is mounted in a
 * Drawer below 1280px and inline beside the canvas above it, and it must not
 * know which one it is in. It is also open over all three views, which is why
 * it moves a deal through its own mutation rather than through the board's.
 *
 * **The entrance is keyed on the deal, not on the mount**, because the two
 * hosts fail in opposite directions. The Drawer slides itself in, so a second
 * animation on the body would double up; the inline column does not animate at
 * all, and clicking a second card while it is open replaces every word in it
 * with no transition whatsoever. One short rise keyed on `contactId` is the
 * only thing that reads correctly in both: an arrival in the drawer, a
 * replacement in the column.
 */
export function DealPanel(props: DealPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    rootRef.current?.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DURATION.base, easing: EASING.entrance },
    );
  }, [props.contactId]);

  /* The shell is its own component so the body below can keep returning early
   * for the skeleton, the error and the missing deal — all four states ride
   * the same animated root instead of each carrying a copy of it. */
  return (
    <div ref={rootRef}>
      <DealPanelBody {...props} />
    </div>
  );
}

function DealPanelBody({ contactId, bindings, fieldNames, canEdit, onFieldCreated }: DealPanelProps) {
  const detail = useDealDetail(contactId, fieldNames);
  const team = useDealTeam();
  const mutations = useDealDetailMutations(contactId, fieldNames, detail.apply, onFieldCreated);
  const { deal } = detail;

  if (detail.loading && !deal) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton variant="text" className="w-2/3" />
        <Skeleton variant="block" className="h-24" />
        <Skeleton variant="block" className="h-40" />
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="p-4">
        <Alert tone="danger" title="Could not load this deal">
          {detail.error}
        </Alert>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-4 text-sm text-text-muted">
        This deal is not available — it may have been removed, or the link may be stale.
      </div>
    );
  }

  const platform = platformOf(deal.__typename);
  const values = attributeMap(deal.attributes);
  const phone = 'phone' in deal ? deal.phone : null;

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-start gap-3">
        <Avatar src={deal.profilePictureUrl ?? undefined} name={deal.name || '?'} size={40} />
        <div className="min-w-0 flex-1">
          <Field label="Name" value={deal.name} onSave={(next) => mutations.rename(next)} />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag tone={platform.tone}>{platform.label}</Tag>
            {deal.unreadMessagesCount > 0 ? <Tag tone="danger">{deal.unreadMessagesCount} unread</Tag> : null}
            {deal.unhandledSwitchToHuman ? <Tag tone="warning">Needs a human</Tag> : null}
            {phone ? <span className="text-xs text-text-muted">{phone}</span> : null}
          </div>
        </div>
      </header>

      <div>
        <span className="mb-1 block text-xs font-medium text-text-muted">Stage</span>
        <Select
          aria-label="Stage"
          value={deal.salesStageV2 ?? ''}
          disabled={!canEdit}
          onChange={(value) => void mutations.setStage(value as SalesStageV2)}
          options={STAGES.map((stage) => ({ value: stage, label: STAGE_META[stage].label }))}
        />
        <p className="mt-1 text-xs text-text-faint">Moved {shortTime(deal.lastSalesStageUpdateTime) || '—'}</p>
      </div>

      <DealAssigneeRow
        deal={deal}
        members={team.members}
        canEdit={canEdit}
        onAssign={mutations.assign}
        onAssignAI={mutations.assignAI}
        onUnassign={mutations.unassign}
      />

      <Separator />

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Deal</h3>
        {DEAL_FIELDS.map((spec) => (
          <DealFieldRow
            key={spec.key}
            binding={bindings[spec.key]}
            raw={values[bindings[spec.key].name]}
            canEdit={canEdit}
            onSave={mutations.setField}
          />
        ))}
      </div>

      <Separator />

      <Field
        label="Note"
        multiline
        value={deal.note ?? ''}
        onSave={(next) => mutations.setNote(next)}
        placeholder="Anything the next person should know"
      />
    </div>
  );
}
