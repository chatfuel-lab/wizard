import { useEffect, useMemo } from 'react';
import { ModuleRoot, Spinner } from '~ui';
import type { ModuleAppProps } from '../types';
import { useShellBridge } from '../shellApi';
import { CoworkerContext } from './CoworkerContext';
import { useCoworkerRuntime } from './hooks/useCoworkerRuntime';
import { CoworkerWorkspace } from './CoworkerWorkspace';

/**
 * The module's full-page surface, and the embeddable entry point.
 *
 * Providers only: a component that renders a context
 * provider may not also consume it, directly or through a hook that does. The
 * work happens one component down, in CoworkerWorkspace.
 *
 * The runtime it hands down owns the one socket, the one answer to the
 * assistant's screen-context tool, and the record of which navigations have
 * already run — none of which may be duplicated, and none of which can live in
 * a component the shell remounts on every bot switch.
 */
export function CoworkerApp({ botId, client, params, setParams }: ModuleAppProps) {
  const runtime = useCoworkerRuntime(client, botId);

  /* The app around this module, handed to the runtime — which is what lets the
     assistant answer "what am I looking at" with the truth and act on the
     answer. Null in an embed, where there is no app of ours to move; the
     runtime then says so instead of silently swallowing a navigation. */
  const shell = useShellBridge();
  useEffect(() => {
    if (runtime === null) return undefined;
    runtime.setShell(shell);
    return () => runtime.setShell(null);
  }, [runtime, shell]);
  const value = useMemo(
    () => (runtime === null ? null : { client, botId, events: runtime.bus, runtime }),
    [runtime, client, botId],
  );

  if (value === null) {
    return (
      <ModuleRoot>
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      </ModuleRoot>
    );
  }

  return (
    <CoworkerContext.Provider value={value}>
      <ModuleRoot>
        <CoworkerWorkspace params={params} setParams={setParams} />
      </ModuleRoot>
    </CoworkerContext.Provider>
  );
}
