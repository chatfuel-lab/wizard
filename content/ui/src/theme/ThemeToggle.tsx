import { IconMonitor, IconMoon, IconSun } from '../icons';
import { useTheme, type ThemePreference, type UseThemeOptions } from './useTheme';

export interface ThemeToggleProps extends UseThemeOptions {
  className?: string;
}

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { value: 'system', label: 'System', Icon: IconMonitor },
  { value: 'light', label: 'Light', Icon: IconSun },
  { value: 'dark', label: 'Dark', Icon: IconMoon },
];

/**
 * Three-way theme control. 'System' is a real option, not an implicit default —
 * a user who has never chosen should be able to see that, and to get back to it.
 *
 * Embed hosts: pass `persist={false}` and/or a `target`, or simply don't mount
 * this at all — the host app usually owns its own theme switch.
 */
export function ThemeToggle({ className = '', ...options }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme(options);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-sunken p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setPreference(value)}
            className={`flex aspect-square h-6 cursor-pointer items-center justify-center rounded-chip transition-colors duration-fast ease-standard focus-visible:focus-ring ${
              active ? 'bg-surface-raised text-text shadow-raised' : 'text-text-faint hover:text-text-muted'
            }`}
          >
            <Icon size={14} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
