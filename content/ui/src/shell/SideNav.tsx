import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRovingFocus, type UseRovingFocusResult } from '../hooks/useRovingFocus';
import { NavRail } from './NavRail';

export interface SideNavItem {
  id: string;
  title: string;
  icon: ReactNode;
}

export interface SideNavGroup {
  id: string;
  title: string;
  icon: ReactNode;
  items: SideNavItem[];
}

export type SideNavVariant = 'rail' | 'expanded';

export interface SideNavProps {
  groups: SideNavGroup[];
  /** The active ITEM's id — the group follows from it. */
  activeId: string;
  onSelect: (id: string) => void;
  /**
   * `rail` is the desktop shape: a strip of group icons, each opening its items
   * as a flyout on hover. The flyout is positioned, not laid out — it draws
   * over the module rather than pushing it sideways, so the nav costs one rail
   * of chrome and nothing else.
   *
   * `expanded` is the drawer shape below the collapse breakpoint: one column,
   * every group stacked with a heading, nothing to hover. A drawer is opened
   * deliberately and read once; a flyout inside it would be a second thing to
   * open after opening the first.
   */
  variant?: SideNavVariant;
}

/** How long the flyout survives the pointer leaving it — the diagonal-move grace. */
const CLOSE_DELAY_MS = 180;

/**
 * Two-level module navigation.
 *
 * The first level is information architecture, not a route: a group is a
 * heading over modules, and the address bar still says `/<moduleId>`. Nothing
 * below this component knows groups exist.
 */
export function SideNav(props: SideNavProps) {
  if (props.groups.length === 0) return null;
  if (props.variant === 'expanded') return <ExpandedNav {...props} />;
  /* One group is not an information architecture, it is a list — and a rail of
     a single icon hiding everything behind a hover is strictly worse than the
     flat rail this shell had before there were groups. A scaffold that
     installed one area's modules gets exactly that rail back. */
  if (props.groups.length === 1) {
    return <NavRail items={props.groups[0].items} activeId={props.activeId} onSelect={props.onSelect} />;
  }
  return <RailNav {...props} />;
}

/** The group a module sits in — the first group is the fallback for an unknown id. */
function groupIdOf(groups: SideNavGroup[], itemId: string): string {
  return groups.find((g) => g.items.some((i) => i.id === itemId))?.id ?? groups[0]?.id ?? '';
}

