/**
 * The module's address.
 *
 * `/<moduleId>/<setId>` names the set, `?e=<eventId>` names the event whose
 * editor is open. Both are places a link can be sent to, so both survive a
 * reload; nothing else about the surface is worth an entry in the back stack.
 */

export interface AdsAddress {
  /** The set in the address, or null at the module root. */
  setId: string | null;
  /** The event being edited: an id, 'new' while one is being added, or null. */
  eventId: string | null;
}

export const NEW_EVENT = 'new';

export function parseAddress(view: string, params: URLSearchParams): AdsAddress {
  const setId = view.split('/')[0]?.trim() || null;
  const eventId = params.get('e')?.trim() || null;
  return { setId, eventId };
}

export function eventParams(current: URLSearchParams, eventId: string | null): URLSearchParams {
  const next = new URLSearchParams(current);
  if (eventId) next.set('e', eventId);
  else next.delete('e');
  return next;
}
