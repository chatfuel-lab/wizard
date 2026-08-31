import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  ChipInput,
  Combobox,
  Dialog,
  FormField,
  Input,
  RadioGroup,
  Select,
  Textarea,
  type ComboboxOption,
} from '~ui';
import {
  AttrFilterDefaultOperator,
  FuelySettingSendEventsToMetaKeywordsRule,
  FuelySettingSendEventsToMetaSalesStage,
  FuelySettingSendEventsToMetaSwitchToHumanFrom,
} from '~api/generated/ads-optimization/graphql';
import { useAds } from '../AdsContext';
import { useCatalog } from '../AdsCatalogContext';
import { useAttributeSearch } from '../hooks/useAttributeSearch';
import { isValueless, type EventDraft } from '../lib/eventDraft';
import { TRIGGERS, type TriggerId } from '../lib/eventKinds';
import { issueOf, MAX_KEYWORDS, MAX_KEYWORD_LENGTH, MAX_PROMPT, validateDraft } from '../lib/eventRules';
import { handoffLabel, operatorLabel, stageLabel, standardLabel } from '../lib/summary';
import type { ConversionEvent } from '../types';
import { TriggerIcon } from './TriggerIcon';

interface EventDialogProps {
  open: boolean;
  draft: EventDraft;
  onDraft: (next: EventDraft) => void;
  /** Every event in the set, so a duplicate is caught before the server sees it. */
  siblings: readonly ConversionEvent[];
  busy: boolean;
  onSave: () => void;
  onDelete: (() => void) | null;
  onClose: () => void;
}

const STAGES = [
  FuelySettingSendEventsToMetaSalesStage.Sorting,
  FuelySettingSendEventsToMetaSalesStage.Ready,
  FuelySettingSendEventsToMetaSalesStage.WorkingOn,
  FuelySettingSendEventsToMetaSalesStage.Won,
  FuelySettingSendEventsToMetaSalesStage.Lost,
];

const HANDOFFS = [
  FuelySettingSendEventsToMetaSwitchToHumanFrom.FuelyAi,
  FuelySettingSendEventsToMetaSwitchToHumanFrom.UserAccount,
];

const OPERATORS = Object.values(AttrFilterDefaultOperator);

const STANDARD_PREFIX = 'standard:';
const CUSTOM_PREFIX = 'custom:';

/**
 * One event, edited in one place.
 *
 * Not a wizard: the conversion, what fires it and that trigger's own fields are
 * three parts of one answer, and a person changing their mind about the trigger
 * should not lose the name they already picked. The draft is flat for the same
 * reason - fields the chosen trigger does not use are kept and simply not sent.
 */
