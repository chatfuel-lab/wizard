/**
 * The module's `Component` — the ordinary module contract (`ModuleAppProps`),
 * which the shell never mounts for auth: auth is a hidden module and reaches
 * the screen through its host integration instead.
 *
 * It stays an explanation rather than a second Team page on purpose. The page
 * needs an adapter, a session and a membership, and all three come from
 * `AuthProvider` above the shell; a standalone that built its OWN adapter
 * would be a second Supabase client with its own storage key, its own refresh
 * timer and its own idea of who is signed in — two sessions in one tab. The
 * embed story is the same one: mount `AuthGate` (the manifest's
 * `entryComponent`), and '/team' works inside it.
 */
import { EmptyState, IconUsers, ModuleRoot } from '~ui';
import type { ModuleAppProps } from '../../types';

export function TeamStandalone(_props: ModuleAppProps) {
  return (
    <ModuleRoot>
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<IconUsers />}
          title="Team"
          description="The Team page lives at /team, inside the auth gate — open it from the avatar menu in the top bar."
        />
      </div>
    </ModuleRoot>
  );
}
