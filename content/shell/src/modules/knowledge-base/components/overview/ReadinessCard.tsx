import { Card, Progress } from '~ui';
import type { Verdict, VerdictTone } from '../../lib/overview';
import type { Severity } from '../../lib/lint';

export interface ReadinessCardProps {
  score: number;
  counts: Record<Severity, number>;
  verdict: Verdict;
}

const TONE_TEXT: Record<VerdictTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

/**
 * The number a person sees first.
 *
 * Deliberately a `Progress` and not the module's `StackedMeter`: readiness is
 * how far along ONE quantity is, and a composition bar that is nearly all one
 * colour would read as lopsided rather than as nearly done. The budget below
 * is the composition; this is the progress.
 *
 * The score itself is a nudge, not a metric — `readinessScore` says so — which
 * is why the sentence beside it, and the findings list on the page, carry the
 * actual meaning. There is no "3 warnings · 4 tips" tally: the findings are
 * right there, each one a row somebody can act on, and counting them twice
 * only makes the page look busier than the work is.
 */
export function ReadinessCard({ score, verdict }: ReadinessCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-3 @compact:flex-row @compact:items-start @compact:gap-5">
        <div className="flex shrink-0 items-baseline gap-1">
          <span className={`text-4xl font-semibold leading-none ${TONE_TEXT[verdict.tone]}`}>{score}</span>
          <span className="text-sm text-text-faint">/ 100</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-text">{verdict.headline}</p>
          <Progress
            value={score}
            label="Knowledge base readiness"
            tone={verdict.tone === 'danger' ? 'danger' : verdict.tone === 'warning' ? 'warning' : 'success'}
            size="sm"
          />
        </div>
      </div>
    </Card>
  );
}
