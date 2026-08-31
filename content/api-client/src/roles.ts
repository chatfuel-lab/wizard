import { MyBotRoleDocument, type PermissionAllowedAction, type PermissionObject } from './generated/core/graphql';
import type { TypedDoc } from './module-client';

/**
 * Permission gates over `MyBotRole` (the core skill op).
 *
 * A caller declares its gates as a spec — each gate is a list of
 * (object, action) pairs, and the gate opens when the role holds ANY of them.
 * "Edit implies View" is spelled by listing both pairs under the view gate;
 * the API keeps the two actions independent, so nothing here infers one from
 * the other.
 *
 * Closed unless the answer says otherwise. `fetchRoleGates` never rejects.
 *
 * There used to be one fail-open case here — a rejected fetch or a 5xx — on the
 * reasoning that nothing had been decided about this caller and the write path
 * was guarded by the same server that was currently unreachable. The second
 * half of that is not true through this stack: the proxy talks upstream under
 * ONE master token, so the API enforces the token owner's role rather than the
 * signed-in person's, and a write this gate would have hidden is a write the
 * API accepts. An unreachable server is therefore not a reason to offer more,
 * and the cost of closing is a hidden button on a page that is already broken.
 *
 * The rest closes for the reasons it always did. A session or auth failure
 * closes every gate: the caller has no session, or the token behind it needs
 * rotating, and an open page would tell them neither. A permission denial
 * closes them too — it is the answer, not a lapse. And an answer that carries
 * no role at all closes them, rather than throwing a TypeError into the catch.
 *
 * None of this is an authorization boundary — see `useGates` in the design
 * system. A gate decides what is offered; what is allowed is the server's, and
 * through a master token the server's answer is about the owner.
 */

export interface RoleGateRequirement {
  object: PermissionObject;
  action: PermissionAllowedAction;
}

/** Gate name → the (object, action) pairs any one of which opens it. */
export type RoleGateSpec<K extends string> = Record<K, readonly RoleGateRequirement[]>;

export type RoleGates<K extends string> = Record<K, boolean>;

/** The one call this file needs from a client — the full module client satisfies it. */
export interface RoleGateClient {
  query<TData, TVars>(doc: TypedDoc<TData, TVars>, variables: TVars): Promise<TData>;
}

const answerAll = <K extends string>(spec: RoleGateSpec<K>, value: boolean): RoleGates<K> => {
  const gates = {} as RoleGates<K>;
  for (const key of Object.keys(spec) as K[]) gates[key] = value;
  return gates;
};

/** Every gate closed — what a caller shows before the answer arrives. */
export const closedGates = <K extends string>(spec: RoleGateSpec<K>): RoleGates<K> => answerAll(spec, false);

export async function fetchRoleGates<K extends string>(
  client: RoleGateClient,
  botId: string,
  spec: RoleGateSpec<K>,
): Promise<RoleGates<K>> {
  try {
    const data = await client.query(MyBotRoleDocument, { botID: botId });
    const permissions: unknown = data.currentUser?.botRole?.botPermissions;
    if (!Array.isArray(permissions)) return closedGates(spec);
    const held = permissions as readonly { object?: unknown; action?: unknown }[];
    const gates = {} as RoleGates<K>;
    for (const key of Object.keys(spec) as K[]) {
      gates[key] = spec[key].some((need) => held.some((p) => p.object === need.object && p.action === need.action));
    }
    return gates;
  } catch {
    return closedGates(spec);
  }
}
