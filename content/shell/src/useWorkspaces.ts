import { useEffect, useState } from 'react';
import type { ModuleClient } from '~api';
import { WorkspacesListDocument } from '~api/generated/core/graphql';
import type { WorkspaceOption } from './lib/botSelection';

export interface WorkspacesState {
  workspaces: WorkspaceOption[];
  /** False until the query has answered one way or the other. */
  loaded: boolean;
}

/**
 * The account's workspaces and the bots in them — one query, both levels of the
 * topbar picker, and the bot titles the chrome shows.
 *
 * `workspaces` lives on `currentUser` (there is no root field for it) and is
 * not paginated, so this is a single round trip.
 *
 * Pass `null` for the client when the auth module is on. That query asks about
 * the account behind the deployment rather than about the signed-in person, and
 * the proxy refuses it — correctly, since with auth a session owns exactly one
 * bot and there is nothing to pick.
 */
export function useWorkspaces(client: ModuleClient | null): WorkspacesState {
  const [state, setState] = useState<WorkspacesState>({ workspaces: [], loaded: false });

  useEffect(() => {
    let cancelled = false;
    if (!client) {
      setState({ workspaces: [], loaded: true });
      return undefined;
    }
    setState({ workspaces: [], loaded: false });
    client
      .query(WorkspacesListDocument, {})
      .then((data) => {
        if (cancelled) return;
        setState({
          workspaces: (data.currentUser?.workspaces ?? []).map((w) => ({
            id: w.id,
            title: w.title,
            bots: w.bots.map((b) => ({ id: b.id, title: b.title })),
          })),
          loaded: true,
        });
      })
      .catch(() => {
        // Loaded-with-nothing rather than loading forever: a stored bot id is
        // still workable, and the empty state says what to do about the rest.
        if (!cancelled) setState({ workspaces: [], loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return state;
}