function RailNav({ groups, activeId, onSelect }: SideNavProps) {
  const activeGroupId = groupIdOf(groups, activeId);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef(0);
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());
  const panelBaseId = useId();

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const open = (id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenId(id);
  };
  /* Deferred, not immediate: the pointer travelling from an icon to the flyout
     beside it passes over the rail's own padding, and a close on the first
     mouseleave would take the panel away underneath it. */
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  };
  const closeNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpenId(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || openId === null) return;
    event.stopPropagation();
    buttons.current.get(openId)?.focus();
    closeNow();
  };

  /* Focus leaving the whole nav closes it; focus moving from a group icon into
     its own flyout must not. `relatedTarget` is null when focus left the
     document entirely — the flyout can stay for that. */
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !event.currentTarget.contains(next)) closeNow();
  };

  return (
    <div
      className="flex min-h-0 shrink-0"
      onMouseEnter={() => window.clearTimeout(closeTimer.current)}
      onMouseLeave={closeSoon}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <nav
        aria-label="Sections"
        className="flex w-rail shrink-0 flex-col border-r border-border bg-surface-raised py-2"
      >
        <ul role="list" className="flex flex-col gap-1">
          {groups.map((group) => {
            const isOpen = openId === group.id;
            const isActive = group.id === activeGroupId;
            const panelId = `${panelBaseId}-${group.id}`;
            /* A group of one is not a group. It gets the module's own icon and
               goes straight there, because a flyout whose only job is to offer
               one thing costs a hover and a click to say what the icon already
               said — and in a scaffolded app that installed one module out of a
               group of three, that is the common shape rather than the odd
               one. */
            const only = group.items.length === 1 ? group.items[0] : undefined;
            if (only) {
              return (
                <li key={group.id} className="flex justify-center">
                  <button
                    type="button"
                    title={only.title}
                    aria-label={only.title}
                    aria-current={only.id === activeId ? 'page' : undefined}
                    onMouseEnter={closeNow}
                    onFocus={closeNow}
                    onClick={() => onSelect(only.id)}
                    className={`touch-target flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-fast ease-standard focus-visible:focus-ring ${
                      only.id === activeId
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text'
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">{only.icon}</span>
                  </button>
                </li>
              );
            }
            return (
              /* `relative` here, and the flyout inside: it anchors to the icon
                 with no measuring, and it lands right after its own trigger in
                 the tab order, so Tab off a group icon walks into that group's
                 items instead of past them. */
              <li key={group.id} className="relative flex justify-center">
                <button
                  ref={(node) => {
                    buttons.current.set(group.id, node);
                  }}
                  type="button"
                  title={group.title}
                  aria-label={group.title}
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? panelId : undefined}
                  aria-current={isActive ? 'true' : undefined}
                  onMouseEnter={() => open(group.id)}
                  onFocus={() => open(group.id)}
                  // Click stays a toggle: a touch screen has no hover, and the
                  // flyout is the only place the module names are written.
                  onClick={() => (isOpen ? closeNow() : open(group.id))}
                  className={`touch-target flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-fast ease-standard focus-visible:focus-ring ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : isOpen
                        ? 'bg-surface-hover text-text'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{group.icon}</span>
                </button>
                {isOpen ? (
                  <div
                    id={panelId}
                    className="absolute left-full top-0 z-dropdown w-nav-panel rounded-r-lg border border-l-0 border-border bg-surface-raised pb-2 shadow-overlay"
                  >
                    <p className="truncate px-3 pb-1 pt-3 text-micro font-semibold uppercase tracking-wide text-text-muted">
                      {group.title}
                    </p>
                    <ItemList
                      items={group.items}
                      activeId={activeId}
                      label={group.title}
                      onSelect={(id) => {
                        closeNow();
                        onSelect(id);
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function ExpandedNav({ groups, activeId, onSelect }: SideNavProps) {
  /* One roving list across every group, exactly as the automations scope rail
     does it: the arrow keys walk the whole nav, and Tab spends one stop on it. */
  const rows = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const roving = useRovingFocus(rows.length, {
    orientation: 'vertical',
    labels: rows.map((i) => i.title),
  });
  /* One group is a list, not an architecture — the same call the rail makes. */
  const single = groups.length === 1;

  return (
    <nav aria-label="Modules" className="flex w-full flex-col py-2" onKeyDown={roving.onKeyDown}>
      {groups.map((group) => (
        <section key={group.id} aria-label={group.title} className="pb-1 last:pb-0">
          {/* A group of one is not a group: its heading would be the word
              above the only row under it, said twice. */}
          {single || group.items.length === 1 ? null : (
            <div className="flex items-center gap-2 px-2 pb-1 pt-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-text-faint">{group.icon}</span>
              <span className="min-w-0 truncate text-micro font-semibold uppercase tracking-wide text-text-muted">
                {group.title}
              </span>
            </div>
          )}
          <ul role="list" className="flex flex-col gap-0.5 px-1">
            {group.items.map((item) => (
              <li key={item.id}>
                <NavRow
                  item={item}
                  active={item.id === activeId}
                  onSelect={onSelect}
                  roving={roving}
                  index={rows.indexOf(item)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

interface ItemListProps {
  items: SideNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
}

/** The flyout's list — its own roving group, one Tab stop for the whole group. */
function ItemList({ items, activeId, onSelect, label }: ItemListProps) {
  const roving = useRovingFocus(items.length, {
    orientation: 'vertical',
    labels: items.map((i) => i.title),
  });
  return (
    <ul role="list" aria-label={label} className="flex flex-col gap-0.5 px-1" onKeyDown={roving.onKeyDown}>
      {items.map((item, index) => (
        <li key={item.id}>
          <NavRow item={item} active={item.id === activeId} onSelect={onSelect} roving={roving} index={index} />
        </li>
      ))}
    </ul>
  );
}

interface NavRowProps {
  item: SideNavItem;
  active: boolean;
  onSelect: (id: string) => void;
  roving: UseRovingFocusResult;
  index: number;
}

function NavRow({ item, active, onSelect, roving, index }: NavRowProps) {
  return (
    <button
      type="button"
      {...roving.itemProps(index)}
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-body transition-colors duration-fast ease-standard focus-visible:focus-ring ${
        active ? 'bg-accent-soft font-medium text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text'
      }`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </button>
  );
}
