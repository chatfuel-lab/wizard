/**
 * The import wizard as a reducer: five steps, one state, no React.
 *
 * Everything the wizard decides lives here — which step is reachable, what a
 * changed delimiter does to the mapping, when a re-parse throws the review
 * away — so the component is wiring and the rules are testable in a node-only
 * runner. Same shape as bookings' `wizardStore`.
 *
 * The one rule worth naming: RE-PARSING RESETS THE PLAN. Changing the
 * delimiter or the header answer changes what the columns are, and carrying a
 * mapping (or worse, hand-edited rows) across that would silently map the
 * question onto the price column. Every re-parse re-guesses and rebuilds.
 */
import type { StepStatus } from '~ui';
import { guessMapping, setMapping, missingRequired, type ColumnMapping, type ImportField } from './importMapping';
import { parseImport, parseTableWith, type Delimiter, type ImportFormat, type ImportParse } from './importParse';
import { buildPlan, editRow, setSkip, setSkipAll, type ApplyReport, type PlanRow } from './importPlan';
import type { ImportTarget } from './knowledgeParams';

export type ImportStep = 'source' | 'parse' | 'map' | 'review' | 'apply';

export const IMPORT_STEPS: readonly ImportStep[] = ['source', 'parse', 'map', 'review', 'apply'];

export const STEP_LABELS: Record<ImportStep, string> = {
  source: 'Source',
  parse: 'Read it',
  map: 'Columns',
  review: 'Review',
  apply: 'Import',
};

/** Where the text came from — shown throughout, so nobody imports the wrong file. */
export type SourceKind = 'file' | 'paste';

export interface ImportState {
  target: ImportTarget;
  step: ImportStep;
  /** The raw text, exactly as it arrived. Re-parsing always starts from this. */
  text: string;
  source: { kind: SourceKind; label: string } | null;
  /** Null until there is text. */
  parse: ImportParse | null;
  /** Set once a person overrides the sniffed format; null means "as detected". */
  formatOverride: ImportFormat | null;
  mapping: ColumnMapping;
  rows: readonly PlanRow[];
  /** Questions or titles already in the knowledge base — what "duplicate" means. */
  existing: readonly string[];
  busy: boolean;
  /** A load or apply failure, already turned into a sentence by `messageFor`. */
  error: string | null;
  report: ApplyReport | null;
}

export function initialImportState(target: ImportTarget, existing: readonly string[] = []): ImportState {
  return {
    target,
    step: 'source',
    text: '',
    source: null,
    parse: null,
    formatOverride: null,
    mapping: {},
    rows: [],
    existing,
    busy: false,
    error: null,
    report: null,
  };
}

export type ImportAction =
  | { type: 'reset'; target: ImportTarget; existing: readonly string[] }
  | { type: 'existing'; existing: readonly string[] }
  | { type: 'text'; text: string; kind: SourceKind; label: string }
  | { type: 'format'; format: ImportFormat }
  | { type: 'delimiter'; delimiter: Delimiter }
  | { type: 'header'; headerUsed: boolean }
  | { type: 'map'; field: ImportField; index: number | null }
  | { type: 'edit'; id: string; field: ImportField; value: string }
  | { type: 'skip'; id: string; skip: boolean }
  | { type: 'skipAll'; skip: boolean }
  | { type: 'goto'; step: ImportStep }
  | { type: 'busy'; busy: boolean }
  | { type: 'error'; error: string | null }
  | { type: 'report'; report: ApplyReport };

/** Re-guess the mapping and rebuild the plan from a fresh parse. */
function replan(state: ImportState, parse: ImportParse): ImportState {
  const mapping = guessMapping(parse.columns, state.target);
  return {
    ...state,
    parse,
    mapping,
    rows: buildPlan({ parse, mapping, target: state.target, existing: state.existing }),
  };
}

