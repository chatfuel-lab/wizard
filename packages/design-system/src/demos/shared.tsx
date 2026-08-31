import type { ReactNode } from 'react';

/** Every showcase is wrapped so each component's tokens read against bg-surface-raised. */
export function Demo({ name, tokens, children }: { name: string; tokens: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline gap-2 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-text">{name}</h3>
        <span className="font-mono text-micro text-text-faint">{tokens}</span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1.5">
      {label ? <span className="w-24 shrink-0 text-xs text-text-muted">{label}</span> : null}
      {children}
    </div>
  );
}

/** Short prose above a demo, for the ones with a rule worth stating. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="mb-3 max-w-2xl text-xs leading-relaxed text-text-muted">{children}</p>;
}
