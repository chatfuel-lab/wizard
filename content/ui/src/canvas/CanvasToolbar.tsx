import type { ComponentType, ReactNode } from 'react';
import { Island } from '../layout/Island';
import { Tooltip } from '../floating/Tooltip';

export interface CanvasTool<Id extends string = string> {
  id: Id;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /**
   * Appended to the tooltip. The binding itself belongs to the module — this is
   * only how it is spelled to the reader.
   */
  shortcut?: string;
  disabled?: boolean;
}

export interface CanvasToolbarProps<Id extends string = string> {
  tools: readonly CanvasTool<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Extra controls after a separator — an "add" button, usually. */
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

/**
 * The tool strip.
 *
 * Deliberately only the tools. Excalidraw splits its chrome in two — which tool
 * you are holding, and the properties of what you have selected — and the split
 * is worth copying because the two have different lifetimes: the tool strip is
 * always there, the properties island exists only while something is selected.
 * Merging them gives you a panel that changes height as you click around.
 *
 * The other half is not a component here, because there is nothing general to
 * say about it: compose an `Island` with whatever the selection actually has.
 *
 * `radiogroup`, not a toolbar of buttons: exactly one tool is held at a time,
 * which is what a radio group means and what makes arrow keys move between them
 * without the module wiring anything.
 */
export function CanvasToolbar<Id extends string>({
  tools,
  value,
  onChange,
  orientation = 'vertical',
  children,
  className,
  'aria-label': ariaLabel = 'Tools',
}: CanvasToolbarProps<Id>) {
  return (
    <Island padding="sm" orientation={orientation} className={className}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={`flex items-center gap-1 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}`}
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = tool.id === value;
          return (
            <Tooltip
              key={tool.id}
              label={tool.shortcut ? `${tool.label} · ${tool.shortcut}` : tool.label}
              placement={orientation === 'vertical' ? 'right' : 'bottom'}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={tool.label}
                disabled={tool.disabled}
                onClick={() => onChange(tool.id)}
                /* Only the held tool is in the tab order. Arrowing between
                   radios is the whole point of the role; nine tab stops in a
                   floating strip is not. */
                tabIndex={active ? 0 : -1}
                className={`relative flex size-8 items-center justify-center rounded-control transition-colors focus-visible:focus-ring disabled:opacity-40 ${
                  active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`}
              >
                <Icon size={16} />
                {tool.shortcut ? (
                  /* The shortcut printed on the button, not only in the
                     tooltip. Excalidraw's one genuinely teaching detail: a
                     tooltip teaches the person who hovers and waits, and the
                     corner digit teaches everyone else, every time they look at
                     the strip. */
                  <span aria-hidden className="absolute bottom-0 right-0.5 text-nano leading-none text-text-faint">
                    {tool.shortcut}
                  </span>
                ) : null}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {children ? (
        <>
          <span aria-hidden className={`bg-border ${orientation === 'vertical' ? 'my-1 h-px w-6' : 'mx-1 h-6 w-px'}`} />
          {children}
        </>
      ) : null}
    </Island>
  );
}
