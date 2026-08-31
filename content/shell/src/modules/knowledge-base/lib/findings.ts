/**
 * The lint's findings, arranged the way a LIST needs them.
 *
 * `lib/lint.ts` writes findings for the Overview, where each one has to stand
 * alone: "No price: House Blend 250g" is a complete sentence in a list of
 * everything wrong with the whole knowledge base. On the product's own card
 * the second half is the card's title, said twice — so a row shortens it.
 *
 * Pure, and separate from the lint itself, because this is presentation
 * arithmetic over findings rather than a judgement about the record.
 */
import type { Finding } from './lint';

/** Findings that name a specific row, keyed by that row's id. */
export function findingsByItem(findings: readonly Finding[]): Map<string, Finding[]> {
  const out = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (!finding.item) continue;
    const known = out.get(finding.item);
    if (known) known.push(finding);
    else out.set(finding.item, [finding]);
  }
  return out;
}

/** Findings about the source as a whole — the ones no row can carry. */
export const sourceWideFindings = (findings: readonly Finding[]): Finding[] =>
  findings.filter((finding) => !finding.item);

/**
 * The finding's title without the row's own name repeated in it.
 *
 * `"No price: House Blend"` → `"No price"`, `'Two entries called "Tea"'` →
 * `"Duplicate title"`. Anything that does not match either shape is left
 * exactly as it was: a wrong guess here would silently truncate a sentence
 * somebody wrote deliberately.
 */
export function shortTitle(finding: Finding): string {
  if (/^Two entries called /.test(finding.title)) return 'Duplicate title';
  const at = finding.title.indexOf(': ');
  return at > 0 ? finding.title.slice(0, at) : finding.title;
}

/** "2 to fix" — how many rows of this source have something on them. */
export const rowsWithFindings = (findings: readonly Finding[]): number => findingsByItem(findings).size;
