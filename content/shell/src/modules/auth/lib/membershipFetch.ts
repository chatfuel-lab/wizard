/**
 * "Who is this account, and does it have a workspace yet" — the async decision
 * AuthProvider runs on every sign-in, invite and refresh.
 *
 * It lives here rather than inside the provider because vitest in this
 * repository is node-only by choice: a decision left inside a component is a
 * decision nothing can assert, and this one has races in it. Every dependency
 * that made it untestable — the reducer, the refs, the host callback — arrives
 * as a field of `MembershipFetchContext`.
 */
import { needsProvision } from './botChoice';
import { provisionMessage } from './provisionMessage';
import type { AuthAction } from './authState';
import type { Membership } from '../types';

/** A provision that failed, and the account it failed for. */
export interface BlockedProvision {
  userId: string;
  message?: string;
}

export interface MembershipFetchContext {
  myMembership: () => Promise<Membership | null>;
  /** Already de-duplicated per account by the provider. */
  provisionFor: (userId: string) => Promise<Membership>;
  /**
   * The account this fetch is for. Async because a sign-up can ask before
   * SIGNED_IN has landed, when only the adapter knows.
   */
  accountId: () => Promise<string>;
  /** The epoch a reply must still match to count — see `settleMembership`. */
  currentEpoch: () => number;
  /**
   * Is an invite waiting to be accepted? A fetch that provisions anyway hands
   * an invited colleague a workspace and a bot of their own — see below.
   */
  invitePending: () => boolean;
  dispatch: (action: AuthAction) => void;
  /** The host runtime's bot picker and workspace name. */
  onWorkspace?: (membership: Membership | null) => void;
  blocked: { read: () => BlockedProvision | null; write: (next: BlockedProvision | null) => void };
}

type SettleContext = Pick<MembershipFetchContext, 'dispatch' | 'currentEpoch' | 'onWorkspace'>;

/**
 * The one way a settled membership leaves this module: to the reducer, and to
 * the host runtime.
 *
 * Both are guarded by the epoch, for the reason the reducer has always had one
 * — a reply for a user who is no longer signed in must not land. Only
 * `dispatch` used to be guarded; `onWorkspace` was called beside it and was
 * not, so a `myMembership` for A that resolved after B signed in named A's
 * bots and A's workspace in B's chrome, while the reducer dropped that very
 * same reply.
 */
export function settleMembership(ctx: SettleContext, epoch: number, membership: Membership | null): void {
  ctx.dispatch({ type: 'membership', epoch, membership });
  if (epoch === ctx.currentEpoch()) ctx.onWorkspace?.(membership);
}

/**
 * `provision: false` is for the paths that just created a membership
 * themselves (accepting an invite), and for the refreshes that only want to
 * re-read a role — asking the server for a bot there would spend somebody
 * else's plan.
 *
 * An invite still waiting to be accepted overrules `provision: true`, and that
 * is not a refinement of it: the caller that asks is the SIGNED_IN handler,
 * which cannot tell a sign-up on `/sign-up` from the one the invite screen
 * runs a round trip before `acceptInvite`. Both arrive with no membership, so
 * `needsProvision` says yes to both, and the invited colleague is given a
 * workspace and a real Chatfuel bot off the deployment's plan — an orphan
 * tenant the UI never shows them, billed, next to the one they were invited
 * to. Bumping the epoch afterwards drops the reply, never the round trip.
 */
export async function fetchMembership(
  ctx: MembershipFetchContext,
  epoch: number,
  { provision = false }: { provision?: boolean } = {},
): Promise<void> {
  try {
    const membership = await ctx.myMembership();
    /*
     * An account with nothing it can OPEN is provisioned — see
     * `needsProvision`, which owns the rule and the reasons. Deliberately NOT
     * dispatched before the attempt: a workspace whose bot was never made is
     * not a workspace anybody can be let into, and leaving `isMember` false is
     * what routes them to /no-access, where the reason and the retry are.
     */
    if (!provision || ctx.invitePending() || !needsProvision(membership)) {
      settleMembership(ctx, epoch, membership);
      return;
    }
    const userId = await ctx.accountId();
    const blocked = ctx.blocked.read();
    if (blocked && blocked.userId === userId) {
      ctx.dispatch({ type: 'membershipFailed', epoch, message: blocked.message });
      return;
    }
    ctx.dispatch({ type: 'provisioning', epoch });
    const provisioned = await ctx.provisionFor(userId).catch((err: unknown) => {
      ctx.blocked.write({ userId, message: provisionMessage(err) });
      throw err;
    });
    settleMembership(ctx, epoch, provisioned);
  } catch (err) {
    // The server's own words when it has them: a full Chatfuel workspace or a
    // misconfigured one is not something a retry fixes.
    ctx.dispatch({ type: 'membershipFailed', epoch, message: provisionMessage(err) });
  }
}
