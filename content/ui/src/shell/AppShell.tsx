import { useState, type ReactNode } from 'react';
import { IconMenu } from '../icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Drawer } from '../overlay/Drawer';

export interface AppShellProps {
  /** Left nav rail — use NavRail. Omit for single-module layouts. */
  nav?: ReactNode;
  /**
   * The nav as it should look inside the drawer, usually the same items with
   * `NavRail variant="expanded"`. Falls back to `nav`. Two explicit slots
   * rather than cloning: the shell should not be in the business of rewriting
   * someone else's props.
   */
  navDrawer?: ReactNode;
  /** Top bar content — use Topbar or roll your own. */
  topbar: ReactNode;
  children: ReactNode;
  /**
   * Own the viewport height (the standalone app) or fill the host's box (an
   * embed). Default true.
   *
   * `h-dvh`, not `h-screen`: `100vh` on mobile Safari is the height the viewport
   * would have with the address bar hidden, so a `h-screen` shell scrolls under
   * it. The dynamic unit tracks the real viewport.
   */
  fill?: boolean;
  /**
   * Below this viewport breakpoint the rail is replaced by a hamburger that
   * opens the nav in a Drawer. `'never'` keeps the rail at every width.
   *
   * This is one of the two sanctioned viewport questions in the system: when
   * the shell IS the top-level app, the viewport genuinely is its container.
   * Module code below it must ask its own container instead.
   */
  navCollapsedBelow?: 'sm' | 'md' | 'lg' | 'never';
}

const NAV_QUERY: Record<'sm' | 'md' | 'lg', string> = {
  sm: '(min-width: 40rem)',
  md: '(min-width: 48rem)',
  lg: '(min-width: 64rem)',
};

/**
 * Slots, not data: the shell knows nothing about bots or modules. The bot
 * picker/label lives in the app and is passed into the topbar slot; module
 * roots own their internal columns.
 *
 * The collapse lives HERE rather than in the host app so that every scaffolded
 * app inherits it — a module author who never thinks about the nav still gets a
 * working one at 360px.
 */
export function AppShell({ nav, navDrawer, topbar, children, fill = true, navCollapsedBelow = 'md' }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const wideEnough = useMediaQuery(navCollapsedBelow === 'never' ? '(min-width: 0px)' : NAV_QUERY[navCollapsedBelow]);
  const collapsed = Boolean(nav) && !wideEnough;

  return (
    <div className={`flex ${fill ? 'h-dvh' : 'h-full min-h-0'} flex-col bg-surface font-sans text-text`}>
      <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-surface-raised px-4">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            className="-ml-2 flex h-field w-field shrink-0 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
          >
            <IconMenu size={18} />
          </button>
        ) : null}
        {topbar}
      </header>
      <div className="flex min-h-0 flex-1">
        {collapsed ? null : nav}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      {collapsed ? (
        <Drawer open={navOpen} onClose={() => setNavOpen(false)} side="left" title="Modules" size="sm">
          {/* onClick rather than a callback prop: the drawer should close on any
              selection, and the nav's own onSelect already fires by then. */}
          <div onClick={() => setNavOpen(false)}>{navDrawer ?? nav}</div>
        </Drawer>
      ) : null}
    </div>
  );
}

export interface TopbarProps {
  /**
   * The PRODUCT's mark — a logo, a wordmark, whatever the app calls itself.
   * Leftmost, before everything else, because it is the one thing in the bar
   * that never changes while the app is open.
   *
   * A node, not a src: content/ui does not know where an app keeps its assets
   * or whether it has one at all.
   */
  brand?: ReactNode;
  /**
   * WHICH account the session is pointed at: a bot label, a workspace name, a
   * picker. This is the bar's primary content and in most apps its only left-
   * hand content.
   *
   * A node, not a string, and unstyled here — slots, not data, exactly as
   * AppShell above. content/ui does not know what a bot is, so it cannot know
   * whether this case deserves a chip, a dropdown or a warning tone. The app
   * knows, because the app is the only thing holding the env vars.
   *
   * Listed first because it matters most; it renders after `title` on the rare
   * occasion an app sets both.
   */
  workspace?: ReactNode;
  /**
   * The PRODUCT's name, if the app wants one in the chrome. Optional, and
   * usually skipped.
   *
   * Not the active module's name. That belongs to the nav rail, which is on
   * screen at desktop widths and one tap away in the drawer below them, and to
   * the module's own `PageHeader`, which is not optional — a module ships as an
   * embed inside a host app where none of this chrome exists, so its header is
   * the only name it can rely on. This prop was required and was fed the module
   * name, and all it bought was the same word twice, a few pixels apart, on
   * every screen in the app. The rail and the module header both survive alone;
   * this copy was the one that answered a question nobody was still asking.
   */
  title?: string;
  /** Session-level controls: theme toggle, account menu. Never module actions. */
  right?: ReactNode;
}

/**
 * The shell's top bar: WHERE you are working, not WHAT you are looking at.
 *
 * Fill at least one slot. An empty bar is still `h-topbar` of border and
 * background, so it reads as a chrome bug rather than as restraint — and below
 * the nav breakpoint the hamburger AppShell renders beside this content would
 * be sitting alone in it.
 */
export function Topbar({ brand, workspace, title, right }: TopbarProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      {brand}
      {title ? <span className="shrink-0 truncate text-body font-semibold">{title}</span> : null}
      {/* No `hidden sm:inline` on the workspace slot. The old bot chip hid
          itself below 640px because the module title was carrying the bar and
          the chip was a footnote to it. It is the bar now, and hiding it would
          empty the whole left side at exactly the widths where the nav rail has
          also collapsed into a drawer. */}
      {workspace ? <div className="flex min-w-0 items-center gap-2">{workspace}</div> : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}
