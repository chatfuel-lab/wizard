import type { ReactNode } from 'react';

export interface StepFrameProps {
  title: string;
  children: ReactNode;
  /** A second column at wide bands — the phone preview — stacked under the form otherwise. */
  aside?: ReactNode;
}

/**
 * What every step draws inside: a heading and its controls, and when it has
 * one, a preview beside them. The two-column shape is a container query on
 * the module root, so the preview moves under the form when the module is
 * narrow whatever the viewport is doing.
 */
export function StepFrame({ title, children, aside }: StepFrameProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-gutter py-4">
      <h2 className="mb-4 text-heading font-semibold text-text">{title}</h2>
      {aside ? (
        <div className="grid grid-cols-1 gap-6 @wide:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">{children}</div>
          <div className="min-w-0">{aside}</div>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