export function EventDialog({ open, draft, onDraft, siblings, busy, onSave, onDelete, onClose }: EventDialogProps) {
  const { client, botId } = useAds();
  const catalog = useCatalog();
  const [attributeQuery, setAttributeQuery] = useState('');
  const [showIssues, setShowIssues] = useState(false);

  const issues = useMemo(() => validateDraft(draft, { siblings }), [draft, siblings]);
  const visible = showIssues ? issues : [];
  const attributes = useAttributeSearch(client, botId, attributeQuery, open && draft.trigger === 'property');

  const patch = (next: Partial<EventDraft>) => onDraft({ ...draft, ...next });

  const nameOptions: ComboboxOption[] = [
    ...catalog.standardNames.map((name) => ({
      value: `${STANDARD_PREFIX}${name}`,
      label: standardLabel(name),
      keywords: [name],
      group: 'Meta knows these',
    })),
    ...catalog.customNames.map((name) => ({
      value: `${CUSTOM_PREFIX}${name}`,
      label: name,
      group: 'Named by this bot',
    })),
  ];

  const nameValue = draft.name
    ? draft.name.kind === 'standard'
      ? `${STANDARD_PREFIX}${draft.name.value}`
      : `${CUSTOM_PREFIX}${draft.name.value}`
    : null;

  const pickName = (value: string | null) => {
    if (!value) return patch({ name: null });
    if (value.startsWith(STANDARD_PREFIX)) {
      patch({
        name: { kind: 'standard', value: value.slice(STANDARD_PREFIX.length) as never },
      });
      return;
    }
    patch({ name: { kind: 'custom', value: value.slice(CUSTOM_PREFIX.length) } });
  };

  const save = () => {
    setShowIssues(true);
    if (issues.length > 0) return;
    onSave();
  };

  const attributeOptions: ComboboxOption[] = attributes.options.map((option) => ({
    value: option.name,
    label: option.name,
    description: option.dataType,
  }));
  /* The stored property may not be on the page of results being shown, and a
     Combobox with no matching option renders as empty - which reads as "this
     event has no property" when it has one. */
  if (draft.attribute.name && !attributeOptions.some((option) => option.value === draft.attribute.name)) {
    attributeOptions.unshift({ value: draft.attribute.name, label: draft.attribute.name });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={draft.id ? 'Edit event' : 'Add event'}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {onDelete ? (
            <Button variant="dangerGhost" onClick={onDelete} disabled={busy}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={save}>
              Save event
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <FormField label="Conversion" error={issueOf(visible, 'name')?.message}>
          {(a11y) => (
            <Combobox
              {...a11y}
              value={nameValue}
              onChange={pickName}
              options={nameOptions}
              clearable
              placeholder="Pick a conversion, or type your own name"
              onCreate={(label) => patch({ name: { kind: 'custom', value: label } })}
              createLabel={(query) => `Report it as "${query}"`}
            />
          )}
        </FormField>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-label font-medium text-text">What fires it</legend>
          <div className="grid grid-cols-1 gap-2 @compact/module:grid-cols-2 @wide/module:grid-cols-3">
            {TRIGGERS.map((trigger) => {
              const selected = draft.trigger === trigger.id;
              return (
                <button
                  key={trigger.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patch({ trigger: trigger.id as TriggerId })}
                  className={`focus-visible:focus-ring flex flex-col gap-1 rounded-card border p-3 text-left transition-colors duration-fast ease-standard ${
                    selected
                      ? 'border-accent bg-accent-soft text-text'
                      : 'border-border text-text-muted hover:bg-row-hover'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-label font-medium text-text">
                    <TriggerIcon trigger={trigger.id} size={14} />
                    {trigger.label}
                  </span>
                  <span className="text-meta text-text-muted">{trigger.fires}</span>
                </button>
              );
            })}
          </div>
          {issueOf(visible, 'trigger') ? (
            <p className="text-meta text-danger">{issueOf(visible, 'trigger')?.message}</p>
          ) : null}
        </fieldset>

        {draft.trigger === 'keywords' ? (
          <div className="flex flex-col gap-4">
            <RadioGroup
              legend="How the message is matched"
              orientation="horizontal"
              value={draft.keywordsRule}
              onChange={(value) => patch({ keywordsRule: value as FuelySettingSendEventsToMetaKeywordsRule })}
              options={[
                { value: FuelySettingSendEventsToMetaKeywordsRule.Contains, label: 'Contains one of them' },
                { value: FuelySettingSendEventsToMetaKeywordsRule.ExactMatch, label: 'Is exactly one of them' },
              ]}
            />
            <FormField label="Keywords" error={issueOf(visible, 'keywords')?.message}>
              {(a11y) => (
                <ChipInput
                  id={a11y.id}
                  value={draft.keywords}
                  onChange={(keywords) => patch({ keywords })}
                  maxItems={MAX_KEYWORDS}
                  maxLength={MAX_KEYWORD_LENGTH}
                  placeholder="A word or a phrase"
                  invalid={a11y['aria-invalid']}
                />
              )}
            </FormField>
          </div>
        ) : null}

        {draft.trigger === 'property' ? (
          <div className="flex flex-col gap-3">
            <FormField label="Contact property" error={issueOf(visible, 'attribute')?.message}>
              {(a11y) => (
                <Combobox
                  {...a11y}
                  value={draft.attribute.name || null}
                  onChange={(name) => patch({ attribute: { ...draft.attribute, name: name ?? '' } })}
                  options={attributeOptions}
                  onSearch={setAttributeQuery}
                  loading={attributes.loading}
                  clearable
                  placeholder="Pick a property"
                />
              )}
            </FormField>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-48">
                <Select
                  value={draft.attribute.operator}
                  onChange={(operator) =>
                    patch({ attribute: { ...draft.attribute, operator: operator as AttrFilterDefaultOperator } })
                  }
                  options={OPERATORS.map((operator) => ({ value: operator, label: operatorLabel(operator) }))}
                  aria-label="How to compare"
                />
              </div>
              {isValueless(draft.attribute.operator) ? null : (
                <div className="min-w-48 flex-1">
                  <Input
                    value={draft.attribute.value}
                    onChange={(event) => patch({ attribute: { ...draft.attribute, value: event.target.value } })}
                    placeholder="Value"
                    aria-label="Value to compare against"
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {draft.trigger === 'status' ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-medium text-text">Statuses that fire it</legend>
            <div className="flex flex-wrap gap-3">
              {STAGES.map((stage) => (
                <Checkbox
                  key={stage}
                  checked={draft.salesStages.includes(stage)}
                  onChange={(checked) =>
                    patch({
                      salesStages: checked
                        ? [...draft.salesStages, stage]
                        : draft.salesStages.filter((candidate) => candidate !== stage),
                    })
                  }
                  label={stageLabel(stage)}
                />
              ))}
            </div>
            {issueOf(visible, 'stages') ? (
              <p className="text-meta text-danger">{issueOf(visible, 'stages')?.message}</p>
            ) : null}
          </fieldset>
        ) : null}

        {draft.trigger === 'handoff' ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-label font-medium text-text">Hand-offs that fire it</legend>
            <div className="flex flex-col gap-2">
              {HANDOFFS.map((source) => (
                <Checkbox
                  key={source}
                  checked={draft.switchToHumanFrom.includes(source)}
                  onChange={(checked) =>
                    patch({
                      switchToHumanFrom: checked
                        ? [...draft.switchToHumanFrom, source]
                        : draft.switchToHumanFrom.filter((candidate) => candidate !== source),
                    })
                  }
                  label={handoffLabel(source)}
                />
              ))}
            </div>
            {issueOf(visible, 'sources') ? (
              <p className="text-meta text-danger">{issueOf(visible, 'sources')?.message}</p>
            ) : null}
          </fieldset>
        ) : null}

        {draft.trigger === 'prompt' ? (
          <FormField label="The condition, in your own words" error={issueOf(visible, 'prompt')?.message}>
            {(a11y) => (
              <Textarea
                {...a11y}
                value={draft.conditionPrompt}
                onChange={(event) => patch({ conditionPrompt: event.target.value })}
                maxLength={MAX_PROMPT}
                showCount
                autoGrow
                rows={3}
                placeholder="The customer confirmed the order"
                invalid={a11y['aria-invalid']}
              />
            )}
          </FormField>
        ) : null}
      </div>
    </Dialog>
  );
}
