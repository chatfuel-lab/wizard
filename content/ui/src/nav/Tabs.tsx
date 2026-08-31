export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Underline tabs.
 *
 * The strip SCROLLS rather than wraps or squashes: a module with five sections
 * and words for names ("Handoff & Leads") is wider than 360 px, and a header
 * that wraps to two rows moves the content under it on every narrow screen.
 * `shrink-0` on the buttons keeps the labels whole while the row scrolls; the
 * scrollbar is hidden because the row is one line of buttons a finger can drag
 * and a trackpad can flick — there is nothing to aim at.
 */
export function Tabs({ tabs, active, onSelect }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:focus-ring ${
              isActive
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:border-border hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
