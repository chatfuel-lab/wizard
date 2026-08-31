import { Alert, Button, IconRefresh, Spinner } from '~ui';
import type { ThreadLiveness } from '../../hooks/useCoworkerThread';

export interface ThreadStatusProps {
  liveness: ThreadLiveness;
  /** The last thing the network said, if it said anything. */
  error: string | null;
  onRefresh: () => void;
  onStop: () => void;
}

/**
 * The honest states, above the composer where they cannot be scrolled away
 * from.
 *
 * Deliberately not in the message list. A typing indicator belongs in the
 * thread and sticks to the bottom with the messages; a *problem* has to be
 * where the operator is about to type, whatever they are looking at — the
 * failure mode this replaces was a thread that animated three dots forever and
 * a person waiting on an answer that the server had already given up on.
 *
 * Two states, and they say different things because they mean different things:
 *
 * - `reconnecting` — a loop is running and nothing has arrived for fifteen
 *   seconds. Nine times out of ten the socket dropped and the hook has already
 *   refetched. One quiet line, no buttons; offering a fix for something that
 *   fixes itself teaches people to press it every time.
 * - `stuck` — two minutes of nothing, the full TTL of the flag that claims the
 *   loop is alive. That is what the ~100-loop-starts-a-minute rate limit looks
 *   like from here: the mutation returned success, the failure was server-side
 *   and silent, and no reply is ever coming. Say it plainly and give both ways
 *   out — read the conversation again in case something did land, or clear the
 *   flag by stopping the loop so the composer works again.
 */
export function ThreadStatus({ liveness, error, onRefresh, onStop }: ThreadStatusProps) {
  if (liveness === 'stuck') {
    return (
      <div className="px-gutter pb-2">
        <Alert
          tone="warning"
          title="The assistant looks stuck"
          action={
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={onRefresh}>
                <IconRefresh size={14} />
                Refresh
              </Button>
              <Button size="sm" variant="secondary" onClick={onStop}>
                Stop
              </Button>
            </div>
          }
        >
          Nothing has come back for two minutes. It may have hit the rate limit, which fails quietly on the server.
          Refresh to check, or stop the run and ask again.
        </Alert>
      </div>
    );
  }

  if (liveness === 'reconnecting') {
    return (
      <div className="flex items-center justify-center gap-2 px-gutter pb-2 text-micro text-text-faint">
        <Spinner size={12} />
        Reconnecting…
      </div>
    );
  }

  /* An error while a conversation is on screen is a footnote, not a state:
     the thread is still readable and the send that failed already said so on
     its own row. */
  if (error) {
    return <div className="px-gutter pb-2 text-micro text-danger">{error}</div>;
  }

  return null;
}