export function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'reset':
      return initialImportState(action.target, action.existing);

    case 'existing': {
      /* The store reloaded under the wizard (another tab saved, a refetch
       * landed). Re-dedupe against what is there NOW rather than against the
       * list the wizard opened with. */
      const next = { ...state, existing: action.existing };
      return state.parse
        ? {
            ...next,
            rows: buildPlan({
              parse: state.parse,
              mapping: state.mapping,
              target: state.target,
              existing: action.existing,
            }),
          }
        : next;
    }

    case 'text': {
      if (action.text.trim() === '') return { ...state, error: 'There is nothing to import in that.' };
      const parse = parseImport(action.text, 'auto');
      return replan(
        {
          ...state,
          text: action.text,
          source: { kind: action.kind, label: action.label },
          formatOverride: null,
          error: null,
          report: null,
          step: 'parse',
        },
        parse,
      );
    }

    case 'format': {
      if (!state.text) return state;
      return replan({ ...state, formatOverride: action.format }, parseImport(state.text, action.format));
    }

    case 'delimiter':
      if (!state.text || state.parse?.format !== 'table') return state;
      return replan(state, parseTableWith(state.text, action.delimiter, state.parse.headerUsed));

    case 'header':
      if (!state.text || state.parse?.format !== 'table' || state.parse.delimiter === null) return state;
      return replan(state, parseTableWith(state.text, state.parse.delimiter, action.headerUsed));

    case 'map': {
      if (!state.parse) return state;
      const mapping = setMapping(state.mapping, action.field, action.index);
      /* The plan is rebuilt, not patched: a column moving from question to
       * answer changes every row's values and every duplicate verdict. Hand
       * edits made before the mapping was right are not worth keeping. */
      return {
        ...state,
        mapping,
        rows: buildPlan({ parse: state.parse, mapping, target: state.target, existing: state.existing }),
      };
    }

    case 'edit':
      return {
        ...state,
        rows: editRow(state.rows, action.id, action.field, action.value, state.target, state.existing),
      };

    case 'skip':
      return { ...state, rows: setSkip(state.rows, action.id, action.skip) };

    case 'skipAll':
      return { ...state, rows: setSkipAll(state.rows, action.skip) };

    case 'goto':
      return canGoTo(state, action.step) ? { ...state, step: action.step, error: null } : state;

    case 'busy':
      return { ...state, busy: action.busy };

    case 'error':
      return { ...state, error: action.error, busy: false };

    case 'report':
      return { ...state, report: action.report, busy: false, step: 'apply' };
  }
}

// ---------------------------------------------------------------------------
// Which step is reachable
// ---------------------------------------------------------------------------

/** Is this step finished enough to leave? */
export function stepComplete(state: ImportState, step: ImportStep): boolean {
  switch (step) {
    case 'source':
      return state.text.trim() !== '';
    case 'parse':
      return (state.parse?.rows.length ?? 0) > 0;
    case 'map':
      return state.parse !== null && missingRequired(state.mapping, state.target).length === 0;
    case 'review':
      return state.rows.some((row) => !row.skip && row.problems.length === 0);
    case 'apply':
      return state.report !== null;
  }
}

/**
 * Every step before it must be complete.
 *
 * Going BACK is always allowed, which is why this is asked about the target
 * step and not about the direction: the Stepper's completed steps are buttons,
 * and a person who mapped the wrong column has to be able to return to it.
 */
export function canGoTo(state: ImportState, step: ImportStep): boolean {
  const at = IMPORT_STEPS.indexOf(step);
  if (at < 0) return false;
  /* Once the import has run, the wizard is a receipt: nothing goes back. */
  if (state.report !== null) return step === 'apply';
  return IMPORT_STEPS.slice(0, at).every((earlier) => stepComplete(state, earlier));
}

export const nextStep = (step: ImportStep): ImportStep =>
  IMPORT_STEPS[Math.min(IMPORT_STEPS.indexOf(step) + 1, IMPORT_STEPS.length - 1)]!;
export const prevStep = (step: ImportStep): ImportStep => IMPORT_STEPS[Math.max(IMPORT_STEPS.indexOf(step) - 1, 0)]!;

/** Can the wizard move on from where it is? */
export const canAdvance = (state: ImportState): boolean =>
  state.step !== 'apply' && stepComplete(state, state.step) && !state.busy;

/** What the `Stepper` renders. An incomplete step the person has walked past reads as an error. */
export function stepStatuses(state: ImportState): Record<ImportStep, StepStatus> {
  const current = IMPORT_STEPS.indexOf(state.step);
  const entries = IMPORT_STEPS.map((step, index): [ImportStep, StepStatus] => {
    if (step === state.step) return [step, 'current'];
    if (index > current) return [step, 'upcoming'];
    return [step, stepComplete(state, step) ? 'complete' : 'error'];
  });
  return Object.fromEntries(entries) as Record<ImportStep, StepStatus>;
}
