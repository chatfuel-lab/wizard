/**
 * The Overview's judgement, as pure functions.
 *
 * The page answers three questions and nothing else: is this knowledge base
 * ready, what is in it, and what should I do next. `lib/lint.ts` already
 * produces the findings and the score; this file turns those into the sentence
 * a person reads first, and decides what a bot with nothing in it is shown
 * instead of a wall of red.
 *
 * which is already the module's one number format.
 */
import type { Severity } from './lint';
import type { SourceId } from './sources';

/** How many findings the list shows before "Show all". A page of 60 rows is a wall, not advice. */
export const FINDINGS_PREVIEW = 12;

export type VerdictTone = 'success' | 'warning' | 'danger';

export interface Verdict {
  tone: VerdictTone;
  /** One line under the score. Says what the number means, never repeats it. */
  headline: string;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  blocker: 'blocker',
  warning: 'warning',
  tip: 'tip',
};

/**
 * The verdict.
 *
 * Blockers dominate: a bot with no phone number and a perfect catalog is not
 * "94% ready", it is unable to answer a question people ask every day. Below
 * that the score decides, because a hundred small things are a real state and
 * "a few warnings" would understate it.
 */
export function readinessVerdict(score: number, counts: Record<Severity, number>): Verdict {
  if (counts.blocker > 0) {
    return {
      tone: 'danger',
      headline:
        counts.blocker === 1
          ? 'One thing is missing that the assistant needs before it can answer properly.'
          : `${counts.blocker} things are missing that the assistant needs before it can answer properly.`,
    };
  }
  if (score < 70)
    return { tone: 'warning', headline: 'A lot of small gaps. Each one is a question somebody will ask.' };
  if (counts.warning > 0)
    return { tone: 'warning', headline: 'Nothing is broken, but a few answers will disappoint someone.' };
  if (counts.tip > 0) return { tone: 'success', headline: 'Ready to answer. What is left is polish.' };
  return { tone: 'success', headline: 'Nothing to fix — everything the assistant reads checks out.' };
}

/** "2 blockers · 5 warnings · 3 tips", zeros omitted. */
export function severitySummary(counts: Record<Severity, number>): string {
  const parts: string[] = [];
  for (const severity of ['blocker', 'warning', 'tip'] as const) {
    const count = counts[severity];
    if (count > 0) parts.push(`${count} ${SEVERITY_LABEL[severity]}${count === 1 ? '' : 's'}`);
  }
  return parts.length === 0 ? 'Nothing to fix' : parts.join(' · ');
}

// ---------------------------------------------------------------------------
// What is in it
// ---------------------------------------------------------------------------

export interface OverviewFacts {
  /** Every profile field concatenated — the cheap "has this person written anything" test. */
  profileText: string;
  instructions: string;
  openDays: number;
  faqs: number;
  products: number;
  services: number;
  team: number;
  /** False while the catalog is still loading: an empty cache is not an empty catalog. */
  catalogReady: boolean;
}

/**
 * A bot nobody has typed into yet.
 *
 * Deliberately strict — every source empty, not "mostly empty". A half-filled
 * knowledge base gets the health page, because at that point the findings are
 * the useful thing; the first-run panel is for the person who just installed
 * the module and has no idea what it wants from them.
 *
 * The catalog gate matters: without it the page flashes "nothing here yet"
 * for one frame on every cold open of a bot with a full catalog.
 */
export function isFirstRun(facts: OverviewFacts): boolean {
  return (
    facts.catalogReady &&
    facts.profileText.trim() === '' &&
    facts.instructions.trim() === '' &&
    facts.openDays === 0 &&
    facts.faqs === 0 &&
    facts.products === 0 &&
    facts.services === 0 &&
    facts.team === 0
  );
}

export interface FirstStep {
  source: SourceId;
  title: string;
  /** What to actually do — an instruction, not a caption restating the title. */
  detail: string;
}

/**
 * The two things worth doing first, in order, skipping whatever is already
 * done. Profile before FAQ because the assistant introducing itself with no
 * company name is the failure a person notices in the first minute; FAQ before
 * the business notes because a question asked ten times a day is worth more
 * than a paragraph nobody has been asked for yet.
 */
export function firstSteps(facts: OverviewFacts): FirstStep[] {
  const candidates: FirstStep[] = [];
  if (facts.profileText.trim() === '' || facts.openDays === 0) {
    candidates.push({
      source: 'profile',
      title: 'Say who you are',
      detail: 'Company name, phone, address and opening hours — what customers ask before anything else.',
    });
  }
  if (facts.faqs === 0) {
    candidates.push({
      source: 'faq',
      title: 'Write five FAQs',
      detail:
        'Prices, delivery, booking, where you are, how to cancel. The fastest change to how the assistant answers.',
    });
  }
  if (facts.instructions.trim() === '') {
    candidates.push({
      source: 'instructions',
      title: 'Write down how you work',
      detail: 'Your rules, your limits, the things a customer has to be told. Start from a template.',
    });
  }
  if (facts.catalogReady && facts.products === 0) {
    candidates.push({
      source: 'products',
      title: 'Add what you sell',
      detail: 'A title, a line of description and a price is all it needs to quote one.',
    });
  }
  return candidates.slice(0, 2);
}

export interface OverviewStat {
  id: 'faq' | 'products' | 'services' | 'team';
  label: string;
  value: string;
}

/* No caption line: a tile labelled FAQ showing 9 does not need a sentence
   underneath saying what an FAQ is. The number and its character cost are the
   two facts; the rest was us talking. */
const STATS: readonly { id: OverviewStat['id']; label: string }[] = [
  { id: 'faq', label: 'FAQ' },
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'team', label: 'Team' },
];

/**
 * Four tiles: a label and a count.
 *
 * There was a fifth for the character total and a per-tile line saying what
 * each source cost. Both are gone. The budget is a REAL constraint - a write
 * gets refused by it - but a raw character count is not something anybody can
 * act on, and printing it five times on the landing page made the numbers that
 * matter (how many FAQs, how many products) compete with a number that does
 * not. What survives is the proportional breakdown further down the page,
 * which answers the only question the budget ever raises: when a save is
 * refused, which part is eating the room.
 */
export function overviewStats(facts: OverviewFacts): OverviewStat[] {
  const counts: Record<OverviewStat['id'], number> = {
    faq: facts.faqs,
    products: facts.products,
    services: facts.services,
    team: facts.team,
  };
  return STATS.map(({ id, label }) => ({ id, label, value: String(counts[id]) }));
}
