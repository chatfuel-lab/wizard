import { IconInfo, IconWarning, Tooltip } from '~ui';
import { shortTitle } from '../../lib/findings';
import type { Finding, Severity } from '../../lib/lint';

export interface ItemFindingsProps {
  /** The findings that named THIS row (`finding.item === id`). */
  findings: readonly Finding[];
  /** `chips` on a card, `dot` in a dense table cell where there is room for one glyph. */
  variant?: 'chips' | 'dot';
}

const TONE: Record<Severity, string> = {
  blocker: 'text-danger',
  warning: 'text-warning',
  tip: 'text-text-faint',
};

const CHIP: Record<Severity, string> = {
  blocker: 'border-danger text-danger bg-danger-soft',
  warning: 'border-warning text-warning bg-warning-soft',
  tip: 'border-border text-text-muted bg-surface-sunken',
};

const worst = (findings: readonly Finding[]): Severity =>
  findings.some((finding) => finding.severity === 'blocker')
    ? 'blocker'
    : findings.some((finding) => finding.severity === 'warning')
      ? 'warning'
      : 'tip';

/**
 * What the lint says about one catalog row, shown ON that row.
 *
 * The Overview lists every finding; this is the other half of the same idea —
 * "no price" is only useful next to the product that has no price. Titles are
 * short by construction (`lib/lint.ts` writes them as labels), and the detail
 * rides along in the tooltip rather than taking a second line on every card.
 */
export function ItemFindings({ findings, variant = 'chips' }: ItemFindingsProps) {
  if (findings.length === 0) return null;

  if (variant === 'dot') {
    const severity = worst(findings);
    const label = findings.map((finding) => finding.title).join(' · ');
    return (
      <Tooltip label={label}>
        <span className={`inline-flex items-center ${TONE[severity]}`} role="img" aria-label={label}>
          {severity === 'tip' ? <IconInfo size={14} /> : <IconWarning size={14} />}
        </span>
      </Tooltip>
    );
  }

  return (
    <ul role="list" className="flex flex-wrap items-center gap-1">
      {findings.map((finding) => (
        <li key={finding.id}>
          <Tooltip label={`${finding.title}. ${finding.detail}`}>
            <span
              className={`inline-flex items-center gap-1 rounded-chip border px-1.5 py-0.5 text-micro ${CHIP[finding.severity]}`}
            >
              {shortTitle(finding)}
            </span>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
