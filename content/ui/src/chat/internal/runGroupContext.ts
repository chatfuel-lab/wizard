import { createContext, useContext } from 'react';

/**
 * Whether a `RunStep` is standing on its own or is one row of a `RunGroup`.
 *
 * The two want different chrome: alone, a step is a bordered card, because
 * nothing else in the thread is going to give it an edge; inside a group, the
 * group owns the border and the steps are rows divided by hairlines. Four
 * bordered cards nested inside a fifth bordered card is the "boxes in boxes"
 * look that a run of tool calls turns into if the step decides on its own.
 *
 * A context rather than a prop because `RunGroup` takes its steps as
 * `children` — it never sees them as objects it could pass a prop to, and
 * `cloneElement` over an arbitrary child list is a worse version of this that
 * also breaks the moment somebody wraps a step in a fragment.
 */
export const RunGroupContext = createContext(false);

export function useInRunGroup(): boolean {
  return useContext(RunGroupContext);
}
