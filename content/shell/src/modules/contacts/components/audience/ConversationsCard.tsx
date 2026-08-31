import { formatCount, formatShare, ownerRows, shareOfMax, type ConversationCounts } from '../../lib/audience';
import type { AudienceOwner } from '../../hooks/useAudience';
import { BarRow, SectionCard } from './Bars';

export interface ConversationsCardProps {
  conversations: ConversationCounts | null;
  owners: AudienceOwner[] | null;
  ownersTruncated: number;
  error: string | null;
  ownersError: string | null;
  onRetry: () => void;
  stale?: boolean;
}

/**
 * The inbox side of the address book: unread, unassigned, handled by Fuely AI,
 * and one row per team member.
 *
 * Every number here comes from `contactChatsCountV2`, which counts contacts
 * that HAVE a conversation — the caveat is passed in already sized (e.g. "12
 * of your 340 contacts have never chatted", with the real counts substituted
 * in) rather than written as a vague warning, because the difference between
 * the two counts is exactly what makes a person think an import failed.
 *
 * The owner breakdown is one request per person: there is no group-by in this
 * API, so the list is capped and says what it left out.
 */
export function ConversationsCard({
  conversations,
  owners,
  ownersTruncated,
  error,
  ownersError,
  onRetry,
  stale,
}: ConversationsCardProps) {
  const total = conversations?.total ?? 0;
  const rows = owners === null ? [] : ownerRows(owners, new Map(owners.map((o) => [o.userId, o.count])), total);

  const summary: { label: string; value: number | null; hint: string }[] = [
    { label: 'Unread', value: conversations?.unread ?? null, hint: 'Conversations with at least one unread message.' },
    { label: 'Unassigned', value: conversations?.unassigned ?? null, hint: 'Nobody owns these conversations.' },
    {
      label: 'Handled by Fuely AI',
      value: conversations?.ai ?? null,
      hint: 'Assigned to the AI rather than to a person.',
    },
  ];

  return (
    <SectionCard
      title="Conversations"
      description="Contacts that have a conversation, split by state and by owner."
      error={error}
      onRetry={onRetry}
      stale={stale}
    >
      <dl className="mb-4 grid grid-cols-3 gap-3">
        {summary.map((item) => (
          <div key={item.label} title={item.hint}>
            <dt className="truncate text-xs text-text-muted">{item.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-text">{formatCount(item.value)}</dd>
            <dd className="text-micro text-text-faint">
              {item.value === null || total === 0
                ? '—'
                : `${formatShare(item.value / total)} of ${total.toLocaleString()}`}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mb-2 text-xs font-medium text-text-muted">By owner</p>
      {ownersError !== null ? (
        <p className="text-sm text-text-muted">{ownersError}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-muted">
          This bot has no team members yet, so every conversation is unassigned or handled by Fuely AI.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <BarRow
              key={row.userId}
              label={row.name}
              labelWidth="8rem"
              fraction={shareOfMax(row.count, rows)}
              value={formatCount(row.count)}
              detail={total > 0 ? formatShare(row.share) : undefined}
              muted={row.count === 0}
              title={`${row.name}: ${row.count.toLocaleString()} conversations assigned, ${formatShare(row.share)} of the ${total.toLocaleString()} counted`}
            />
          ))}
        </ul>
      )}
      {ownersTruncated > 0 ? (
        <p className="mt-2 text-micro text-text-faint">
          {ownersTruncated.toLocaleString()} more team member{ownersTruncated === 1 ? '' : 's'} are not counted here —
          this API has no group-by, so each row is its own request.
        </p>
      ) : null}
    </SectionCard>
  );
}
