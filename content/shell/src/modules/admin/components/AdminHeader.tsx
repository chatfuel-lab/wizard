import { Button, IconLock, IconRefresh, PageHeader, Tabs } from '~ui';
import type { AdminView } from '../lib/adminParams';

export interface AdminHeaderProps {
  view: AdminView;
  onView: (view: AdminView) => void;
  /** The account the master token belongs to — which Chatfuel this is. */
  accountName: string | null;
  /** Off where there is no database: nobody to grant a bot to. */
  showAccess: boolean;
  loading: boolean;
  onRefresh: () => void;
  onLock: () => void;
}

export function AdminHeader({ view, onView, accountName, showAccess, loading, onRefresh, onLock }: AdminHeaderProps) {
  const tabs = [
    { id: 'bots', label: 'Bots' },
    ...(showAccess ? [{ id: 'access', label: 'Access' }] : []),
    { id: 'health', label: 'Health' },
  ];

  return (
    <PageHeader
      title="Admin"
      meta={accountName ? <span className="text-meta text-text-muted">{accountName}</span> : null}
      actions={
        <>
          <Button variant="ghost" iconOnly aria-label="Refresh" loading={loading} onClick={onRefresh}>
            <IconRefresh />
          </Button>
          <Button variant="ghost" onClick={onLock}>
            <IconLock />
            Lock
          </Button>
        </>
      }
      tabs={<Tabs tabs={tabs} active={view} onSelect={(id) => onView(id as AdminView)} />}
    />
  );
}
