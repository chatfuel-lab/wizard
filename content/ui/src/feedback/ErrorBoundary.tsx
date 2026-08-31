import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { IconRefresh, IconWarning } from '../icons';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';

/**
 * The only thing in React that stops a render error from taking the page with
 * it. `<Suspense>` catches promises, not exceptions: one module that throws
 * while rendering unmounts the whole tree above it, and the user is left with a
 * white screen and no way back other than the browser's reload button.
 *
 * So the boundary goes around anything that is not ours to trust — a module
 * mounted by the shell, a lazy chunk fetched over the network — and the rest of
 * the app (shell, nav, the bot picker) survives the module that broke.
 *
 * Two failures look identical to React and need different words:
 *
 * - a lazy import that fails to load is almost always a chunk that no longer
 *   exists because the app was redeployed under the open tab. Retrying in place
 *   fetches the same dead URL, so the offer is a reload.
 * - anything else is a bug in the code that just rendered. A remount is worth
 *   trying — the error may have come from one bad response — and reload is the
 *   fallback.
 *
 * Recovery is a remount, not a re-render: `attempt` keys the subtree, so trying
 * again builds it from nothing rather than handing the same broken state back
 * to the same component. A boundary does not reset itself when its parent
 * re-renders, which is deliberate — give it a `key` (module id, bot id) to make
 * navigating away a fresh start.
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Replaces the default screen. Gets the error and a remount. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /** Somewhere to report to — an error tracker, a toast, a log. */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** What broke, in the user's words: "This bot's inbox", "The flow editor". */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  attempt: number;
}

/** A chunk that 404s: the deploy moved under an open tab, so reload is the fix. */
function isStaleChunk(error: Error): boolean {
  return /dynamically imported module|module script failed|Loading chunk|Importing a module/i.test(
    `${error.name}: ${error.message}`,
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  private retry = () => {
    this.setState((prev) => ({ error: null, attempt: prev.attempt + 1 }));
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error, attempt } = this.state;
    if (!error) return <Fragment key={attempt}>{this.props.children}</Fragment>;
    if (this.props.fallback) return this.props.fallback(error, this.retry);

    const stale = isStaleChunk(error);
    const what = this.props.label ?? 'This part of the app';
    return (
      <EmptyState
        icon={<IconWarning />}
        title={stale ? 'A new version is available' : `${what} stopped working`}
        description={
          stale
            ? 'The app was updated while this tab was open, so the page it tried to load is gone. Reloading picks up the new one.'
            : error.message
        }
        action={
          <div className="flex items-center gap-2">
            {stale ? null : (
              <Button variant="secondary" size="sm" onClick={this.retry}>
                Try again
              </Button>
            )}
            <Button variant={stale ? 'primary' : 'ghost'} size="sm" onClick={this.reload}>
              <IconRefresh />
              Reload the page
            </Button>
          </div>
        }
      />
    );
  }
}
