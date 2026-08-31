/**
 * What is wrong with this knowledge base, as pure functions.
 *
 * This is the honest local stand-in for the "retrieval quality" panel every
 * RAG product ships. Chatfuel exposes no retrieval API, no scores and no
 * citations, so there is nothing to measure a query against - but almost
 * everything that makes an assistant answer badly IS visible in the record
 * itself: a question asked twice with two different answers, an answer three
 * paragraphs long, a product with no price, a prompt with the catalog pasted
 * into it, a bot with no phone number.
 *
 * Every finding names the source it belongs to and, where it can, the exact
 * row, so the Overview can link straight to the thing to fix.
 *
 * Thresholds are deliberate and documented rather than tuned:
 *   - an FAQ answer over 600 characters is a page, not an answer;
 *   - free text over 4 000 characters crowds out everything else in the
 *     prompt (and the server has its own limit, which is what
 *     `FuelyAdditionalInstructionsCharLimitExceeded` is for);
 *   - under 5 FAQs is not a knowledge base yet.
 */
import type { CatalogProduct, CatalogService, FaqRow, KnowledgeBaseInfo, SpecialistInfo } from '../types';
import { ESSENTIAL_FIELDS, FIELD_META, PROFILE_FIELDS, warnFor } from './profileFields';
import type { SourceId } from './sources';

export type Severity = 'blocker' | 'warning' | 'tip';

export interface Finding {
  /** Stable across renders so a list does not re-key while somebody reads it. */
  id: string;
  source: SourceId;
  severity: Severity;
  title: string;
  detail: string;
  /** The row to open when the finding is clicked - an FAQ key or a catalog item id. */
  item?: string;
}

export const FAQ_ANSWER_MAX = 600;
export const INSTRUCTIONS_MAX = 4000;
export const FAQ_THIN_BELOW = 5;

export interface LintInput {
  kb: KnowledgeBaseInfo | null;
  faqs: readonly FaqRow[];
  products: readonly CatalogProduct[];
  services: readonly CatalogService[];
  specialists: readonly SpecialistInfo[];
  /** False while the catalog is still loading - stops "no products" firing on an empty cache. */
  catalogReady: boolean;
}

/**
 * What makes two questions "the same" — case, punctuation and spacing thrown
 * away. Exported because the FAQ page pairs duplicates on screen and MUST agree
 * with the finding that flagged them; two copies of this rule would drift into
 * a row marked as a duplicate of nothing.
 */
export const normalizeQuestion = (question: string): string =>
  question
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

function lintProfile(kb: KnowledgeBaseInfo): Finding[] {
  const findings: Finding[] = [];
  for (const field of PROFILE_FIELDS) {
    const value = (kb[field] ?? '') as string;
    const meta = FIELD_META[field];
    if (value.trim() === '') {
      if (ESSENTIAL_FIELDS.includes(field)) {
        findings.push({
          id: `profile.missing.${field}`,
          source: 'profile',
          severity: 'blocker',
          title: `No ${meta.label.toLocaleLowerCase()}`,
          detail: meta.hint,
        });
      } else {
        findings.push({
          id: `profile.empty.${field}`,
          source: 'profile',
          severity: 'tip',
          title: `${meta.label} is empty`,
          detail: meta.hint,
        });
      }
      continue;
    }
    const warning = warnFor(field, value);
    if (warning)
      findings.push({
        id: `profile.format.${field}`,
        source: 'profile',
        severity: 'warning',
        title: `${meta.label} looks wrong`,
        detail: warning,
      });
  }

  const days = kb.businessHoursSchedule.workingHours ?? [];
  if (days.every((day) => !day.enabled)) {
    findings.push({
      id: 'profile.hours.none',
      source: 'profile',
      severity: 'warning',
      title: 'No opening hours',
      detail:
        'The assistant cannot tell anyone when you are open, and booking questions have nothing to check against.',
    });
  }
  return findings;
}

