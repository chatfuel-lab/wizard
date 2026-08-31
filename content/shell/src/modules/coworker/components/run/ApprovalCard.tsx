import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Collapsible, JsonView, Kbd, Spinner, Tag, Textarea } from '~ui';
import { summarizeArguments, summarizeBatch } from '../../lib/approval';
import { describeTool } from '../../lib/toolCalls';
import type { ApprovalCardProps } from '../contracts';
import { StepGlyph } from './StepGlyph';

/**
 * Where a person authorises software to change the account they pay for.
 *
 * The API's shape is unusually blunt and the interface has to be honest about
 * all of it (guide.md, "Tool approval"):
 *
 * - **One boolean resolves the whole batch.** There is no approving half of
 *   it, so there are no per-tool switches here — offering them would promise
 *   something the server cannot keep. `needsManualApprove` is marked per tool
 *   because it differs per tool; the decision is not.
 * - **Nothing runs until it is answered, and there is no expiry.** A pending
 *   approval blocks the conversation indefinitely. So this reads as a
 *   checkpoint, not as a banner that can be scrolled past — and it says the
 *   waiting out loud rather than implying it with a colour.
 * - **Replying instead of answering IS a rejection**, with the reply as the
 *   denial message. That is the server's behaviour, not a rule we invented, so
 *   it is stated once, plainly, next to the buttons that avoid it.
 * - **The response resolves asynchronously.** The mutation returns `true`
 *   immediately and the batch clears later, on an event — hence `responded`,
 *   and hence a state that says what was sent rather than pretending it is
 *   already done.
 *
 * What it replaces: a `JSON.stringify(arguments, null, 2)` in a `<pre>`. The
 * arguments are still one click away, verbatim — reading them is sometimes the
 * only way to be sure — but they are `~ui`'s `JsonView` now: keys that stay
 * put, values coloured by type so `"12"` and `12` are visibly different things
 * on a field called `amount`, containers that fold with a count on them, and
 * the whole payload copyable in one press. The line a decision is actually made
 * on is still "45-min Colour Consultation · 45 min · €80.00", derived in
 * `lib/approval.ts`, and it is still the line in front of the buttons; the tree
 * is what "Arguments" expands into.
 */

