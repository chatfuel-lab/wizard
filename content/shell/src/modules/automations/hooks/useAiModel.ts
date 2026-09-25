import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AutomationsAiModelDocument,
  AutomationsBotSetOpenAiModelDocument,
  AutomationsBotUnsetOpenAiModelDocument,
} from '~api/generated/automations/graphql';
import { useAutomations } from '../AutomationsContext';
import { saveAction, type AiModelOption } from '../lib/aiModels';
import { errorMessage } from '../lib/errors';

export interface AiModelApi {
  /** The bot's own choice; null = the default. */
  current: string | null;
  options: AiModelOption[];
  loading: boolean;
  /** A failed read — the card says so and offers a retry. */
  error: string | null;
  saving: boolean;
  reload: () => void;
  /** Writes what `saveAction` says. Rejects with the sentence to show. */
  save: (chosen: string) => Promise<void>;
}

/**
 * The bot's AI model: one read (`AutomationsAIModel`) and the set/unset pair.
 *
 * Its own query, not a field on the bootstrap: the model is Configure's
 * business rather than Ai's, and an error here must not blank the automations.
 */
export function useAiModel(): AiModelApi {
  const { client, botId } = useAutomations();
  const [current, setCurrent] = useState<string | null>(null);
  const [options, setOptions] = useState<AiModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);

  const reload = useCallback(() => {
    const gen = ++generation.current;
    setLoading(true);
    setError(null);
    client
      .query(AutomationsAiModelDocument, { botID: botId })
      .then((data) => {
        if (gen !== generation.current) return;
        setCurrent(data.bot.openAIConfig.model ?? null);
        setOptions(data.bot.openAIModelOptions.map(({ model, isDefault }) => ({ model, isDefault })));
      })
      .catch((err: unknown) => {
        if (gen === generation.current) setError(errorMessage(err));
      })
      .finally(() => {
        if (gen === generation.current) setLoading(false);
      });
  }, [client, botId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (chosen: string) => {
      const action = saveAction(current, chosen, options);
      if (action === 'none') return;
      setSaving(true);
      try {
        const next =
          action === 'unset'
            ? (await client.mutate(AutomationsBotUnsetOpenAiModelDocument, { botID: botId })).botUnsetOpenAIModel
            : (await client.mutate(AutomationsBotSetOpenAiModelDocument, { botID: botId, openAIModel: chosen }))
                .botSetOpenAIModel;
        setCurrent(next.openAIConfig.model ?? null);
      } catch (err) {
        throw new Error(errorMessage(err), { cause: err });
      } finally {
        setSaving(false);
      }
    },
    [client, botId, current, options],
  );

  return { current, options, loading, error, saving, reload, save };
}
