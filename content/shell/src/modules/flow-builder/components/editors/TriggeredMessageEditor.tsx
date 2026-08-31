import { useMemo, useState } from 'react';
import { errorMessageFor } from '~api';
import { Button, Field, Select, type SelectOption } from '~ui';
import {
  AttrFilterDefaultOperator,
  DeleteTriggerAttributeFilterDocument,
  SetTriggerAttributeFilterDocument,
  SetTriggerConditionTypeDocument,
  SetTriggerDelayDocument,
  SetTriggeredMessageSegmentDocument,
  TriggerConditionType,
  TriggerDelayUnit,
} from '~api/generated/flow-builder/graphql';
import { useFlowBuilder } from '../../FlowBuilderContext';
import { useAttributeSuggestions } from '../../hooks/useAttributeSuggestions';
import { pickBlock } from '../../lib/pickBlock';
import { segmentErrorFilterIds } from '../../lib/segmentInput';
import type { BlockT, ElementOf } from '../../types';
import { SegmentEditor } from './shared/SegmentEditor';
import { useBlockMutation } from './useBlockMutation';

export interface TriggeredMessageEditorProps {
  element: ElementOf<'TriggeredMessageBlockElement'>;
  onBlock: (block: BlockT) => void;
  /** trigger* ops return Trigger! alone — reconcile by refetching the flow. */
  refetch: () => Promise<void>;
}

const CONDITION_OPTIONS: SelectOption[] = [
  { value: TriggerConditionType.LastMessageFromContact, label: 'After the contact’s last message' },
  { value: TriggerConditionType.ContactAttributeChanged, label: 'When an attribute changes' },
];

const DELAY_UNIT_OPTIONS: SelectOption[] = Object.values(TriggerDelayUnit).map((unit) => ({
  value: unit,
  label: unit,
}));

/**
 * Audience segment + the trigger domain (condition type, delay, attribute
 * filter). The trigger is IMMUTABLE while the entry point is enabled
 * (EnabledTriggerIsImmutable) — the controls stay visible rather than hiding,
 * and the server's refusal surfaces verbatim at the moment of the edit.
 */
export function TriggeredMessageEditor({ element, onBlock, refetch }: TriggeredMessageEditorProps) {
  const { client } = useFlowBuilder();
  const { run } = useBlockMutation(onBlock);
  const suggestions = useAttributeSuggestions(element.platform);
  const trigger = element.trigger;
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [attrDraft, setAttrDraft] = useState<{ name: string; value: string } | null>(null);
  const errorFilterIds = useMemo(() => segmentErrorFilterIds(element.segmentErrors), [element.segmentErrors]);

  /** trigger* mutation runner: no enclosing block in the response → refetch. */
  const runTrigger = async (mutate: () => Promise<unknown>) => {
    setTriggerError(null);
    try {
      await mutate();
      await refetch();
    } catch (err) {
      setTriggerError(errorMessageFor(err, {}));
    }
  };

  return (
    <div className="space-y-4">
      <SegmentEditor
        segment={element.segment}
        platform={element.platform}
        errorFilterIds={errorFilterIds}
        onSave={(request) => run(SetTriggeredMessageSegmentDocument, { elementID: element.id, request }, pickBlock)}
      />
      <div className="space-y-2 border-t border-border pt-3">
        <div className="text-xs font-medium text-text-muted">Trigger</div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-muted">Fires</span>
          <Select
            className="w-full"
            aria-label="Trigger condition"
            value={trigger.conditionType}
            options={CONDITION_OPTIONS}
            onChange={(conditionType) =>
              void runTrigger(() =>
                client.mutate(SetTriggerConditionTypeDocument, {
                  triggerID: trigger.id,
                  conditionType: conditionType as TriggerConditionType,
                }),
              )
            }
          />
        </label>
        <div className="flex items-end gap-2">
          <Field
            label="Delay"
            value={String(trigger.delayValue)}
            validate={(v) => (/^\d+$/.test(v.trim()) ? null : 'Whole number required')}
            onSave={(value) =>
              runTrigger(() =>
                client.mutate(SetTriggerDelayDocument, {
                  triggerID: trigger.id,
                  delay: { value: Number(value.trim()), unit: trigger.delayUnit },
                }),
              )
            }
          />
          <Select
            aria-label="Delay unit"
            value={trigger.delayUnit}
            options={DELAY_UNIT_OPTIONS}
            onChange={(unit) =>
              void runTrigger(() =>
                client.mutate(SetTriggerDelayDocument, {
                  triggerID: trigger.id,
                  delay: { value: trigger.delayValue, unit: unit as TriggerDelayUnit },
                }),
              )
            }
          />
        </div>
        {trigger.conditionType === TriggerConditionType.ContactAttributeChanged ? (
          <div className="space-y-2 rounded-lg border border-border p-2.5">
            <div className="text-xs font-medium text-text-muted">Watched attribute</div>
            {trigger.attributeCondition && !attrDraft ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-text">{trigger.attributeCondition.attribute.name}</span>
                <span className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setAttrDraft({
                        name: trigger.attributeCondition?.attribute.name ?? '',
                        value: trigger.attributeCondition?.defaultStrategy?.comparableValues[0] ?? '',
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void runTrigger(() =>
                        client.mutate(DeleteTriggerAttributeFilterDocument, { triggerID: trigger.id }),
                      )
                    }
                  >
                    Clear
                  </Button>
                </span>
              </div>
            ) : null}
            {!trigger.attributeCondition && !attrDraft ? (
              <Button variant="ghost" size="sm" onClick={() => setAttrDraft({ name: '', value: '' })}>
                Set attribute filter
              </Button>
            ) : null}
            {attrDraft ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-text-muted">Attribute</span>
                  <input
                    value={attrDraft.name}
                    list="trigger-attr-suggestions"
                    placeholder="attribute name"
                    onChange={(e) => setAttrDraft({ ...attrDraft, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                  <datalist id="trigger-attr-suggestions">
                    {suggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-text-muted">Becomes (optional)</span>
                  <input
                    value={attrDraft.value}
                    placeholder="any value"
                    onChange={(e) => setAttrDraft({ ...attrDraft, value: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!attrDraft.name.trim()}
                    onClick={() => {
                      const draft = attrDraft;
                      setAttrDraft(null);
                      void runTrigger(() =>
                        client.mutate(SetTriggerAttributeFilterDocument, {
                          triggerID: trigger.id,
                          attrCondition: {
                            name: draft.name.trim(),
                            defaultStrategy: draft.value.trim()
                              ? {
                                  operator: AttrFilterDefaultOperator.Is,
                                  comparableValues: [draft.value.trim()],
                                }
                              : undefined,
                          },
                        }),
                      );
                    }}
                  >
                    Save filter
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setAttrDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {trigger.validationErrors.length > 0 ? (
          <p className="text-xs text-danger">Trigger issues: {trigger.validationErrors.join(', ')}</p>
        ) : null}
        {triggerError ? <p className="text-xs text-danger">{triggerError}</p> : null}
      </div>
    </div>
  );
}
