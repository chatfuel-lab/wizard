import { useState } from 'react';
import { errorMessageFor } from '~api';
import {
  AiAgentTemplatesCatalogDocument,
  DashboardLocale,
  type AiAgentTemplateId,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../FlowBuilderContext';
import { blockOriginUnderPointer, blockPluginsForFlow, placeNewBlock, type BlockPluginDef } from '../lib/blockPlugins';
import type { FlowT } from '../types';
import { useCreateBlock } from './useCreateBlock';
import { useErrorFlash } from './useErrorFlash';

export interface AiAgentTemplateOption {
  id: AiAgentTemplateId;
  title: string;
}

/** The aiAgent family's second question, waiting for an answer. */
export interface TemplatePrompt {
  templates: readonly AiAgentTemplateOption[];
  /** Where the block goes once the template is chosen — already nudged. */
  at: { x: number; y: number };
}

export interface PlaceBlockApi {
  pending: boolean;
  actionError: string | null;
  /**
   * Create a family's block with its origin under `world` — a drop point, a
   * click, the viewport centre — nudged off anything already there. The
   * aiAgent family cannot be created without a template, so for it this
   * fetches the catalog and raises `templatePrompt` instead; `chooseTemplate`
   * finishes the job at the remembered position.
   */
  place: (pluginKey: string, world: { x: number; y: number }) => Promise<void>;
  templatePrompt: TemplatePrompt | null;
  chooseTemplate: (templateID: string) => Promise<void>;
  dismissTemplate: () => void;
}

/**
 * The palette's create path, reachable from a drop, an armed click and Enter
 * alike, with the position arriving as a world point rather than being guessed
 * from the viewport: the shared `useCreateBlock` recipe (slim response →
 * refetch → select the new block), the two-step template pick for the one
 * family that needs it, and `blockOriginUnderPointer` before `placeNewBlock`,
 * so the block appears under the pointer rather than hanging off it.
 */
export function usePlaceBlock(flow: FlowT, refetch: () => Promise<void>): PlaceBlockApi {
  const { client } = useFlowBuilder();
  const { pending: creating, actionError: createError, create } = useCreateBlock(flow, refetch);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState<TemplatePrompt | null>(null);
  const catalog = useErrorFlash();

  const pending = creating || loadingTemplates;

  const place = async (pluginKey: string, world: { x: number; y: number }) => {
    const plugin = blockPluginsForFlow(flow).find((candidate) => candidate.key === pluginKey);
    if (!plugin || pending) return;
    const origin = blockOriginUnderPointer(world);
    const at = placeNewBlock(flow.blocks, origin.x, origin.y);
    if (plugin.needsTemplate) {
      setLoadingTemplates(true);
      catalog.clear();
      try {
        const data = await client.query(AiAgentTemplatesCatalogDocument, { locale: DashboardLocale.En });
        setTemplatePrompt({ templates: data.aiAgentTemplates ?? [], at });
      } catch (err) {
        catalog.flash(errorMessageFor(err, {}));
      } finally {
        setLoadingTemplates(false);
      }
      return;
    }
    await create(() => client.mutate(plugin.document, { flowID: flow.id, x: at.x, y: at.y }));
  };

  const chooseTemplate = async (templateID: string) => {
    const prompt = templatePrompt;
    const plugin = blockPluginsForFlow(flow).find(
      (candidate): candidate is BlockPluginDef & { needsTemplate: true } => candidate.needsTemplate === true,
    );
    if (!prompt || !plugin) return;
    setTemplatePrompt(null);
    await create(() =>
      client.mutate(plugin.document, {
        flowID: flow.id,
        x: prompt.at.x,
        y: prompt.at.y,
        templateID: templateID as AiAgentTemplateId,
      }),
    );
  };

  const dismissTemplate = () => setTemplatePrompt(null);

  return {
    pending,
    actionError: createError ?? catalog.error,
    place,
    templatePrompt,
    chooseTemplate,
    dismissTemplate,
  };
}
