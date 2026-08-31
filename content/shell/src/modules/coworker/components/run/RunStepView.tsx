import { useEffect, useState } from 'react';
import { Button, IconUndo, JsonView, RunStep } from '~ui';
import { useCoworker } from '../../CoworkerContext';
import { classifyAction } from '../../lib/frontendActions';
import type { ActionOutcome, CoworkerRuntime } from '../../lib/runtime';
import { describeTool, humanize } from '../../lib/toolCalls';
import type { RunStepViewProps } from '../contracts';
import { toolIcon } from './StepGlyph';

/**
 * One thing the assistant did, as a row of `~ui`'s `RunStep`.
 *
 * Every tool call the API sends arrives as its own message with EMPTY content
 * and a single `toolCalls` entry — which is why the module filtered them out
 * and showed nothing, and why a run of six steps used to read as one answer
 * appearing from nowhere. A step is the receipt for work already done: quiet,
 * scannable, one line, and never competing with the answer above it.
 *
 * The chrome is not this file's any more. `RunStep` draws the row, the chip
 * behind the glyph, the state word (visible for the two states that are not
 * self-evident, in the accessibility tree for all four) and the disclosure;
 * inside a `RunGroup` it drops its border and becomes a plain row, through a
 * context. What is left here is the only part that is this module's: reading a
 * tool call, and reading the runtime's verdict on a navigation.
 *
 * ## The state of a step, and what this module can honestly claim
 *
 * The wire carries no result and no duration. A tool call arrives as a message
 * and nothing ever comes back to say how it went — so an ordinary step is
 * `done`, because the message existing IS the record that the call was made,
 * and `running` would be a spinner that never stops. The run as a whole knows
 * better (see `components/thread/RunGroup.tsx`) and carries that instead.
 *
 * Navigations are the exception, and deliberately so. The runtime decides
 * whether to move the app, moves it, and remembers what happened
 * (`lib/runtime.ts`); that verdict maps onto three of the four run states
 * exactly — declined is `skipped`, failed is `failed`, moved is `done` — and
 * this file renders it and never makes it. The separation is not tidiness: a
 * component that navigated on render would move the operator's screen again on
 * every remount, and again on every page of history it scrolled past.
 */

interface OutcomeState {
  outcome: ActionOutcome | undefined;
  /** A later navigation has happened, so this one's undo no longer leads home. */
  superseded: boolean;
}

/**
 * The runtime's verdict on one navigation, kept in sync.
 *
 * Not `useSyncExternalStore`: the second fact this needs — has something moved
 * the app SINCE — is not in the store at all, it is the sequence of events, and
 * a snapshot function cannot see a sequence. `undo` restores the address captured
 * before the move, so after a second navigation it no longer restores anything
 * the operator recognises; it stops being offered instead of quietly lying.
 */
function useOutcome(runtime: CoworkerRuntime, messageId: string): OutcomeState {
  const [state, setState] = useState<OutcomeState>(() => ({
    outcome: runtime.outcome(messageId),
    superseded: false,
  }));

  useEffect(() => {
    setState({ outcome: runtime.outcome(messageId), superseded: false });
    return runtime.onOutcome((next) => {
      setState((prev) => {
        if (next.messageID === messageId) return { outcome: next, superseded: false };
        if (prev.outcome === undefined || prev.superseded) return prev;
        return { ...prev, superseded: true };
      });
    });
  }, [runtime, messageId]);

  return state;
}

