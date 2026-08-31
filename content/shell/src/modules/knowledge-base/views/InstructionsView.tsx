import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  IconArrowRight,
  IconClock,
  IconSparkles,
  PageBody,
  Skeleton,
  Textarea,
  Tooltip,
  useToast,
} from '~ui';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { useKnowledgeUndo } from '../KnowledgeBaseUndoContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { HistoryDialog } from '../components/instructions/HistoryDialog';
import { TemplateDialog } from '../components/instructions/TemplateDialog';
import { SectionSaveBar } from '../components/profile/SectionSaveBar';
import { useKnowledgeDraft } from '../hooks/useKnowledgeDraft';
import { messageFor } from '../lib/errors';
import { versionLogFor, type Version } from '../lib/instructionsHistory';
import { applyTemplate, belongsIn, type InsertMode, type InstructionsTemplate } from '../lib/instructionsTemplates';
import type { Severity } from '../lib/lint';
import { FIELD_META } from '../lib/profileFields';
import { sourceMeta } from '../lib/sources';
import type { KnowledgeViewProps } from './types';

const TONE: Record<Severity, 'danger' | 'warning' | 'info'> = { blocker: 'danger', warning: 'warning', tip: 'info' };

const PLACEHOLDER = 'What we do\n…\n\nHow we work\n- …\n\nWhat we do not do\n…\n\nWorth knowing\n…';

/**
 * The free-text half of the business.
 *
 * The wire calls this field `additionalInstructions` and the name is a
 * leftover: the behaviour prompt moved to the per-scope automation settings,
 * and what is left here is everything a customer might ask that does not fit a
 * profile field, an FAQ row or a catalog item — how you work, what you will not
 * do, the quirk somebody has to know before promising anything on your behalf.
 *
 * It is also the field people misuse, by pasting the FAQ and the price list
 * into it. Both facts shape the page: a real editor with room to write, and the
 * lint's warnings sitting above it with a button that opens the source the
 * pasted content actually belongs in.
 *
 * The history is this session's, in memory, and says so out loud: there is no
 * history API, and the one thing worse than no undo is an undo that turns out
 * not to have been there.
 */
export function InstructionsView({ findings, canEditHere, onBusy, onParams }: KnowledgeViewProps) {
  const { botId } = useKnowledgeBase();
  const store = useKnowledge();
  const undo = useKnowledgeUndo();
  const toast = useToast();

  const log = useMemo(() => versionLogFor(botId), [botId]);
  const [versions, setVersions] = useState<readonly Version[]>(() => log.list());
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => onBusy(false), [onBusy]);

  const serverValue = store.state.kb?.additionalInstructions ?? '';

  const write = useCallback(
    async (value: string, previous: string) => {
      await store.saveField('additionalInstructions', value);

      /* The version log holds what was REPLACED, so every entry in it is
         directly restorable and none of them is the text on screen. */
      log.record(previous, Date.now());
      setVersions(log.list());

      const revert = () => {
        void store.saveField('additionalInstructions', previous).catch((failure: unknown) => {
          toast.show({ title: 'Could not undo', description: messageFor(failure), tone: 'danger' });
        });
      };
      undo.push(
        {
          kind: 'field',
          field: 'additionalInstructions',
          label: FIELD_META.additionalInstructions.label,
          at: Date.now(),
        },
        revert,
      );
      toast.show({
        title: 'Saved',
        tone: 'success',
        /* See ProfileFieldRow: a captured `undo.run` is one render stale. */
        action: {
          label: 'Undo',
          onClick: () => {
            undo.clear();
            revert();
          },
        },
      });
    },
    [store, log, undo, toast],
  );

  const draft = useKnowledgeDraft('instructions', 'text', serverValue, write);

  const insert = useCallback(
    (template: InstructionsTemplate, mode: InsertMode) =>
      draft.set((current) => applyTemplate(current, template, mode)),
    [draft],
  );
  const openHistory = useCallback(() => {
    setNow(Date.now());
    setHistoryOpen(true);
  }, []);

  if (!store.state.kb) {
    return (
      <PageBody measure="prose">
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading the AI instructions">
          <Skeleton variant="block" height="24rem" />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody measure="prose">
      <div className="flex flex-col gap-4">
        {!canEditHere ? (
          <Alert tone="info" title="Read only">
            Your role can read these instructions but not change them — editing needs the Ai · Edit permission.
          </Alert>
        ) : null}

        {findings.map((finding) => {
          const target = belongsIn(finding.id);
          return (
            <Alert
              key={finding.id}
              tone={TONE[finding.severity]}
              title={finding.title}
              action={
                target ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onParams({ source: target, item: null, q: '', import: null, draft: null })}
                  >
                    Open {sourceMeta(target).label}
                    <IconArrowRight />
                  </Button>
                ) : finding.id === 'instructions.empty' && canEditHere ? (
                  <Button size="sm" variant="secondary" onClick={() => setTemplatesOpen(true)}>
                    <IconSparkles />
                    Start from a template
                  </Button>
                ) : undefined
              }
            >
              {finding.detail}
            </Alert>
          );
        })}

        <Card
          title="About the business"
          actions={
            canEditHere ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setTemplatesOpen(true)}>
                  <IconSparkles />
                  Templates
                </Button>
                {/* Disabled rather than hidden, with the reason on it: the
                    feature has to be discoverable before the first save, which
                    is exactly when the list is empty. */}
                <Tooltip
                  label={
                    versions.length === 0
                      ? 'Earlier versions appear here after your first save in this session'
                      : 'Earlier versions from this session'
                  }
                >
                  <Button size="sm" variant="ghost" onClick={openHistory} disabled={versions.length === 0}>
                    <IconClock />
                    History
                  </Button>
                </Tooltip>
              </>
            ) : undefined
          }
        >
          {/* Borderless: the Card already draws the box, and a bordered field
              inside a bordered card is two frames around one thing. The focus
              ring still fires, which is the part that has to survive. */}
          <Textarea
            value={draft.value}
            onChange={(event) => draft.set(event.target.value)}
            disabled={!canEditHere}
            autoGrow
            rows={14}
            maxRows={40}
            placeholder={PLACEHOLDER}
            aria-label="About the business"
            className="mb-3 border-transparent bg-transparent px-0"
          />

          <SectionSaveBar
            dirty={draft.dirty}
            saving={draft.saving}
            error={draft.error}
            conflict={draft.conflict}
            onSave={() => void draft.save().catch(() => undefined)}
            onCancel={draft.discard}
            onUseTheirs={draft.useTheirs}
            onKeepMine={draft.keepMine}
            canEdit={canEditHere}
          />
        </Card>
      </div>

      <TemplateDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        hasText={draft.value.trim() !== ''}
        onInsert={insert}
      />
      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={versions}
        now={now}
        onRestore={(version) => draft.set(version.value)}
      />
    </PageBody>
  );
}
