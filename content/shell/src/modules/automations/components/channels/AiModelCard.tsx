import { useEffect, useState } from 'react';
import { Alert, Button, Card, IconSparkles, RadioGroup, Skeleton, Tag, useToast } from '~ui';
import { useAiModel, type AiModelApi } from '../../hooks/useAiModel';
import { effectiveModel, listedModels, modelLabel, modelPrice, saveAction } from '../../lib/aiModels';

export interface AiModelCardProps {
  /** Configure: Edit. Without it the card says which model is in use and offers nothing to change. */
  canChange: boolean;
}

/**
 * The model the bot answers with, on the Default · All channels page — the
 * one place in this module that is about the whole bot rather than a source.
 *
 * Per bot, not per scope: every automation, flow and AI agent on the bot
 * answers with it. Going back to the default model unsets the choice (see
 * `saveAction`), so the bot follows the default when Chatfuel moves it.
 */
export function AiModelCard({ canChange }: AiModelCardProps) {
  return <AiModelView ai={useAiModel()} canChange={canChange} />;
}

/** The card drawn from the hook's answer alone — what the render test freezes. */
export function AiModelView({ ai, canChange }: { ai: AiModelApi; canChange: boolean }) {
  const toast = useToast();
  const inUse = effectiveModel(ai.current, ai.options);
  const [picked, setPicked] = useState<string | null>(inUse);
  const [error, setError] = useState<string | null>(null);

  // A fresh answer (first load, a save, a reload) resets the pick to what is in use.
  useEffect(() => {
    setPicked(inUse);
  }, [inUse]);

  const dirty = picked !== null && saveAction(ai.current, picked, ai.options) !== 'none';
  const models = listedModels(ai.current, ai.options);
  const selectable = new Set(ai.options.map((option) => option.model));

  const save = async () => {
    if (picked === null) return;
    setError(null);
    try {
      await ai.save(picked);
      toast.show({ title: `The bot answers with ${modelLabel(picked)}`, tone: 'success', duration: 3000 });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <IconSparkles size={16} />
          <span>AI model</span>
        </span>
      }
      description="The model every AI answer on this bot is written with — all sources, flows and AI agents."
      actions={inUse ? <Tag tone="neutral">{modelLabel(inUse)}</Tag> : null}
      footer={
        canChange && ai.options.length > 0 ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={!dirty || ai.saving} onClick={() => setPicked(inUse)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!dirty} loading={ai.saving} onClick={() => void save()}>
              Save model
            </Button>
          </div>
        ) : undefined
      }
    >
      {ai.loading && ai.options.length === 0 ? (
        <Skeleton variant="block" height="10rem" />
      ) : ai.error ? (
        <Alert
          tone="danger"
          title="The model could not be read"
          action={
            <Button size="sm" variant="secondary" onClick={ai.reload}>
              Retry
            </Button>
          }
        >
          {ai.error}
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <RadioGroup
            aria-label="AI model"
            value={picked ?? ''}
            onChange={setPicked}
            disabled={!canChange || ai.saving}
            options={models.map((model) => ({
              value: model,
              label: ai.options.find((o) => o.model === model)?.isDefault
                ? `${modelLabel(model)} · default`
                : modelLabel(model),
              description: modelPrice(model),
              disabled: !selectable.has(model),
            }))}
          />
          <p className="text-xs text-text-muted">
            Prices are per million tokens and include Chatfuel&apos;s fee. Estimated usage is based on average benchmark
            data.
          </p>
          {!canChange ? (
            <p className="text-xs text-text-muted">Changing the model needs the Configure · Edit permission.</p>
          ) : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      )}
    </Card>
  );
}