function lintInstructions(kb: KnowledgeBaseInfo): Finding[] {
  const findings: Finding[] = [];
  const text = kb.additionalInstructions ?? '';
  const trimmed = text.trim();

  if (trimmed === '') {
    findings.push({
      id: 'instructions.empty',
      source: 'instructions',
      severity: 'tip',
      title: 'Nothing written about the business yet',
      detail: 'How you work, what you will not do, the things a customer has to be told. Start from a template.',
    });
    return findings;
  }
  if (text.length > INSTRUCTIONS_MAX) {
    findings.push({
      id: 'instructions.long',
      source: 'instructions',
      severity: 'warning',
      title: 'This is very long',
      detail: `${text.length} characters, read on every single message. Anything that is a question, a price or a product belongs in the FAQ or the catalog, where it costs less and can be edited one at a time.`,
    });
  }
  /* Prices and Q:/A: pairs in the prompt are the classic mistake: the same
     facts then live in two places and drift apart. */
  if (/^\s*(q|question)\s*[:.-]/im.test(text)) {
    findings.push({
      id: 'instructions.faq',
      source: 'instructions',
      severity: 'warning',
      title: 'A FAQ pasted in here',
      detail: 'Question and answer pairs belong in the FAQ source, where you can search and edit them one by one.',
    });
  }
  if ((text.match(/[$€£]\s?\d|\b\d+[.,]\d{2}\b/g) ?? []).length >= 3) {
    findings.push({
      id: 'instructions.prices',
      source: 'instructions',
      severity: 'warning',
      title: 'A price list pasted in here',
      detail: 'Put priced things in the catalog. Prices here are invisible to the catalog and go stale silently.',
    });
  }
  return findings;
}

/**
 * Exported on its own as well as through `lint`: the FAQ page lints its own
 * DRAFT so a finding appears while the answer is being typed rather than after
 * it is saved. Same rules, same finding ids — so when the draft matches the
 * server the two lists are identical.
 */
export function lintFaqs(faqs: readonly FaqRow[]): Finding[] {
  const findings: Finding[] = [];

  const seen = new Map<string, FaqRow>();
  for (const faq of faqs) {
    const identity = normalizeQuestion(faq.question);
    if (faq.question.trim() === '') {
      findings.push({
        id: `faq.noquestion.${faq.key}`,
        source: 'faq',
        severity: 'blocker',
        title: 'An FAQ with no question',
        detail: 'The assistant has no way to match it.',
        item: faq.key,
      });
      continue;
    }
    if (faq.answer.trim() === '') {
      findings.push({
        id: `faq.noanswer.${faq.key}`,
        source: 'faq',
        severity: 'blocker',
        title: `No answer: "${faq.question}"`,
        detail: 'An empty answer is worse than no entry - it looks answered.',
        item: faq.key,
      });
    }
    if (faq.answer.length > FAQ_ANSWER_MAX) {
      findings.push({
        id: `faq.long.${faq.key}`,
        source: 'faq',
        severity: 'warning',
        title: `Very long answer: "${faq.question}"`,
        detail: `${faq.answer.length} characters. Split it, or move the detail to your website and link there.`,
        item: faq.key,
      });
    }
    const first = seen.get(identity);
    if (first) {
      findings.push({
        id: `faq.duplicate.${faq.key}`,
        source: 'faq',
        severity: first.answer.trim() === faq.answer.trim() ? 'tip' : 'warning',
        title: `Asked twice: "${faq.question}"`,
        detail:
          first.answer.trim() === faq.answer.trim()
            ? 'The same question and the same answer, twice.'
            : 'The same question with two different answers - the assistant will pick one and you will not know which.',
        item: faq.key,
      });
    } else {
      seen.set(identity, faq);
    }
  }

  if (faqs.length === 0) {
    findings.push({
      id: 'faq.none',
      source: 'faq',
      severity: 'blocker',
      title: 'No FAQs',
      detail: 'This is the fastest thing you can add that changes how the assistant answers.',
    });
  } else if (faqs.length < FAQ_THIN_BELOW) {
    findings.push({
      id: 'faq.thin',
      source: 'faq',
      severity: 'tip',
      title: 'Only a few FAQs',
      detail: `Most businesses need ${FAQ_THIN_BELOW} to 25 - shipping, prices, booking, cancellation, where you are.`,
    });
  }
  return findings;
}

