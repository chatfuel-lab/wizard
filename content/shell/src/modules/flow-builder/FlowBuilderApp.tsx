import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, IconFlow, ModuleRoot, SplitPane, ToastProvider } from '~ui';
import type { ModuleAppProps } from '../types';
import { usePublishScreenContext } from '../shellApi';
import { FlowBuilderContext, type FlowBuilderContextValue } from './FlowBuilderContext';
import { FlowEditor } from './components/FlowEditor';
import { FlowPicker } from './components/FlowPicker';
import { useFlowPrefetch } from './hooks/useFlowPrefetch';
import { useFlowsList } from './hooks/useFlowsList';
import { createPrefetchCache } from './lib/flowPrefetch';

/**
 * Embeddable root of the flow-builder module: FlowPicker on the left,
 * per-flow canvas + inspector on the right.
 * Deep links: /flow-builder?flow=<flowId>&b=<blockId>.
 */
export function FlowBuilderApp({ botId, client, params, setParams }: ModuleAppProps) {
  /* The prefetch cache is per client and bot, like everything else in here: a
     new bot is a new cache, and the old one's requests go with it. */
  const context = useMemo<FlowBuilderContextValue>(
    () => ({ client, botId, flowCache: createPrefetchCache() }),
    [client, botId],
  );
  const [flowId, setFlowId] = useState<string | null>(() => params.get('flow'));
  const [blockId, setBlockId] = useState<string | null>(() => params.get('b'));
  // The ?b= deep link belongs to the flow the link was minted for — consume
  // it once; switching flows must not resurrect it.
  const initialBlockId = useRef(params.get('b'));

  // Keep the deep link shareable (params are read once at mount; the shell
  // remounts this component on module/bot switches).
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (flowId) next.set('flow', flowId);
    else next.delete('flow');
    if (flowId && blockId) next.set('b', blockId);
    else next.delete('b');
    if (next.toString() !== params.toString()) setParams(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, blockId]);

  const selectFlow = (nextFlowId: string | null) => {
    if (nextFlowId === flowId) return;
    initialBlockId.current = null;
    setBlockId(null);
    setFlowId(nextFlowId);
  };

  return (
    /* Outside the module root, because the toast stack portals to the body
       anyway. It is here for one message: the ⌘Z that cannot undo what was just
       done, which has to be said somewhere, and which the page header's error
       banner is the wrong place for — that banner is for the server refusing
       something, and this is us refusing. */
    <ToastProvider>
      <FlowBuilderContext.Provider value={context}>
        <ModuleRoot>
          <Inner
            flowId={flowId}
            onSelectFlow={selectFlow}
            initialBlockId={initialBlockId.current}
            onBlockChange={setBlockId}
          />
        </ModuleRoot>
      </FlowBuilderContext.Provider>
    </ToastProvider>
  );
}

function Inner({
  flowId,
  onSelectFlow,
  initialBlockId,
  onBlockChange,
}: {
  flowId: string | null;
  onSelectFlow: (flowId: string | null) => void;
  initialBlockId: string | null;
  onBlockChange: (blockId: string | null) => void;
}) {
  const flows = useFlowsList();
  const prefetch = useFlowPrefetch();

  /* What the Coworker sees when it asks what is on screen. Write-only into a
     sink the shell owns; a no-op when this module runs as an embed. */
  usePublishScreenContext({
    module: 'Flows',
    flows: flows.groups.reduce((n, g) => n + g.flows.length, 0) + flows.ungrouped.length,
    openFlow: flowId,
    openBlock: initialBlockId,
  });

  // Which pane is showing while the panes are stacked. This is real state, NOT
  // `flowId ? 'detail' : 'side'`: that expression would make the back control
  // useless, because pressing it sets 'side' while flowId is still set, and the
  // next render derives 'detail' again and throws the reader straight back into
  // the canvas.
  //
  // Seeded from the selection AT MOUNT so a ?flow=<id> deep link opens the
  // canvas at every width — 360px included — which is the whole reason the seed
  // reads flowId instead of defaulting to 'side'.
  const [showing, setShowing] = useState<'side' | 'detail'>(() => (flowId ? 'detail' : 'side'));

  const select = (nextFlowId: string) => {
    onSelectFlow(nextFlowId);
    setShowing('detail');
  };

  /* The open flow was deleted. Back to the list, at every width — the canvas
     behind the dialog is showing a flow that no longer exists. */
  const deselect = () => {
    onSelectFlow(null);
    setShowing('side');
  };

  return (
    <SplitPane
      side={
        <FlowPicker flows={flows} selectedId={flowId} onSelect={select} onDeleted={deselect} onPrefetch={prefetch} />
      }
      sideWidth="sidenav"
      sideLabel="Flows"
      collapseBelow="wide"
      showing={showing}
      onShowingChange={setShowing}
    >
      {flowId ? (
        <FlowEditor
          key={flowId}
          flowId={flowId}
          initialBlockId={initialBlockId}
          onSelectedBlockChange={onBlockChange}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<IconFlow />}
            title="Pick a flow"
            description="Choose a flow on the left to view its canvas and edit message content. Run the seed recipe for a [Starter] Welcome flow."
          />
        </div>
      )}
    </SplitPane>
  );
}
