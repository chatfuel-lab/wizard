import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRovingFocus } from '../hooks/useRovingFocus';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  size?: 'sm' | 'md';
  /** Hide the text and keep only icons. Each option still needs its label. */
  iconOnly?: boolean;
  'aria-label': string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SegmentedControlProps<string>['size']>, string> = {
  sm: 'h-field-sm text-xs',
  md: 'h-field text-sm',
};

interface Pill {
  left: number;
  width: number;
}

/**
 * Board / Table / Forecast style switch.
 *
 * The selected state is one moving pill rather than a per-button background,
 * so switching reads as a single object sliding instead of two things
 * cross-fading. Its geometry is measured from the buttons and transitioned in
 * CSS — `left`/`width` rather than a transform, because a scaled transform
 * would distort the pill's corner radius as it travels.
 *
 * Duration and easing come from tokens, which is also how reduced motion turns
 * the slide off without this component knowing about it.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  iconOnly = false,
  className = '',
  ...aria
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<(HTMLElement | null)[]>([]);
  const [pill, setPill] = useState<Pill | null>(null);

  const disabled = options.flatMap((option, index) => (option.disabled ? [index] : []));
  const roving = useRovingFocus(options.length, {
    orientation: 'horizontal',
    disabled,
    labels: options.map((option) => option.label),
  });

  const activeIndex = options.findIndex((option) => option.value === value);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const button = buttonsRef.current[activeIndex];
    if (!container || !button) {
      setPill(null);
      return;
    }
    setPill({ left: button.offsetLeft, width: button.offsetWidth });
  }, [activeIndex]);

  useEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    /* Labels change width when a font loads late or the container is resized by
     * a drawer opening; without this the pill drifts off its button. */
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={aria['aria-label']}
      onKeyDown={roving.onKeyDown}
      className={`relative inline-flex items-center gap-0.5 rounded-control bg-surface-sunken p-0.5 ${className}`}
    >
      {pill ? (
        <span
          aria-hidden
          style={{ left: pill.left, width: pill.width }}
          className="absolute bottom-0.5 top-0.5 rounded-control bg-surface-raised shadow-raised transition-[left,width] duration-fast ease-standard"
        />
      ) : null}

      {options.map((option, index) => {
        const selected = option.value === value;
        const { tabIndex, ref } = roving.itemProps(index);
        return (
          <button
            key={option.value}
            ref={(node) => {
              ref(node);
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? option.label : undefined}
            disabled={option.disabled}
            tabIndex={tabIndex}
            onClick={() => onChange(option.value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-control px-2.5 font-medium transition-colors duration-fast ease-standard focus-visible:focus-ring disabled:cursor-not-allowed disabled:text-text-faint ${
              SIZE_CLASSES[size]
            } ${selected ? 'text-text' : 'text-text-muted hover:text-text'}`}
          >
            {option.icon !== undefined ? <span className="shrink-0">{option.icon}</span> : null}
            {iconOnly ? null : <span className="truncate">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