export function ApprovalCard({ conversationId, request, responded, onRespond, compact }: ApprovalCardProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  /* Which way it was answered, so the pending line says the true thing. Cleared
     whenever the thread re-arms the card — a failed mutation does that. */
  const [sent, setSent] = useState<'approved' | 'rejected' | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  const batchId = request.requestedInMsgID;
  useEffect(() => {
    setRejecting(false);
    setReason('');
    setExpanded(null);
  }, [conversationId, batchId]);

  useEffect(() => {
    if (!responded) setSent(null);
  }, [responded]);

  const facts = summarizeBatch(request.tools);

  const approve = useCallback(() => {
    setSent('approved');
    onRespond(true);
  }, [onRespond]);

  const reject = useCallback(() => {
    setSent('rejected');
    onRespond(false, reason.trim() === '' ? undefined : reason.trim());
  }, [onRespond, reason]);

  /* Enter approves — but only for a reader who has not focused anything, only
     for a batch that destroys nothing, and only for the copy of this card that
     is actually on screen.

     Written as a listener rather than with `useHotkeys` for two reasons, both
     of which would ship as bugs: the hook calls preventDefault BEFORE the
     handler can decline, so an Enter meant for a focused button elsewhere on
     the page would be swallowed by a card the operator was not even looking at;
     and its `rootRef` scope still fires when focus is on the body, which is
     exactly the case where a copy of this card that is not on screen — the
     stacked layout hides the thread pane while the rail is showing — would
     answer a batch the operator never saw. The `offsetParent` check below is
     what rules that out. */
  const approveRef = useRef(approve);
  approveRef.current = approve;
  const enterApproves = !responded && !rejecting && !facts.destructive;

  useEffect(() => {
    if (!enterApproves) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const card = cardRef.current;
      if (card === null || card.offsetParent === null) return;
      const active = document.activeElement;
      if (active !== null && active !== document.body && active !== card) return;
      event.preventDefault();
      approveRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enterApproves]);

  const heading = facts.destructive
    ? 'The assistant wants to remove data'
    : facts.writes > 0
      ? 'The assistant wants to change your account'
      : 'The assistant is asking for permission';

  return (
    <section
      ref={cardRef}
      aria-label="Approval required"
      className={`rounded-card border p-3 ${
        facts.destructive ? 'border-danger/40 bg-danger-soft' : 'border-warning/40 bg-warning-soft'
      }`}
    >
      <h3 className="text-label font-semibold text-text">{heading}</h3>
      <p className="mt-0.5 text-meta text-text-muted">
        {facts.total === 1 ? 'One action' : `${facts.total} actions`}, and none of them have run.
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {request.tools.map((tool, index) => {
          const described = describeTool(tool.toolID);
          const open = expanded === index;
          return (
            <li
              key={`${tool.toolID}-${index}`}
              className="flex items-start gap-2.5 rounded-card border border-border bg-surface-raised px-3 py-2.5"
            >
              <StepGlyph glyph={described.glyph} large />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 truncate text-label font-medium text-text">{described.title}</span>
                  {tool.needsManualApprove ? (
                    <Tag tone={described.effect === 'destroy' ? 'danger' : 'warning'}>needs your approval</Tag>
                  ) : (
                    <Tag>runs with them</Tag>
                  )}
                </div>
                <p className="mt-0.5 text-meta text-text-muted">{summarizeArguments(tool.toolID, tool.arguments)}</p>
                <Collapsible
                  open={open}
                  onOpenChange={(next) => setExpanded(next ? index : null)}
                  trigger={<span className="text-meta text-text-muted">Arguments</span>}
                  className="mt-0.5"
                >
                  {/* Sunken, so the raw payload reads as something quoted
                      rather than as more of the card's own prose. */}
                  <JsonView value={tool.arguments} className="mt-1.5 rounded-card bg-surface-sunken p-2" />
                </Collapsible>
              </div>
            </li>
          );
        })}
      </ul>

      {responded ? (
        <div aria-live="polite" className="mt-3 flex items-center gap-2 text-meta text-text-muted">
          <Spinner size={14} />
          {sent === 'rejected' ? 'Rejected — telling the assistant.' : 'Approved — the assistant is running it.'}
        </div>
      ) : rejecting ? (
        <div className="mt-3">
          <Textarea
            /* It appears because the operator asked for it, so it takes the
               caret with it. */
            autoFocus
            autoGrow
            rows={2}
            maxRows={5}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setRejecting(false);
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) reject();
            }}
            placeholder="Why not? The assistant reads this as your reply."
            aria-label="Reason for rejecting"
          />
          <div className={`mt-2 flex gap-2 ${compact ? 'flex-col' : 'items-center'}`}>
            <Button size="sm" variant="danger" onClick={reject}>
              Reject all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        /* No paragraph restating the server's rules under the buttons. The one
           of them the operator can walk into blind — a plain reply rejecting
           the whole batch — is said by the composer's own notice while the
           approval is pending, at the moment it applies. */
        <div className={`mt-3 flex gap-2 ${compact ? 'flex-col' : 'items-center'}`}>
          <Button size="sm" variant={facts.destructive ? 'danger' : 'primary'} onClick={approve}>
            Approve
          </Button>
          <Button size="sm" variant="dangerGhost" onClick={() => setRejecting(true)}>
            Reject…
          </Button>
          {enterApproves && !compact ? (
            <span className="ml-auto flex items-center gap-1 text-micro text-text-faint">
              <Kbd keys={['enter']} />
              approves
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}
