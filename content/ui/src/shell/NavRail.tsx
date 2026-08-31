import type { ReactNode } from 'react';

export interface NavRailItem {
  id: string;
  title: string;
  icon: ReactNode;
}

export type NavRailVariant = 'rail' | 'expanded';

export interface NavRailProps {
  items: NavRailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /**
   * `rail` is the icon-only strip; `expanded` adds labels and is what the
   * shell's drawer copy uses, where there is width to spare and an icon with
   * no label is a guessing game.
   *
   * `expanded` fills its host and draws no edge of its own, because that host
   * is a drawer which already has one. A fixed width here would leave the
   * drawer part-filled with a stray border down the middle of it.
   */
  variant?: NavRailVariant;
}

/** Left nav for switching modules; in `rail` the titles surface as tooltips. */
export function NavRail({ items, activeId, onSelect, variant = 'rail' }: NavRailProps) {
  const expanded = variant === 'expanded';
  return (
    <nav
      className={`flex shrink-0 flex-col gap-1 bg-surface-raised py-2 ${
        expanded ? 'w-full items-stretch px-2' : 'w-rail items-center border-r border-border'
      }`}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            title={expanded ? undefined : item.title}
            aria-label={item.title}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
            className={`touch-target flex items-center rounded-control transition-colors duration-fast ease-standard focus-visible:focus-ring ${
              expanded ? 'gap-2 px-2 text-body' : 'h-10 w-10 justify-center'
            } ${active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text'}`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
            {expanded ? <span className="truncate">{item.title}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
