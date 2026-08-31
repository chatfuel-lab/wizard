import { useState, type RefObject } from 'react';
import { errorMessageFor } from '~api';
import {
  AiAgentTemplatesCatalogDocument,
  DashboardLocale,
  type AiAgentTemplateId,
} from '~api/generated/flow-builder/graphql';
import { Select } from '~ui';
import { useFlowBuilder } from '../FlowBuilderContext';
import { useCreateBlock } from '../hooks/useCreateBlock';
import type { AiAgentTemplateOption } from '../hooks/usePlaceBlock';
import {
  blockPluginsForFlow,
  placeNewBlock,
  type BlockPluginDef,
  type ConnectedCreateRequest,
} from '../lib/blockPlugins';
import { BLOCK_SOURCE_HANDLE, decodeHandleId } from '../lib/graph';
import type { DanglingEdge, FlowT } from '../types';

export interface ConnectMenuProps {
  flow: FlowT;
  refetch: () => Promise<void>;
  /** The dropped edge this menu completes. */
  dangling: DanglingEdge;
  /** The canvas wrapper — the menu opens at the drop point inside it. */
  canvasRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

/** The dangling edge's source parts, ready for the connected-create request. */
function toRequest(dangling: DanglingEdge): ConnectedCreateRequest {
  const { sourceBlockID, sourceHandle } = dangling;
  if (!sourceHandle || sourceHandle === BLOCK_SOURCE_HANDLE) return { sourceBlockID };
  const decoded = decodeHandleId(sourceHandle);
  return decoded
    ? { sourceBlockID, sourceBlockElementID: decoded.elementId, sourceHandleID: decoded.handleId }
    : { sourceBlockID };
}

/**
 * The creation triad's second leg on canvas: an edge dropped on empty space
 * opens this picker at the drop point; the chosen family fires its
 * <family>CreateWithBlockAndConnection — block creation and edge wiring in
 * ONE atomic round-trip (no orphan block when the server refuses the edge).
 * Families without a connected variant (the entry points — they cannot be
 * edge targets) are not offered. Same slim-diff → refetch → select landing as
 * the palette via useCreateBlock; the aiAgent family swaps in its template
 * pick first.
 */
export function ConnectMenu({ flow, refetch, dangling, canvasRef, onClose }: ConnectMenuProps) {
  const { client } = useFlowBuilder();
  const { pending, actionError, create } = useCreateBlock(flow, refetch);
  const [templates, setTemplates] = useState<readonly AiAgentTemplateOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const plugins = blockPluginsForFlow(flow).filter((p) => p.connectedDocument);
  if (plugins.length === 0) return null;

  const rect = canvasRef.current?.getBoundingClientRect();
  const left = rect ? Math.min(Math.max(dangling.client.x - rect.left, 8), rect.width - 240) : 8;
  const top = rect ? Math.min(Math.max(dangling.client.y - rect.top, 8), rect.height - 48) : 8;

  const request = toRequest(dangling);
  const { x, y } = placeNewBlock(flow.blocks, dangling.position.x, dangling.position.y);

  const finish = async (run: () => Promise<Record<string, unknown>>) => {
    await create(run);
    onClose();
  };

  const add = async (key: string) => {
    const plugin = plugins.find((p) => p.key === key);
    if (!plugin?.connectedDocument || pending) return;
    if (plugin.needsTemplate) {
      setCatalogError(null);
      try {
        const data = await client.query(AiAgentTemplatesCatalogDocument, { locale: DashboardLocale.En });
        setTemplates(data.aiAgentTemplates ?? []);
      } catch (err) {
        setCatalogError(errorMessageFor(err, {}));
      }
      return;
    }
    const doc = plugin.connectedDocument;
    await finish(() => client.mutate(doc, { flowID: flow.id, request, x, y }));
  };

  const addAiAgent = async (templateID: string) => {
    const plugin = plugins.find((p): p is BlockPluginDef & { needsTemplate: true } => p.needsTemplate === true);
    const doc = plugin?.connectedDocument;
    if (!doc) return;
    setTemplates(null);
    await finish(() =>
      client.mutate(doc, {
        flowID: flow.id,
        request,
        x,
        y,
        templateID: templateID as AiAgentTemplateId,
      }),
    );
  };

  const error = actionError ?? catalogError;

  return (
    <div
      className="absolute z-10 w-60 space-y-1 rounded-lg border border-border bg-surface-raised p-2 shadow-lg"
      style={{ left, top }}
    >
      {templates ? (
        <Select
          value=""
          placeholder="Pick AI agent template…"
          aria-label="Pick AI agent template"
          disabled={pending}
          options={templates.map((t) => ({ value: t.id, label: t.title }))}
          onChange={(id) => void addAiAgent(id)}
        />
      ) : (
        <Select
          value=""
          placeholder={pending ? 'Creating…' : 'Create connected block…'}
          aria-label="Create connected block"
          disabled={pending}
          options={plugins.map((p) => ({ value: p.key, label: p.label }))}
          onChange={(key) => void add(key)}
        />
      )}
      {error ? <p className="truncate text-xs text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-md px-2 py-1 text-left text-xs text-text-muted hover:bg-surface-hover hover:text-text"
      >
        Cancel
      </button>
    </div>
  );
}
