import { Button, IconRefresh, PageHeader, Spinner, Tooltip } from '~ui';
import { useTeam } from '../TeamContext';

/**
 * The page's top zone: a way to reload, and nothing else.
 *
 * Adding somebody is the People card's action, next to the list it changes —
 * the same place adding a bot lives. A page-level button sat above two tables
 * and named neither.
 */
export function TeamHeader() {
  const team = useTeam();
  const loading = team.state.status === 'loading' || team.state.status === 'idle';

  return (
    <PageHeader
      title="Team"
      actions={
        <Tooltip label="Refresh">
          <Button variant="ghost" size="sm" aria-label="Refresh" onClick={team.refresh} disabled={loading}>
            {loading ? <Spinner size={14} /> : <IconRefresh />}
          </Button>
        </Tooltip>
      }
    />
  );
}
