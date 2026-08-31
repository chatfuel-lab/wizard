/**
 * The arithmetic and the wording of a long client-side run.
 *
 * This exists because the Chatfuel API has no bulk mutation of any kind: no
 * bulk update, no bulk delete, no merge. Every "apply to 240 contacts" in the
 * product is 240 sequential requests from the browser, and somebody is sitting
 * there watching them. That makes the progress strip a load-bearing part of the
 * feature rather than decoration — it is the only place the truth about a
 * half-finished run is told.
 *
 * Which is why the sentence is computed here and tested: a run that says
 * "240 of 240" and hides that eleven of them failed has actively lied, and so
 * has one that prints NaN% because the caller started with an empty selection.
 */

export type BulkRunStatus = 'running' | 'stopped' | 'done';

export interface BulkRunState {
  /** Items attempted so far — successes and failures both. */
  done: number;
  total: number;
  failed: number;
  status: BulkRunStatus;
}

/**
 * Percent complete, 0–100, integer.
 *
 * Guarded at both ends: `total: 0` is a real state (someone hit Apply with
 * nothing selected, or the selection emptied under a live update) and a bar
 * showing NaN% is the classic way it reaches a customer.
 */
export function bulkPercent(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/**
 * The one line under the label.
 *
 * A failure count is emitted ONLY when there is one — a permanent
 * "0 failed" trains people to stop reading the row where it will one day say
 * something else.
 */
export function bulkSummary(state: BulkRunState): string {
  const { done, total, failed, status } = state;
  if (total <= 0) return 'Nothing to do.';

  const counted = `${Math.min(done, total)} of ${total}`;
  const failures = failed > 0 ? ` · ${failed} failed` : '';

  if (status === 'stopped') return `Stopped at ${counted}${failures}`;
  if (status === 'done') {
    /* "Finished" and not "Done — 240 of 240": a run that finished with
     * failures did not do what was asked, and the sentence has to survive
     * being read alone. */
    return failed > 0 ? `Finished ${counted}${failures}` : `Finished · ${total} updated`;
  }
  return `${counted}${failures}`;
}

/**
 * The bar's tone.
 *
 * Warning rather than danger while failures accumulate: the run is still doing
 * what it was asked, most of it is working, and painting the whole strip red
 * over one rejected record would make the person stop it for no reason.
 *
 * Danger is reserved for a run that has ENDED with half or more of what it
 * attempted failing — that is not a run with some failures in it, that is a run
 * that did not work, and yellow would let it pass as mostly fine.
 *
 * A stopped run with no failures is neither: nothing went wrong, but nothing
 * finished either, so it never claims success.
 */
export function bulkTone(state: BulkRunState): 'accent' | 'success' | 'warning' | 'danger' {
  const { done, failed, status } = state;
  if (status === 'running') return failed > 0 ? 'warning' : 'accent';
  if (failed === 0) return status === 'done' ? 'success' : 'accent';
  return failed * 2 >= done ? 'danger' : 'warning';
}

/**
 * What the live region announces, and how often.
 *
 * Not every item: 240 polite announcements is a screen reader reading numbers
 * for a minute and a half with no way to interrupt. Announce the start, the
 * end, and a heartbeat every `step` items — the same rhythm a sighted user
 * gets from glancing at the bar.
 */
export function bulkAnnouncement(state: BulkRunState, label: string, step = 25): string | null {
  const { done, total, status } = state;
  if (total <= 0) return null;
  if (status !== 'running') return `${label}. ${bulkSummary(state)}`;
  if (done === 0 || done === total || done % step === 0) return `${label}. ${bulkSummary(state)}`;
  return null;
}
