import { Button, Checkbox, IconChevronDown, Popover } from '~ui';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface FilterPopoverProps<T extends string> {
  label: string;
  options: readonly FilterOption<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  /** Keep the URL's canonical order: the option list's. */
  className?: string;
}

/**
 * A "Service ▾" / "Status ▾" button that opens a checkbox list. The count of
 * checked options rides on the button so a narrowed calendar says so at a
 * glance; "Clear" inside resets that one dimension.
 */
export function FilterPopover<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: FilterPopoverProps<T>) {
  const toggle = (option: T) => {
    const next = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  };
  const active = value.length > 0;
  return (
    <Popover
      placement="bottom-start"
      aria-label={`Filter by ${label.toLowerCase()}`}
      className={`p-2 ${className}`}
      trigger={(props) => (
        <Button
          {...props}
          variant={active ? 'secondary' : 'outline'}
          size="sm"
          aria-label={`Filter by ${label.toLowerCase()}${active ? `, ${value.length} selected` : ''}`}
        >
          {label}
          {active ? <span className="tabular-nums text-text-muted">· {value.length}</span> : null}
          <IconChevronDown size={12} />
        </Button>
      )}
    >
      <div className="flex min-w-48 flex-col gap-1">
        {options.length === 0 ? (
          <span className="px-1 py-2 text-label text-text-muted">Nothing to filter by yet.</span>
        ) : null}
        {options.map((option) => (
          <Checkbox
            key={option.value}
            checked={value.includes(option.value)}
            onChange={() => toggle(option.value)}
            label={
              <span className="flex items-baseline gap-2">
                <span>{option.label}</span>
                {option.hint ? <span className="text-micro text-text-faint">{option.hint}</span> : null}
              </span>
            }
            className="rounded-control px-1 py-1 hover:bg-surface-hover"
          />
        ))}
        {active ? (
          <Button variant="ghost" size="xs" className="mt-1 self-start" onClick={() => onChange([])}>
            Clear
          </Button>
        ) : null}
      </div>
    </Popover>
  );
}
