import { useEffect, useMemo, useState } from 'react';
import { DURATION_PRESETS, formatDuration, parseDuration } from '../lib/time/timeOfDay';
import { Input } from '../primitives/Input';
import { SegmentedControl } from './SegmentedControl';

export interface DurationInputProps {
  /** Minutes, or null for unset. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Minutes offered as chips. Default 15/30/45/60/90/120. */
  presets?: readonly number[];
  /** Minutes; typed values below it are rejected. Default 5. */
  min?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label': string;
  className?: string;
}

const CUSTOM = 'custom';

/**
 * Presets as a segmented control plus a "Custom" segment that reveals a text
 * box. A value that matches no preset opens as custom, so a 50-minute service
 * edits as `50` rather than snapping to 45. The text box parses what people
 * type — `90`, `1h30`, `1:30` — and commits on blur or Enter.
 */
export function DurationInput({
  value,
  onChange,
  presets = DURATION_PRESETS,
  min = 5,
  disabled = false,
  size = 'md',
  className = '',
  ...aria
}: DurationInputProps) {
  const isPreset = value !== null && presets.includes(value);
  const [custom, setCustom] = useState(value !== null && !isPreset);
  const [text, setText] = useState(value === null ? '' : String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value !== null && !presets.includes(value)) {
      setCustom(true);
      setText(String(value));
    }
  }, [presets, value]);

  const options = useMemo(
    () => [
      ...presets.map((minutes) => ({ value: String(minutes), label: formatDuration(minutes), disabled })),
      { value: CUSTOM, label: 'Custom', disabled },
    ],
    [disabled, presets],
  );

  const commitText = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      setError(null);
      onChange(null);
      return;
    }
    const parsed = parseDuration(trimmed);
    if (parsed === null) {
      setError('Enter minutes, like 45, or 1h30');
      return;
    }
    if (parsed < min) {
      setError(`At least ${formatDuration(min)}`);
      return;
    }
    setError(null);
    onChange(parsed);
    setText(String(parsed));
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={custom ? CUSTOM : value === null ? '' : String(value)}
          onChange={(next) => {
            if (next === CUSTOM) {
              setCustom(true);
              return;
            }
            setCustom(false);
            setError(null);
            onChange(Number(next));
          }}
          options={options}
          size={size}
          aria-label={aria['aria-label']}
        />
        {custom ? (
          <span className="inline-flex items-center gap-1.5">
            <Input
              value={text}
              inputMode="numeric"
              placeholder="min"
              disabled={disabled}
              aria-label={`${aria['aria-label']}, custom minutes`}
              aria-invalid={error !== null || undefined}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
              onBlur={commitText}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitText();
                }
              }}
              className={`w-24 tabular-nums ${size === 'sm' ? 'h-field-sm text-label' : ''} ${error ? 'border-danger' : ''}`}
            />
            <span className="text-label text-text-muted">min</span>
          </span>
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="text-micro text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
