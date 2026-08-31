import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Stepper, type Band, type StepperStep } from '~ui';
import { useKnowledge } from '../../KnowledgeBaseStoreContext';
import { useImportApply } from '../../hooks/useImportApply';
import { useImportStore } from '../../hooks/useImportStore';
import { acceptedRows } from '../../lib/importPlan';
import { canAdvance, IMPORT_STEPS, nextStep, prevStep, STEP_LABELS, stepStatuses } from '../../lib/importStore';
import type { ImportTarget, KnowledgeParams } from '../../lib/knowledgeParams';
import { ImportApplyStep } from './ImportApplyStep';
import { ImportFrame } from './ImportFrame';
import { ImportMapStep } from './ImportMapStep';
import { ImportParseStep } from './ImportParseStep';
import { ImportReviewStep } from './ImportReviewStep';
import { ImportSourceStep } from './ImportSourceStep';

export interface ImportWizardProps {
  /** The target THIS page owns. The wizard opens when `?import=` matches it. */
  target: ImportTarget;
  params: KnowledgeParams;
  onParams: (patch: Partial<KnowledgeParams>) => void;
  band: Band;
  /** False on a read-only role: the wizard says so rather than pretending to work. */
  canEdit: boolean;
}

/** A file bigger than this is not a FAQ list, and reading it would freeze the tab. */
const MAX_FILE_BYTES = 2_000_000;

const TITLES: Record<ImportTarget, string> = { faq: 'Import FAQ entries', products: 'Import products' };

/**
 * Getting content IN: a file, pasted text or a page from the customer's own
 * site, turned into rows they review and then save.
 *
 * Read this first, because the shape of the whole thing follows from it:
 * **Chatfuel has no ingestion API.** No file upload, no URL crawler, no
 * chunking, no embeddings, no vector index. The knowledge base is a list of
 * FAQ pairs and a catalog of items, and the ONLY way anything gets in is the
 * same mutation the editor uses. So this wizard never says "attached" or
 * "indexed": it parses locally, shows every row it is about to create with its
 * character cost, and then creates them. What a person sees on the review step
 * is exactly what will exist afterwards.
 *
 * Mounted (always) by the FAQ and Products pages; open state lives in the URL
 * (`?import=faq|products`), so a cold deep link opens straight into it.
 */
export function ImportWizard({ target, params, onParams, band, canEdit }: ImportWizardProps) {
  const store = useKnowledge();

  const open = params.import === target;
  const { state, dispatch } = useImportStore(target, open);

  /* Products land one at a time and the bar has to move; this is progress, not
     a rule, so it stays out of the reducer. */
  const [done, setDone] = useState(0);
  const [sourceBusy, setSourceBusy] = useState(false);
  /* Fresh progress on every OPEN; the store resets itself on the same key. */
  useEffect(() => {
    if (!open) return;
    setDone(0);
    setSourceBusy(false);
  }, [open]);

  const apply = useImportApply({ state, dispatch, target, setDone });

  const close = useCallback(() => onParams({ import: null }), [onParams]);

  // -------------------------------------------------------------------------
  // Getting text in
  // -------------------------------------------------------------------------

  const takeFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        dispatch({ type: 'error', error: 'That file is larger than 2 MB. Split it, or paste the part you want.' });
        return;
      }
      setSourceBusy(true);
      void file
        .text()
        .then((text) => dispatch({ type: 'text', text, kind: 'file', label: file.name }))
        .catch(() => dispatch({ type: 'error', error: 'That file could not be read.' }))
        .finally(() => setSourceBusy(false));
    },
    [dispatch],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!open) return null;

  const statuses = stepStatuses(state);
  const steps: StepperStep[] = IMPORT_STEPS.map((step) => ({
    id: step,
    label: STEP_LABELS[step],
    status: statuses[step],
  }));
  const accepted = acceptedRows(state.rows).length;
  const onReview = state.step === 'review';
  const finished = state.report !== null;

  const footer = (
    <>
      {state.step !== 'source' && !finished ? (
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: 'goto', step: prevStep(state.step) })}
          disabled={state.busy}
        >
          Back
        </Button>
      ) : null}
      <Button variant="secondary" onClick={close} disabled={state.busy}>
        {finished ? 'Close' : 'Cancel'}
      </Button>
      {onReview ? (
        <Button variant="primary" onClick={apply} disabled={accepted === 0 || state.busy} loading={state.busy}>
          {accepted === 1 ? 'Import 1 row' : `Import ${accepted} rows`}
        </Button>
      ) : finished || state.step === 'apply' ? null : (
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'goto', step: nextStep(state.step) })}
          disabled={!canAdvance(state)}
        >
          Next
        </Button>
      )}
    </>
  );

  return (
    <ImportFrame open={open} onClose={close} title={TITLES[target]} band={band} footer={footer}>
      <div className="flex flex-col gap-4">
        {canEdit ? (
          <Stepper
            aria-label="Import steps"
            steps={steps}
            current={state.step}
            onStepClick={(id) => dispatch({ type: 'goto', step: id as (typeof IMPORT_STEPS)[number] })}
          />
        ) : null}

        {state.error ? (
          <Alert tone="danger" title="That did not work" onDismiss={() => dispatch({ type: 'error', error: null })}>
            {state.error}
          </Alert>
        ) : null}

        {!canEdit ? (
          <Alert tone="warning" title="You cannot change the knowledge base">
            Importing writes FAQ entries and catalog items, which needs the AI edit permission on this bot.
          </Alert>
        ) : state.step === 'source' ? (
          <ImportSourceStep
            target={target}
            busy={sourceBusy}
            onFile={takeFile}
            onPaste={(text) => dispatch({ type: 'text', text, kind: 'paste', label: 'Pasted text' })}
          />
        ) : state.step === 'parse' && state.parse ? (
          <ImportParseStep
            parse={state.parse}
            sourceLabel={state.source?.label ?? 'Pasted text'}
            onFormat={(format) => dispatch({ type: 'format', format })}
            onDelimiter={(delimiter) => dispatch({ type: 'delimiter', delimiter })}
            onHeader={(headerUsed) => dispatch({ type: 'header', headerUsed })}
          />
        ) : state.step === 'map' && state.parse ? (
          <ImportMapStep
            parse={state.parse}
            mapping={state.mapping}
            target={target}
            onMap={(field, index) => dispatch({ type: 'map', field, index })}
          />
        ) : state.step === 'review' ? (
          <ImportReviewStep
            rows={state.rows}
            target={target}
            usedChars={store.state.usage?.total ?? null}
            onEdit={(id, field, value) => dispatch({ type: 'edit', id, field, value })}
            onSkip={(id, skip) => dispatch({ type: 'skip', id, skip })}
            onSkipAll={(skip) => dispatch({ type: 'skipAll', skip })}
          />
        ) : (
          <ImportApplyStep target={target} planned={accepted} done={done} busy={state.busy} report={state.report} />
        )}
      </div>
    </ImportFrame>
  );
}
