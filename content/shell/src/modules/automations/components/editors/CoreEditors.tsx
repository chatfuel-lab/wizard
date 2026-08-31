import { useEffect, useId, useState } from 'react';
import { Button, IconSparkles, Input, RadioGroup, Switch, Textarea } from '~ui';
import {
  FuelySettingWhenAiRepliesOptions,
  type FuelySettingIncomingMessagesHowToReply,
} from '~api/generated/automations/graphql';
import { useCatalog } from '../../AutomationsCatalogContext';
import { isCommentReplyScope } from '../../lib/scopes';
import {
  BOOKING_RULES_OPTIONS,
  CATALOG_IMAGES_OPTIONS,
  FOLLOW_UPS_OPTIONS,
  HOW_TO_REPLY_OPTIONS,
  summarizeSchedule,
  WHEN_AI_REPLIES_OPTIONS,
} from '../../lib/settingSummary';
import { integerInRange, LIMITS, STARTER_PROMPT } from '../../lib/limits';
import {
  DraftFooter,
  FieldLabel,
  Hint,
  ModeControl,
  useAutoFocus,
  useEditorDraft,
  useImmediateSave,
  useSettingSaving,
} from './shared';
import type { EditorProps } from './types';

/**
 * The six "core" settings every scope carries (the two people-heavy ones are
 * in PeopleEditors). Immediate: When AI replies, Message delays, Images,
 * Booking rules. Draft: AI instructions (mode + prompt in ONE draft — a mode
 * change alone still goes through Save, so the two writes never race for the
 * per-bot edit lock), Send follow-ups.
 */

// ── 1. AI instructions ─────────────────────────────────────────────────────

export function IncomingMessagesEditor({
  automation,
  setting,
  scope,
  canEdit,
  autoFocus,
}: EditorProps<'FuelySettingIncomingMessages'>) {
  const draft = useEditorDraft(automation, setting);
  const [starterDismissed, setStarterDismissed] = useState(false);
  const rootRef = useAutoFocus(autoFocus);
  const id = useId();
  // howToReply must be UsingAI outside the four comment scopes
  // (FuelyIncomingMessagesHowToReplyNotAllowed) — lock the control there.
  const canChooseMode = isCommentReplyScope(scope);
  const empty = draft.value.messagePrompt.trim() === '';

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <ModeControl<FuelySettingIncomingMessagesHowToReply>
          value={draft.value.howToReply}
          options={HOW_TO_REPLY_OPTIONS}
          disabled={!canEdit}
          lockedTo={canChooseMode ? undefined : setting.howToReply}
          onChange={(howToReply) => draft.set((prev) => ({ ...prev, howToReply }))}
          aria-label="How to reply"
        />
        {canChooseMode ? null : (
          <Hint>Only comment sources can be set to not reply — direct messages are always answered by the AI.</Hint>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>Instructions for the AI</FieldLabel>
        <Textarea
          id={id}
          value={draft.value.messagePrompt}
          onChange={(event) => draft.set((prev) => ({ ...prev, messagePrompt: event.target.value }))}
          autoGrow
          rows={6}
          maxRows={40}
          maxLength={LIMITS.prompt}
          showCount
          disabled={!canEdit}
          placeholder="Who the AI is, what it may promise, how it should sound…"
        />
        {empty && canEdit && !starterDismissed ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => draft.set((prev) => ({ ...prev, messagePrompt: STARTER_PROMPT }))}
            >
              <IconSparkles /> Insert a starter
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setStarterDismissed(true)}>
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}

// ── 2. When AI replies ─────────────────────────────────────────────────────

export function WhenAIRepliesEditor({ automation, setting, canEdit }: EditorProps<'FuelySettingWhenAIReplies'>) {
  const save = useImmediateSave(automation);
  const saving = useSettingSaving(automation.id, setting.__typename);
  const catalog = useCatalog();
  const schedule = summarizeSchedule(
    catalog.bot?.fuelyConfig?.knowledgeBase.businessHoursSchedule.workingHours ?? null,
  );
  const outside = setting.option === FuelySettingWhenAiRepliesOptions.OutsideOfWorkingHours;

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup<FuelySettingWhenAiRepliesOptions>
        value={setting.option}
        options={WHEN_AI_REPLIES_OPTIONS}
        disabled={!canEdit || saving}
        aria-label="When AI replies"
        onChange={(option) => void save({ type: 'FuelySettingWhenAIReplies', update: { option } })}
      />
      {outside ? (
        schedule ? (
          <Hint>
            Working hours: {schedule} ·{' '}
            <a
              href="/knowledge-base"
              className="text-accent underline-offset-2 hover:underline focus-visible:focus-ring"
            >
              Edit hours
            </a>
          </Hint>
        ) : (
          <Hint tone="warning">
            No working hours are set in the knowledge base, so the AI would answer at every hour.{' '}
            <a href="/knowledge-base" className="underline-offset-2 hover:underline focus-visible:focus-ring">
              Set the hours
            </a>
          </Hint>
        )
      ) : null}
    </div>
  );
}