function NavigationStep({
  messageId,
  parameters,
  compact,
}: {
  messageId: string;
  parameters: Record<string, unknown>;
  compact: boolean;
}) {
  const { runtime } = useCoworker();
  const { outcome, superseded } = useOutcome(runtime, messageId);
  /* Keyed by the outcome object, so a deferred navigation that is later run
     from the button below comes back with its Undo intact. */
  const [undoneFor, setUndoneFor] = useState<ActionOutcome | null>(null);

  const pathKey = parameters.pathKey;
  const target = typeof pathKey === 'string' && pathKey.trim() !== '' ? pathKey : null;
  const glyph = toolIcon('navigate');

  /* No outcome means the runtime never saw this message on the socket — it was
     read out of history, on this mount or a previous one. The navigation
     happened, or was declined, in a session this component knows nothing about,
     so it states the intention and claims nothing else. `done` for the same
     reason every other historical step is done: the message is the record that
     the assistant asked, and `skipped` would claim it did not happen. */
  if (outcome === undefined) {
    return <RunStep icon={glyph} title={target === null ? 'Open a page' : `Open ${target}`} state="done" />;
  }

  if (outcome.deferred !== undefined) {
    /* The gate declined: the operator was typing, was reading another chat, or
       there is no shell to move (the module on its own page, or an embed). The
       first two are theirs to release with a click; the last one is not, so it
       stays a sentence and does not pretend to be a button. `skipped` is the
       literal truth — the run reached this step and nothing happened. */
    const control = runtime.hasShell() ? (
      <Button size="xs" variant="ghost" onClick={() => runtime.runDeferred(messageId)}>
        Open it
      </Button>
    ) : null;
    return (
      <RunStep
        icon={glyph}
        title={outcome.label}
        /* In a narrow band the button and the reason compete for the same
           strip, and the button is the one that can be acted on. */
        detail={control !== null && compact ? undefined : outcome.deferred}
        state="skipped"
        actions={control ?? undefined}
      />
    );
  }

  if (!outcome.ok) {
    return <RunStep icon={glyph} title={outcome.label} state="failed" />;
  }

  const undone = undoneFor === outcome;
  const canUndo = outcome.undo !== undefined && !superseded && !undone;
  return (
    <RunStep
      icon={glyph}
      title={outcome.label}
      detail={undone ? 'undone' : undefined}
      state="done"
      actions={
        canUndo ? (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              outcome.undo?.();
              setUndoneFor(outcome);
            }}
          >
            <IconUndo size={12} />
            {/* In a narrow band the label is the first thing that can go; the
                button keeps its name for anyone not reading it with their
                eyes. */}
            <span className={compact ? 'sr-only' : ''}>Undo</span>
          </Button>
        ) : undefined
      }
    />
  );
}

/**
 * Whether a tool call has a row of its own.
 *
 * Two do not, and both for the same reason — they are not a record of work, they
 * are an offer the operator can still take up. Exported because the group above
 * has to know how many rows it is actually going to get: a run whose every call
 * is a quick reply would otherwise draw a bordered card announcing four steps
 * and then show nothing.
 */
export function isVisibleStep(call: RunStepViewProps['call']): boolean {
  if (call.__typename === 'CoworkerToolButtons') return false;
  if (call.__typename === 'CoworkerFrontendAction') {
    return classifyAction(call.actionType) !== 'quick-reply';
  }
  return true;
}

export function RunStepView({ call, messageId, compact }: RunStepViewProps) {
  if (call.__typename === 'CoworkerFrontendAction') {
    const kind = classifyAction(call.actionType);
    if (kind === 'quick-reply') {
      /* Offered options are not a step. They are the operator's next message,
         drawn as chips under the newest one — see QuickReplyBar. */
      return null;
    }
    if (kind === 'navigate') {
      return <NavigationStep messageId={messageId} parameters={call.parameters} compact={compact} />;
    }
    /* An action type nobody has seen. Its parameters are the only thing that
       says what it was, so they are the one disclosure in the thread — every
       other step's arguments are simply not on the wire. */
    return (
      <RunStep icon={toolIcon('tool')} title={humanize(call.actionType) || call.actionType} state="done">
        {Object.keys(call.parameters).length > 0 ? <JsonView value={call.parameters} /> : undefined}
      </RunStep>
    );
  }

  if (call.__typename === 'CoworkerToolOther') {
    const tool = describeTool(call.toolID);
    /* No disclosure: `CoworkerToolOther` carries a `toolID` and nothing else.
       The arguments exist only on a pending approval, which is where the
       `JsonView` of them lives. */
    return <RunStep icon={toolIcon(tool.glyph)} title={tool.title} state="done" />;
  }

  /* CoworkerToolButtons stays with the message that carries it: pressing one is
     a mutation on the thread (`clickButton`), and nothing in this component's
     contract can send it. The guide lists the type; nobody has seen one live. */
  return null;
}
