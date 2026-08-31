import { useEffect, useState } from 'react';
import { FormField, Input, Switch } from '~ui';
import type { ReelOptions } from '../../types';

export interface ReelFieldsProps {
  options: ReelOptions;
  onChange: (next: ReelOptions) => void;
  disabled?: boolean;
  error?: string | null;
}

/** Milliseconds in, seconds on screen — nobody thinks about a cover in thousandths. */
const toSeconds = (ms: number | undefined): string => (ms === undefined ? '' : String(ms / 1000));

const toMilliseconds = (text: string): number | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
};

/**
 * The three settings only a Reel has.
 *
 * `coverURL` and the cover frame are two ways to ask for the same picture and
 * the platform takes the cover when both are set, so they sit together and
 * neither is sent unless it was filled in.
 *
 * The frame keeps its own text while it is being typed: the value crossing the
 * boundary is milliseconds, and rewriting the box from a rounded number on every
 * keystroke moves the caret out from under whoever is typing.
 */
export function ReelFields({ options, onChange, disabled = false, error }: ReelFieldsProps) {
  const [frame, setFrame] = useState(() => toSeconds(options.thumbOffset));

  useEffect(() => {
    if (toMilliseconds(frame) === options.thumbOffset) return;
    setFrame(toSeconds(options.thumbOffset));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncs the box from the outside value only; `frame` is the text being typed, and re-running on it would rewrite the box out from under the caret
  }, [options.thumbOffset]);

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Cover image" error={error}>
        {(a11y) => (
          <Input
            {...a11y}
            value={options.coverURL ?? ''}
            onChange={(event) => onChange({ ...options, coverURL: event.target.value })}
            placeholder="https://"
            disabled={disabled}
          />
        )}
      </FormField>

      <div className="flex flex-wrap items-end gap-4">
        <FormField label="Cover frame, seconds" className="w-32">
          {(a11y) => (
            <Input
              {...a11y}
              value={frame}
              onChange={(event) => {
                setFrame(event.target.value);
                onChange({ ...options, thumbOffset: toMilliseconds(event.target.value) });
              }}
              inputMode="decimal"
              placeholder="0"
              disabled={disabled}
            />
          )}
        </FormField>

        <div className="pb-2">
          <Switch
            checked={options.shareToFeed ?? false}
            onChange={(next) => onChange({ ...options, shareToFeed: next })}
            disabled={disabled}
            label="Also show in the feed"
          />
        </div>
      </div>
    </div>
  );
}
