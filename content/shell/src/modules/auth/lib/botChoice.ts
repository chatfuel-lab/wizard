/**
 * Which bot a signed-in session lands in, as a rule rather than as an effect.
 *
 * The same shape as the open mode's `lib/botSelection.ts`, and for the same
 * reason: the authority order is worth reading in one place, and it is the part
 * that has to keep being true while bots are added, renamed and deleted under
 * a live session.
 *
 * Authority: the bot already open (it must not move under somebody mid-edit) →
 * the one they were last in → the first they may open. A bot still being
 * created carries no id yet and is never chosen; a workspace with none of them
 * answers null, which is the app's "no bots yet" state.
 */
import type { BotRef, Membership } from '../types';

/** The bots this session can actually open — a reservation carries no id yet. */
export const readyBots = (bots: readonly BotRef[]): (BotRef & { botId: string })[] =>
  bots.filter((bot): bot is BotRef & { botId: string } => Boolean(bot.botId));

/**
 * Does this account still need the server to make it a bot?
 *
 * "No workspace" and "a workspace with nothing openable in it" are ONE answer.
 * They used to be two: a workspace with no bots was read as "its owner just
 * deleted the last one", so signing in again created nothing — and a sign-up
 * whose bot never got made was indistinguishable from it, left on an empty
 * state for ever with the failure nowhere on screen. The server now refuses to
 * let a workspace delete its own last bot, so zero openable bots means one
 * thing: provisioning did not finish. Asking again is the right answer, and
 * the route is idempotent about a run that is still going.
 *
 * A MEMBER is the exception, and it is not cosmetic. `cf_my_bots_json` shows a
 * member only the bots they were GRANTED, so zero is what somebody waiting for
 * access sees in a workspace full of them. The database would refuse them
 * anyway (`cf_new_bot` requires admin) and the screen would carry an error
 * whose real answer is "ask an admin". Owners and admins bypass that filter,
 * so for them the count they see is the workspace's own.
 */
export function needsProvision(membership: Membership | null): boolean {
  if (!membership) return true;
  if (membership.role === 'member') return false;
  return readyBots(membership.tenant.bots).length === 0;
}

interface BotChoiceInput {
  bots: readonly BotRef[];
  /** What the browser remembered for this account, if anything. */
  stored: string | null;
  /** The bot open right now, if any. */
  current: string | null;
}

export function chooseBot({ bots, stored, current }: BotChoiceInput): string | null {
  const openable = readyBots(bots);
  if (openable.length === 0) return null;
  if (current && openable.some((bot) => bot.botId === current)) return current;
  const remembered = openable.find((bot) => bot.botId === stored);
  return (remembered ?? openable[0]!).botId;
}

/** Whether two bot lists are the same, so the store replaces the array only when it is not. */
export function sameBots(a: readonly BotRef[], b: readonly BotRef[]): boolean {
  return (
    a.length === b.length &&
    a.every((bot, i) => bot.id === b[i]!.id && bot.botId === b[i]!.botId && bot.name === b[i]!.name)
  );
}
