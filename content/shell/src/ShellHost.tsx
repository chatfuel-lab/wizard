import { useMemo, useRef, type ReactNode } from 'react';
import { ScreenContextProvider, ShellBridgeProvider } from './modules/shellApi';
import { createScreenSink } from './lib/screenContext';
import { createShellBridge, type Destination } from './lib/shellBridge';
import { navigate as navigateUrl, type AppRoute } from './lib/route';

/**
 * The two things a module can ask of the app around it.
 *
 * A module publishes what the operator is looking at (`usePublishScreenContext`)
 * and, if it has reason to, reads or moves the app (`useShellBridge`). Only one
 * module does the second — the Coworker, whose assistant is asked "what am I
 * looking at" by a tool on the server and answers with whatever this collects.
 *
 * This was a dock: the assistant rendered as a panel beside every other module,
 * with a button in the top bar. That is gone. It put a permanent piece of one
 * module's chrome into every screen in the product, and an assistant is not
 * furniture — it is a place you go. What survives is the part that was never
 * about the panel: the app can still be read and still be navigated, from the
 * assistant's own page.
 *
 * Neither capability lets a module reach another module. Publishing is
 * write-only into a sink this owns, and the bridge only ever resolves against
 * the module registry.
 */

export interface ShellHostProps {
  route: AppRoute;
  /** The shell's own navigation, so the bridge never touches window itself. */
  navigate: (moduleId: string, params: URLSearchParams) => void;
  destinations: readonly Destination[];
  children: ReactNode;
}

export function ShellHost({ route, navigate, destinations, children }: ShellHostProps) {
  /* The route changes under whoever holds the bridge, and the bridge is built
     once. Both sides read through a ref so a snapshot taken ten minutes later
     is still current. */
  const routeRef = useRef(route);
  routeRef.current = route;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const sink = useMemo(() => createScreenSink(), []);
  const publish = useMemo(() => sink.publish.bind(sink), [sink]);

  const bridge = useMemo(
    () =>
      createShellBridge({
        destinations,
        currentRoute: () => routeRef.current,
        currentUrl: () => `${window.location.pathname}${window.location.search}`,
        readDetail: () => sink.read(),
        navigate: (moduleId, params) => navigateRef.current(moduleId, params),
        restore: (url) => navigateUrl(url),
      }),
    [destinations, sink],
  );

  return (
    <ScreenContextProvider value={publish}>
      <ShellBridgeProvider value={bridge}>{children}</ShellBridgeProvider>
    </ScreenContextProvider>
  );
}
