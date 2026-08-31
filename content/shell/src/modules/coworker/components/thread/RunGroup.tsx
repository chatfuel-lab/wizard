import { RunGroup as RunFrame } from '~ui';
import { RunStepView, isVisibleStep } from '../run/RunStepView';
import type { RunStep } from '../../lib/threadRows';

export interface RunGroupProps {
  steps: readonly RunStep[];
  conversationId: string;
  compact: boolean;
  /**
   * The agent loop is running and this is the newest row in the thread — so
   * this run is the one still happening. The thread knows it and nothing in
   * the row does: a tool call arrives as a message and nothing ever comes back
   * to say it finished.
   */
  running?: boolean;
}

/**
 * What the assistant DID between two things it said.
 *
 * One question in practice produced five messages: a skill lookup,
 * two read tools, a navigation, and then the answer. Four of those are steps
 * with empty content, and an earlier version of the thread hid all of them — so the whole
 * visible record of a thirty-second run was a question followed, eventually, by
 * a paragraph.
 *
 * ## Where the border goes
 *
 * `~ui`'s `RunGroup` owns it, and the steps inside lose theirs — that switch
 * travels through a context, which is why the steps are passed as plain
 * children and never through a `React.Children` transform: a map that rebuilt
 * them outside the provider would give every step its own card back, and four
 * bordered cards inside a fifth is the boxes-in-boxes look a run turns into
 * when nobody owns the edge.
 *
 * A run of ONE gets no group. `RunStep` standing alone draws its own border,
 * which is exactly right for it, and a summary line reading "1 step" above a
 * single row spends a row of the thread saying what the row below it already
 * says. A single tool call is common — `get_frontend_state` on its own before
 * an ordinary answer — so this is the case worth spending a branch on.
 *
 * ## Open while it is happening, folded once it is not
 *
 * `~ui`'s default, and it is the right one here: the reason to draw tool
 * activity at all is that the operator is waiting and wants to know what is
 * going on. Once the answer is above it the run is history, and history reads
 * as one line — "4 steps" — that opens if anyone cares. `defaultOpen` is only
 * an initial value, so a group that was open while it ran does not fold away
 * under the reader the moment the answer lands.
 *
 * ## Steps that draw nothing
 *
 * `suggest_quick_reply` arrives as a tool call per option and is rendered under
 * the composer as chips, not here; `CoworkerToolButtons` cannot be actioned
 * from a step at all. Both are filtered BEFORE the frame is chosen, or a run of
 * three quick replies would draw a card announcing "3 steps" over nothing.
 */
export function RunGroup({ steps, conversationId, compact, running = false }: RunGroupProps) {
  const visible = steps.filter((step) => isVisibleStep(step.call));
  if (visible.length === 0) return null;

  const rows = visible.map((step, index) => (
    <RunStepView
      /* The message id is the key AND the identity of the step's outcome —
         the runtime records what became of a navigation under it. Two calls
         have never arrived on one message (`toolCalls` holds 0 or 1), but
         the index keeps the key unique if one ever does. */
      key={`${step.messageId}:${index}`}
      call={step.call}
      messageId={step.messageId}
      conversationId={conversationId}
      compact={compact}
    />
  ));

  if (rows.length === 1) return <div className="my-1">{rows}</div>;

  return (
    <RunFrame state={running ? 'running' : 'done'} count={rows.length} className="my-1">
      {rows}
    </RunFrame>
  );
}
