/**
 * The handful of things every auth screen needs and nothing else in the app
 * does: the whole-viewport spinner the router shows between decisions, an
 * error banner that takes focus when it appears, and a text link that is a
 * button (because it navigates in place, and a bare <a href> would fight the
 * shell's own router for the click).
 */
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { Alert, Spinner } from '~ui';
import type { AppRoute } from '../../types';

/** The screens all take the parsed route; `navigate` comes from useAuth(). */
export interface ScreenProps {
  route: AppRoute;
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-surface font-sans">
      <Spinner />
      {/* The label is the announcement; the spinner is decoration. */}
      <span role="status" className="text-meta text-text-muted">
        {label}
      </span>
    </div>
  );
}

/**
 * A failed submit. `Alert tone="danger"` already carries `role="alert"`, so it
 * is announced; the focus move is for the sighted keyboard user whose caret is
 * still in the last field of a form that just refused them — without it the
 * message can be a screen away and they never see it.
 *
 * Keyed on the message so a SECOND failure with different copy re-announces
 * and re-focuses, while a re-render with the same message does not.
 */
export function ErrorAlert({ message, action }: { message: string; action?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [message]);
  return (
    <div ref={ref} tabIndex={-1} className="rounded-card focus-visible:focus-ring">
      <Alert tone="danger" action={action}>
        {message}
      </Alert>
    </div>
  );
}

export function TextLink({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-chip font-medium text-accent underline-offset-2 transition-colors duration-fast ease-standard hover:text-accent-hover hover:underline focus-visible:focus-ring ${className}`}
    >
      {children}
    </button>
  );
}

/** The vertical rhythm of a form: fields, then the alert, then the button. */
export function FormStack({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
    </form>
  );
}

/**
 * The "nothing to do here" body: an icon, a sentence and a way onward. Not
 * `~ui EmptyState` — that one centres itself in a full-height box and expects
 * a page around it, and inside a 26rem auth card it collapses to a strip of
 * whitespace with a line of text in the middle.
 */
export function ScreenNotice({
  icon,
  children,
  actions,
}: {
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      {icon !== undefined ? <span className="text-text-faint [&_svg]:size-6">{icon}</span> : null}
      <div className="text-sm text-text-muted">{children}</div>
      {actions !== undefined ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
