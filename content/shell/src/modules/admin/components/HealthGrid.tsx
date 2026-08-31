import { Alert, Card, StatTile, Tag } from '~ui';
import type { AdminHealth } from '../types';

export interface HealthGridProps {
  health: AdminHealth | null;
}

const yesNo = (value: boolean | null): string => (value === null ? '—' : value ? 'Yes' : 'No');

/**
 * What this deployment can and cannot do right now.
 *
 * Every secret is a yes/no and never a value. The panel exists so an operator
 * does not have to open .env over SSH to find out whether the token still
 * works — not so they can read it out of a browser, which would make one
 * screen as sensitive as the file.
 */
export function HealthGrid({ health }: HealthGridProps) {
  if (!health) return null;

  const tiles = [
    {
      label: 'Chatfuel token',
      value: health.token.accepted ? 'Accepted' : health.token.present ? 'Refused' : 'Missing',
    },
    { label: 'Account', value: health.account?.name || '—', detail: health.account?.email ?? undefined },
    {
      label: 'Bot fence',
      value: health.fence.ok ? (health.fence.bots === null ? 'Off' : String(health.fence.bots)) : 'Unavailable',
      detail: health.fence.kind,
    },
    { label: 'Sign-in', value: health.authMode },
    {
      label: 'Database',
      value: yesNo(health.supabase.reachable),
      detail: health.supabase.configured ? undefined : 'Not configured',
    },
    { label: 'Publish queue', value: yesNo(health.publishingQueue) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {health.problems.length > 0 ? (
        <Alert tone="warning" title="This deployment is not fully configured">
          <div className="flex flex-wrap gap-1 pt-1">
            {health.problems.map((problem) => (
              <Tag key={problem} tone="warning">
                {problem}
              </Tag>
            ))}
          </div>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 @wide:grid-cols-3">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} detail={tile.detail} />
        ))}
      </div>

      <Card>
        <dl className="flex flex-col gap-2">
          {[
            ['Chatfuel API', health.upstream],
            ['Token variable', health.tokenEnv],
            ['Home workspace', health.homeWorkspaceId ?? '—'],
            ['Outbound', health.egress],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-label text-text-muted">{label}</dt>
              <dd className="min-w-0 truncate text-body text-text">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
