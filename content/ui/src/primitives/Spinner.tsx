export interface SpinnerProps {
  /** Pixel size. Default 20. */
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block animate-spin rounded-full border-2 border-border border-t-accent ${className}`}
    />
  );
}