function lintCatalog(
  products: readonly CatalogProduct[],
  services: readonly CatalogService[],
  ready: boolean,
): Finding[] {
  const findings: Finding[] = [];
  if (!ready) return findings;

  const check = (items: readonly (CatalogProduct | CatalogService)[], source: SourceId, noun: string) => {
    const titles = new Map<string, string>();
    for (const item of items) {
      if (!item.price) {
        findings.push({
          id: `${source}.noprice.${item.id}`,
          source,
          severity: 'warning',
          title: `No price: ${item.title}`,
          detail: `The assistant will not quote a ${noun} it has no price for.`,
          item: item.id,
        });
      }
      if (item.description.trim() === '') {
        findings.push({
          id: `${source}.nodesc.${item.id}`,
          source,
          severity: 'tip',
          title: `No description: ${item.title}`,
          detail: 'A line about it is what the assistant uses to match a customer question.',
          item: item.id,
        });
      }
      if (item.images.length === 0 && source === 'products') {
        findings.push({
          id: `${source}.nophoto.${item.id}`,
          source,
          severity: 'tip',
          title: `No photo: ${item.title}`,
          detail: 'A photo is what the assistant sends when someone asks to see it.',
          item: item.id,
        });
      }
      const identity = item.title.trim().toLocaleLowerCase();
      const first = titles.get(identity);
      if (first) {
        findings.push({
          id: `${source}.duplicate.${item.id}`,
          source,
          severity: 'warning',
          title: `Two entries called "${item.title}"`,
          detail: 'The assistant cannot tell them apart, and neither can a customer.',
          item: item.id,
        });
      } else {
        titles.set(identity, item.id);
      }
    }
    const unavailable = items.filter((item) => !item.isAvailable).length;
    if (items.length > 0 && unavailable === items.length) {
      findings.push({
        id: `${source}.allunavailable`,
        source,
        severity: 'warning',
        title: `Every ${noun} is unavailable`,
        detail: 'The assistant has nothing it can offer.',
      });
    }
  };

  check(products, 'products', 'product');
  check(services, 'services', 'service');
  return findings;
}

export function lint(input: LintInput): Finding[] {
  if (!input.kb) return [];
  return [
    ...lintProfile(input.kb),
    ...lintInstructions(input.kb),
    ...lintFaqs(input.faqs),
    ...lintCatalog(input.products, input.services, input.catalogReady),
  ];
}

const WEIGHT: Record<Severity, number> = { blocker: 6, warning: 2, tip: 1 };

/**
 * A 0-100 readiness score.
 *
 * Deliberately blunt: a blocker costs six points, a warning two, a tip one,
 * and the score is what is left of a hundred. It is a nudge on the Overview,
 * not a metric anyone should optimise, and the list of findings underneath it
 * is the part that actually helps.
 */
export function readinessScore(findings: readonly Finding[]): number {
  const cost = findings.reduce((sum, finding) => sum + WEIGHT[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - cost));
}

export function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { blocker: 0, warning: 0, tip: 0 };
  for (const finding of findings) out[finding.severity] += 1;
  return out;
}

/** Findings on one source, for the rail dot and the source page banner. */
export const findingsFor = (findings: readonly Finding[], source: SourceId): Finding[] =>
  findings.filter((finding) => finding.source === source);

/** Worst severity on a source, or null when it is clean. */
export function worstSeverity(findings: readonly Finding[], source: SourceId): Severity | null {
  const own = findingsFor(findings, source);
  if (own.some((finding) => finding.severity === 'blocker')) return 'blocker';
  if (own.some((finding) => finding.severity === 'warning')) return 'warning';
  if (own.length > 0) return 'tip';
  return null;
}

/** Blockers first, then warnings, then tips; stable within a severity. */
export function bySeverity(findings: readonly Finding[]): Finding[] {
  const rank: Record<Severity, number> = { blocker: 0, warning: 1, tip: 2 };
  return [...findings].sort((a, b) => rank[a.severity] - rank[b.severity]);
}
