import { useMemo, useRef } from 'react';
import { ModuleRoot, ToastProvider } from '~ui';
import type { ModuleAppProps } from '../types';
import { PublishingContext } from './PublishingContext';
import { PublishingQueueContext } from './PublishingQueueContext';
import { usePostsStore } from './hooks/usePostsStore';
import { PublishingWorkspace } from './PublishingWorkspace';

/**
 * Embeddable root of the Publishing module — a calendar of what is going out, a
 * queue where failures are read, a library of what is already on the account,
 * and the composer over all three.
 *
 * This component owns the providers and nothing else. `PublishingWorkspace` owns
 * the address, the band, the account gate, the composer and the keyboard.
 *
 * `rootRef` goes to `ModuleRoot` and on to the workspace, which is what every
 * shortcut in this module is scoped against: a key only fires while focus is
 * inside this element or nowhere at all, so a host app that binds `n` or `/` of
 * its own keeps them.
 *
 * The provider/consumer split is deliberate and not cosmetic: a context hook
 * called inside the component that renders the provider throws at runtime, and
 * neither `tsc` nor a node-only test suite can see it. Every hook called HERE
 * takes its arguments; nothing here reads a context this file provides.
 */
export function PublishingApp({ botId, client, view, setView, params, setParams }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);
  const queue = usePostsStore(client, botId);
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <ToastProvider>
      <PublishingContext.Provider value={context}>
        <PublishingQueueContext.Provider value={queue}>
          <ModuleRoot ref={rootRef} className="relative">
            <PublishingWorkspace
              view={view}
              setView={setView}
              params={params}
              setParams={setParams}
              rootRef={rootRef}
            />
          </ModuleRoot>
        </PublishingQueueContext.Provider>
      </PublishingContext.Provider>
    </ToastProvider>
  );
}
