import { useId } from 'react';
import { Button, IconClose, IconPlus, Input, Tag, Textarea } from '~ui';
import type {
  FuelyCollectContactInfoEntryValidationErrorCode,
  FuelySettingCollectContactInfoEntryInput,
  FuelySettingSwitchToHumanRuleInput,
} from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { COLLECT_INFO_OPTIONS, SWITCH_TO_HUMAN_OPTIONS } from '../../lib/settingSummary';
import { AssigneePicker } from '../pickers/AssigneePicker';
import { AttributePicker } from '../pickers/AttributePicker';
import { LIMITS } from '../../lib/limits';
import { DraftFooter, FieldLabel, Hint, ModeControl, useAutoFocus, useEditorDraft } from './shared';
import type { EditorProps } from './types';

/**
 * The two people settings — DRAFTS: the mode `SegmentedControl` and the list
 * are one draft each, saved together (a mode flip alone still goes through
 * Save so two writes never race for the edit lock).
 *
 * Rules and captures are keyed by INDEX. The API gives neither an id: a
 * write REPLACES the whole list, and the read shape is positional. A stable
 * key would have to be invented client-side and would not survive a live
 * update anyway (the server's list comes back positional). Index keys mean a
 * removal re-keys the rows below it — acceptable for lists of ≤ 20 / ≤ 40
 * short blocks with no per-row animation.
 */

// ── 6. Switch to human agents ──────────────────────────────────────────────

const EMPTY_RULE: FuelySettingSwitchToHumanRuleInput = { switchingConditions: '', messagePrompt: '', assignees: [] };

export function SwitchToHumanEditor({
  automation,
  setting,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingSwitchToHuman'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const catalog = useCatalog();
  const rules = draft.value.rules;
  const full = rules.length >= LIMITS.rules;

  const setRule = (index: number, patch: Partial<FuelySettingSwitchToHumanRuleInput>) =>
    draft.set((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    }));
  const removeRule = (index: number) =>
    draft.set((prev) => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));
  const addRule = () => draft.set((prev) => ({ ...prev, rules: [...prev.rules, { ...EMPTY_RULE }] }));

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={draft.value.howToSwitch}
        options={SWITCH_TO_HUMAN_OPTIONS}
        disabled={!canEdit}
        onChange={(howToSwitch) => draft.set((prev) => ({ ...prev, howToSwitch }))}
        aria-label="Switch to human agents"
      />
      {rules.length === 0 ? <Hint>No rules yet — the AI never hands a conversation over on its own.</Hint> : null}
      <ol className="flex flex-col gap-3">
        {rules.map((rule, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-muted">Rule {index + 1}</span>
              {canEdit ? (
                <Button
                  size="xs"
                  variant="ghost"
                  iconOnly
                  aria-label={`Remove rule ${index + 1}`}
                  onClick={() => removeRule(index)}
                >
                  <IconClose />
                </Button>
              ) : null}
            </div>
            <RuleText
              label="When…"
              value={rule.switchingConditions}
              disabled={!canEdit}
              placeholder="The person asks for a human, a manager or a call"
              onChange={(switchingConditions) => setRule(index, { switchingConditions })}
            />
            <RuleText
              label="AI instructions for the hand-off message"
              value={rule.messagePrompt}
              disabled={!canEdit}
              placeholder="Say a teammate will reply within a few minutes and thank them for waiting"
              onChange={(messagePrompt) => setRule(index, { messagePrompt })}
            />
            <div className="flex flex-col gap-1">
              <FieldLabel>Assign to</FieldLabel>
              <AssigneePicker
                value={(rule.assignees ?? []).map((a) => a.userID)}
                onChange={(ids) => setRule(index, { assignees: ids.map((userID) => ({ userID })) })}
                team={catalog.team}
                disabled={!canEdit}
              />
            </div>
          </li>
        ))}
      </ol>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={addRule} disabled={full}>
            <IconPlus /> Add rule
          </Button>
          <span className="text-micro tabular-nums text-text-faint">
            {rules.length} / {LIMITS.rules}
          </span>
        </div>
      ) : null}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

