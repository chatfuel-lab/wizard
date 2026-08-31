import { useEffect, useState } from 'react';

export interface GatesState<G> {
  /** True until the first answer lands. Nothing is offered before it. */
  loading: boolean;
  gates: G;
}

/**
 * Role gates for a surface: one fetch, one answer, no churn.
 *
 * ## These are not an authorization boundary
 *
 * A gate decides what is OFFERED — which buttons render, which column is
 * editable. It never decides what is ALLOWED: that is the API's, on every
 * request, and a gate this hook opens over a call the server would refuse is a
 * button that produces an error, not an escalation. Read the rule below in that
 * light — what a gate does with a failed lookup is a UI availability choice,
 * and it is only safe because nothing here is the check that matters. Never
 * move a check into a gate that the server does not also make.
 *
 * The fetcher decides everything about what a gate means — this hook only owns
 * the lifecycle: start closed, ask once per fetcher identity, keep the last
 * answer while a new one is in flight. `fetchGates` must be identity-stable
 * (a `useCallback` over the client and bot id); a fresh closure per render
 * would ask the same question every render. `closed` is read once, on mount.
 *
 * The fetcher is expected not to reject — the shared role fetcher answers
 * closed on everything, including a request that never reached the server. If a
 * custom fetcher rejects anyway, the gates simply stay where they were and
 * loading ends.
 */
export function useGates<G>(fetchGates: () => Promise<G>, closed: G): GatesState<G> {
  const [state, setState] = useState<GatesState<G>>(() => ({ loading: true, gates: closed }));

  useEffect(() => {
    let cancelled = false;
    fetchGates()
      .then((gates) => {
        if (!cancelled) setState({ loading: false, gates });
      })
      .catch(() => {
        if (!cancelled) setState((previous) => ({ loading: false, gates: previous.gates }));
      });
    return () => {
      cancelled = true;
    };
  }, [fetchGates]);

  return state;
}
