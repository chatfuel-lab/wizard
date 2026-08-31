/**
 * The module's deep link. One parameter today — which conversation is open —
 * but it goes through a codec like every other module's for one reason: the
 * surface must derive its state from `props.params` on EVERY render.
 *
 * Seeding React state from params at mount instead looks identical until
 * something else writes the URL. The assistant's own `navigate` action does
 * exactly that, and a mount-seeded surface ignores it silently.
 */

interface CoworkerParams {
  conversationId: string | null;
}

export function parseCoworkerParams(params: URLSearchParams): CoworkerParams {
  const c = params.get('c');
  return { conversationId: c && c.trim() !== '' ? c : null };
}

export function writeCoworkerParams(current: URLSearchParams, next: CoworkerParams): URLSearchParams {
  const params = new URLSearchParams(current);
  if (next.conversationId) params.set('c', next.conversationId);
  else params.delete('c');
  return params;
}
