import { useState } from 'react';
import { Button, Card, IconArrowRight, IconCheck } from '~ui';
import { FINDINGS_PREVIEW, severitySummary } from '../../lib/overview';
import { countBySeverity, type Finding, type Severity } from '../../lib/lint';
import { sourceMeta } from '../../lib/sources';

export interface FindingsListProps {
  findings: readonly Finding[];
  /** Opens the finding's source, and its row when it named one. */
  onOpen: (finding: Finding) => void;
}

const DOT: Record<Severity, string> = {
  blocker: 'bg-danger',
  warning: 'bg-warning',
  tip: 'bg-border-strong',
};

const DOT_LABEL: Record<Severity, string> = {
  blocker: 'Needs attention',
  warning: 'Worth a look',
  tip: 'A suggestion',
};

/**
 * Everything the lint found, worst first, each row one press away from the
 * thing that has to change.
 *
 * The list is capped until asked, because a bot with sixty half-written FAQs
 * produces sixty findings and a page of them is a wall, not advice. The first
 * twelve are the ones sorted worst-first, so the cap never hides a blocker
 * behind a tip.
 */
export function FindingsList({ findings, onOpen }: FindingsListProps) {
  const [all, setAll] = useState(false);
  const shown = all ? findings : findings.slice(0, FINDINGS_PREVIEW);
  const hidden = findings.length - shown.length;

  if (findings.length === 0) {
    return (
      <Card title="What to fix">
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <IconCheck size={16} className="shrink-0 text-success" />
          Nothing to fix. Everything the assistant reads checks out.
        </p>
      </Card>
    );
  }

  return (
    <Card title="What to fix" description={severitySummary(countBySeverity(findings))}>
      <ul className="flex flex-col divide-y divide-border-subtle">
        {shown.map((finding) => (
          <li
            key={finding.id}
            className="flex flex-col gap-2 py-2.5 first:pt-0 @compact:flex-row @compact:items-start @compact:gap-3"
          >
            <span
              role="img"
              aria-label={DOT_LABEL[finding.severity]}
              className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[finding.severity]}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text">{finding.title}</p>
              <p className="mt-0.5 text-xs text-text-muted">{finding.detail}</p>
            </div>
            <Button size="sm" variant="ghost" className="shrink-0 self-start" onClick={() => onOpen(finding)}>
              {sourceMeta(finding.source).label}
              <IconArrowRight />
            </Button>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setAll(true)}>
          Show {hidden} more
        </Button>
      ) : null}
    </Card>
  );
}
