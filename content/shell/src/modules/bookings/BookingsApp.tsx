import { useMemo, useRef } from 'react';
import { ModuleRoot, ToastProvider, useUndoOffer } from '~ui';
import type { ModuleAppProps } from '../types';
import { BookingsCatalogContext } from './BookingsCatalogContext';
import { BookingsContext } from './BookingsContext';
import { BookingsLiveContext } from './BookingsLiveContext';
import { BookingsSettingsContext } from './BookingsSettingsContext';
import { BookingsUndoContext, type BookingsUndoValue } from './BookingsUndoContext';
import { BookingsWorkspace } from './BookingsWorkspace';
import { useCatalogStore } from './hooks/useCatalogStore';
import { useLiveChannel } from './hooks/useLiveChannel';
import { useSettingsStore } from './hooks/useSettingsStore';
import { UNDO_TTL_MS, undoLabel, type UndoEntry } from './lib/undo';

/**
 * Embeddable root of the bookings module.
 *
 * It owns the providers — the client, the one live channel, the catalog, the
 * settings, the pending undo, the toasts — and nothing else. `BookingsWorkspace`
 * owns the URL, the band, the keyboard, the open booking and the wizard; each
 * section view owns its own data. **Only the active section is mounted.**
 *
 * The provider/consumer split is deliberate: a `useX()` hook in the component
 * that renders `<XContext.Provider>` throws (the provider is still a return
 * value), `tsc` cannot see it, and vitest is node-only — validate pass 10b is
 * the whole defence. Every hook called HERE takes props, not context.
 *
 * Deep links: the surface is the path segment ('/bookings/staff'); the rest is
 * the query — `?mode=`, `&date=`, `&by=`, `&color=`, `&specialist=`,
 * `&service=`, `&status=`, `&q=`, `&range=`, `&from=`, `&to=`, `&sort=`,
 * `&period=`, `&density=`, `&s=`, `&b=`, `&new=1&start=&end=&contact=`; the
 * An older `?week=` still opens that week. An unknown value falls back silently.
 */
export function BookingsApp({ botId, client, params, view, setView: setLocation }: ModuleAppProps) {
  const context = useMemo(() => ({ client, botId }), [client, botId]);
  const live = useLiveChannel(client, botId);
  const catalog = useCatalogStore(client, botId, live.bus);
  const settings = useSettingsStore(client, botId, live.bus);

  /* One undo entry, above every section (see BookingsUndoContext). The offer's
   * lifecycle — one deep, cleared before it runs, expiring on its own — is the
   * shared `useUndoOffer`; the TTL stays this module's, so `isUndoExpired` and
   * the live offer can never disagree. */
  const offer = useUndoOffer<UndoEntry>({ ttlMs: UNDO_TTL_MS });

  const undo: BookingsUndoValue = useMemo(
    () => ({
      entry: offer.entry,
      label: offer.entry ? undoLabel(offer.entry) : null,
      push: offer.push,
      run: offer.run,
      clear: offer.clear,
    }),
    [offer],
  );

  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <ToastProvider>
      <BookingsContext.Provider value={context}>
        <BookingsLiveContext.Provider value={live}>
          <BookingsCatalogContext.Provider value={catalog}>
            <BookingsSettingsContext.Provider value={settings}>
              <BookingsUndoContext.Provider value={undo}>
                {/* `relative` is what `ActionBar` (absolute, deliberately not
                    portalled) positions against. */}
                <ModuleRoot ref={rootRef} className="relative">
                  <BookingsWorkspace rootRef={rootRef} params={params} view={view} setLocation={setLocation} />
                </ModuleRoot>
              </BookingsUndoContext.Provider>
            </BookingsSettingsContext.Provider>
          </BookingsCatalogContext.Provider>
        </BookingsLiveContext.Provider>
      </BookingsContext.Provider>
    </ToastProvider>
  );
}
