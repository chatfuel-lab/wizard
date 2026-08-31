import { describe, expect, it } from 'vitest';
import { PermissionAllowedAction, PermissionObject } from '../src/generated/core/graphql';
import {
  ChatfuelAuthError,
  ChatfuelGraphQLError,
  ChatfuelHttpError,
  ChatfuelNetworkError,
  ChatfuelSessionError,
} from '../src/errors';
import { closedGates, fetchRoleGates, type RoleGateClient, type RoleGateSpec } from '../src/roles';

const SPEC: RoleGateSpec<'canView' | 'canEdit'> = {
  // Edit implies View on the dashboard side, so the view gate lists both.
  canView: [
    { object: PermissionObject.People, action: PermissionAllowedAction.Edit },
    { object: PermissionObject.People, action: PermissionAllowedAction.View },
  ],
  canEdit: [{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }],
};

const clientWith = (permissions: { object: PermissionObject; action: PermissionAllowedAction }[]): RoleGateClient => ({
  query: <TData>() =>
    Promise.resolve({
      currentUser: { id: 'u1', botRole: { botPermissions: permissions } },
    } as TData),
});

describe('fetchRoleGates', () => {
  it('opens a gate when the role holds any of its pairs', async () => {
    const viewer = clientWith([{ object: PermissionObject.People, action: PermissionAllowedAction.View }]);
    await expect(fetchRoleGates(viewer, 'bot-1', SPEC)).resolves.toEqual({ canView: true, canEdit: false });

    const editor = clientWith([{ object: PermissionObject.People, action: PermissionAllowedAction.Edit }]);
    await expect(fetchRoleGates(editor, 'bot-1', SPEC)).resolves.toEqual({ canView: true, canEdit: true });
  });

  it('keeps gates closed when the role holds nothing relevant', async () => {
    const other = clientWith([{ object: PermissionObject.Ai, action: PermissionAllowedAction.Edit }]);
    await expect(fetchRoleGates(other, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });

  it('closes when the request never reached an answer', async () => {
    // This used to be the one fail-open case, on the reasoning that the write
    // path was guarded by the same server. It is not: upstream sees the master
    // token's role, not this caller's, so an unreachable server is no reason to
    // offer more.
    const offline: RoleGateClient = { query: () => Promise.reject(new ChatfuelNetworkError('fetch failed')) };
    await expect(fetchRoleGates(offline, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });

    const upstreamDown: RoleGateClient = { query: () => Promise.reject(new ChatfuelHttpError(503, 'bad gateway')) };
    await expect(fetchRoleGates(upstreamDown, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });

  it('closes on a failure it cannot place, and never rejects', async () => {
    // A bare Error is not evidence that the server would refuse the write; it
    // used to be the fail-open path, which meant any programming mistake in
    // this function opened every gate.
    const broken: RoleGateClient = { query: () => Promise.reject(new Error('boom')) };
    await expect(fetchRoleGates(broken, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });

    const refused: RoleGateClient = { query: () => Promise.reject(new ChatfuelHttpError(400, 'nope')) };
    await expect(fetchRoleGates(refused, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });

  it('closes when the answer carries no role', async () => {
    // A null botRole is a shape the server may send. Reading through it threw a
    // TypeError into the catch, which answered every gate true.
    const noRole: RoleGateClient = {
      query: <TData>() => Promise.resolve({ currentUser: { id: 'u1', botRole: null } } as TData),
    };
    await expect(fetchRoleGates(noRole, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });

    const noPermissions: RoleGateClient = {
      query: <TData>() => Promise.resolve({ currentUser: { id: 'u1', botRole: { botPermissions: null } } } as TData),
    };
    await expect(fetchRoleGates(noPermissions, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });

  it('closes every gate when the failure says there is no caller to ask about', async () => {
    // Fail-open rests on the server refusing the write later. A caller with no
    // session has nothing the server would accept, so an open page only lets
    // them discover that one click at a time.
    const noSession: RoleGateClient = {
      query: () => Promise.reject(new ChatfuelSessionError([{ message: 'no session' }])),
    };
    await expect(fetchRoleGates(noSession, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });

    const staleToken: RoleGateClient = {
      query: () => Promise.reject(new ChatfuelAuthError([{ message: 'nope', extensions: { code: 'Unauthorized' } }])),
    };
    await expect(fetchRoleGates(staleToken, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });

  it('closes on a permission error, which is an answer and not a lapse', async () => {
    const denied: RoleGateClient = {
      query: () =>
        Promise.reject(new ChatfuelGraphQLError([{ message: 'no', extensions: { code: 'NotEnoughPermissions' } }])),
    };
    await expect(fetchRoleGates(denied, 'bot-1', SPEC)).resolves.toEqual({ canView: false, canEdit: false });
  });
});

describe('the constant answer', () => {
  it('mirrors the spec keys', () => {
    expect(closedGates(SPEC)).toEqual({ canView: false, canEdit: false });
  });
});
