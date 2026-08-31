import { Button, Spinner } from '~ui';

export interface FillProgressProps {
  loaded: number;
  target: number;
  onStop: () => void;
}

/** The pill that reports a running select-all fill and offers to stop it. */
export function FillProgress({ loaded, target, onStop }: FillProgressProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-rail flex justify-center">
      <span className="pointer-events-auto flex items-center gap-2 rounded-card border border-border bg-surface-overlay px-3 py-1.5 text-meta shadow-overlay">
        <Spinner size={14} />
        Loading {loaded.toLocaleString()} of {target.toLocaleString()}…
        <Button variant="ghost" size="sm" onClick={onStop}>
          Stop
        </Button>
      </span>
    </div>
  );
}
