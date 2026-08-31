import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ModuleAppProps } from '../../types';
import { useEventSets } from '../AdsStoreContext';
import { NEW_EVENT, eventParams, parseAddress, type AdsAddress } from '../lib/adsParams';
import { draftFromEvent, emptyDraft, type EventDraft } from '../lib/eventDraft';
import type { ConversionEvent, EventSetView } from '../types';

export interface AdsUrlArgs {
  /** The view segment of the address (the set id, '' at the module's root). */
  view: string;
  /** The shell's writer: view segment and params in one move. */
  setView: ModuleAppProps['setView'];
  params: URLSearchParams;
  setParams: ModuleAppProps['setParams'];
}

export interface AdsUrlApi {
  address: AdsAddress;
  /** Every set, base first: the rail's rows and the source of `active`. */
  sets: readonly EventSetView[];
  /** The set the address names, or null while it is loading or unknown. */
  active: EventSetView | null;
  /** The active set's events. */
  events: readonly ConversionEvent[];
  /** Which pane is on screen while the layout is stacked. */
  showing: 'side' | 'detail';
  setShowing: Dispatch<SetStateAction<'side' | 'detail'>>;
  /** What the event dialog is editing, or null while it is closed. */
  draft: EventDraft | null;
  setDraft: Dispatch<SetStateAction<EventDraft | null>>;
  selectSet: (setId: string) => void;
  openEvent: (eventId: string | null) => void;
}

/**
 * The address, and the state that follows it.
 *
 * `/<setId>?e=<eventId>` is everything a link carries; the rest lives here
 * because the address alone cannot say it — which pane is on screen while the
 * layout is stacked, and the draft the event dialog edits. The writers keep
 * the address honest: moving between sets drops `?e=`, and an address that
 * names no set redirects to the default one without entering the back stack.
 */
export function useAdsUrl({ view, setView, params, setParams }: AdsUrlArgs): AdsUrlApi {
  const store = useEventSets();

  /* The dialog's draft. It is state and not a derivation because the dialog
     edits it, and the address must not change on every keystroke. */
  const [draft, setDraft] = useState<EventDraft | null>(null);

  // Keyed on the string, not the object: `params` is a fresh URLSearchParams on
  // every shell render, and re-parsing would hand the workspace a new address.
  const query = params.toString();
  const address = useMemo(() => parseAddress(view, new URLSearchParams(query)), [view, query]);

  /* Which pane is on screen while the two are stacked. Real state, not
     `active ? 'detail' : 'side'`: a set is ALWAYS selected here, so the derived
     form would pin this to 'detail' and the back control could never reach the
     rail. Seeded from the deep link, so a shared link opens the set at every
     width while a cold open lands on the list. */
  const [showing, setShowing] = useState<'side' | 'detail'>(() => (address.setId ? 'detail' : 'side'));
  const sets = store.views;
  const active = useMemo(() => sets.find((set) => set.id === address.setId) ?? null, [sets, address.setId]);
  const events = useMemo(() => active?.events?.value ?? [], [active]);

  /* The address names no set, or names one this bot does not have. Either way
     the default set is where the module opens, and replacing keeps a dead link
     out of the back stack. */
  useEffect(() => {
    if (store.loading || sets.length === 0) return;
    if (active) return;
    const fallback = sets[0];
    if (fallback) setView(fallback.id, undefined, { replace: true });
  }, [store.loading, sets, active, setView]);

  /* Moving to another set drops the event parameter with it: an event id from
     the set you just left names nothing here, and a dead parameter in the
     address is a link that opens on nothing when it is shared. */
  const openSet = useCallback((setId: string) => setView(setId, new URLSearchParams()), [setView]);

  /* Picking from the rail is also a move to the other pane while stacked - and
     it has to happen here rather than in the effect below, because picking the
     row that is already selected changes no address at all. */
  const selectSet = useCallback(
    (setId: string) => {
      setShowing('detail');
      openSet(setId);
    },
    [openSet],
  );
  const openEvent = useCallback(
    (eventId: string | null) => setParams(eventParams(params, eventId)),
    [params, setParams],
  );

  /* Arriving at another set shows it, at every width. The first id is only
     recorded: a cold open redirects from no set to the default one, and that
     is not a move a person made - it must not push the rail off a narrow
     screen before anything has been chosen. */
  const lastSetId = useRef(address.setId);
  useEffect(() => {
    const next = active?.id ?? null;
    if (next === null || lastSetId.current === next) return;
    const first = lastSetId.current === null;
    lastSetId.current = next;
    if (!first) setShowing('detail');
  }, [active?.id]);

  /* The dialog's draft follows the address: `?e=new` opens an empty one, an id
     opens that event. */
  useEffect(() => {
    if (!address.eventId) {
      setDraft(null);
      return;
    }
    if (address.eventId === NEW_EVENT) {
      setDraft((current) => current ?? emptyDraft());
      return;
    }
    const event = events.find((candidate) => candidate.id === address.eventId);
    setDraft(event ? draftFromEvent(event) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `events` is read without re-running on it: a live update mid-edit must not rebuild the draft under the open dialog
  }, [address.eventId, active?.id]);

  return { address, sets, active, events, showing, setShowing, draft, setDraft, selectSet, openEvent };
}
