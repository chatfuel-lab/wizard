import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ConfirmDialog,
  IconChevronLeft,
  IconCopy,
  IconSend,
  Stepper,
  useToast,
  type StepperStep,
} from '~ui';
import type { Band } from '~ui';
import { useCampaigns } from '../../BroadcastsCampaignsContext';
import { useBroadcasts } from '../../BroadcastsContext';
import type { BotFactsState } from '../../hooks/useBotFacts';
import { useDuplicate } from '../../hooks/useDuplicate';
import type { MyRole } from '../../hooks/useMyRole';
import { useSchedule } from '../../hooks/useSchedule';
import { useTemplateFill } from '../../hooks/useTemplateFill';
import { COMPOSER_STEPS, type ComposerStep } from '../../lib/broadcastsParams';
import type { CampaignRecord } from '../../lib/campaign';
import { STEP_LABELS, firstInvalidStep, nextStep, prevStep, stepStatus, stepValid } from '../../lib/composerSteps';
import { errorMessage } from '../../lib/errors';
import { formatCount } from '../../lib/format';
import { AudienceStep } from './AudienceStep';
import { MessageStep } from './MessageStep';
import { NameStep, type KindChoice } from './NameStep';
import { ReviewStep } from './ReviewStep';
import { ScheduleStep } from './ScheduleStep';
import { draftKindOf, kindSwitchKey, switchKind } from './kindSwitch';

export interface ComposerViewProps {
  record: CampaignRecord;
  step: ComposerStep | null;
  onStep: (step: ComposerStep) => void;
  onClose: () => void;
  /** The composer moved onto a copy — a duplicate was made. */
  onDuplicated: (flowId: string) => void;
  /** Where a WhatsApp number gets connected, or null when this deployment has nowhere to send the person. */
  onConnectWhatsApp: (() => void) | null;
  band: Band;
  role: MyRole;
  bot: BotFactsState;
  zone: string;
  now: number;
}

const kindChoiceOf = (record: CampaignRecord): KindChoice =>
  record.isOneTime ? 'now' : record.kind === 'recurring' ? 'recurring' : 'later';

/**
 * The frame around the five steps: the bar with the way back and the name,
 * the stepper, the open step, and the footer that moves between them — or,
 * on the review, does the one thing the campaign is for.
 *
 * A draft and a scheduled campaign are editable (the schedule step disarms
 * before it writes); a campaign that has gone out is read-only here, and
 * its review offers Duplicate instead of a send. The address names the open
 * step; when it names none, the first step that is not done is open.
 */