function RuleText({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoGrow
        rows={2}
        maxRows={12}
        maxLength={LIMITS.ruleText}
        showCount
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── 7. Lead qualification ──────────────────────────────────────────────────

/** The soft validation the server attaches to a capture, in a sentence. */
const CAPTURE_WARNINGS: Record<FuelyCollectContactInfoEntryValidationErrorCode, string> = {
  AttributeRequired: 'Pick or type an attribute to store the answer in.',
  DescriptionRequired: 'Say what the AI should look for.',
  AttributeIsDuplicated: 'This attribute is captured twice — keep one.',
  InvalidAttribute: 'This attribute name is not valid.',
  SystemAttributeIsNotAllowed: 'System attributes cannot be captured — use a custom one.',
};

const EMPTY_CAPTURE: FuelySettingCollectContactInfoEntryInput = { name: '', description: '' };

export function CollectContactInfoEditor({
  automation,
  setting,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingCollectContactInfo'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const catalog = useCatalog();
  const captures = draft.value.captures;
  const full = captures.length >= LIMITS.captures;

  const setCapture = (index: number, patch: Partial<FuelySettingCollectContactInfoEntryInput>) =>
    draft.set((prev) => ({
      ...prev,
      captures: prev.captures.map((capture, i) => (i === index ? { ...capture, ...patch } : capture)),
    }));
  const removeCapture = (index: number) =>
    draft.set((prev) => ({ ...prev, captures: prev.captures.filter((_, i) => i !== index) }));
  const addCapture = () => draft.set((prev) => ({ ...prev, captures: [...prev.captures, { ...EMPTY_CAPTURE }] }));

  /* The warnings belong to the SERVER's captures (they come back read-only
     after a save). While the draft is clean they line up by index; once the
     list is edited they may not, so they are shown only while clean. */
  const warningsAt = (index: number): FuelyCollectContactInfoEntryValidationErrorCode[] =>
    draft.dirty ? [] : (setting.captures[index]?.validationErrors ?? []);

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={draft.value.howToCollect}
        options={COLLECT_INFO_OPTIONS}
        disabled={!canEdit}
        onChange={(howToCollect) => draft.set((prev) => ({ ...prev, howToCollect }))}
        aria-label="Lead qualification"
      />
      {captures.length === 0 ? <Hint>Nothing is captured yet.</Hint> : null}
      <ol className="flex flex-col gap-3">
        {captures.map((capture, index) => (
          <li key={index} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-muted">Capture {index + 1}</span>
              {canEdit ? (
                <Button
                  size="xs"
                  variant="ghost"
                  iconOnly
                  aria-label={`Remove capture ${index + 1}`}
                  onClick={() => removeCapture(index)}
                >
                  <IconClose />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 @compact:grid-cols-2">
              <CaptureDescription
                value={capture.description}
                disabled={!canEdit}
                onChange={(description) => setCapture(index, { description })}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel>Store in attribute</FieldLabel>
                <AttributePicker
                  value={capture.name}
                  onChange={(name) => setCapture(index, { name })}
                  attributes={catalog.attributes}
                  allowCreate
                  disabled={!canEdit}
                />
              </div>
            </div>
            {warningsAt(index).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {warningsAt(index).map((code) => (
                  <Tag key={code} tone="warning">
                    {CAPTURE_WARNINGS[code] ?? code}
                  </Tag>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={addCapture} disabled={full}>
            <IconPlus /> Add capture
          </Button>
          <span className="text-micro tabular-nums text-text-faint">
            {captures.length} / {LIMITS.captures}
          </span>
        </div>
      ) : null}
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

function CaptureDescription({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>Search messages for…</FieldLabel>
      <Input
        id={id}
        value={value}
        maxLength={LIMITS.captureDescription}
        disabled={disabled}
        placeholder="Which treatment they are interested in"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
