import { Tag } from '~ui';

export interface SwitcherOption {
  id: string;
  title: string;
}

export interface SwitcherProps {
  /** The id currently in effect — may name something not in `options` yet. */
  value: string;
  options: readonly SwitcherOption[];
  /** Screen-reader name for the control, e.g. "Switch bot". */
  label: string;
  onSwitch: (id: string) => void;
}

/**
 * One level of the topbar picker: a workspace, or a bot inside it.
 *
 * It degrades rather than disappearing. With something to choose between it is
 * a select; with a single option it is that option's name; before the list has
 * arrived it is the raw id, which is at least true. The bar's left side is
 * WHERE you are working, and going blank there reads as a chrome bug.
 */
export function Switcher({ value, options, label, onSwitch }: SwitcherProps) {
  if (options.length > 1) {
    return (
      <select
        value={value}
        onChange={(e) => onSwitch(e.target.value)}
        className="h-7 max-w-44 rounded-md border border-border bg-surface-sunken px-2 text-xs text-text-muted focus:border-accent focus:outline-none"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
    );
  }

  const title = options.find((option) => option.id === value)?.title ?? options[0]?.title;
  if (!title && !value) return null;
  return (
    <Tag>
      <span className="block max-w-44 truncate" title={title ? value : undefined}>
        {title ?? value}
      </span>
    </Tag>
  );
}