export function ComposerView({
  record,
  step: addressed,
  onStep,
  onClose,
  onDuplicated,
  onConnectWhatsApp,
  band,
  role,
  bot,
  zone,
  now,
}: ComposerViewProps) {
  const store = useCampaigns();
  const { client } = useBroadcasts();
  const toast = useToast();
  const step = addressed ?? firstInvalidStep(record, now);
  /* An address that names no step opens on the first one not done — and
     then names it, so a write landing on that step does not move the page
     onto the next. */
  useEffect(() => {
    if (addressed === null) onStep(step);
  }, [addressed, step, onStep]);
  const canEdit = role.canEdit && (record.status === 'draft' || record.status === 'scheduled');
  const facts = bot.state === 'ready' ? bot.facts : null;
  const whatsappMissing = bot.state === 'ready' && bot.facts.whatsapp === null;

  const fill = useTemplateFill(record);
  const schedule = useSchedule(record, zone);
  const duplicating = useDuplicate(zone, now);

  const [kind, setKind] = useState<KindChoice>(() => kindChoiceOf(record));
  const [count, setCount] = useState<number | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  /* The kind the draft IS, whenever that changes under the choice (a switch
     landed, or another draft is open). "Later" and "Repeating" are one pair,
     so a repeating draft keeps that word. */
  const isOneTime = record.isOneTime;
  const recordKind = record.kind;
  useEffect(() => {
    setKind((current) => {
      if (isOneTime) return 'now';
      if (recordKind === 'recurring') return 'recurring';
      return current === 'now' ? 'later' : current;
    });
  }, [isOneTime, recordKind]);

  const switching = store.isPending(kindSwitchKey(record.flowId));
  const busy =
    switching ||
    acting ||
    schedule.saving ||
    duplicating.pending ||
    store.isPending(`send:${record.flowId}`) ||
    store.isPending(`enable:${record.flowId}`) ||
    store.isPending(`disable:${record.flowId}`);

  const chooseKind = useCallback(
    (choice: KindChoice) => {
      setKind(choice);
      const wanted = choice === 'now' ? 'now' : 'scheduled';
      if (wanted === draftKindOf(record)) return;
      setFailure(null);
      switchKind(store, client, record, wanted)
        .then((failures) => {
          if (failures.length > 0) setFailure(failures.join(' '));
        })
        .catch((err: unknown) => {
          setFailure(errorMessage(err));
          setKind(kindChoiceOf(record));
        });
    },
    [store, client, record],
  );

  const steps = useMemo<StepperStep[]>(
    () =>
      COMPOSER_STEPS.map((id) => ({
        id,
        label: STEP_LABELS[id],
        status: stepStatus(record, id, step, now),
      })),
    [record, step, now],
  );

  const goTo = useCallback((next: ComposerStep | null) => next && onStep(next), [onStep]);

  const continueEnabled = (() => {
    if (busy) return false;
    switch (step) {
      case 'message':
        return canEdit ? fill.canContinue : true;
      case 'schedule': {
        if (record.isOneTime) return true;
        const draft = schedule.draft;
        if (Number.isNaN(schedule.at) || !draft) return false;
        // An empty list is a write the server refuses; the step holds until there is one.
        if (draft.repeat === 'weekdays') return draft.weekdays.length > 0;
        if (draft.repeat === 'dates') return draft.dates.length > 0;
        return true;
      }
      default:
        return true;
    }
  })();

  const onContinue = async () => {
    if (step === 'schedule' && canEdit && !record.isOneTime) {
      const landed = await schedule.commit();
      if (!landed) return;
    }
    goTo(nextStep(step));
  };

  const ready = canEdit && stepValid(record, 'review', now) && count !== null && count > 0 && !whatsappMissing && !busy;

  const send = async () => {
    setActing(true);
    setFailure(null);
    try {
      await store.sendNow(record);
      toast.show({ title: 'Sending', tone: 'success', duration: 4000 });
      onClose();
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const arm = async () => {
    setActing(true);
    setFailure(null);
    try {
      const armed = await store.enable(record);
      if (!armed) {
        await store.refetchFlow(record.flowId);
        setFailure('Chatfuel did not schedule it — something in the campaign is not complete.');
        return;
      }
      toast.show({ title: 'Campaign scheduled', tone: 'success', duration: 4000 });
      onClose();
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const duplicate = async () => {
    setFailure(null);
    try {
      const result = await duplicating.duplicate(record);
      if (result.failures.length > 0) setFailure(result.failures.join(' '));
      else toast.show({ title: 'Copy made', tone: 'success', duration: 4000 });
      onDuplicated(result.flowId);
    } catch (err) {
      setFailure(errorMessage(err));
    }
  };

  const primary = (() => {
    if (step !== 'review' || !role.canEdit) return null;
    if (record.status === 'sent' || record.status === 'sending') {
      return (
        <Button variant="primary" onClick={() => void duplicate()} loading={duplicating.pending} disabled={busy}>
          <IconCopy />
          Duplicate
        </Button>
      );
    }
    if (record.isOneTime) {
      return (
        <Button variant="primary" onClick={() => setConfirmSend(true)} disabled={!ready} loading={acting}>
          <IconSend />
          Send now
        </Button>
      );
    }
    return (
      <Button variant="primary" onClick={() => void arm()} disabled={!ready} loading={acting}>
        <IconSend />
        Schedule
      </Button>
    );
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-gutter py-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <IconChevronLeft />
          Campaigns
        </Button>
        <span className="truncate text-body font-semibold text-text">{record.name}</span>
      </div>

      <div className="shrink-0 border-b border-border px-gutter py-3">
        <Stepper
          aria-label="Campaign steps"
          steps={steps}
          current={step}
          orientation={band === 'wide' || band === 'inline' ? 'horizontal' : 'vertical'}
          onStepClick={(id) => goTo(id as ComposerStep)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {failure ? (
            <div className="px-gutter pt-3">
              <Alert tone="danger" onDismiss={() => setFailure(null)}>
                {failure}
              </Alert>
            </div>
          ) : null}
          {step === 'name' ? (
            <NameStep
              record={record}
              canEdit={canEdit}
              switching={switching}
              kind={kind}
              onRename={(name) => store.rename(record.flowId, name)}
              onKind={chooseKind}
            />
          ) : step === 'message' ? (
            <MessageStep
              record={record}
              fill={fill}
              canEdit={canEdit}
              facts={facts}
              whatsappMissing={whatsappMissing}
              onConnectWhatsApp={onConnectWhatsApp}
            />
          ) : step === 'audience' ? (
            <AudienceStep record={record} zone={zone} canEdit={canEdit} onCount={setCount} />
          ) : step === 'schedule' ? (
            <ScheduleStep
              record={record}
              schedule={schedule}
              zone={zone}
              now={now}
              canEdit={canEdit}
              recurring={kind === 'recurring'}
              onRepeatChange={(repeat) => setKind(repeat === 'once' ? 'later' : 'recurring')}
            />
          ) : (
            <ReviewStep
              record={record}
              zone={zone}
              now={now}
              facts={facts}
              count={count}
              onCount={setCount}
              onStep={onStep}
              whatsappMissing={whatsappMissing}
            />
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-gutter py-3">
        <Button variant="ghost" onClick={() => goTo(prevStep(step))} disabled={prevStep(step) === null || busy}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step === 'review' ? (
            primary
          ) : (
            <Button
              variant="primary"
              onClick={() => void onContinue()}
              disabled={!continueEnabled}
              loading={schedule.saving}
            >
              Continue
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        title={`Send to ${formatCount(count)} contacts?`}
        confirmLabel="Send"
        tone="default"
        onConfirm={async () => {
          setConfirmSend(false);
          await send();
        }}
      >
        “{record.name}” goes to every contact in its audience the moment you confirm.
      </ConfirmDialog>
    </div>
  );
}
