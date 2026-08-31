import { useId, type ReactNode } from 'react';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly RadioOption<T>[];
  /** Visible group heading. Omit and pass aria-label instead. */
  legend?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * Native radios in a fieldset.
 *
 * No roving tabindex here: a radio group already IS one Tab stop with arrow
 * keys inside it, natively, in every browser. Re-implementing that would only
 * be a way to get it slightly wrong.
 */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  legend,
  orientation = 'vertical',
  disabled = false,
  className = '',
  ...aria
}: RadioGroupProps<T>) {
  const name = useId();

  return (
    <fieldset disabled={disabled} aria-label={aria['aria-label']} className={`min-w-0 border-0 p-0 ${className}`}>
      {legend !== undefined ? <legend className="mb-1.5 text-xs font-medium text-text-muted">{legend}</legend> : null}

      <div className={`flex gap-3 ${orientation === 'vertical' ? 'flex-col' : 'flex-wrap'}`}>
        {options.map((option) => {
          const isDisabled = disabled || option.disabled === true;
          return (
            <label
              key={option.value}
              className={`flex items-start gap-2 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="relative mt-0.5 inline-flex">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  disabled={isDisabled}
                  onChange={() => onChange(option.value)}
                  className="peer absolute inset-0 h-full w-full cursor-[inherit] appearance-none rounded-full focus-visible:focus-ring"
                />
                <span
                  aria-hidden
                  className={`flex aspect-square h-4 items-center justify-center rounded-full border transition-colors duration-fast ease-standard ${
                    value === option.value ? 'border-accent' : 'border-border-strong'
                  } ${isDisabled ? 'opacity-50' : 'peer-hover:border-accent'}`}
                >
                  <span
                    className={`aspect-square h-2 rounded-full transition-transform duration-fast ease-spring ${
                      value === option.value ? 'scale-100 bg-accent' : 'scale-0 bg-transparent'
                    }`}
                  />
                </span>
              </span>

              <span className="min-w-0">
                <span className={`block text-sm ${isDisabled ? 'text-text-faint' : 'text-text'}`}>{option.label}</span>
                {option.description !== undefined ? (
                  <span className="block text-xs text-text-muted">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
