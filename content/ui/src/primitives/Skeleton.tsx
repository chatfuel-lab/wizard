export interface SkeletonProps {
  variant?: 'text' | 'block' | 'circle';
  /** CSS width. Ignored for `circle`, which is square by definition. */
  width?: string;
  /** CSS height. Defaults per variant. */
  height?: string;
  /** `text` only: how many lines to stack. The last one is short, as prose is. */
  lines?: number;
  className?: string;
}

const VARIANT_RADIUS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'rounded-chip',
  block: 'rounded-card',
  circle: 'rounded-full',
};

/**
 * Loading placeholder.
 *
 * `skeleton` and `animate-shimmer` are both tokens, so reduced motion turns the
 * sweep off in the stylesheet and this component needs no branch for it.
 *
 * Marked aria-hidden and paired with a live region by the caller — a screen
 * reader user wants "Loading contacts", not eleven grey rectangles.
 */
export function Skeleton({ variant = 'text', width, height, lines = 1, className = '' }: SkeletonProps) {
  const base = `skeleton animate-shimmer ${VARIANT_RADIUS[variant]} ${className}`;

  if (variant === 'circle') {
    const size = height ?? width ?? '2rem';
    return <span aria-hidden style={{ width: size, height: size }} className={`block ${base}`} />;
  }

  const resolvedHeight = height ?? (variant === 'text' ? '0.75rem' : '4rem');

  if (variant === 'text' && lines > 1) {
    return (
      <span aria-hidden className="flex flex-col gap-1.5">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            style={{
              width: index === lines - 1 ? '60%' : (width ?? '100%'),
              height: resolvedHeight,
            }}
            className={`block ${base}`}
          />
        ))}
      </span>
    );
  }

  return <span aria-hidden style={{ width: width ?? '100%', height: resolvedHeight }} className={`block ${base}`} />;
}
