import type { ReactNode } from 'react';

/** Centered gray system text — takeover markers, close reasons, one line each. */
export function SystemLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex justify-center">
      <span className="max-w-[85%] rounded-full bg-surface-sunken px-3 py-1 text-center text-xs text-text-muted">
        {children}
      </span>
    </div>
  );
}