// ── 3. Message delays ──────────────────────────────────────────────────────

export function MessageDelaysEditor({ automation, setting, canEdit }: EditorProps<'FuelySettingMessageDelays'>) {
  const save = useImmediateSave(automation);
  const saving = useSettingSaving(automation.id, setting.__typename);
  return (
    <div className="flex flex-col gap-1.5">
      <Switch
        checked={setting.enabled}
        disabled={!canEdit || saving}
        label="Delay messages"
        onChange={(enabled) => save({ type: 'FuelySettingMessageDelays', update: { enabled } })}
      />
      <Hint>
        Makes chatting feel more human and gives the AI time to collect messages instead of replying to each one.
      </Hint>
    </div>
  );
}

// ── 4. Images ──────────────────────────────────────────────────────────────

export function CatalogImagesEditor({ automation, setting, canEdit }: EditorProps<'FuelySettingCatalogImages'>) {
  const save = useImmediateSave(automation);
  const saving = useSettingSaving(automation.id, setting.__typename);
  const [count, setCount] = useState(String(setting.imagesPerCatalogItem));
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  // Adopt the server's number whenever it moves (an undo, a teammate's edit).
  useEffect(() => {
    setCount(String(setting.imagesPerCatalogItem));
    setError(null);
  }, [setting.imagesPerCatalogItem]);

  const commit = () => {
    const problem = integerInRange(count, LIMITS.imagesMin, LIMITS.imagesMax);
    if (problem) {
      setError(problem);
      return;
    }
    const next = Number(count.trim());
    setError(null);
    if (next === setting.imagesPerCatalogItem) return;
    void save({
      type: 'FuelySettingCatalogImages',
      update: { whenToShow: setting.whenToShow, imagesPerCatalogItem: next },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={setting.whenToShow}
        options={CATALOG_IMAGES_OPTIONS}
        disabled={!canEdit || saving}
        aria-label="When to show images"
        onChange={(whenToShow) =>
          void save({
            type: 'FuelySettingCatalogImages',
            update: { whenToShow, imagesPerCatalogItem: setting.imagesPerCatalogItem },
          })
        }
      />
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>Images per product or service</FieldLabel>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={LIMITS.imagesMin}
          max={LIMITS.imagesMax}
          step={1}
          value={count}
          disabled={!canEdit || saving}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setCount(event.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          className="max-w-28"
        />
        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : (
          <Hint>0–{LIMITS.imagesMax}. Saves when you leave the field or press Enter.</Hint>
        )}
      </div>
    </div>
  );
}

// ── 5. Booking rules ───────────────────────────────────────────────────────

export function BookingRulesEditor({ automation, setting, canEdit }: EditorProps<'FuelySettingBookingRules'>) {
  const save = useImmediateSave(automation);
  const saving = useSettingSaving(automation.id, setting.__typename);
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={setting.autonomyLevel}
        options={BOOKING_RULES_OPTIONS}
        disabled={!canEdit || saving}
        aria-label="Booking rules"
        onChange={(autonomyLevel) => void save({ type: 'FuelySettingBookingRules', update: { autonomyLevel } })}
      />
      <Hint>
        Bookings’ own settings (notifications, reminders) live in{' '}
        <a
          href="/bookings/settings"
          className="text-accent underline-offset-2 hover:underline focus-visible:focus-ring"
        >
          Bookings › Settings
        </a>
        .
      </Hint>
    </div>
  );
}

// ── 8. Send follow-ups ─────────────────────────────────────────────────────

export function FollowUpsEditor({ automation, setting, canEdit, autoFocus }: EditorProps<'FuelySettingFollowUps'>) {
  const draft = useEditorDraft(automation, setting);
  const rootRef = useAutoFocus(autoFocus);
  const id = useId();
  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <ModeControl
        value={draft.value.howToSend}
        options={FOLLOW_UPS_OPTIONS}
        disabled={!canEdit}
        onChange={(howToSend) => draft.set((prev) => ({ ...prev, howToSend }))}
        aria-label="Send follow-ups"
      />
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>When and how to follow up</FieldLabel>
        <Textarea
          id={id}
          value={draft.value.messagePrompt}
          onChange={(event) => draft.set((prev) => ({ ...prev, messagePrompt: event.target.value }))}
          autoGrow
          rows={3}
          maxRows={20}
          maxLength={LIMITS.replyPrompt}
          showCount
          disabled={!canEdit}
          placeholder="If the person goes quiet after asking about a treatment, check in once after two hours…"
        />
      </div>
      <DraftFooter draft={draft} canEdit={canEdit} />
    </div>
  );
}
