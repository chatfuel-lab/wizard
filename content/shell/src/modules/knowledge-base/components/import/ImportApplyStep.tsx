import { Alert, Progress } from '~ui';
import { applySummary, type ApplyReport } from '../../lib/importPlan';
import type { ImportTarget } from '../../lib/knowledgeParams';

export interface ImportApplyStepProps {
  target: ImportTarget;
  /** How many rows the run was asked to create. */
  planned: number;
  /** How many have landed so far — products are created one call at a time. */
  done: number;
  busy: boolean;
  report: ApplyReport | null;
}

/**
 * The run, and then the receipt.
 *
 * FAQ is one replace-all write, so it either happened or it did not. Products
 * are N creates and any of them can fail on its own — a duplicate title, the
 * catalog limit, the knowledge base filling up mid-run — so this screen lists
 * exactly which rows did not land and never rounds a partial import up to
 * "done".
 */
export function ImportApplyStep({ target, planned, done, busy, report }: ImportApplyStepProps) {
  if (busy || !report) {
    return (
      <div className="flex flex-col gap-3">
        <Progress
          label={target === 'faq' ? 'Saving the FAQ list' : `Creating products — ${done} of ${planned}`}
          showLabel
          value={target === 'faq' ? undefined : done}
          max={Math.max(planned, 1)}
        />
        <p className="text-sm text-text-muted">
          {target === 'faq'
            ? 'The whole FAQ list is written in one go — this is one save, not one per row.'
            : 'One product per call, in order. Leave this open until it finishes; closing it stops the run where it is.'}
        </p>
      </div>
    );
  }

  const summary = applySummary(report);

  return (
    <div className="flex flex-col gap-3">
      <Alert tone={summary.tone} title={summary.title}>
        {summary.description}
      </Alert>

      {report.failed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-label font-medium text-text">These rows were refused</span>
          <ul className="flex flex-col gap-1 rounded-panel border border-border p-3">
            {report.failed.map((failure) => (
              <li key={failure.label} className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium text-text">{failure.label}</span>
                <span className="text-text-muted">{failure.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.target === 'products' && report.created > 0 ? (
        <p className="text-xs text-text-faint">
          Imported products are in the catalog now. There is no undo for a create — delete them from the Products list
          if this was not what you wanted.
        </p>
      ) : null}
    </div>
  );
}
